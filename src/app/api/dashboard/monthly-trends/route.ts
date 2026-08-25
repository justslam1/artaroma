import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monthsParam = parseInt(searchParams.get('months') || '12', 10);
    const monthsCount = isNaN(monthsParam) || monthsParam <= 0 ? 12 : Math.min(monthsParam, 24);

    // 1. Fetch Sales Orders with customer & items
    let salesOrders: any[] = [];
    try {
      const soRows = await executeQuery<any[]>(`
        SELECT 
          so.id,
          so.so_number,
          so.customer_id,
          so.status,
          so.payment_method,
          so.payment_status,
          so.total_goods_amount,
          so.grand_total,
          so.order_date,
          so.created_at,
          c.company_name as customer_name
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        WHERE so.status NOT IN ('DIBATALKAN', 'CANCELLED')
        ORDER BY COALESCE(so.order_date, so.created_at) ASC
      `);
      if (soRows) salesOrders = soRows;
    } catch (err) {
      console.warn('Failed to query sales_orders for monthly trends:', err);
    }

    // 1b. Fetch SO Items for product-level volume
    let soItems: any[] = [];
    try {
      const itemRows = await executeQuery<any[]>(`
        SELECT 
          si.id,
          si.so_id,
          si.product_id,
          si.product_name,
          si.qty_kg,
          si.unit_price_per_kg,
          si.subtotal,
          so.order_date,
          so.created_at
        FROM so_items si
        JOIN sales_orders so ON si.so_id = so.id
        WHERE so.status NOT IN ('DIBATALKAN', 'CANCELLED')
      `);
      if (itemRows) soItems = itemRows;
    } catch (err) {
      console.warn('Failed to query so_items for monthly trends:', err);
    }

    // 2. Fetch Purchase Orders with distributor
    let purchaseOrders: any[] = [];
    try {
      const poRows = await executeQuery<any[]>(`
        SELECT 
          po.id,
          po.po_number,
          po.distributor_id,
          po.status,
          po.payment_method,
          po.payment_status,
          po.total_amount,
          po.paid_amount,
          po.order_date,
          po.created_at,
          d.name as distributor_name
        FROM purchase_orders po
        LEFT JOIN distributors d ON po.distributor_id = d.id
        WHERE po.status NOT IN ('DIBATALKAN', 'CANCELLED')
        ORDER BY COALESCE(po.order_date, po.created_at) ASC
      `);
      if (poRows) purchaseOrders = poRows;
    } catch (err) {
      console.warn('Failed to query purchase_orders for monthly trends:', err);
    }

    // 2b. Fetch PO Items for volume
    let poItems: any[] = [];
    try {
      const poItemRows = await executeQuery<any[]>(`
        SELECT 
          pi.id,
          pi.po_id,
          pi.product_id,
          pi.product_name,
          pi.qty_ordered_kg,
          pi.cost_per_kg,
          pi.subtotal,
          po.order_date,
          po.created_at
        FROM po_items pi
        JOIN purchase_orders po ON pi.po_id = po.id
        WHERE po.status NOT IN ('DIBATALKAN', 'CANCELLED')
      `);
      if (poItemRows) poItems = poItemRows;
    } catch (err) {
      console.warn('Failed to query po_items for monthly trends:', err);
    }

    // 3. Generate Month Keys for the target range (e.g. 2025-09 to 2026-08)
    const monthKeys: string[] = [];
    const now = new Date();
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      monthKeys.push(`${yyyy}-${mm}`);
    }

    const formatMonthLabel = (key: string) => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    };

    // 4. AGGREGATE SALES ORDERS BY MONTH
    const salesByMonth = monthKeys.map((key, index) => {
      const ordersInMonth = salesOrders.filter((so) => {
        const orderDateStr = so.order_date || so.created_at;
        if (!orderDateStr) return false;
        const d = new Date(orderDateStr);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return k === key;
      });

      const itemsInMonth = soItems.filter((item) => {
        const itemDateStr = item.order_date || item.created_at;
        if (!itemDateStr) return false;
        const d = new Date(itemDateStr);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return k === key;
      });

      const totalOmset = ordersInMonth.reduce((sum, so) => sum + Number(so.grand_total || so.total_goods_amount || 0), 0);
      const totalVolumeKg = itemsInMonth.reduce((sum, item) => sum + Number(item.qty_kg || 0), 0);
      const totalOrders = ordersInMonth.length;
      const uniqueCustomers = new Set(ordersInMonth.map((o) => o.customer_id || o.customer_name).filter(Boolean)).size;

      // Product sales breakdown in this month
      const productBreakdown: Record<string, { name: string; volumeKg: number; revenue: number }> = {};
      itemsInMonth.forEach((it) => {
        const pName = it.product_name || 'Produk Lainnya';
        if (!productBreakdown[pName]) {
          productBreakdown[pName] = { name: pName, volumeKg: 0, revenue: 0 };
        }
        productBreakdown[pName].volumeKg += Number(it.qty_kg || 0);
        productBreakdown[pName].revenue += Number(it.subtotal || 0);
      });

      return {
        monthKey: key,
        monthLabel: formatMonthLabel(key),
        totalOmset,
        totalVolumeKg,
        totalOrders,
        uniqueCustomers,
        products: Object.values(productBreakdown),
      };
    });

    // Compute Growth MoM for sales
    const salesTrends = salesByMonth.map((item, idx) => {
      let growthPercent = 0;
      if (idx > 0 && salesByMonth[idx - 1].totalOmset > 0) {
        const prev = salesByMonth[idx - 1].totalOmset;
        growthPercent = Number((((item.totalOmset - prev) / prev) * 100).toFixed(1));
      }
      return {
        ...item,
        growthPercent,
      };
    });

    // 5. AGGREGATE PURCHASE ORDERS BY MONTH
    const poByMonth = monthKeys.map((key, index) => {
      const posInMonth = purchaseOrders.filter((po) => {
        const orderDateStr = po.order_date || po.created_at;
        if (!orderDateStr) return false;
        const d = new Date(orderDateStr);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return k === key;
      });

      const itemsInMonth = poItems.filter((item) => {
        const itemDateStr = item.order_date || item.created_at;
        if (!itemDateStr) return false;
        const d = new Date(itemDateStr);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return k === key;
      });

      const totalPOAmount = posInMonth.reduce((sum, po) => sum + Number(po.total_amount || 0), 0);
      const totalPaidAmount = posInMonth.reduce((sum, po) => sum + Number(po.paid_amount || 0), 0);
      const totalSisaHutang = Math.max(0, totalPOAmount - totalPaidAmount);
      const totalVolumeKg = itemsInMonth.reduce((sum, item) => sum + Number(item.qty_ordered_kg || 0), 0);
      const totalPOs = posInMonth.length;

      // Vendor spending breakdown in this month
      const vendorBreakdown: Record<string, { name: string; totalAmount: number; count: number }> = {};
      posInMonth.forEach((po) => {
        const vName = po.distributor_name || 'Suplier Lainnya';
        if (!vendorBreakdown[vName]) {
          vendorBreakdown[vName] = { name: vName, totalAmount: 0, count: 0 };
        }
        vendorBreakdown[vName].totalAmount += Number(po.total_amount || 0);
        vendorBreakdown[vName].count += 1;
      });

      return {
        monthKey: key,
        monthLabel: formatMonthLabel(key),
        totalPOAmount,
        totalPaidAmount,
        totalSisaHutang,
        totalVolumeKg,
        totalPOs,
        vendors: Object.values(vendorBreakdown),
      };
    });

    // 6. AGGREGATE CUSTOMER PURCHASING TRENDS
    const customerMap: Record<
      string,
      {
        id: string;
        name: string;
        monthlyTotals: Record<string, number>;
        totalSpent: number;
        totalOrders: number;
      }
    > = {};

    salesOrders.forEach((so) => {
      const cId = so.customer_id || 'unknown';
      const cName = so.customer_name || 'Customer Umum B2B';
      const orderDateStr = so.order_date || so.created_at;
      if (!orderDateStr) return;

      const d = new Date(orderDateStr);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const amount = Number(so.grand_total || so.total_goods_amount || 0);

      if (!customerMap[cId]) {
        customerMap[cId] = {
          id: cId,
          name: cName,
          monthlyTotals: {},
          totalSpent: 0,
          totalOrders: 0,
        };
      }

      customerMap[cId].monthlyTotals[mKey] = (customerMap[cId].monthlyTotals[mKey] || 0) + amount;
      customerMap[cId].totalSpent += amount;
      customerMap[cId].totalOrders += 1;
    });

    const customerTrends = Object.values(customerMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .map((c) => ({
        id: c.id,
        name: c.name,
        totalSpent: c.totalSpent,
        totalOrders: c.totalOrders,
        avgOrderValue: c.totalOrders > 0 ? Math.round(c.totalSpent / c.totalOrders) : 0,
        history: monthKeys.map((k) => ({
          monthKey: k,
          monthLabel: formatMonthLabel(k),
          amount: c.monthlyTotals[k] || 0,
        })),
      }));

    return NextResponse.json({
      success: true,
      data: {
        monthKeys,
        monthsCount,
        salesTrends,
        poTrends: poByMonth,
        customerTrends,
        summary: {
          totalLifetimeRevenue: salesTrends.reduce((sum, m) => sum + m.totalOmset, 0),
          totalLifetimePO: poByMonth.reduce((sum, m) => sum + m.totalPOAmount, 0),
          totalLifetimeSalesVolumeKg: salesTrends.reduce((sum, m) => sum + m.totalVolumeKg, 0),
          totalLifetimePOVolumeKg: poByMonth.reduce((sum, m) => sum + m.totalVolumeKg, 0),
        },
      },
    });
  } catch (err: any) {
    console.error('Error generating monthly trends:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
