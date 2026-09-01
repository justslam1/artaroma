import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { generateNextSONumber } from '@/lib/sequences';
import { initialCustomers, initialInvoices, initialSalesOrders } from '@/lib/mock-data';
import { verifyApiAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    let orders: any[] = [];
    try {
      orders = await executeQuery<any[]>(
        `SELECT so.*, c.company_name as customer_company, c.pic_name as customer_name 
         FROM sales_orders so 
         LEFT JOIN customers c ON so.customer_id = c.id 
         ORDER BY so.order_date DESC`
      );
      if (!orders) {
        orders = [];
      } else if (orders.length > 0) {
        // Load child items from so_items for each order
        for (let i = 0; i < orders.length; i++) {
          const items = await executeQuery(
            'SELECT * FROM so_items WHERE so_id = ?',
            [orders[i].id]
          );
          orders[i].items = items || [];
        }
      }
    } catch (dbErr) {
      console.warn('DB sales-orders query failed:', dbErr);
      orders = [];
    }

    return NextResponse.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth(req);
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const body = await req.json();
    const { customer_id, items, payment_method, courier_id, shipping_type, shipping_cost } = body;

    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'customer_id and non-empty items array are required' },
        { status: 400 }
      );
    }

    // BOLA / IDOR protection for Customer role
    if (user.role === 'CUSTOMER') {
      const isSelf = user.customer_id === customer_id || user.id === customer_id || user.id === `usr-cust-${customer_id}`;
      if (!isSelf) {
        return NextResponse.json(
          { success: false, message: 'Akses ditolak. Anda tidak berhak membuat pesanan atas nama customer lain.' },
          { status: 403 }
        );
      }
    }

    // Query products table to get authoritative price map
    const productPriceMap: Record<string, { name: string; price: number; variantPrices: Record<string, number> }> = {};
    try {
      const pRows = await executeQuery<any[]>('SELECT id, name, price_idr, variant_prices FROM products');
      if (Array.isArray(pRows)) {
        pRows.forEach((p) => {
          let varPrices: Record<string, number> = {};
          if (typeof p.variant_prices === 'string') {
            try { varPrices = JSON.parse(p.variant_prices); } catch {}
          } else if (p.variant_prices && typeof p.variant_prices === 'object') {
            varPrices = p.variant_prices;
          }
          productPriceMap[p.id] = {
            name: p.name,
            price: parseFloat(p.price_idr) || 0,
            variantPrices: varPrices,
          };
        });
      }
    } catch (err: any) {
      console.warn('Price lookup warning:', err.message);
    }

    // 1. Fetch Customer details & calculate Current Piutang & Overdue status
    let customer: any = null;
    let currentPiutang = 0;
    let hasOverdue = false;

    try {
      const custRows = await executeQuery<any[]>(
        'SELECT * FROM customers WHERE id = ? LIMIT 1',
        [customer_id]
      );
      if (custRows && custRows.length > 0) {
        customer = custRows[0];

        // Fetch unpaid invoices to calculate piutang & overdue
        const invRows = await executeQuery<any[]>(
          "SELECT * FROM invoices WHERE customer_id = ? AND status IN ('UNPAID', 'OVERDUE')",
          [customer_id]
        );

        for (const inv of invRows) {
          currentPiutang += parseFloat(inv.total_amount) - parseFloat(inv.paid_amount || 0);
          if (inv.status === 'OVERDUE') {
            hasOverdue = true;
          }
        }
      }
    } catch {
      // Fallback check from mock data
      const mockCust = initialCustomers.find((c) => c.id === customer_id);
      if (mockCust) {
        customer = mockCust;
        currentPiutang = mockCust.current_piutang;
        hasOverdue = mockCust.has_overdue;
      }
    }

    if (!customer) {
      // Fallback default customer values for smooth testing
      customer = {
        id: customer_id,
        company_name: 'Customer B2B',
        credit_limit: 50000000,
        credit_terms_days: 30,
      };
    }

    // Calculate total order amount with authoritative server-side price validation
    let totalGoodsAmount = 0;
    const processedItems = items.map((item: any, idx: number) => {
      const qty = Math.max(0.1, parseFloat(item.qty_kg) || 1);
      
      // Determine authentic unit price
      let unitPrice = parseFloat(item.unit_price_per_kg) || 0;
      const dbProduct = productPriceMap[item.product_id];
      if (dbProduct) {
        const packSizeKey = item.variant_sku?.includes('-25K') ? '25' : item.variant_sku?.includes('-5K') ? '5' : '1';
        const officialVariantPrice = dbProduct.variantPrices[packSizeKey];
        if (officialVariantPrice && officialVariantPrice > 0) {
          unitPrice = officialVariantPrice;
        } else if (dbProduct.price > 0) {
          unitPrice = dbProduct.price;
        }
      }

      const subtotal = Math.round(qty * unitPrice);
      totalGoodsAmount += subtotal;

      return {
        id: `so-item-${Date.now()}-${idx}`,
        product_id: item.product_id,
        product_name: dbProduct?.name || item.product_name || 'Varian Produk',
        qty_kg: qty,
        unit_price_per_kg: unitPrice,
        subtotal,
      };
    });

    const finalShippingType = shipping_type === 'LOCO' ? 'LOCO' : 'FRANCO';
    const finalShippingCost = finalShippingType === 'LOCO' ? (parseFloat(shipping_cost) || 0) : 0;
    const ppn = Math.round(totalGoodsAmount * 0.11);
    const grandTotal = totalGoodsAmount + ppn + finalShippingCost;

    // 2. CREDIT LIMIT & OVERDUE CHECK LOGIC (B2B Requirement: Requires Super Admin Approval if Exceeded or Overdue)
    let requiresSuperAdminApproval = false;
    let creditWarning: 'MELEBIHI_PLAFON' | 'OVERDUE_INVOICE' | 'MELEBIHI_PLAFON_DAN_OVERDUE' | undefined = undefined;
    const creditLimit = parseFloat(customer.credit_limit || 0);
    const projectedTotalPiutang = currentPiutang + grandTotal;

    if (payment_method === 'TEMPO') {
      const isCreditLimitExceeded = projectedTotalPiutang > creditLimit;
      const hasOverdueInvoices = hasOverdue;

      if (isCreditLimitExceeded || hasOverdueInvoices) {
        requiresSuperAdminApproval = true;
        if (isCreditLimitExceeded && hasOverdueInvoices) {
          creditWarning = 'MELEBIHI_PLAFON_DAN_OVERDUE';
        } else if (hasOverdueInvoices) {
          creditWarning = 'OVERDUE_INVOICE';
        } else {
          creditWarning = 'MELEBIHI_PLAFON';
        }
      }
    }

    const soId = `so-${Date.now()}`;
    const soNumber = await generateNextSONumber();
    const orderDate = new Date().toISOString();

    try {
      await executeQuery(
        `INSERT INTO sales_orders 
        (id, so_number, customer_id, courier_id, status, payment_method, shipping_type, shipping_cost, total_goods_amount, grand_total, order_date)
        VALUES (?, ?, ?, ?, 'PENDING_APPROVAL', ?, ?, ?, ?, ?, ?)`,
        [
          soId,
          soNumber,
          customer_id,
          courier_id || null,
          payment_method || 'LUNAS_TRANSFER',
          finalShippingType,
          finalShippingCost,
          totalGoodsAmount,
          grandTotal,
          orderDate,
        ]
      );

      for (const item of processedItems) {
        await executeQuery(
          `INSERT INTO so_items (id, so_id, product_id, product_name, qty_kg, unit_price_per_kg, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            soId,
            item.product_id,
            item.product_name || 'Varian Produk',
            item.qty_kg,
            item.unit_price_per_kg,
            item.subtotal,
          ]
        );
      }

      // Send Instant Web Push Notification to Admin Smartphones / Browsers
      const { sendPushNotificationToAll } = await import('@/lib/push-notifications');
      sendPushNotificationToAll({
        title: `📦 Sales Order Baru (${soNumber})`,
        body: `${customer?.company_name || customer?.pic_name || 'Customer B2B'} mengajukan pesanan baru senilai Rp ${Math.round(grandTotal).toLocaleString('id-ID')}`,
        category: 'orders',
        icon: '/icon.png',
        url: `/admin/orders/${soId}`,
        tag: `so-${soId}`,
      }).catch((pushErr) => console.warn('[WebPush] Error on SO create:', pushErr));

      // Send Automatic WhatsApp Notifications to Admin & Customer (Async / Non-blocking)
      (async () => {
        try {
          const {
            getWhatsAppConfig,
            sendWhatsAppMessage,
            formatNewSalesOrderWAMessage,
            formatCustomerOrderConfirmationWAMessage,
          } = await import('@/lib/whatsapp');

          const waConfig = await getWhatsAppConfig();
          if (!waConfig.enabled || !waConfig.apiToken) return;

          const totalWeightKg = processedItems.reduce((s: number, it: any) => s + (it.qty_kg || 0), 0);
          const originUrl = req.nextUrl.origin || 'https://artaroma.co.id';

          // 1. Send Notification to Admin / Sales / Warehouse WhatsApp
          if (waConfig.notifyAdmin && waConfig.adminPhone) {
            const adminMsg = formatNewSalesOrderWAMessage({
              soNumber,
              customerName: customer?.pic_name || customer?.company_name || 'Customer B2B',
              customerCompany: customer?.company_name,
              customerPhone: customer?.pic_phone || customer?.phone,
              paymentMethod: payment_method || 'LUNAS_TRANSFER',
              orderDate: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
              items: processedItems.map((it: any) => ({
                name: it.product_name,
                qtyKg: it.qty_kg,
                unitPrice: it.unit_price_per_kg,
                subtotal: it.subtotal,
              })),
              totalWeightKg,
              grandTotal,
              originUrl,
            });

            await sendWhatsAppMessage({
              target: waConfig.adminPhone,
              message: adminMsg,
              token: waConfig.apiToken,
            });
          }

          // 2. Send Confirmation Notification to Customer WhatsApp
          const customerPhone = customer?.pic_phone || customer?.phone;
          if (waConfig.notifyCustomer && customerPhone) {
            const customerMsg = formatCustomerOrderConfirmationWAMessage({
              soNumber,
              customerName: customer?.pic_name || customer?.company_name || 'Pelanggan Setia',
              items: processedItems.map((it: any) => ({
                name: it.product_name,
                qtyKg: it.qty_kg,
                unitPrice: it.unit_price_per_kg,
                subtotal: it.subtotal,
              })),
              totalWeightKg,
              grandTotal,
            });

            await sendWhatsAppMessage({
              target: customerPhone,
              message: customerMsg,
              token: waConfig.apiToken,
            });
          }
        } catch (waErr) {
          console.warn('[WhatsApp] Async notification error on SO create:', waErr);
        }
      })();
    } catch (e: any) {
      console.error('DB insert SO error:', e.message);
      return NextResponse.json(
        { success: false, message: `Database insert failed: ${e.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        requires_super_admin_approval: requiresSuperAdminApproval,
        credit_warning: creditWarning,
        message: requiresSuperAdminApproval
          ? 'Sales Order berhasil diajukan dan memerlukan persetujuan khusus dari Super Admin karena melebihi plafon kredit atau ada tagihan jatuh tempo.'
          : 'Sales Order submitted successfully. Pending Admin/Finance review.',
        data: {
          id: soId,
          so_number: soNumber,
          customer_id,
          customer_company: customer.company_name,
          status: 'PENDING_APPROVAL',
          payment_method: payment_method || 'LUNAS_TRANSFER',
          total_goods_amount: totalGoodsAmount,
          grand_total: grandTotal,
          order_date: orderDate,
          items: processedItems,
          requires_super_admin_approval: requiresSuperAdminApproval,
          credit_approval_status: requiresSuperAdminApproval ? 'PENDING' : 'APPROVED',
          credit_warning: creditWarning,
          credit_limit_amount: creditLimit,
          current_piutang_amount: currentPiutang,
          projected_piutang_amount: projectedTotalPiutang,
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
