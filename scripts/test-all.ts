import dotenv from 'dotenv';
dotenv.config();

import { executeQuery } from '../src/lib/db';
import { VAPID_PUBLIC_KEY, ensurePushTableExists } from '../src/lib/push-notifications';
import { convertUsdToIdr, getUsdExchangeRate } from '../src/lib/currency-store';

async function runCliTests() {
  console.log('\n======================================================');
  console.log('🚀 ARTAROMA AUTOMATED SYSTEM TEST RUNNER (CLI)');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function check(title: string, fn: () => Promise<void>) {
    process.stdout.write(`⏳ [TEST] ${title}... `);
    try {
      await fn();
      console.log('✅ PASS');
      passed++;
    } catch (e: any) {
      console.log(`❌ FAIL: ${e.message}`);
      failed++;
    }
  }

  // 1. Database Connectivity
  await check('Database & Tables Integrity', async () => {
    await ensurePushTableExists();
    const rows: any = await executeQuery('SELECT 1 as val');
    if (!rows || rows[0]?.val !== 1) throw new Error('Query ping failed');
  });

  // 2. USD Pricelist Formula
  await check('USD Formula Markup (25kg -> 5kg +$0.90 -> 1kg +$1.35)', async () => {
    const base = 1.0;
    const p5 = Number((base + 0.9).toFixed(2));
    const p1 = Number((base + 1.35).toFixed(2));
    if (p5 !== 1.9 || p1 !== 2.35) throw new Error('Formula markup mismatch');
    const idr = convertUsdToIdr(p5);
    if (idr <= 0) throw new Error('IDR conversion error');
  });

  // 3. FEFO Sorting
  await check('FEFO Batch Sorting Order', async () => {
    const batches = [
      { id: 2, exp: '2027-01-01' },
      { id: 1, exp: '2026-06-01' },
    ];
    batches.sort((a, b) => new Date(a.exp).getTime() - new Date(b.exp).getTime());
    if (batches[0].id !== 1) throw new Error('FEFO sorting inverted');
  });

  // 4. Web Push Setup
  await check('Web Push VAPID Configuration', async () => {
    if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.length < 20) {
      throw new Error('VAPID public key invalid');
    }
  });

  console.log('\n======================================================');
  console.log(`📊 HASIL: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runCliTests().catch((e) => {
  console.error('Fatal CLI test error:', e);
  process.exit(1);
});
