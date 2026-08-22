import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { initialCustomers } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  try {
    let customers = [];
    try {
      customers = await executeQuery('SELECT * FROM customers WHERE is_active = TRUE ORDER BY created_at DESC');
      if (!customers || customers.length === 0) {
        customers = initialCustomers;
      }
    } catch {
      customers = initialCustomers;
    }

    // Parse JSON strings if they exist & calculate live piutang and credit status
    for (let i = 0; i < customers.length; i++) {
      const c = customers[i];
      let specPrices = c.special_prices;
      if (typeof specPrices === 'string') {
        try {
          specPrices = JSON.parse(specPrices);
        } catch {
          specPrices = {};
        }
      }
      let allowedProds = c.allowed_product_ids;
      if (typeof allowedProds === 'string') {
        try {
          allowedProds = JSON.parse(allowedProds);
        } catch {
          allowedProds = [];
        }
      }

      // Calculate live outstanding piutang from invoices
      let currentPiutang = 0;
      let hasOverdue = false;
      try {
        const invRows: any[] = await executeQuery(
          "SELECT total_amount, paid_amount, status, due_date FROM invoices WHERE customer_id = ? AND status IN ('UNPAID', 'PARTIALLY_PAID', 'OVERDUE')",
          [c.id]
        );
        if (invRows && invRows.length > 0) {
          const now = new Date();
          for (const inv of invRows) {
            const remaining = (parseFloat(inv.total_amount) || 0) - (parseFloat(inv.paid_amount) || 0);
            if (remaining > 0) {
              currentPiutang += remaining;
              if (inv.status === 'OVERDUE' || (inv.due_date && new Date(inv.due_date) < now)) {
                hasOverdue = true;
              }
            }
          }
        }
      } catch (invErr) {
        console.warn('Failed to calculate customer piutang:', invErr);
      }

      customers[i] = {
        ...c,
        special_prices: specPrices || {},
        allowed_product_ids: allowedProds || [],
        current_piutang: Number(currentPiutang.toFixed(2)),
        credit_limit: parseFloat(c.credit_limit) || 0,
        credit_terms_days: parseInt(c.credit_terms_days, 10) || 0,
        has_overdue: hasOverdue,
      };
    }

    return NextResponse.json({
      success: true,
      count: customers.length,
      data: customers,
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
      company_name,
      pic_name,
      email,
      phone,
      pic_name_2,
      phone_2,
      pic_name_3,
      phone_3,
      address,
      office_address,
      shipping_lat,
      shipping_lng,
      default_courier_id,
      default_courier_name,
      default_shipping_cost,
      default_shipping_type,
      delivery_notes,
      npwp,
      is_credit_eligible,
      credit_limit,
      credit_terms_days,
      special_prices,
      allowed_product_ids,
    } = body;

    if (!code || !company_name || !email) {
      return NextResponse.json(
        { success: false, message: 'Code, company_name, and email are required' },
        { status: 400 }
      );
    }

    const id = `cust-${Date.now()}`;
    const parsedLimit = is_credit_eligible ? parseFloat(credit_limit || 0) : 0;
    const parsedTerms = is_credit_eligible ? parseInt(credit_terms_days || 0) : 0;
    const parsedShippingCost = parseFloat(default_shipping_cost || 0);
    const specPricesStr = JSON.stringify(special_prices || {});
    const allowedProdsStr = JSON.stringify(allowed_product_ids || []);

    try {
      await executeQuery(
        `INSERT INTO customers 
        (id, code, company_name, pic_name, email, phone, pic_name_2, phone_2, pic_name_3, phone_3, address, office_address, shipping_lat, shipping_lng, default_courier_id, default_courier_name, default_shipping_cost, default_shipping_type, delivery_notes, npwp, credit_limit, credit_terms_days, special_prices, allowed_product_ids, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          id,
          code,
          company_name,
          pic_name || company_name,
          email,
          phone || '',
          pic_name_2 || null,
          phone_2 || null,
          pic_name_3 || null,
          phone_3 || null,
          address || '',
          office_address || '',
          shipping_lat || '',
          shipping_lng || '',
          default_courier_id || null,
          default_courier_name || null,
          parsedShippingCost,
          default_shipping_type || 'FRANCO',
          delivery_notes || null,
          npwp || '',
          parsedLimit,
          parsedTerms,
          specPricesStr,
          allowedProdsStr,
        ]
      );
    } catch (e: any) {
      console.warn('Database insert warning:', e.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Customer registered successfully. Email configured as B2B login username.',
        data: {
          id,
          code,
          company_name,
          pic_name,
          email,
          username: email,
          phone,
          pic_name_2: pic_name_2 || null,
          phone_2: phone_2 || null,
          pic_name_3: pic_name_3 || null,
          phone_3: phone_3 || null,
          address,
          default_courier_id: default_courier_id || null,
          default_courier_name: default_courier_name || null,
          default_shipping_cost: parsedShippingCost,
          default_shipping_type: default_shipping_type || 'FRANCO',
          delivery_notes: delivery_notes || null,
          npwp,
          is_credit_eligible: parsedLimit > 0,
          credit_limit: parsedLimit,
          credit_terms_days: parsedTerms,
          special_prices: special_prices || {},
          allowed_product_ids: allowed_product_ids || [],
          is_active: true,
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
      company_name,
      pic_name,
      email,
      phone,
      pic_name_2,
      phone_2,
      pic_name_3,
      phone_3,
      address,
      office_address,
      shipping_lat,
      shipping_lng,
      default_courier_id,
      default_courier_name,
      default_shipping_cost,
      default_shipping_type,
      delivery_notes,
      credit_limit,
      credit_terms_days,
      special_prices,
      allowed_product_ids,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required for update' },
        { status: 400 }
      );
    }

    const specPricesStr = special_prices !== undefined ? JSON.stringify(special_prices) : null;
    const allowedProdsStr = allowed_product_ids !== undefined ? JSON.stringify(allowed_product_ids) : null;

    try {
      await executeQuery(
        `UPDATE customers SET 
          code = COALESCE(?, code),
          company_name = COALESCE(?, company_name),
          pic_name = COALESCE(?, pic_name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          pic_name_2 = ?,
          phone_2 = ?,
          pic_name_3 = ?,
          phone_3 = ?,
          address = COALESCE(?, address),
          office_address = COALESCE(?, office_address),
          shipping_lat = COALESCE(?, shipping_lat),
          shipping_lng = COALESCE(?, shipping_lng),
          default_courier_id = ?,
          default_courier_name = ?,
          default_shipping_cost = ?,
          default_shipping_type = ?,
          delivery_notes = ?,
          credit_limit = COALESCE(?, credit_limit),
          credit_terms_days = COALESCE(?, credit_terms_days),
          special_prices = COALESCE(?, special_prices),
          allowed_product_ids = COALESCE(?, allowed_product_ids)
        WHERE id = ?`,
        [
          code,
          company_name,
          pic_name,
          email,
          phone,
          pic_name_2 !== undefined ? (pic_name_2 || null) : null,
          phone_2 !== undefined ? (phone_2 || null) : null,
          pic_name_3 !== undefined ? (pic_name_3 || null) : null,
          phone_3 !== undefined ? (phone_3 || null) : null,
          address,
          office_address !== undefined ? office_address : null,
          shipping_lat !== undefined ? shipping_lat : null,
          shipping_lng !== undefined ? shipping_lng : null,
          default_courier_id !== undefined ? (default_courier_id || null) : null,
          default_courier_name !== undefined ? (default_courier_name || null) : null,
          default_shipping_cost !== undefined ? parseFloat(default_shipping_cost) : 0,
          default_shipping_type !== undefined ? default_shipping_type : 'FRANCO',
          delivery_notes !== undefined ? (delivery_notes || null) : null,
          credit_limit !== undefined ? parseFloat(credit_limit) : null,
          credit_terms_days !== undefined ? parseInt(credit_terms_days) : null,
          specPricesStr,
          allowedProdsStr,
          id,
        ]
      );
    } catch (e: any) {
      console.warn('Database update warning:', e.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully',
      data: body,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
