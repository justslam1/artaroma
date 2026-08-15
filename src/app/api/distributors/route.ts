export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { initialDistributors } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  try {
    let distributors = [];
    try {
      distributors = await executeQuery('SELECT * FROM distributors ORDER BY name ASC');
      if (!distributors || distributors.length === 0) {
        distributors = initialDistributors;
      } else {
        distributors = distributors.map((d: any) => {
          let ids = d.supplied_product_ids;
          if (typeof ids === 'string') {
            try {
              ids = JSON.parse(ids);
            } catch {
              ids = [];
            }
          }
          return {
            ...d,
            supplied_product_ids: Array.isArray(ids) ? ids : [],
          };
        });
      }
    } catch (e: any) {
      console.warn('Database query distributors fallback:', e.message);
      distributors = initialDistributors;
    }

    return NextResponse.json({
      success: true,
      count: distributors.length,
      data: distributors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      name,
      contact_name,
      email,
      phone,
      address,
      top_payable_days,
      bank_account,
      npwp,
      notes,
      supplied_product_ids,
    } = body;

    if (!code || !name) {
      return NextResponse.json(
        { success: false, message: 'Code and Name are required' },
        { status: 400 }
      );
    }

    const id = `dist-${Date.now()}`;
    const pidsJson = supplied_product_ids ? JSON.stringify(supplied_product_ids) : null;

    try {
      await executeQuery(
        `INSERT INTO distributors 
        (id, code, name, contact_name, email, phone, address, top_payable_days, bank_account, npwp, notes, supplied_product_ids)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          code,
          name,
          contact_name || '',
          email || '',
          phone || '',
          address || '',
          top_payable_days ? parseInt(top_payable_days) : 30,
          bank_account || '',
          npwp || '',
          notes || '',
          pidsJson,
        ]
      );
    } catch (e: any) {
      console.warn('Database insert distributor warning:', e.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Distributor created successfully',
        data: {
          id,
          code,
          name,
          contact_name,
          email,
          phone,
          address,
          top_payable_days,
          bank_account,
          npwp,
          notes,
          supplied_product_ids: supplied_product_ids || [],
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      code,
      name,
      contact_name,
      email,
      phone,
      address,
      top_payable_days,
      bank_account,
      npwp,
      notes,
      supplied_product_ids,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required for update' },
        { status: 400 }
      );
    }

    const pidsJson = supplied_product_ids ? JSON.stringify(supplied_product_ids) : null;

    try {
      await executeQuery(
        `UPDATE distributors SET 
          code = COALESCE(?, code),
          name = COALESCE(?, name),
          contact_name = COALESCE(?, contact_name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          top_payable_days = COALESCE(?, top_payable_days),
          bank_account = COALESCE(?, bank_account),
          npwp = COALESCE(?, npwp),
          notes = COALESCE(?, notes),
          supplied_product_ids = COALESCE(?, supplied_product_ids)
        WHERE id = ?`,
        [
          code,
          name,
          contact_name,
          email,
          phone,
          address,
          top_payable_days ? parseInt(top_payable_days) : null,
          bank_account,
          npwp,
          notes,
          pidsJson,
          id,
        ]
      );
    } catch (e: any) {
      console.warn('Database update distributor warning:', e.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Distributor updated successfully',
      data: body,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required for delete' },
        { status: 400 }
      );
    }

    try {
      await executeQuery('DELETE FROM distributors WHERE id = ?', [id]);
    } catch (e: any) {
      console.warn('Database delete distributor warning:', e.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Distributor deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
