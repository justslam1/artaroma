import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { StockOpnameDraft } from '@/lib/types';
import { verifyApiAuth } from '@/lib/auth';

// In-memory fallback cache for drafts
let inMemoryDrafts: StockOpnameDraft[] = [];

// Helper to ensure MySQL table exists
async function ensureDraftsTable() {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS stock_opname_drafts (
        id VARCHAR(100) PRIMARY KEY,
        draft_number VARCHAR(100),
        title VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PENDING_APPROVAL',
        created_at DATETIME,
        created_by VARCHAR(100),
        approved_at DATETIME NULL,
        approved_by VARCHAR(100) NULL,
        rejection_reason TEXT NULL,
        general_notes TEXT NULL,
        total_items INT DEFAULT 0,
        total_system_kg DECIMAL(12,3) DEFAULT 0,
        total_physical_kg DECIMAL(12,3) DEFAULT 0,
        total_difference_kg DECIMAL(12,3) DEFAULT 0,
        items_json JSON
      )
    `);
  } catch (e: any) {
    console.warn('ensureDraftsTable warning:', e.message);
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureDraftsTable();

    try {
      const rows: any[] = await executeQuery(
        'SELECT * FROM stock_opname_drafts ORDER BY created_at DESC'
      );

      if (rows && rows.length > 0) {
        const drafts = rows.map((r) => ({
          ...r,
          items: typeof r.items_json === 'string' ? JSON.parse(r.items_json) : (r.items_json || []),
        }));
        return NextResponse.json({ success: true, count: drafts.length, data: drafts });
      }
    } catch (dbErr: any) {
      console.warn('MySQL fetch drafts error, using fallback:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      count: inMemoryDrafts.length,
      data: inMemoryDrafts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth(req, ['Lihat Stok (Gudang)']);
  if (auth.error) return auth.error;

  try {
    await ensureDraftsTable();
    const body = await req.json();
    const { title, created_by, general_notes, items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Rincian item draft opname wajib diisi.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const dateStr = now.toISOString().replace(/[-:T.]/g, '').substring(0, 14);
    const draftNumber = `DRAFT-OPN-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;
    const draftId = `draft-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let totalSys = 0;
    let totalPhys = 0;
    items.forEach((item: any) => {
      totalSys += Number(item.system_qty_kg || 0);
      totalPhys += Number(item.physical_qty_kg || 0);
    });
    const totalDiff = totalPhys - totalSys;

    const newDraft: StockOpnameDraft = {
      id: draftId,
      draft_number: draftNumber,
      title: title || `Draft Audit Stok Opname (${items.length} Batch)`,
      status: 'PENDING_APPROVAL',
      created_at: now.toISOString(),
      created_by: created_by || 'Staff Gudang',
      general_notes: general_notes || '',
      total_items: items.length,
      total_system_kg: totalSys,
      total_physical_kg: totalPhys,
      total_difference_kg: totalDiff,
      items: items,
    };

    try {
      await executeQuery(
        `INSERT INTO stock_opname_drafts 
        (id, draft_number, title, status, created_at, created_by, general_notes, total_items, total_system_kg, total_physical_kg, total_difference_kg, items_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newDraft.id,
          newDraft.draft_number,
          newDraft.title,
          newDraft.status,
          newDraft.created_at,
          newDraft.created_by,
          newDraft.general_notes,
          newDraft.total_items,
          newDraft.total_system_kg,
          newDraft.total_physical_kg,
          newDraft.total_difference_kg,
          JSON.stringify(newDraft.items),
        ]
      );
    } catch (dbErr: any) {
      console.warn('Insert draft to MySQL failed, saving to in-memory fallback:', dbErr.message);
    }

    inMemoryDrafts.unshift(newDraft);

    return NextResponse.json({
      success: true,
      message: 'Draft Stok Opname berhasil disimpan dan siap diajukan ke Super Admin!',
      data: newDraft,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyApiAuth(req, ['Lihat Stok (Gudang)']);
  if (auth.error) return auth.error;

  try {
    await ensureDraftsTable();
    const body = await req.json();
    const { id, action, approved_by, rejection_reason } = body;

    if (!id || !action) {
      return NextResponse.json(
        { success: false, message: 'Draft ID and action are required' },
        { status: 400 }
      );
    }

    // Retrieve draft
    let draft: StockOpnameDraft | null = null;
    try {
      const rows: any[] = await executeQuery(
        'SELECT * FROM stock_opname_drafts WHERE id = ? LIMIT 1',
        [id]
      );
      if (rows && rows.length > 0) {
        draft = {
          ...rows[0],
          items: typeof rows[0].items_json === 'string' ? JSON.parse(rows[0].items_json) : (rows[0].items_json || []),
        };
      }
    } catch (e: any) {
      console.warn('Failed to query draft from MySQL:', e.message);
    }

    if (!draft) {
      draft = inMemoryDrafts.find((d) => d.id === id) || null;
    }

    if (!draft) {
      return NextResponse.json(
        { success: false, message: 'Draft Stok Opname tidak ditemukan.' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    if (action === 'APPROVE') {
      const approver = approved_by || 'SUPER ADMIN HQ';

      // 1. Execute physical stock adjustments in database
      for (const item of draft.items) {
        const qty = Number(item.physical_qty_kg || 0);
        
        try {
          const rows: any[] = await executeQuery(
            `SELECT product_id, variant_sku, batch_number, pack_size_kg, current_qty_kg FROM stock_batches WHERE id = ?`,
            [item.batch_id]
          );

          if (rows && rows.length > 0) {
            const batch = rows[0];
            let packSize = 1;
            if (batch.pack_size_kg) {
              packSize = Math.max(1, parseInt(batch.pack_size_kg));
            }
            const newUnitCount = qty > 0 ? Math.max(1, Math.ceil(qty / packSize)) : 0;
            const oldQty = parseFloat(batch.current_qty_kg || 0);
            const diff = qty - oldQty;

            // Log history
            const historyId = `opname-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
            const auditorName = `${draft.created_by} (Disetujui: ${approver})`;
            
            await executeQuery(
              `INSERT INTO stock_opname_history 
              (id, batch_id, product_id, variant_sku, batch_number, system_qty_kg, physical_qty_kg, difference_qty_kg, notes, created_at, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
              [
                historyId,
                item.batch_id,
                batch.product_id,
                batch.variant_sku || '',
                batch.batch_number || '',
                oldQty,
                qty,
                diff,
                item.notes || draft.general_notes || 'Penyelarasan Draft Opname',
                auditorName,
              ]
            );

            // Update batch
            await executeQuery(
              `UPDATE stock_batches SET current_qty_kg = ?, unit_count = ? WHERE id = ?`,
              [qty, newUnitCount, item.batch_id]
            );
          }
        } catch (updateErr: any) {
          console.warn(`Failed to update batch ${item.batch_id}:`, updateErr.message);
        }
      }

      // 2. Mark draft as APPROVED
      draft.status = 'APPROVED';
      draft.approved_at = now;
      draft.approved_by = approver;

      try {
        await executeQuery(
          `UPDATE stock_opname_drafts SET status = 'APPROVED', approved_at = ?, approved_by = ? WHERE id = ?`,
          [now, approver, id]
        );
      } catch (dbErr: any) {
        console.warn('Update draft status error:', dbErr.message);
      }

      // Update in-memory
      inMemoryDrafts = inMemoryDrafts.map((d) => (d.id === id ? draft! : d));

      return NextResponse.json({
        success: true,
        message: `Draft Opname ${draft.draft_number} berhasil disetujui oleh Super Admin dan diselaraskan ke database!`,
        data: draft,
      });
    } else if (action === 'REJECT') {
      draft.status = 'REJECTED';
      draft.rejection_reason = rejection_reason || 'Ditolak oleh Super Admin untuk dihitung ulang.';

      try {
        await executeQuery(
          `UPDATE stock_opname_drafts SET status = 'REJECTED', rejection_reason = ? WHERE id = ?`,
          [draft.rejection_reason, id]
        );
      } catch (dbErr: any) {
        console.warn('Update draft reject error:', dbErr.message);
      }

      inMemoryDrafts = inMemoryDrafts.map((d) => (d.id === id ? draft! : d));

      return NextResponse.json({
        success: true,
        message: `Draft Opname ${draft.draft_number} telah ditolak.`,
        data: draft,
      });
    } else if (action === 'DELETE') {
      try {
        await executeQuery('DELETE FROM stock_opname_drafts WHERE id = ?', [id]);
      } catch (dbErr: any) {
        console.warn('Delete draft error:', dbErr.message);
      }

      inMemoryDrafts = inMemoryDrafts.filter((d) => d.id !== id);

      return NextResponse.json({
        success: true,
        message: `Draft Opname berhasil dihapus.`,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
