import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { initialAppUsers } from '@/lib/mock-data';

export async function GET() {
  try {
    const dbUsers = await executeQuery<any[]>('SELECT id, name, email, linked_entity_name, allowed_modules, is_active, created_at FROM users ORDER BY created_at ASC');
    
    if (dbUsers && dbUsers.length > 0) {
      const formatted = dbUsers.map((u) => {
        let modules: string[] = [];
        if (u.allowed_modules) {
          try {
            modules = typeof u.allowed_modules === 'string' ? JSON.parse(u.allowed_modules) : u.allowed_modules;
          } catch {
            modules = String(u.allowed_modules).split(',').map((s) => s.trim()).filter(Boolean);
          }
        }
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          linked_entity_name: u.linked_entity_name || 'Artaroma HQ',
          allowed_modules: modules,
          is_active: Boolean(u.is_active),
          created_at: String(u.created_at).split('T')[0],
        };
      });
      return NextResponse.json({ success: true, data: formatted });
    }

    return NextResponse.json({ success: true, data: initialAppUsers });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message, data: initialAppUsers }, { status: 500 });
  }
}
