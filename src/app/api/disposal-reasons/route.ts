import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { DEFAULT_DISPOSAL_REASONS, DisposalReason } from '@/lib/disposal-reason-store';
import { verifyApiAuth } from '@/lib/auth';

async function initDisposalReasonsTable() {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS disposal_reasons (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const existing = await executeQuery<any[]>('SELECT COUNT(*) as cnt FROM disposal_reasons');
    if (existing && existing[0] && Number(existing[0].cnt) === 0) {
      for (const r of DEFAULT_DISPOSAL_REASONS) {
        await executeQuery(
          'INSERT IGNORE INTO disposal_reasons (id, name, description, is_active) VALUES (?, ?, ?, ?)',
          [r.id, r.name, r.description || '', r.is_active !== false ? 1 : 0]
        );
      }
    }
  } catch (err) {
    console.warn('Init disposal_reasons table warning:', err);
  }
}

export async function GET() {
  try {
    await initDisposalReasonsTable();
    const rows = await executeQuery<any[]>('SELECT * FROM disposal_reasons ORDER BY name ASC');
    if (rows && rows.length > 0) {
      const data: DisposalReason[] = rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        description: r.description || '',
        is_active: Boolean(r.is_active),
        created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      }));
      return NextResponse.json({ success: true, data });
    }
  } catch (err) {
    console.warn('DB get disposal reasons fallback to default:', err);
  }

  return NextResponse.json({ success: true, data: DEFAULT_DISPOSAL_REASONS });
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth(req, ['Master Data', 'Lihat Stok (Gudang)']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: 'Nama alasan pembuangan wajib diisi' }, { status: 400 });
    }

    const newId = `reason-${Date.now()}`;
    const newReason: DisposalReason = {
      id: newId,
      name: name.trim(),
      description: description?.trim() || '',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    try {
      await initDisposalReasonsTable();
      await executeQuery(
        'INSERT INTO disposal_reasons (id, name, description, is_active) VALUES (?, ?, ?, 1)',
        [newReason.id, newReason.name, newReason.description]
      );
    } catch (err) {
      console.warn('DB insert disposal reason warning:', err);
    }

    return NextResponse.json({ success: true, data: newReason });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyApiAuth(req, ['Master Data', 'Lihat Stok (Gudang)']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, name, description, is_active } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ success: false, message: 'ID dan nama alasan wajib diisi' }, { status: 400 });
    }

    try {
      await initDisposalReasonsTable();
      await executeQuery(
        'UPDATE disposal_reasons SET name = ?, description = ?, is_active = COALESCE(?, is_active) WHERE id = ?',
        [name.trim(), description?.trim() || '', is_active !== undefined ? (is_active ? 1 : 0) : null, id]
      );
    } catch (err) {
      console.warn('DB update disposal reason warning:', err);
    }

    return NextResponse.json({
      success: true,
      data: {
        id,
        name: name.trim(),
        description: description?.trim() || '',
        is_active: is_active !== undefined ? Boolean(is_active) : true,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyApiAuth(req, ['Master Data', 'Lihat Stok (Gudang)']);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID alasan wajib disertakan' }, { status: 400 });
    }

    try {
      await initDisposalReasonsTable();
      await executeQuery('DELETE FROM disposal_reasons WHERE id = ?', [id]);
    } catch (err) {
      console.warn('DB delete disposal reason warning:', err);
    }

    return NextResponse.json({ success: true, message: 'Alasan pembuangan berhasil dihapus' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
