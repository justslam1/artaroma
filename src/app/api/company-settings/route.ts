import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyApiAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const rows = await executeQuery('SELECT key_name, value_text FROM company_settings');
    const settings: Record<string, string> = {};
    
    // Map rows to a simple key-value object
    if (Array.isArray(rows)) {
      rows.forEach((row: any) => {
        settings[row.key_name] = row.value_text;
      });
    }

    // Default fallbacks in case DB query was successful but returned empty
    const responseData = {
      company_name: settings.company_name || 'PT Artaroma Jayatama',
      company_tagline: settings.company_tagline || 'B2B Fragrance Oil Supplier & Management Hub',
      warehouse_address: settings.warehouse_address || 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272',
      logistics_pic: settings.logistics_pic || 'Tim Gudang FEFO Engine',
      delivery_schedule_rule: settings.delivery_schedule_rule || 'Max 7 Hari setelah PO diterbitkan',
      bank_bca: settings.bank_bca || '882-019-3881',
      bank_mandiri: settings.bank_mandiri || '156-00-1928374-1',

      // New finance settings keys
      bank_accounts: settings.bank_accounts ? JSON.parse(settings.bank_accounts) : [
        { bank: 'Bank Central Asia (BCA)', no: '882-019-3881', atas_nama: 'PT Artaroma Jayatama', jenis: 'Rekening Operasional', badge: 'bg-blue-100 text-blue-800' },
        { bank: 'Bank Mandiri', no: '156-00-1928374-1', atas_nama: 'PT Artaroma Jayatama', jenis: 'Rekening Giro Bisnis', badge: 'bg-yellow-100 text-yellow-800' },
        { bank: 'Bank BNI', no: '009-445-8876', atas_nama: 'PT Artaroma Jayatama', jenis: 'Rekening Cadangan', badge: 'bg-orange-100 text-orange-800' },
      ],
      payment_settings: settings.payment_settings ? JSON.parse(settings.payment_settings) : {
        top_payable: '30 Hari',
        top_receivable: '30 Hari',
        late_fee: '1.5%',
        currency: 'IDR (Rupiah Indonesia)',
        ppn: '11%'
      },
      tax_documents: settings.tax_documents ? JSON.parse(settings.tax_documents) : {
        npwp: '01.987.654.3-041.000',
        nppkp: '01.987.654.3-041.000',
        nib: '1234567890123',
        legal_name: 'PT Artaroma Jayatama',
        address: 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272'
      }
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyApiAuth(req, ['Master Data']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();

    for (const [key, val] of Object.entries(body)) {
      if (val !== undefined && val !== null) {
        await executeQuery(
          `INSERT INTO company_settings (key_name, value_text) 
           VALUES (?, ?) 
           ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)`,
          [key, typeof val === 'object' ? JSON.stringify(val) : String(val)]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Company settings updated successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
