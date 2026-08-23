import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryFilter = searchParams.get('category') || 'ALL';
    const searchQuery = searchParams.get('q') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';

    const allLogs: any[] = [];

    // 1. Fetch Manual Operational Logs
    try {
      const manualRows: any[] = await executeQuery(
        'SELECT * FROM operational_logs ORDER BY log_date DESC'
      );
      if (manualRows && manualRows.length > 0) {
        for (const row of manualRows) {
          allLogs.push({
            id: row.id,
            timestamp: row.log_date,
            category: row.category || 'CATATAN_MANUAL',
            category_label: 'Catatan Manual',
            title: row.title,
            description: row.description || '',
            actor_name: row.actor_name || 'Admin',
            actor_role: row.actor_role || 'ADMIN',
            ref_code: row.reference_id || '-',
            document_type: row.document_type || null,
            document_number: row.document_number || null,
            photo_url: row.photo_url || null,
            signature_url: row.signature_url || null,
            raw_data: row,
          });
        }
      }
    } catch (e: any) {
      console.warn('Manual logs query failed:', e.message);
    }

    // 2. Generate Log Events from Purchase Orders (PO)
    try {
      const poRows: any[] = await executeQuery(
        `SELECT 
          po.id,
          po.po_number,
          po.order_date,
          po.status,
          po.total_amount,
          po.payment_method,
          po.shipments,
          po.created_at,
          d.name AS supplier_name,
          d.contact_name AS supplier_pic
        FROM purchase_orders po
        LEFT JOIN distributors d ON po.distributor_id = d.id
        ORDER BY po.order_date DESC`
      );

      if (poRows && poRows.length > 0) {
        for (const row of poRows) {
          const items: any[] = await executeQuery(
            'SELECT * FROM po_items WHERE po_id = ?',
            [row.id]
          );

          // Check if there are shipments with surat jalan attachments in JSON
          let vendorSJPhoto: string | null = null;
          if (row.shipments) {
            try {
              const parsedShipments = typeof row.shipments === 'string' ? JSON.parse(row.shipments) : row.shipments;
              if (Array.isArray(parsedShipments) && parsedShipments.length > 0) {
                const lastShipment = parsedShipments[parsedShipments.length - 1];
                if (lastShipment && lastShipment.surat_jalan_data) {
                  vendorSJPhoto = lastShipment.surat_jalan_data;
                }
              }
            } catch (jsonErr) {
              console.warn('Failed parsing PO shipments JSON:', jsonErr);
            }
          }

          allLogs.push({
            id: `log-po-create-${row.id}`,
            timestamp: row.created_at || row.order_date,
            category: 'PROCUREMENT',
            category_label: 'Pengadaan Suplier',
            title: `Penerbitan PO Suplier ${row.po_number}`,
            description: `Pengadaan barang dari suplier ${row.supplier_name || 'Vendor Suplier'}. Total Nilai PO: Rp ${Number(row.total_amount || 0).toLocaleString('id-ID')}. Status PO: ${row.status}. Terdiri dari ${items.length} varian bibit parfum.`,
            actor_name: row.supplier_pic || 'Tim Purchasing',
            actor_role: 'PURCHASING',
            ref_code: row.po_number,
            document_type: 'PO',
            document_number: row.po_number,
            photo_url: vendorSJPhoto,
            po_id: row.id,
            party_name: row.supplier_name || 'Vendor Suplier',
            grand_total: parseFloat(row.total_amount) || 0,
            items: items || [],
          });
        }
      }
    } catch (e: any) {
      console.warn('PO logs query failed:', e.message);
    }

    // 3. Generate Log Events from Sales Orders (SO)
    try {
      const soRows: any[] = await executeQuery(
        `SELECT 
          so.id,
          so.so_number,
          so.order_date,
          so.status,
          so.grand_total,
          so.courier_name,
          so.surat_jalan_number,
          so.delivered_date,
          so.received_by,
          so.received_photo,
          so.received_signature,
          so.cancellation_reason,
          so.cancelled_at,
          c.company_name,
          c.pic_name AS customer_pic,
          c.phone AS customer_phone,
          c.address AS customer_address,
          inv.id AS invoice_id,
          inv.invoice_number,
          inv.status AS invoice_status,
          deliv.recipient_name AS deliv_recipient,
          deliv.proof_photo_url AS deliv_photo,
          deliv.digital_signature_url AS deliv_signature,
          deliv.received_at AS deliv_time
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN invoices inv ON so.id = inv.so_id
        LEFT JOIN deliveries deliv ON so.id = deliv.so_id
        ORDER BY so.order_date DESC`
      );

      if (soRows && soRows.length > 0) {
        for (const row of soRows) {
          const items: any[] = await executeQuery(
            `SELECT si.*, sb.batch_number 
             FROM so_items si
             LEFT JOIN so_item_batches sib ON si.id = sib.so_item_id
             LEFT JOIN stock_batches sb ON sib.stock_batch_id = sb.id
             WHERE si.so_id = ?`,
            [row.id]
          );

          // Event 1: SO Created / Registered
          allLogs.push({
            id: `log-so-create-${row.id}`,
            timestamp: row.order_date,
            category: 'SALES',
            category_label: 'Penjualan B2B',
            title: `Penerbitan Sales Order ${row.so_number}`,
            description: `Pesanan dibuat untuk ${row.company_name || 'Customer B2B'} (${row.customer_pic || 'PIC'}). Total Transaksi: Rp ${Number(row.grand_total || 0).toLocaleString('id-ID')}. Terdiri dari ${items.length} item varian produk.`,
            actor_name: row.customer_pic || 'Sales Team',
            actor_role: 'SALES',
            ref_code: row.so_number,
            document_type: 'SO',
            document_number: row.so_number,
            so_id: row.id,
            surat_jalan_number: row.surat_jalan_number,
            invoice_number: row.invoice_number,
            party_name: row.company_name || 'Customer B2B',
            party_pic: row.customer_pic,
            grand_total: parseFloat(row.grand_total) || 0,
            items: items || [],
          });

          // Event 2: Dispatched / In Transit (Surat Jalan issued)
          if (row.status === 'DIKIRIM' || row.status === 'DITERIMA' || row.status === 'DELIVERED') {
            allLogs.push({
              id: `log-so-dispatch-${row.id}`,
              timestamp: row.order_date,
              category: 'LOGISTICS',
              category_label: 'Pengiriman & Surat Jalan',
              title: `Pengiriman Armada: ${row.surat_jalan_number || `SJ-${row.so_number}`}`,
              description: `Barang diserahkan ke kurir ${row.courier_name || 'Armada Internal'} untuk dikirimkan ke alamat: ${row.customer_address || '-'}.`,
              actor_name: row.courier_name || 'Petugas Gudang',
              actor_role: 'LOGISTICS',
              ref_code: row.surat_jalan_number || `SJ-${row.so_number}`,
              document_type: 'SJ',
              document_number: row.surat_jalan_number || `SJ-${row.so_number}`,
              so_id: row.id,
              surat_jalan_number: row.surat_jalan_number,
              invoice_number: row.invoice_number,
              party_name: row.company_name || 'Customer B2B',
              grand_total: parseFloat(row.grand_total) || 0,
              items: items || [],
            });
          }

          // Event 3: POD Completed (Customer Signed & Photo taken)
          if (row.received_photo || row.deliv_photo || row.received_signature || row.deliv_signature || row.status === 'DITERIMA' || row.status === 'DELIVERED') {
            allLogs.push({
              id: `log-so-pod-${row.id}`,
              timestamp: row.delivered_date || row.deliv_time || row.order_date,
              category: 'POD',
              category_label: 'Serah Terima & POD',
              title: `Serah Terima Barang Sukses (${row.so_number})`,
              description: `Barang telah diterima dan diverifikasi oleh ${row.received_by || row.deliv_recipient || row.customer_pic || 'PIC Customer'}. Bukti foto POD dan tanda tangan digital telah tercatat.`,
              actor_name: row.received_by || row.deliv_recipient || 'Customer PIC',
              actor_role: 'CUSTOMER',
              ref_code: row.so_number,
              document_type: 'SJ',
              document_number: row.surat_jalan_number || `SJ-${row.so_number}`,
              photo_url: row.received_photo || row.deliv_photo || null,
              signature_url: row.received_signature || row.deliv_signature || null,
              so_id: row.id,
              surat_jalan_number: row.surat_jalan_number,
              invoice_number: row.invoice_number,
              party_name: row.company_name || 'Customer B2B',
              grand_total: parseFloat(row.grand_total) || 0,
              items: items || [],
            });
          }

          // Event 4: Invoice
          if (row.invoice_number || row.status === 'DITERIMA') {
            allLogs.push({
              id: `log-so-inv-${row.id}`,
              timestamp: row.delivered_date || row.order_date,
              category: 'FINANCE',
              category_label: 'Keuangan & Invoice',
              title: `Penerbitan Invoice ${row.invoice_number || `INV-${row.so_number}`}`,
              description: `Invoice tagihan senilai Rp ${Number(row.grand_total || 0).toLocaleString('id-ID')} untuk ${row.company_name || 'Customer B2B'}. Status: ${row.invoice_status || 'UNPAID'}.`,
              actor_name: 'Tim Keuangan Artaroma',
              actor_role: 'FINANCE',
              ref_code: row.invoice_number || `INV-${row.so_number}`,
              document_type: 'INV',
              document_number: row.invoice_number || `INV-${row.so_number}`,
              so_id: row.id,
              surat_jalan_number: row.surat_jalan_number,
              invoice_number: row.invoice_number,
              party_name: row.company_name || 'Customer B2B',
              grand_total: parseFloat(row.grand_total) || 0,
              items: items || [],
            });
          }

          // Event 5: Cancelled
          if (row.status === 'CANCELLED') {
            allLogs.push({
              id: `log-so-cancel-${row.id}`,
              timestamp: row.cancelled_at || row.order_date,
              category: 'CANCELLED',
              category_label: 'Pembatalan Pesanan',
              title: `Pembatalan Pesanan ${row.so_number}`,
              description: `Pesanan dibatalkan. Alasan: ${row.cancellation_reason || 'Dibatalkan oleh Admin'}. Stok yang terpotong telah direfund ke gudang.`,
              actor_name: 'Tim Admin / Keuangan',
              actor_role: 'ADMIN',
              ref_code: row.so_number,
              document_type: 'SO',
              document_number: row.so_number,
              so_id: row.id,
              party_name: row.company_name || 'Customer B2B',
              grand_total: parseFloat(row.grand_total) || 0,
              items: items || [],
            });
          }
        }
      }
    } catch (e: any) {
      console.warn('SO logs query failed:', e.message);
    }

    // 4. Generate Log Events from Stock Opname History
    try {
      const opnameRows: any[] = await executeQuery(
        'SELECT * FROM stock_opname_history ORDER BY opname_date DESC LIMIT 50'
      );
      if (opnameRows && opnameRows.length > 0) {
        for (const row of opnameRows) {
          allLogs.push({
            id: `log-opname-${row.id}`,
            timestamp: row.opname_date,
            category: 'WAREHOUSE',
            category_label: 'Audit Stok & Opname',
            title: `Audit Stok Opname: ${row.product_name || 'Varian Produk'}`,
            description: `Batch ${row.batch_number || '-'}. Selisih: ${row.difference_kg > 0 ? '+' : ''}${row.difference_kg} Kg. Fisik: ${row.physical_qty_kg} Kg (Sistem: ${row.system_qty_kg} Kg). Alasan: ${row.reason || 'Pemeriksaan rutin'}.`,
            actor_name: row.adjusted_by || 'Petugas Gudang',
            actor_role: 'WAREHOUSE',
            ref_code: `OPN-${row.batch_number || row.id}`,
            document_type: null,
            document_number: null,
          });
        }
      }
    } catch (e: any) {
      console.warn('Opname logs query failed:', e.message);
    }

    // Sort chronologically (Newest first)
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply category filter
    let filtered = allLogs;
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter((l) => l.category === categoryFilter);
    }

    // Apply date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((l) => {
        if (!l.timestamp) return false;
        try {
          const dStr = new Date(l.timestamp).toISOString().split('T')[0];
          if (startDate && dStr < startDate) return false;
          if (endDate && dStr > endDate) return false;
          return true;
        } catch {
          return true;
        }
      });
    }

    // Apply text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          (l.actor_name && l.actor_name.toLowerCase().includes(q)) ||
          (l.ref_code && l.ref_code.toLowerCase().includes(q)) ||
          (l.party_name && l.party_name.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      count: filtered.length,
      data: filtered,
      stats: {
        total_logs: allLogs.length,
        sales_logs: allLogs.filter((l) => l.category === 'SALES').length,
        pod_logs: allLogs.filter((l) => l.category === 'POD').length,
        finance_logs: allLogs.filter((l) => l.category === 'FINANCE').length,
        procurement_logs: allLogs.filter((l) => l.category === 'PROCUREMENT').length,
        warehouse_logs: allLogs.filter((l) => l.category === 'WAREHOUSE').length,
        manual_logs: allLogs.filter((l) => l.category === 'CATATAN_MANUAL').length,
      },
    });
  } catch (error: any) {
    console.error('Failed to get logbook events:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Add a new manual logbook entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      category,
      actor_name,
      actor_role,
      reference_id,
      document_type,
      document_number,
      photo_url,
      signature_url,
    } = body;

    if (!title || !description) {
      return NextResponse.json(
        { success: false, message: 'Judul dan rincian catatan log book wajib diisi' },
        { status: 400 }
      );
    }

    const logId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();

    await executeQuery(
      `INSERT INTO operational_logs 
       (id, log_date, category, title, description, actor_name, actor_role, reference_id, document_type, document_number, photo_url, signature_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        now,
        category || 'CATATAN_MANUAL',
        title,
        description,
        actor_name || 'Admin',
        actor_role || 'ADMIN',
        reference_id || null,
        document_type || null,
        document_number || null,
        photo_url || null,
        signature_url || null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Catatan Log Book berhasil disimpan ke database.',
      data: { id: logId, title, log_date: now },
    });
  } catch (error: any) {
    console.error('Failed to create manual logbook entry:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
