import { loadEnvConfig } from '@next/env';
import fs from 'fs';
import path from 'path';

loadEnvConfig(process.cwd());

import pool from './db';

async function dumpLocalDb() {
  console.log('📦 Starting Local MySQL Database Export...');
  const connection = await pool.getConnection();

  try {
    const [tablesRes] = await connection.query('SHOW TABLES') as any[];
    const dbName = process.env.DB_NAME || 'fragrance_hub';
    const keyName = `Tables_in_${dbName}`;
    const tables: string[] = tablesRes.map((row: any) => row[keyName] || Object.values(row)[0]);

    console.log('Found local tables:', tables);

    let sqlOutput = `-- =============================================================================\n`;
    sqlOutput += `-- ARTAROMA LOCAL DATABASE EXPORT DUMP\n`;
    sqlOutput += `-- Generated at: ${new Date().toISOString()}\n`;
    sqlOutput += `-- =============================================================================\n\n`;
    sqlOutput += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    const allAlterConstraints: string[] = [];

    for (const table of tables) {
      console.log(`Dumping table: ${table}...`);
      
      // 1. Get CREATE TABLE statement
      const [createRes] = await connection.query(`SHOW CREATE TABLE \`${table}\``) as any[];
      const createSql = createRes[0]['Create Table'];

      // Parse and extract constraints to prevent ordering issues during creation
      const createSqlLines = createSql.split('\n');
      const cleanLines: string[] = [];

      for (const line of createSqlLines) {
        if (line.includes('CONSTRAINT')) {
          const trimmed = line.trim();
          const cleanConstraint = trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed;
          allAlterConstraints.push(`ALTER TABLE \`${table}\` ADD ${cleanConstraint};`);
        } else {
          cleanLines.push(line);
        }
      }

      // Remove trailing comma from the last column line before closing parenthesis
      let closingIndex = -1;
      for (let i = cleanLines.length - 1; i >= 0; i--) {
        if (cleanLines[i].trim().startsWith(')')) {
          closingIndex = i;
          break;
        }
      }
      if (closingIndex > 0) {
        const lastColIndex = closingIndex - 1;
        const lineVal = cleanLines[lastColIndex].trim();
        if (lineVal.endsWith(',')) {
          const indent = cleanLines[lastColIndex].match(/^\s*/)?.[0] || '  ';
          cleanLines[lastColIndex] = indent + lineVal.slice(0, -1);
        }
      }

      const cleanCreateSql = cleanLines.join('\n');
      
      sqlOutput += `-- DROP & CREATE TABLE FOR \`${table}\`\n`;
      sqlOutput += `DROP TABLE IF EXISTS \`${table}\`;\n`;
      sqlOutput += `${cleanCreateSql};\n\n`;

      // 2. Get all rows
      const [rows] = await connection.query(`SELECT * FROM \`${table}\``) as any[];
      
      if (rows.length > 0) {
        sqlOutput += `-- INSERT DATA FOR \`${table}\`\n`;
        const columns = Object.keys(rows[0]).map(col => `\`${col}\``).join(', ');
        
        sqlOutput += `INSERT INTO \`${table}\` (${columns}) VALUES \n`;
        
        const valueStrings = rows.map((row: any) => {
          const values = Object.values(row).map((val: any) => {
            if (val === null) return 'NULL';
            if (typeof val === 'number') return val;
            if (typeof val === 'boolean') return val ? 1 : 0;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "\\'")}'`;
            return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
          });
          return `(${values.join(', ')})`;
        });
        
        sqlOutput += valueStrings.join(',\n') + ';\n\n';
      }
    }

    // Append foreign key constraints at the very end of the file
    if (allAlterConstraints.length > 0) {
      sqlOutput += `-- =============================================================================\n`;
      sqlOutput += `-- ADD FOREIGN KEY CONSTRAINTS (At the end to prevent errno: 150)\n`;
      sqlOutput += `-- =============================================================================\n\n`;
      sqlOutput += allAlterConstraints.join('\n') + '\n\n';
    }

    sqlOutput += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    const outputPath = path.join(process.cwd(), 'artaroma_local_export.sql');
    fs.writeFileSync(outputPath, sqlOutput, 'utf8');
    console.log(`\n✅ Database exported successfully to: ${outputPath}`);
  } catch (error: any) {
    console.error('❌ Database Export Failed:', error.message);
  } finally {
    connection.release();
    process.exit(0);
  }
}

dumpLocalDb();
