'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import {
  initialSalesOrders,
  initialInvoices,
  initialProducts,
  initialCouriers,
  initialCustomers,
} from '@/lib/mock-data';
import { POPDFModal } from '@/components/common/po-pdf-modal';
import { SalesOrderPDFModal } from '@/components/common/sales-order-pdf-modal';
import { InvoicePDFModal } from '@/components/common/invoice-pdf-modal';
import { SuratJalanPDFModal } from '@/components/common/surat-jalan-pdf-modal';
import { PrintLabelModal } from '@/components/common/print-label-modal';
import { PrintShippingAddressModal } from '@/components/common/print-shipping-address-modal';
import { SalesOrder, Invoice, PurchaseOrder, Customer } from '@/lib/types';
import { formatIDR, formatKg } from '@/lib/utils';
import {
  getStoredOrders,
  getStoredInvoices,
  saveStoredOrders,
  saveStoredInvoices,
  updateSalesOrderStatus,
} from '@/lib/order-store';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  Truck,
  Layers,
  FileCheck,
  Edit3,
  Check,
  PackageCheck,
  UserCheck,
  Plus,
  Trash2,
  AlertTriangle,
  Tag,
  MapPin,
  CheckCircle,
  XCircle,
  Sparkles,
  FileSpreadsheet,
  Upload,
  CreditCard,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { exportToXLSX } from '@/lib/export-excel';
import { canUserExportXLSX } from '@/lib/auth';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = (params?.id as string) || 'so-101';

  // Current user for permissions
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch((err) => console.warn('Failed to load user info in SO detail:', err));
  }, []);

  // State
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isPOPDFOpen, setIsPOPDFOpen] = useState(false);
  const [isSalesOrderPDFOpen, setIsSalesOrderPDFOpen] = useState(false);
  const [isInvoicePDFOpen, setIsInvoicePDFOpen] = useState(false);
  const [isSuratJalanPDFOpen, setIsSuratJalanPDFOpen] = useState(false);
  const [selectedSuratJalanTrip, setSelectedSuratJalanTrip] = useState<number | undefined>(undefined);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isShippingAddressModalOpen, setIsShippingAddressModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Master products and customers list fetched from API
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companyConfig, setCompanyConfig] = useState<any>({
    company_name: 'PT Artaroma Jayatama',
    warehouse_address: 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272',
    logistics_pic: 'Tim Gudang FEFO Engine',
  });

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setProducts(json.data);
        }
      })
      .catch((err) => console.error('Failed to load products:', err));

    fetch('/api/customers', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCustomers(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load customers:', err));

    fetch('/api/company-settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCompanyConfig(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load company-settings:', err));
  }, []);

  // Flat list of all active variants across products
  const allVariantsList = React.useMemo(() => {
    const list: { id: string; name: string; product_id: string; packSize: number; stockKg: number; stockUnits: number; defaultPrice: number; sku: string }[] = [];
    const sourceProducts = products.length > 0 ? products : initialProducts;

    sourceProducts.forEach((p: any) => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v: any) => {
          const packSize = Number(v.pack_size_kg || 25);
          const stockKg = p.variant_stocks?.[String(packSize)] ?? (v.stock_kg || 0);
          const stockUnits = Math.max(0, Math.round(stockKg / packSize));
          list.push({
            id: v.id,
            name: v.variant_name,
            product_id: p.id,
            packSize: packSize,
            stockKg: stockKg,
            stockUnits: stockUnits,
            defaultPrice: Number(v.selling_price_per_kg || p.selling_price_per_kg || 1500000),
            sku: v.variant_sku || p.sku,
          });
        });
      } else {
        const sizes = p.pack_sizes || [25, 5, 1];
        sizes.forEach((size: number) => {
          const stockKg = p.variant_stocks?.[String(size)] ?? 0;
          const stockUnits = Math.max(0, Math.round(stockKg / size));
          list.push({
            id: `${p.id}-${size}`,
            name: `${p.name} ${size}K`,
            product_id: p.id,
            packSize: size,
            stockKg: stockKg,
            stockUnits: stockUnits,
            defaultPrice: p.selling_price_per_kg || (size === 25 ? 1353000 : size === 5 ? 1090000 : 1100000),
            sku: `${p.sku}-${size}K`,
          });
        });
      }
    });
    return list;
  }, [products]);

  const syncState = () => {
    setSalesOrders(getStoredOrders());
    setInvoices(getStoredInvoices());
  };

  // On mount: try to fetch the specific SO from MySQL (authoritative), update localStorage
  useEffect(() => {
    // Initial sync from localStorage
    syncState();

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/sales-orders/${orderId}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success && json.data) {
          const freshOrder = {
            ...json.data,
            items: Array.isArray(json.data.items) ? json.data.items : [],
          };
          // Merge fresh order into localStorage
          const stored = getStoredOrders();
          const merged = stored.some((o) => o.id === freshOrder.id || o.so_number === freshOrder.so_number)
            ? stored.map((o) => (o.id === freshOrder.id || o.so_number === freshOrder.so_number ? freshOrder : o))
            : [freshOrder, ...stored];
          saveStoredOrders(merged, false);
          setSalesOrders(merged);
          setInvoices(getStoredInvoices());
          return;
        }
      } catch (err) {
        console.warn('Order detail: API fetch failed, using localStorage:', err);
      }
      // Fallback: use localStorage
      syncState();
    };

    fetchOrder();
    const handleUpdate = () => syncState();
    window.addEventListener('artaroma_orders_updated', handleUpdate);
    window.addEventListener('artaroma_invoices_updated', handleUpdate);
    return () => {
      window.removeEventListener('artaroma_orders_updated', handleUpdate);
      window.removeEventListener('artaroma_invoices_updated', handleUpdate);
    };
  }, [orderId]);

  // Find target order
  const order =
    salesOrders.find((so) => so.id === orderId || so.so_number === orderId) ||
    salesOrders[0] ||
    initialSalesOrders[0];

  const invoice = invoices.find(
    (inv) =>
      inv.so_number === order.so_number ||
      inv.so_id === order.id ||
      (order.invoice_id && inv.id === order.invoice_id)
  );

  const handleExportSODetailXLSX = () => {
    if (!order) return;
    if (!canUserExportXLSX(currentUser)) {
      alert('Akses Ditolak: Akun Anda tidak memiliki hak akses modul "Ekspor Data (XLSX)". Silakan hubungi Super Admin.');
      return;
    }
    const data = (order.items || []).map((item, index) => ({
      'No': index + 1,
      'No SO': order.so_number,
      'Tanggal SO': order.order_date,
      'Nama Customer': order.customer_name,
      'Perusahaan': order.customer_company,
      'Deskripsi Produk': item.product_name,
      'Qty (Kg)': item.qty_kg,
      'Harga Satuan / Kg (IDR)': item.unit_price_per_kg || 0,
      'Subtotal (IDR)': item.subtotal || 0,
    }));
    exportToXLSX(data, {
      fileName: `SO_${order.so_number}_Items_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: `Rincian SO ${order.so_number}`,
    });
  };

  // Local state for items in DIKONFIRMASI editing
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [addVariantId, setAddVariantId] = useState('');
  const [addQtyKg, setAddQtyKg] = useState<number>(0);
  const [addPricePerKg, setAddPricePerKg] = useState<number>(0);

  // Local state for batch selection in PROSES_GUDANG stage
  const [selectedBatches, setSelectedBatches] = useState<Record<string, string>>({});
  const [batchQuantities, setBatchQuantities] = useState<Record<string, number>>({});
  const [batches, setBatches] = useState<any[]>([]);

  // Multi-batch lot allocations per item: multiBatchInputs[itemId][batchId] = qty_kg
  const [multiBatchInputs, setMultiBatchInputs] = useState<Record<string, Record<string, number>>>({});

  const handleBatchQtyChange = (itemId: string, batchId: string, val: string, maxStock: number) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setMultiBatchInputs((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [batchId]: num,
      },
    }));
  };

  const autoAllocateFEFOForItem = (item: any, matchedBatches: any[]) => {
    let remaining = Number(item.qty_kg) || 0;
    const newAllocation: Record<string, number> = {};
    for (const b of matchedBatches) {
      if (remaining <= 0) break;
      const avail = Number(b.current_qty_kg) || 0;
      const take = Math.min(avail, remaining);
      if (take > 0) {
        newAllocation[b.id] = take;
        remaining -= take;
      }
    }
    setMultiBatchInputs((prev) => ({
      ...prev,
      [item.id]: newAllocation,
    }));
  };

  const validateMultiBatchSelection = () => {
    if (!order || !order.items) return false;
    for (const item of order.items) {
      const itemAlloc = multiBatchInputs[item.id] || {};
      const totalAlloc = Object.values(itemAlloc).reduce((sum, q) => sum + (Number(q) || 0), 0);
      const targetQty = Number(item.qty_kg) || 0;

      if (totalAlloc === 0) {
        alert(`Harap isi kuantitas lot batch untuk varian '${getProductName(item)}'! (Dibutuhkan: ${targetQty} Kg)`);
        return false;
      }

      if (totalAlloc !== targetQty) {
        alert(
          `Jumlah kuantitas lot yang diinput (${totalAlloc} Kg) harus sama dengan yang dibutuhkan (${targetQty} Kg) untuk varian '${getProductName(item)}'!`
        );
        return false;
      }
    }
    return true;
  };

  // Initialize batch quantities from order items
  useEffect(() => {
    if (order && order.items) {
      const initialQtys: Record<string, number> = {};
      const initialPrices: Record<string, number> = {};
      order.items.forEach((item) => {
        initialQtys[item.id] = item.qty_kg;
        const p = products.find((prod) => prod.id === item.product_id);
        initialPrices[item.id] = item.unit_price_per_kg || p?.selling_price_per_kg || 1500000;
      });
      setBatchQuantities(initialQtys);
      setItemConfirmedKgs(initialQtys);
      setItemPrices(initialPrices);
    }
  }, [order, products]);

  // Fetch batches list from MySQL database
  useEffect(() => {
    fetch('/api/stock-batches')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setBatches(json.data);
        }
      })
      .catch((err) => console.error('Failed to load batches:', err));
  }, []);

  // Fetch active couriers list from MySQL database
  const [courierList, setCourierList] = useState<any[]>(initialCouriers);
  useEffect(() => {
    fetch('/api/couriers')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCourierList(json.data);
        }
      })
      .catch((err) => console.error('Failed to load couriers:', err));
  }, []);

  // Local state for POD modal
  const [isPODModalOpen, setIsPODModalOpen] = useState(false);
  const [podReceivedBy, setPodReceivedBy] = useState('');
  const [podPhoto, setPodPhoto] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Support touch events
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    
    // Support mouse events
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b'; // slate-800
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const useDefaultSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    clearCanvas();
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0284c7'; // sky-600

    ctx.moveTo(50, 80);
    ctx.bezierCurveTo(70, 40, 100, 40, 120, 80);
    ctx.bezierCurveTo(140, 110, 160, 110, 180, 70);
    ctx.bezierCurveTo(200, 30, 220, 50, 240, 90);
    
    ctx.moveTo(40, 100);
    ctx.quadraticCurveTo(150, 130, 270, 95);
    ctx.stroke();
  };

  const handleOpenPODModal = () => {
    // Validate that each item has exact matching lot quantity
    if (!validateMultiBatchSelection()) return;

    // Set default recipient name
    setPodReceivedBy(order.customer_name || '');
    setPodPhoto('');
    setIsPODModalOpen(true);
  };

  const handleConfirmPOD = (receivedBy: string, photo: string, signature: string) => {
    if (!receivedBy.trim()) {
      alert('Nama penerima wajib diisi!');
      return;
    }
    if (!photo) {
      alert('Bukti foto penerimaan wajib diambil/diunggah!');
      return;
    }
    if (!signature) {
      alert('Tanda tangan penerima wajib diisi!');
      return;
    }

    // Build updated items with precise multi-batch lot assignments
    const updatedItems = order.items.map((item) => {
      const itemAlloc = multiBatchInputs[item.id] || {};
      const allocatedBatches = Object.entries(itemAlloc)
        .filter(([_, q]) => Number(q) > 0)
        .map(([bId, q]) => {
          const bObj = batches.find((b) => b.id === bId || b.batch_number === bId);
          return {
            batch_number: bObj ? bObj.batch_number : bId,
            qty_taken_kg: Number(q),
          };
        });

      return {
        ...item,
        assigned_batches: allocatedBatches.length > 0 ? allocatedBatches : (item.assigned_batches || [{ batch_number: 'LOT-2026-FEFO', qty_taken_kg: item.qty_kg }]),
      };
    });

    // Deduct stock in database for all selected lots
    const batchUpdates: any[] = [];
    order.items.forEach((item) => {
      const itemAlloc = multiBatchInputs[item.id] || {};
      Object.entries(itemAlloc).forEach(([bId, q]) => {
        const qtyTaken = Number(q) || 0;
        if (qtyTaken > 0) {
          const batchObj = batches.find((b) => b.id === bId || b.batch_number === bId);
          if (batchObj) {
            const newQty = Math.max(0, Number(batchObj.current_qty_kg) - qtyTaken);
            batchUpdates.push({
              id: batchObj.id,
              current_qty_kg: newQty,
              notes: `Pengeluaran Sales Order ${order.so_number}`,
            });
          }
        }
      });
    });

    if (batchUpdates.length > 0) {
      fetch('/api/stock-batches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_updates: batchUpdates }),
      }).catch((err) => console.warn('Failed to update stock batches:', err));
    }

    updateSalesOrderStatus(order.id, 'DITERIMA', {
      items: updatedItems,
      received_by: receivedBy,
      received_photo: photo,
      received_signature: signature,
      delivered_date: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
    });

    setIsPODModalOpen(false);
  };

  // Local state for Courier Handover Modal
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [checkedCourierItems, setCheckedCourierItems] = useState<Record<string, boolean>>({});

  const handleOpenCourierModal = () => {
    // Validate that each item has exact matching lot quantity
    if (!validateMultiBatchSelection()) return;

    // Open modal
    setCheckedCourierItems({});
    setIsCourierModalOpen(true);
  };

  // Pre-populate multiBatchInputs when order and batches are loaded
  useEffect(() => {
    if (order && order.status === 'PROSES_GUDANG' && batches.length > 0 && order.items) {
      setMultiBatchInputs((prev) => {
        const next = { ...prev };
        let hasChanges = false;

        order.items.forEach((item) => {
          if (!next[item.id] || Object.keys(next[item.id]).length === 0) {
            next[item.id] = {};
            const resolvedName = getProductName(item);
            const match = resolvedName.match(/(\d+)K$/);
            const itemPackSize = match ? parseInt(match[1]) : null;

            const matchedBatches = batches
              .filter((b) => {
                const isSameProduct = b.product_id === item.product_id;
                const hasStock = Number(b.current_qty_kg) > 0 || (Array.isArray(item.assigned_batches) && item.assigned_batches.some((ab: any) => ab.batch_number === b.batch_number));
                if (!isSameProduct || !hasStock) return false;
                if (itemPackSize !== null) return b.pack_size_kg === itemPackSize;
                return true;
              })
              .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

            if (Array.isArray(item.assigned_batches) && item.assigned_batches.length > 0) {
              item.assigned_batches.forEach((ab: any) => {
                const b = batches.find((batch) => batch.batch_number === ab.batch_number);
                const bKey = b ? b.id : ab.batch_number;
                next[item.id][bKey] = Number(ab.qty_taken_kg) || 0;
              });
              hasChanges = true;
            } else if (matchedBatches.length > 0) {
              let remaining = Number(item.qty_kg) || 0;
              for (const b of matchedBatches) {
                if (remaining <= 0) break;
                const avail = Number(b.current_qty_kg) || 0;
                const take = Math.min(avail, remaining);
                if (take > 0) {
                  next[item.id][b.id] = take;
                  remaining -= take;
                }
              }
              hasChanges = true;
            }
          }
        });

        return hasChanges ? next : prev;
      });
    }
  }, [order, batches]);

  const getProductName = (item: any) => {
    if (item.product_name && item.product_name !== 'undefined') return item.product_name;
    const prod = products.find((p) => p.id === item.product_id);
    if (prod) {
      // Try to determine the variant pack size from item quantity
      let packSize = 25;
      if (item.qty_kg === 25 || item.qty_kg === 50 || item.qty_kg === 75) packSize = 25;
      else if (item.qty_kg === 5 || item.qty_kg === 10 || item.qty_kg === 15) packSize = 5;
      else if (item.qty_kg === 1 || item.qty_kg === 2 || item.qty_kg === 3) packSize = 1;
      return `${prod.name} ${packSize}K`;
    }
    return 'Varian Produk';
  };

  // Initialize editing items from order
  useEffect(() => {
    if (order && order.items) {
      setEditingItems(order.items);
    }
  }, [order]);

  const handleUpdateItemQty = (itemId: string, newQty: number) => {
    setEditingItems(
      editingItems.map((item) =>
        item.id === itemId
          ? { ...item, qty_kg: newQty, subtotal: newQty * (item.unit_price_per_kg || 1500000) }
          : item
      )
    );
  };

  const handleUpdateItemPrice = (itemId: string, newPrice: number) => {
    setEditingItems(
      editingItems.map((item) =>
        item.id === itemId
          ? { ...item, unit_price_per_kg: newPrice, subtotal: item.qty_kg * newPrice }
          : item
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setEditingItems(editingItems.filter((item) => item.id !== itemId));
  };

  const handleAddNewItem = () => {
    const selectedVar = allVariantsList.find((v) => v.id === addVariantId);
    if (!selectedVar) {
      alert('Pilih varian produk terlebih dahulu!');
      return;
    }
    if (addQtyKg <= 0) {
      alert('Kuantitas (Kg) harus lebih dari 0!');
      return;
    }
    const price = addPricePerKg > 0 ? addPricePerKg : selectedVar.defaultPrice;
    const newItem = {
      id: `so-item-${Date.now()}`,
      so_id: order.id,
      product_id: selectedVar.product_id,
      product_name: selectedVar.name,
      qty_kg: addQtyKg,
      unit_price_per_kg: price,
      subtotal: addQtyKg * price,
    };
    setEditingItems([...editingItems, newItem]);
    setAddVariantId('');
    setAddQtyKg(0);
    setAddPricePerKg(0);
  };

  const handleConfirmAndIssueSuratJalan = async (sjNumber: string, courierName: string) => {
    setIsApproving(true);
    try {
      // 1. Call server-side transactional FEFO approval API
      const res = await fetch(`/api/sales-orders/${order.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editingItems,
          shipping_type: shippingType,
          shipping_cost: shippingCost,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || 'Gagal menyetujui Sales Order di server.');
      }

      const approvalData = json.data;

      // 2. Calculate new totals from editing items
      let calculatedTotal = 0;
      editingItems.forEach((item) => {
        calculatedTotal += (item.unit_price_per_kg || 1500000) * item.qty_kg;
      });

      // 3. Map FEFO allocations from API response to our local order items structure
      const fefoAllocations = approvalData.fefo_allocations || [];
      const updatedItems = editingItems.map((item) => {
        // Find allocation for this specific so_item
        const allocs = fefoAllocations.filter((a: any) => a.so_item_id === item.id);
        return {
          ...item,
          assigned_batches: allocs.map((a: any) => ({
            batch_number: a.batch_number,
            qty_taken_kg: Number(a.qty_taken_kg) || 0,
          })),
        };
      });

      const finalInvoice = invoice
        ? {
            ...invoice,
            invoice_number: approvalData.invoice_number || invoice.invoice_number,
            total_amount: calculatedTotal,
            status: 'UNPAID' as const,
          }
        : {
            id: `inv-${Date.now()}`,
            invoice_number: approvalData.invoice_number || `INV-2026-07-${Math.floor(100 + Math.random() * 900)}`,
            so_id: order.id,
            so_number: order.so_number,
            customer_id: order.customer_id,
            customer_name: order.customer_company,
            status: 'UNPAID' as const,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: '2026-08-20',
            total_amount: calculatedTotal,
            paid_amount: 0,
          };

      // 4. Update parent order and local state with the exact details from server
      updateSalesOrderStatus(
        order.id,
        'PROSES_GUDANG',
        {
          total_goods_amount: calculatedTotal,
          grand_total: calculatedTotal,
          items: updatedItems,
          invoice_id: finalInvoice.id,
          courier_name: courierName || 'Rian Pratama',
          surat_jalan_number: sjNumber,
        },
        finalInvoice
      );

      alert(`Sales Order '${order.so_number}' berhasil dikirim ke gudang dengan alokasi FEFO otomatis dari database!`);
    } catch (err: any) {
      console.error(err);
      alert(`Gagal Melakukan Alokasi FEFO Server-Side:\n${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  // Interactive Form State for Admin Price Confirmation (DIAJUKAN step)
  const [itemPrices, setItemPrices] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    if (order && order.items) {
      order.items.forEach((item) => {
        const p = initialProducts.find((prod) => prod.id === item.product_id);
        map[item.id] = item.unit_price_per_kg || p?.selling_price_per_kg || 1500000;
      });
    }
    return map;
  });

  const [itemConfirmedKgs, setItemConfirmedKgs] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    if (order && order.items) {
      order.items.forEach((item) => {
        map[item.id] = item.original_qty_kg !== undefined ? item.original_qty_kg : item.qty_kg;
      });
    }
    return map;
  });

  const [shippingType, setShippingType] = useState<'FRANCO' | 'LOCO'>(() => {
    return (order as any)?.shipping_type || 'FRANCO';
  });
  const [shippingCost, setShippingCost] = useState<number>(() => {
    return (order as any)?.shipping_cost || 0;
  });

  useEffect(() => {
    if (order) {
      if ((order as any).shipping_type) setShippingType((order as any).shipping_type);
      if ((order as any).shipping_cost !== undefined) setShippingCost((order as any).shipping_cost);
    }
  }, [order?.shipping_type, order?.shipping_cost]);

  const [fulfillmentMode, setFulfillmentMode] = useState<'ADJUST_SO' | 'MULTI_TRIP'>('ADJUST_SO');

  // Payment proof URL state (synchronized from Customer upload or Admin upload)
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(() => {
    return invoice?.payment_proof_url || (order as any)?.payment_proof_url || null;
  });

  useEffect(() => {
    if (invoice?.payment_proof_url) {
      setPaymentProofUrl(invoice.payment_proof_url);
    } else if ((order as any)?.payment_proof_url) {
      setPaymentProofUrl((order as any).payment_proof_url);
    }
  }, [invoice?.payment_proof_url, (order as any)?.payment_proof_url]);

  const handleAdminProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result as string;
        setPaymentProofUrl(url);

        // Save immediately to local storage invoices & sales orders
        const currentInvs = getStoredInvoices();
        const updatedInvs = currentInvs.map((inv) =>
          inv.id === invoice?.id || inv.so_id === order.id
            ? { ...inv, payment_proof_url: url }
            : inv
        );
        saveStoredInvoices(updatedInvs);

        const currentOrders = getStoredOrders();
        const updatedOrders = currentOrders.map((o) =>
          o.id === order.id || o.so_number === order.so_number
            ? { ...o, payment_proof_url: url }
            : o
        );
        saveStoredOrders(updatedOrders, false);
        setInvoices(updatedInvs);
        setSalesOrders(updatedOrders);
      };
      reader.readAsDataURL(file);
    }
  };

  // Super Admin Approval Actions for Credit Limit Overrun or Overdue Invoices
  const handleApproveCreditOverride = () => {
    if (!confirm(`Apakah Anda yakin ingin menyetujui (ACC Override) pesanan '${order.so_number}' ini meskipun melebihi plafon / ada tagihan jatuh tempo?`)) return;

    const currentOrders = getStoredOrders();
    const updatedOrders = currentOrders.map((o) =>
      o.id === order.id || o.so_number === order.so_number
        ? {
            ...o,
            credit_approval_status: 'APPROVED' as const,
            credit_approval_by: currentUser?.name || currentUser?.email || 'Super Admin',
            credit_approval_date: new Date().toISOString(),
          }
        : o
    );
    saveStoredOrders(updatedOrders, false);
    setSalesOrders(updatedOrders);
    window.dispatchEvent(new Event('artaroma_orders_updated'));
    alert(`✅ Persetujuan Super Admin Berhasil Disimpan!\nPesanan '${order.so_number}' kini dapat diproses oleh tim Finance & Gudang.`);
  };

  const handleRejectCreditOrder = () => {
    const reason = prompt('Masukkan alasan penolakan pesanan ini:', 'Melebihi limit kredit/jatuh tempo dan tidak disetujui Super Admin.');
    if (reason === null) return;

    handleCancelOrder();
  };

  // Action 1: Admin Confirm Prices & Issue Invoice -> DIKONFIRMASI (With Multi-Trip or SO Adjustment Support)
  const handleConfirmPrices = () => {
    // 1. Validation: For items with confirmedQty > 0, check stock
    let totalConfirmedKg = 0;
    const trip1Items: any[] = [];
    const trip2Items: any[] = [];

    for (const item of order.items) {
      const prod = products.find((p) => p.id === item.product_id);
      const getPackSizeFromName = (name: string): number => {
        const clean = (name || '').toUpperCase().trim();
        if (clean.endsWith('25K')) return 25;
        if (clean.endsWith('5K')) return 5;
        if (clean.endsWith('1K')) return 1;
        return 25;
      };
      const sizeKg = getPackSizeFromName(item.product_name);
      const stockKg = prod?.variant_stocks?.[String(sizeKg)] ?? 0;
      const initialOrderedQty = item.original_qty_kg !== undefined ? item.original_qty_kg : item.qty_kg;
      const confirmedQty = itemConfirmedKgs[item.id] !== undefined ? itemConfirmedKgs[item.id] : initialOrderedQty;

      if (confirmedQty > initialOrderedQty) {
        alert(
          `Jumlah konfirmasi untuk '${item.product_name}' (${confirmedQty} Kg) tidak boleh melebihi pesanan awal customer (${initialOrderedQty} Kg)!`
        );
        return;
      }

      if (confirmedQty > 0) {
        totalConfirmedKg += confirmedQty;
        if (stockKg < confirmedQty) {
          alert(
            `Sisa stok tidak mencukupi untuk '${item.product_name}'!\n` +
            `• Kuantitas Dikonfirmasi: ${confirmedQty} Kg\n` +
            `• Sisa Stok Tersedia: ${stockKg} Kg\n\n` +
            `Kurangi jumlah konfirmasi sesuai stok tersedia, atau ubah menjadi 0 kg.`
          );
          return;
        }

        trip1Items.push({
          so_item_id: item.id,
          product_id: item.product_id,
          product_name: getProductName(item),
          qty_shipped_kg: confirmedQty,
        });
      }

      // Remaining unfulfilled quantity goes to Trip 2 (if Multi-Trip mode selected)
      const remainingQty = initialOrderedQty - confirmedQty;
      if (remainingQty > 0) {
        trip2Items.push({
          so_item_id: item.id,
          product_id: item.product_id,
          product_name: getProductName(item),
          qty_shipped_kg: remainingQty,
        });
      }
    }

    if (totalConfirmedKg === 0) {
      alert('Kuantitas yang dikonfirmasi tidak boleh 0 kg untuk semua item! Minimal 1 item harus dikirim. Jika tidak ada stok sama sekali, silakan batalkan pesanan.');
      return;
    }

    let calculatedGoodsTotal = 0;
    const updatedItems = order.items.map((item) => {
      const price = item.unit_price_per_kg || 1500000;
      const initialOrderedQty = item.original_qty_kg !== undefined ? item.original_qty_kg : item.qty_kg;
      const confirmedQty = itemConfirmedKgs[item.id] !== undefined ? itemConfirmedKgs[item.id] : initialOrderedQty;
      const subtotal = confirmedQty * price;
      calculatedGoodsTotal += subtotal;

      return {
        ...item,
        original_qty_kg: initialOrderedQty,
        qty_kg: confirmedQty,
        unit_price_per_kg: price,
        subtotal: subtotal,
      };
    });

    const finalShippingType = shippingType;
    const finalShippingCost = shippingType === 'FRANCO' ? 0 : Number(shippingCost || 0);
    const ppn = Math.round(calculatedGoodsTotal * 0.11);
    const grandTotal = calculatedGoodsTotal + ppn + finalShippingCost;

    const termsDays = Number(customer?.credit_terms_days || (order.payment_method === 'TEMPO' ? 30 : 0));
    const issueDateObj = new Date();
    const dueDateObj = new Date(issueDateObj.getTime() + termsDays * 86400000);
    const issueDateStr = issueDateObj.toISOString().split('T')[0];
    const dueDateStr = dueDateObj.toISOString().split('T')[0];

    const newInvNumber = `INV-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoice_number: newInvNumber,
      so_id: order.id,
      so_number: order.so_number,
      customer_id: order.customer_id,
      customer_name: order.customer_company,
      status: 'UNPAID',
      issue_date: issueDateStr,
      due_date: dueDateStr,
      shipping_type: finalShippingType,
      shipping_cost: finalShippingCost,
      total_amount: grandTotal,
      paid_amount: 0,
      faktur_pajak_file_url: '/dummy-faktur-pajak.pdf',
    };

    // Construct Multi-Trip Shipments if multi-trip mode is selected and there are remaining items
    let shipments: any[] | undefined = undefined;
    let finalItemsToSave = updatedItems;

    const hasMultiTripSplit = trip2Items.length > 0;

    if (hasMultiTripSplit && fulfillmentMode === 'MULTI_TRIP') {
      shipments = [
        {
          id: `trip-1-${Date.now()}`,
          trip_number: 1,
          surat_jalan_number: `SJ-ART-2026-${order.so_number.split('-').pop()}-T1`,
          shipment_date: new Date().toISOString().split('T')[0],
          status: 'DIKONFIRMASI',
          items: trip1Items,
          notes: 'Pengiriman Trip 1 (Stok Siap Kirim)',
        },
        {
          id: `trip-2-${Date.now()}`,
          trip_number: 2,
          surat_jalan_number: `SJ-ART-2026-${order.so_number.split('-').pop()}-T2`,
          shipment_date: '-',
          status: 'MENUNGGU_GUDANG',
          items: trip2Items,
          notes: 'Pengiriman Multi-Trip Selanjutnya (Menunggu ketersediaan stok)',
        },
      ];
    } else if (hasMultiTripSplit && fulfillmentMode === 'ADJUST_SO') {
      // Menyesuaikan Pesanan SO: Filter SO items to only those with confirmedQty > 0
      finalItemsToSave = updatedItems.filter((it) => it.qty_kg > 0);
      shipments = undefined;
    }

    updateSalesOrderStatus(
      order.id,
      'DIKONFIRMASI',
      {
        total_goods_amount: calculatedGoodsTotal,
        grand_total: grandTotal,
        shipping_type: finalShippingType,
        shipping_cost: finalShippingCost,
        items: finalItemsToSave,
        invoice_id: newInvoice.id,
        surat_jalan_number: shipments ? shipments[0].surat_jalan_number : (order.surat_jalan_number || `SJ-ART-2026-${order.so_number.split('-').pop()}`),
        shipments: shipments,
      },
      newInvoice
    );

    if (hasMultiTripSplit && fulfillmentMode === 'MULTI_TRIP' && shipments && shipments.length > 1) {
      alert(`Pesanan '${order.so_number}' berhasil dikonfirmasi dengan Pengiriman Multi-Trip!\n• Trip 1: Siap diproses gudang (${trip1Items.reduce((s, it) => s + it.qty_shipped_kg, 0)} kg)\n• Trip 2: Otomatis dialokasikan untuk sisa pesanan (${trip2Items.reduce((s, it) => s + it.qty_shipped_kg, 0)} kg)`);
    } else if (hasMultiTripSplit && fulfillmentMode === 'ADJUST_SO') {
      alert(`Pesanan '${order.so_number}' berhasil disesuaikan secara final menjadi ${totalConfirmedKg} kg dan Invoice resmi telah diterbitkan!`);
    } else {
      alert(`Pesanan '${order.so_number}' berhasil dikonfirmasi dan Invoice resmi telah diterbitkan!`);
    }
  };

  // Action to start Trip 2 warehouse process
  const handleStartTrip2 = () => {
    if (!order.shipments || order.shipments.length < 2) return;
    const trip2 = order.shipments[1];
    const trip2SOItems = trip2.items.map((it: any) => ({
      id: it.so_item_id || `so-item-t2-${Date.now()}`,
      so_id: order.id,
      product_id: it.product_id,
      product_name: it.product_name || 'Varian Produk',
      qty_kg: it.qty_shipped_kg,
      unit_price_per_kg: 1500000,
      subtotal: it.qty_shipped_kg * 1500000,
    }));

    const updatedShipments = order.shipments.map((s: any, idx: number) => {
      if (idx === 1) {
        return { ...s, status: 'PROSES_GUDANG' };
      }
      return s;
    });

    updateSalesOrderStatus(order.id, 'PROSES_GUDANG', {
      items: trip2SOItems,
      surat_jalan_number: trip2.surat_jalan_number,
      shipments: updatedShipments,
    });

    alert(`Trip 2 (${trip2.surat_jalan_number}) berhasil dipindahkan ke PROSES GUDANG! Petugas gudang sekarang dapat memilih lot batch untuk sisa pesanan.`);
  };

  // Action to revert status to previous workflow stage (Restricted: cannot revert once DIKIRIM)
  const handleGoBackToPreviousStage = () => {
    if (order.status === 'DIKIRIM' || order.status === 'DITERIMA' || (order.status as string) === 'DELIVERED') {
      alert('Pesanan yang sudah sampai di tahap DIKIRIM tidak dapat dikembalikan ke tahap sebelumnya. Anda hanya dapat menyelesaikan serah terima atau membatalkan pesanan.');
      return;
    }

    let prevStatus: SalesOrder['status'] | null = null;
    if (order.status === 'DIKONFIRMASI') prevStatus = 'DIAJUKAN';
    else if (order.status === 'PROSES_GUDANG') prevStatus = 'DIKONFIRMASI';

    if (prevStatus) {
      if (confirm(`Apakah Anda yakin ingin mengembalikan status pesanan ke "${prevStatus}" untuk melakukan koreksi?`)) {
        updateSalesOrderStatus(order.id, prevStatus);
      }
    }
  };

  // Local state for Cancel Order Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelCustomNotes, setCancelCustomNotes] = useState('');

  const handleOpenCancelModal = () => {
    setCancelReason('');
    setCancelCustomNotes('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancelOrder = () => {
    const reasonText = cancelReason === 'Lainnya'
      ? cancelCustomNotes.trim()
      : (cancelCustomNotes.trim() ? `${cancelReason} (${cancelCustomNotes.trim()})` : cancelReason.trim());

    if (!reasonText) {
      alert('Harap pilih atau tuliskan alasan pembatalan pesanan!');
      return;
    }

    const now = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

    // If cancelling an order that was already DIKIRIM, restore the deducted batch stocks
    if (order.status === 'DIKIRIM') {
      const batchRestorations: any[] = [];
      order.items.forEach((item) => {
        if (item.assigned_batches && item.assigned_batches.length > 0) {
          item.assigned_batches.forEach((b) => {
            const batchObj = batches.find((bt) => bt.batch_number === b.batch_number || bt.id === b.batch_number);
            if (batchObj && Number(b.qty_taken_kg) > 0) {
              batchRestorations.push({
                id: batchObj.id,
                current_qty_kg: Number(batchObj.current_qty_kg) + Number(b.qty_taken_kg),
                notes: `Pengembalian Stok (Pembatalan Pesanan ${order.so_number})`,
              });
            }
          });
        }
      });

      if (batchRestorations.length > 0) {
        fetch('/api/stock-batches', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch_updates: batchRestorations }),
        }).catch((err) => console.warn('Failed to restore stock batches on cancel:', err));
      }
    }

    updateSalesOrderStatus(order.id, 'CANCELLED', {
      cancellation_reason: reasonText,
      cancelled_at: now,
      cancelled_by: 'TIM ADMIN / KEUANGAN',
    });

    setSalesOrders((prev) =>
      prev.map((o) =>
        o.id === order.id || o.so_number === order.so_number
          ? {
              ...o,
              status: 'CANCELLED' as const,
              cancellation_reason: reasonText,
              cancelled_at: now,
              cancelled_by: 'TIM ADMIN / KEUANGAN',
            }
          : o
      )
    );

    setIsCancelModalOpen(false);
    setCancelReason('');
    setCancelCustomNotes('');
    alert(`Pesanan '${order.so_number}' telah berhasil dibatalkan.`);
  };

  // Action to cancel sales order
  const handleCancelOrder = () => {
    handleOpenCancelModal();
  };

  // Action 2: Finance Accept Payment -> PROSES GUDANG
  const handleAcceptPayment = () => {
    if (invoice) {
      const updatedInv = { ...invoice, status: 'PAID' as const, payment_verification_status: 'VERIFIED' as const };
      updateSalesOrderStatus(order.id, 'PROSES_GUDANG', {}, updatedInv);
    } else {
      updateSalesOrderStatus(order.id, 'PROSES_GUDANG');
    }
  };

  // Action 3: Gudang Picked & Packed -> DIKIRIM
  const handleDispatchOrder = () => {
    // Validate that each item has exact matching lot quantity
    if (!validateMultiBatchSelection()) return;

    const updatedItems = order.items.map((item) => {
      const itemAlloc = multiBatchInputs[item.id] || {};
      const allocatedBatches = Object.entries(itemAlloc)
        .filter(([_, q]) => Number(q) > 0)
        .map(([bId, q]) => {
          const bObj = batches.find((b) => b.id === bId || b.batch_number === bId);
          return {
            batch_number: bObj ? bObj.batch_number : bId,
            qty_taken_kg: Number(q),
          };
        });

      return {
        ...item,
        assigned_batches: allocatedBatches.length > 0 ? allocatedBatches : (item.assigned_batches || [{ batch_number: 'LOT-2026-FEFO', qty_taken_kg: item.qty_kg }]),
      };
    });

    // Deduct stock in database for all selected lots
    const batchUpdates: any[] = [];
    order.items.forEach((item) => {
      const itemAlloc = multiBatchInputs[item.id] || {};
      Object.entries(itemAlloc).forEach(([bId, q]) => {
        const qtyTaken = Number(q) || 0;
        if (qtyTaken > 0) {
          const batchObj = batches.find((b) => b.id === bId || b.batch_number === bId);
          if (batchObj) {
            const newQty = Math.max(0, Number(batchObj.current_qty_kg) - qtyTaken);
            batchUpdates.push({
              id: batchObj.id,
              current_qty_kg: newQty,
              notes: `Pengeluaran Sales Order ${order.so_number}`,
            });
          }
        }
      });
    });

    if (batchUpdates.length > 0) {
      fetch('/api/stock-batches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_updates: batchUpdates }),
      }).catch((err) => console.warn('Failed to update stock batches:', err));
    }

    updateSalesOrderStatus(order.id, 'DIKIRIM', {
      items: updatedItems,
    });
    alert(`Pesanan '${order.so_number}' berhasil diserahkan ke kurir untuk pengiriman!`);
  };

  // Action 4: Courier / Customer Received & Signed POD -> DITERIMA
  const handleReceiveOrder = () => {
    const unassignedItem = order.items.find((item) => !selectedBatches[item.id]);
    if (unassignedItem) {
      alert(`Harap pilih nomor batch untuk varian '${unassignedItem.product_name}' terlebih dahulu!`);
      return;
    }

    const mismatchedItem = order.items.find((item) => {
      const qtyTaken = batchQuantities[item.id] !== undefined ? batchQuantities[item.id] : item.qty_kg;
      return qtyTaken !== item.qty_kg;
    });
    if (mismatchedItem) {
      const qtyTaken = batchQuantities[mismatchedItem.id] !== undefined ? batchQuantities[mismatchedItem.id] : mismatchedItem.qty_kg;
      alert(
        `Jumlah kg yang dipenuhi gudang (${qtyTaken} Kg) harus sama dengan jumlah yang dipesan (${mismatchedItem.qty_kg} Kg) untuk varian '${mismatchedItem.product_name}'!`
      );
      return;
    }

    const updatedItems = order.items.map((item) => {
      const selectedBatchId = selectedBatches[item.id];
      const batchObj = batches.find((b) => b.id === selectedBatchId);
      const qtyTaken = batchQuantities[item.id] !== undefined ? batchQuantities[item.id] : item.qty_kg;
      return {
        ...item,
        assigned_batches: batchObj
          ? [{ batch_number: batchObj.batch_number, qty_taken_kg: qtyTaken }]
          : item.assigned_batches || [{ batch_number: 'LOT-2026-FEFO', qty_taken_kg: qtyTaken }],
      };
    });

    // Deduct stock in database
    const batchUpdates = updatedItems.map((item) => {
      const selectedBatchId = selectedBatches[item.id];
      const batchObj = batches.find((b) => b.id === selectedBatchId);
      const qtyTaken = batchQuantities[item.id] !== undefined ? batchQuantities[item.id] : item.qty_kg;
      if (batchObj) {
        const newQty = Math.max(0, Number(batchObj.current_qty_kg) - qtyTaken);
        return {
          id: batchObj.id,
          current_qty_kg: newQty,
          notes: `Pengeluaran Sales Order ${order.so_number}`,
        };
      }
      return null;
    }).filter(Boolean);

    if (batchUpdates.length > 0) {
      fetch('/api/stock-batches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_updates: batchUpdates }),
      }).catch((err) => console.warn('Failed to update stock batches:', err));
    }

    updateSalesOrderStatus(order.id, 'DITERIMA', {
      items: updatedItems,
    });
  };

  if (!order) {
    return (
      <div className="bg-[#f5f7fa] min-h-screen pb-20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm font-medium">Memuat rincian pesanan B2B...</p>
        </div>
      </div>
    );
  }

  // 5 Simplified Stepper Statuses
  const soCreatorName = order.created_by || (order.customer_name ? `${order.customer_name}${order.customer_company ? ` (${order.customer_company})` : ''}` : currentUser?.name || 'Customer B2B');
  const steps = [
    {
      key: 'DIAJUKAN',
      title: 'Diajukan',
      time: order.order_date,
      actor: `Oleh ${soCreatorName.toUpperCase()}`,
    },
    {
      key: 'DIKONFIRMASI',
      title: 'Dikonfirmasi',
      time: (order.status !== 'DIAJUKAN' && order.status !== 'PENDING_APPROVAL') ? '22 JUL 2026 20:24' : '-',
      actor: 'Oleh TIM KEUANGAN',
    },
    {
      key: 'PROSES_GUDANG',
      title: 'Proses Gudang',
      time:
        order.status === 'PROSES_GUDANG' ||
        order.status === 'DIKIRIM' ||
        order.status === 'DITERIMA'
          ? '22 JUL 2026 20:28'
          : '-',
      actor: 'Oleh TIM GUDANG FEFO',
    },
    {
      key: 'DIKIRIM',
      title: 'Dikirim',
      time:
        order.status === 'DIKIRIM' || order.status === 'DITERIMA'
          ? '22 JUL 2026 20:29'
          : '-',
      actor: 'Oleh KURIR / EXPEDISI',
    },
    {
      key: 'DITERIMA',
      title: 'Diterima',
      time: order.status === 'DITERIMA' ? '22 JUL 2026 20:31' : '-',
      actor: order.status === 'DITERIMA' ? 'Oleh USER / PENERIMA' : '-',
    },
  ];

  // Dynamic Customer and Credit Approval Resolution
  const customer =
    customers.find((c) => c.id === order.customer_id) ||
    initialCustomers.find(
      (c) =>
        c.id === order.customer_id ||
        c.company_name === order.customer_company ||
        c.company_name === order.customer_name
    );

  const isSuperAdmin = currentUser?.is_super_admin || currentUser?.role === 'SUPER_ADMIN';

  // Live calculation of financial metrics for credit check
  const creditLimit = customer ? Number(customer.credit_limit || 0) : Number(order.credit_limit_amount || 40000000);
  const currentPiutang = customer ? Number(customer.current_piutang || 0) : Number(order.current_piutang_amount || 0);

  // Check if customer has overdue invoices
  const customerInvoices = invoices.filter(
    (inv) => inv.customer_id === order.customer_id || inv.customer_name === order.customer_company
  );
  const isOverdueDebt = Boolean(customer?.has_overdue || customerInvoices.some((inv) => inv.status === 'OVERDUE'));

  // Order totals calculation
  let orderGoodsSubtotal = 0;
  (order.items || []).forEach((it) => {
    const q = it.original_qty_kg !== undefined ? it.original_qty_kg : it.qty_kg;
    const p = it.unit_price_per_kg || 1500000;
    orderGoodsSubtotal += q * p;
  });
  const orderGrandTotal = order.grand_total || (orderGoodsSubtotal + Math.round(orderGoodsSubtotal * 0.11) + (order.shipping_cost || 0));
  const projectedPiutang = currentPiutang + orderGrandTotal;

  const isExceedingCredit = creditLimit > 0 && projectedPiutang > creditLimit;

  // Determine if this order requires Super Admin approval (only applicable in DIAJUKAN stage)
  const isInitialStage = order.status === 'DIAJUKAN' || order.status === 'PENDING_APPROVAL';
  const isTempoOrder = order.payment_method === 'TEMPO' || (order as any).payment_method === 'KREDIT' || !order.payment_method;
  const requiresSuperAdminCreditApproval =
    isInitialStage && (
      Boolean(order.requires_super_admin_approval) ||
      (isTempoOrder && (isExceedingCredit || isOverdueDebt)) ||
      (isExceedingCredit && creditLimit > 0)
    );

  const isPendingSuperAdminApproval =
    requiresSuperAdminCreditApproval &&
    order.credit_approval_status !== 'APPROVED';

  const isApprovedBySuperAdmin =
    isInitialStage &&
    (Boolean(order.requires_super_admin_approval) || isExceedingCredit || isOverdueDebt) &&
    order.credit_approval_status === 'APPROVED';

  const activeCreditWarning =
    order.credit_warning ||
    (isExceedingCredit && isOverdueDebt
      ? 'MELEBIHI_PLAFON_DAN_OVERDUE'
      : isOverdueDebt
      ? 'OVERDUE_INVOICE'
      : 'MELEBIHI_PLAFON');

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-20">
      <AdminTopNav />

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/sales-orders"
            className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Sales Order (SO)
          </Link>
        </div>

        {/* Centered Page Header Title with Prominent Approval Badge */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              Detail Pesanan - {order.so_number}
            </h1>
            {isPendingSuperAdminApproval && (
              <span className="bg-red-600 text-white text-xs font-black uppercase px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5 animate-pulse">
                <ShieldAlert className="w-4 h-4 text-white" /> ⚠️ BUTUH APPROVAL SUPER ADMIN
              </span>
            )}
            {isApprovedBySuperAdmin && (
              <span className="bg-emerald-600 text-white text-xs font-bold uppercase px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-white" /> ✓ APPROVED SUPER ADMIN
              </span>
            )}
          </div>
        </div>

        {/* Status Pesanan Horizontal Stepper Bar (6 Separate Steps) */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Status Pesanan
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {steps.map((step) => {
              const isCancelledStep = order.status === 'CANCELLED' && (
                (step.key === 'DIKONFIRMASI' && order.invoice_id) ||
                (step.key === 'DIAJUKAN' && !order.invoice_id)
              );

              let isPassed = false;
              if (order.status !== 'CANCELLED') {
                if (step.key === 'DIAJUKAN') isPassed = true;
                else if (step.key === 'DIKONFIRMASI') isPassed = (order.status !== 'DIAJUKAN' && order.status !== 'PENDING_APPROVAL');
                else if (step.key === 'PROSES_GUDANG') isPassed = ['PROSES_GUDANG', 'DIKIRIM', 'DITERIMA'].includes(order.status);
                else if (step.key === 'DIKIRIM') isPassed = ['DIKIRIM', 'DITERIMA'].includes(order.status);
                else if (step.key === 'DITERIMA') isPassed = order.status === 'DITERIMA';
              } else {
                // If cancelled, steps prior to cancellation are marked as green/passed
                if (step.key === 'DIAJUKAN' && order.invoice_id) {
                  isPassed = true;
                }
              }

              return (
                <div key={step.key} className="space-y-1 text-center">
                  {/* Status Pill Badge */}
                  <div
                    className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all border ${
                      isCancelledStep
                        ? 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                        : isPassed
                          ? step.key === 'DIAJUKAN'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : step.key === 'DIKONFIRMASI'
                              ? 'bg-purple-100 text-purple-800 border-purple-300'
                              : step.key === 'PROSES_GUDANG'
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                : step.key === 'DIKIRIM'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-gray-100 text-gray-400 border-gray-200'
                    }`}
                  >
                    {isCancelledStep ? 'Dibatalkan' : step.title}
                  </div>

                  {/* Timestamp & Actor */}
                  <div className="text-[11px] text-slate-500 pt-1">
                    <div className="font-semibold text-slate-600">{step.time}</div>
                    <div className="text-[10px] text-slate-400 uppercase leading-tight font-medium">
                      {step.actor}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Penerima & Pengirim Side-by-Side Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Penerima */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-800 border-b border-gray-100 pb-2">
              Penerima (Customer B2B)
            </h2>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Nama Penerima:</span>
                <span className="col-span-2 font-bold text-slate-800">
                  {order.customer_company} ({order.customer_name})
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Alamat Pengiriman:</span>
                <span className="col-span-2 text-slate-700">
                  Kawasan Industri Jababeka V Blok C-12, Cikarang, Bekasi
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Tanggal Dibutuhkan:</span>
                <span className="col-span-2 text-slate-700">ASAP (Segera)</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Metode Pembayaran:</span>
                <span className="col-span-2 font-bold text-blue-700">
                  {order.payment_method}
                </span>
              </div>
            </div>
          </div>

          {/* Card Pengirim */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-800 border-b border-gray-100 pb-2">
              Pengirim (Gudang Central)
            </h2>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Nama Pengirim:</span>
                <span className="col-span-2 font-bold text-slate-800">
                  {companyConfig.company_name || 'PT Artaroma Jayatama'}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Alamat Warehouse:</span>
                <span className="col-span-2 text-slate-700">
                  {companyConfig.warehouse_address || 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272'}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Petugas Penyiapan:</span>
                <span className="col-span-2 text-slate-700">
                  {companyConfig.logistics_pic || 'Tim Gudang FEFO Engine'}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Armada Kurir:</span>
                <span className="col-span-2 text-amber-700 font-semibold">
                  {order.courier_name || 'Rian Pratama (Blind Van B 9482 SXZ)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Document Action Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsSalesOrderPDFOpen(true)}
            className="bg-white hover:bg-gray-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" /> Sales Order
          </button>

          {canUserExportXLSX(currentUser) && (
            <button
              onClick={handleExportSODetailXLSX}
              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Ekspor Rincian Item SO ke File Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Ekspor Rincian SO (XLSX)
            </button>
          )}

          <button
            onClick={() => setIsInvoicePDFOpen(true)}
            className="bg-white hover:bg-gray-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <FileCheck className="w-3.5 h-3.5 text-blue-600" /> Invoice
          </button>

          <button
            onClick={() => alert('Download Bukti Transfer PDF')}
            className="bg-white hover:bg-gray-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" /> Bukti Transfer
          </button>

          <button
            onClick={() => {
              setSelectedSuratJalanTrip(undefined);
              setIsSuratJalanPDFOpen(true);
            }}
            className="bg-white hover:bg-gray-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 text-blue-600" /> Surat Jalan
          </button>

          <button
            onClick={() => alert('Download Laporan Penerimaan POD TTD Digital PDF')}
            className="bg-white hover:bg-gray-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Laporan Penerimaan (POD)
          </button>

          <button
            onClick={() => setIsLabelModalOpen(true)}
            className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Tag className="w-3.5 h-3.5 text-amber-600" /> Cetak Label Produk
          </button>

          <button
            onClick={() => setIsShippingAddressModalOpen(true)}
            className="bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-600" /> Cetak Alamat Pengiriman
          </button>
        </div>

        {/* MULTI-TRIP SHIPMENTS TRACKER (When order is split into multiple trips) */}
        {order.shipments && order.shipments.length > 1 && (
          <div className="bg-white border-2 border-indigo-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm">
                <Truck className="w-5 h-5 text-indigo-600" />
                <span>Pengiriman Multi-Trip Aktif ({order.shipments.length} Trip)</span>
              </div>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">
                Pesanan Terbagi Parsial
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {order.shipments.map((trip: any, tIdx: number) => {
                const isTripActive = tIdx === 0 ? order.status !== 'DITERIMA' : (order.status === 'DITERIMA' || trip.status === 'PROSES_GUDANG');
                const totalTripKg = trip.items.reduce((s: number, it: any) => s + (Number(it.qty_shipped_kg) || 0), 0);

                return (
                  <div
                    key={trip.id}
                    className={`rounded-xl p-4 border transition-all space-y-2.5 ${
                      isTripActive
                        ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-100'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                          {trip.trip_number}
                        </span>
                        <span className="font-bold text-slate-800 text-xs">
                          Trip {trip.trip_number} ({totalTripKg} Kg)
                        </span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        trip.status === 'DITERIMA'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : trip.status === 'DIKIRIM'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : trip.status === 'PROSES_GUDANG'
                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                          : trip.status === 'DIKONFIRMASI'
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {trip.status === 'MENUNGGU_GUDANG' ? 'Menunggu Stok (Backorder)' : trip.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200/80">
                      <div className="flex justify-between">
                        <span>Surat Jalan:</span>
                        <strong className="text-slate-800 font-mono">#{trip.surat_jalan_number}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Item Trip Ini:</span>
                        <div className="space-y-0.5">
                          {trip.items.map((it: any, iIdx: number) => (
                            <div key={iIdx} className="flex justify-between text-slate-700 font-semibold text-[10px]">
                              <span>• {it.product_name}</span>
                              <span className="font-mono">{formatKg(it.qty_shipped_kg)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSuratJalanTrip(trip.trip_number);
                            setIsSuratJalanPDFOpen(true);
                          }}
                          className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-blue-600" /> Surat Jalan Trip {trip.trip_number} (PDF)
                        </button>
                      </div>
                    </div>

                    {/* Action for Trip 2 if ready to start */}
                    {tIdx === 1 && trip.status === 'MENUNGGU_GUDANG' && (
                      <button
                        type="button"
                        onClick={handleStartTrip2}
                        className="w-full mt-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" /> Mulai Proses Gudang Trip 2
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WORKFLOW ACTION PANEL */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-blue-900 text-sm flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Form Eksekusi Aksi Alur Kerja
            </h3>
            <div className="flex items-center gap-2">
              {isPendingSuperAdminApproval && (
                <span className="bg-red-600 text-white font-extrabold text-xs px-3.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm animate-pulse">
                  <ShieldAlert className="w-3.5 h-3.5" /> ⚠️ BUTUH APPROVAL SUPER ADMIN
                </span>
              )}
              {isApprovedBySuperAdmin && (
                <span className="bg-emerald-600 text-white font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ✓ APPROVED SUPER ADMIN
                </span>
              )}
              {['DIKONFIRMASI', 'PROSES_GUDANG'].includes(order.status) && (
                <button
                  onClick={handleGoBackToPreviousStage}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                  title="Kembalikan status pesanan ke tahap sebelumnya untuk mengoreksi data"
                >
                  ← Koreksi Tahap Sebelumnya
                </button>
              )}
              <span className={`text-white font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider ${
                order.status === 'CANCELLED' ? 'bg-red-600' : 'bg-blue-700'
              }`}>
                STATUS SAAT INI: {order.status === 'PENDING_APPROVAL' ? 'Diajukan' : order.status}
              </span>
            </div>
          </div>


          {/* Action Step Cancelled */}
          {order.status === 'CANCELLED' && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 text-xs space-y-3 shadow-xs">
              <div className="flex items-center gap-2.5 text-red-700 font-extrabold text-sm uppercase tracking-wide">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Pesanan Ini Telah Dibatalkan / Ditolak
              </div>
              
              <div className="bg-white border border-red-200 rounded-lg p-3.5 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-1.5 flex-wrap gap-2">
                  <span>Waktu Pembatalan: <strong className="text-slate-700">{order.cancelled_at || '-'}</strong></span>
                  <span>Dibatalkan Oleh: <strong className="text-slate-700">{order.cancelled_by || 'Admin / Tim Keuangan'}</strong></span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-0.5">Alasan Pembatalan:</span>
                  <p className="text-xs font-semibold text-red-800 bg-red-50/60 p-2.5 rounded-md border border-red-100 italic">
                    "{order.cancellation_reason || 'Tidak ada catatan alasan yang dicatat.'}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Step 1: DIAJUKAN / PENDING_APPROVAL -> Confirm Prices */}
          {(order.status === 'DIAJUKAN' || order.status === 'PENDING_APPROVAL') && (() => {
            let totalConfirmedKg = 0;
            let totalRemainingKg = 0;
            let hasInsufficientStock = false;
            let hasExceededOrder = false;
            let hasMultiTripSplit = false;

            order.items.forEach((item) => {
              const prod = products.find((p) => p.id === item.product_id);
              const getPackSizeFromName = (name: string): number => {
                const clean = (name || '').toUpperCase().trim();
                if (clean.endsWith('25K')) return 25;
                if (clean.endsWith('5K')) return 5;
                if (clean.endsWith('1K')) return 1;
                return 25;
              };
              const sizeKg = getPackSizeFromName(item.product_name);
              const stockKg = prod?.variant_stocks?.[String(sizeKg)] ?? 0;
              const initialQty = item.original_qty_kg !== undefined ? item.original_qty_kg : item.qty_kg;
              const confirmed = itemConfirmedKgs[item.id] !== undefined ? itemConfirmedKgs[item.id] : initialQty;

              if (confirmed > initialQty) {
                hasExceededOrder = true;
              }
              if (confirmed > 0) {
                totalConfirmedKg += confirmed;
                if (stockKg < confirmed) {
                  hasInsufficientStock = true;
                }
              }
              const remaining = Math.max(0, initialQty - confirmed);
              if (remaining > 0) {
                totalRemainingKg += remaining;
                hasMultiTripSplit = true;
              }
            });

            const isAllZero = totalConfirmedKg === 0;
            const isBlocked = hasInsufficientStock || hasExceededOrder || isAllZero || isPendingSuperAdminApproval;

            return (
              <div className="space-y-4 bg-white p-6 rounded-xl border border-blue-100 shadow-xs">
                <div className="text-xs text-slate-800 font-bold border-b pb-2 mb-1 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-blue-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Langkah 1: Verifikasi Sisa Stok, Harga, PPN (11%) & Ongkos Kirim untuk Terbitkan Invoice
                  </span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Tahap: DIAJUKAN
                  </span>
                </div>

                {/* Super Admin Approval Required Banner */}
                {isPendingSuperAdminApproval && (
                  <div className="bg-red-50/90 border-2 border-red-400 rounded-xl p-4 space-y-3 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-200 pb-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                        <div>
                          <span className="font-extrabold text-red-900 text-sm block">
                            ⚠️ Memerlukan Persetujuan (Approval) dari Super Admin
                          </span>
                          <span className="text-[11px] text-red-700 font-medium">
                            {activeCreditWarning === 'MELEBIHI_PLAFON_DAN_OVERDUE'
                              ? 'Pesanan ini melebihi Plafon Kredit DAN Customer memiliki tagihan yang telah Jatuh Tempo (Overdue).'
                              : activeCreditWarning === 'OVERDUE_INVOICE'
                              ? 'Customer memiliki tagihan yang telah Jatuh Tempo (Overdue) dan belum dilunasi.'
                              : 'Total nilai pesanan ini melebihi sisa Plafon Kredit Customer.'}
                          </span>
                        </div>
                      </div>
                      <span className="bg-red-100 text-red-800 border border-red-300 font-extrabold text-[10px] px-2.5 py-1 rounded-full w-max">
                        STATUS: MENUNGGU APPROVAL SUPER ADMIN
                      </span>
                    </div>

                    {/* Financial Metric Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-white p-3 rounded-lg border border-red-200">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Plafon Kredit Customer:</span>
                        <span className="font-mono font-bold text-slate-800 text-sm">
                          {formatIDR(creditLimit)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Piutang Berjalan:</span>
                        <span className="font-mono font-bold text-amber-700 text-sm">
                          {formatIDR(currentPiutang)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Proyeksi Total Piutang:</span>
                        <span className="font-mono font-extrabold text-red-700 text-sm">
                          {formatIDR(projectedPiutang)}
                        </span>
                      </div>
                    </div>

                    {/* Super Admin Action Buttons or Non-Admin Lock Notice */}
                    {isSuperAdmin ? (
                      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-100/60 p-3 rounded-lg border border-red-200">
                        <div className="text-xs text-red-950 font-semibold flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-red-700 shrink-0" />
                          <span>Anda login sebagai <strong>Super Admin</strong>. Anda berhak menyetujui (ACC Override) pesanan ini untuk melanjutkan proses.</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleApproveCreditOverride}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Setujui (ACC) Pesanan Ini
                          </button>
                          <button
                            type="button"
                            onClick={handleRejectCreditOrder}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Tolak Pesanan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-100/80 border border-amber-300 rounded-lg p-3 text-xs text-amber-950 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>
                          <strong>Akses Dibatasi:</strong> Proses penerbitan invoice dikunci. Harap hubungi <strong>Super Admin</strong> untuk memberikan persetujuan (Approval) atas pesanan ini.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Approved by Super Admin Banner */}
                {isApprovedBySuperAdmin && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-xs text-emerald-900 flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-extrabold text-emerald-800 text-sm block">
                          Persetujuan Super Admin: DISETUJUI (APPROVED)
                        </span>
                        <span className="text-[11px] text-emerald-700">
                          Pesanan telah disetujui (override kredit) oleh <strong>{order.credit_approval_by || 'Super Admin'}</strong>{order.credit_approval_date ? ` pada ${new Date(order.credit_approval_date).toLocaleString('id-ID')}` : ''}.
                        </span>
                      </div>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] px-2.5 py-1 rounded-full shrink-0">
                      OVERRIDE ACC
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  {order.items.map((item) => {
                    const prod = products.find((p) => p.id === item.product_id);
                    const getPackSizeFromName = (name: string): number => {
                      const clean = (name || '').toUpperCase().trim();
                      if (clean.endsWith('25K')) return 25;
                      if (clean.endsWith('5K')) return 5;
                      if (clean.endsWith('1K')) return 1;
                      return 25;
                    };
                    const sizeKg = getPackSizeFromName(item.product_name);
                    const stockKg = prod?.variant_stocks?.[String(sizeKg)] ?? 0;
                    const stockUnits = Math.max(0, Math.round(stockKg / sizeKg));
                    const initialQty = item.original_qty_kg !== undefined ? item.original_qty_kg : item.qty_kg;
                    const orderedUnits = Math.max(1, Math.round(initialQty / sizeKg));
                    const confirmedQty = itemConfirmedKgs[item.id] !== undefined ? itemConfirmedKgs[item.id] : initialQty;
                    const isInsufficient = confirmedQty > 0 && stockKg < confirmedQty;
                    const isExceeded = confirmedQty > initialQty;
                    const isZero = confirmedQty === 0;
                    const isPartial = confirmedQty > 0 && confirmedQty < initialQty;

                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 p-3 rounded-lg border text-xs transition-colors ${
                          isInsufficient || isExceeded
                            ? 'bg-red-50/50 border-red-300'
                            : isZero
                            ? 'bg-amber-50/30 border-amber-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-slate-800 text-sm">{item.product_name}</div>
                          <div className="text-slate-500 font-medium">
                            Pesanan Awal: <span className="font-mono text-slate-700 font-bold">{orderedUnits} Unit ({formatKg(initialQty)})</span>
                            <span className="mx-2">•</span>
                            Harga Satuan: <span className="font-mono text-slate-700 font-bold">{formatIDR(item.unit_price_per_kg ?? 0)}/kg</span>
                          </div>
                          {isExceeded && (
                            <div className="text-[10px] text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded font-bold mt-1 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              Jumlah konfirmasi ({confirmedQty} Kg) melebihi pesanan customer ({initialQty} Kg)
                            </div>
                          )}
                          {isZero && (
                            <div className="text-[10px] text-amber-900 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded font-bold mt-1 inline-flex items-center gap-1">
                              <Truck className="w-3 h-3 text-amber-600" />
                              Kuantitas 0 Kg: Produk ini ({formatKg(initialQty)}) akan masuk ke Multi-Trip selanjutnya (Trip 2)
                            </div>
                          )}
                          {isPartial && (
                            <div className="text-[10px] text-amber-900 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded font-bold mt-1 inline-flex items-center gap-1">
                              <Truck className="w-3 h-3 text-amber-600" />
                              Sebagian: {confirmedQty} Kg dikirim Trip 1, sisa {initialQty - confirmedQty} Kg masuk ke Multi-Trip selanjutnya (Trip 2)
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 font-bold">Konfirmasi Jumlah (Kg):</span>
                            <input
                              type="number"
                              step={sizeKg}
                              min="0"
                              max={initialQty}
                              value={confirmedQty}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setItemConfirmedKgs({
                                  ...itemConfirmedKgs,
                                  [item.id]: val
                                });
                              }}
                              className={`w-24 bg-white border rounded px-2 py-1 font-mono font-bold text-xs text-center focus:outline-none ${
                                isInsufficient || isExceeded
                                  ? 'border-red-400 text-red-700 bg-red-50/30 focus:border-red-500 focus:ring-1 focus:ring-red-200'
                                  : isZero
                                  ? 'border-amber-300 text-amber-800 bg-amber-50/30 focus:border-amber-400 focus:ring-1 focus:ring-amber-200'
                                  : 'border-gray-300 text-slate-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-100'
                              }`}
                            />
                          </div>

                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500 font-medium">Sisa Stok:</span>
                              <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                                isInsufficient 
                                  ? 'bg-red-100 text-red-700 border border-red-300' 
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}>
                                {stockUnits} Unit ({formatKg(stockKg)})
                              </span>
                            </div>
                            {isInsufficient && (
                              <span className="bg-red-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded shadow-2xs">
                                STOK TIDAK CUKUP
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Exceeded Customer Order Warning Banner */}
                {hasExceededOrder && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3.5 text-xs text-red-900 flex items-start gap-2.5 font-medium shadow-xs">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-extrabold text-red-800 block text-sm">
                        Jumlah Konfirmasi Melebihi Pesanan Customer
                      </span>
                      <p className="text-red-700 leading-relaxed">
                        Terdapat item dengan jumlah konfirmasi yang melebihi pesanan awal customer. Jumlah yang dikonfirmasi maksimal sama dengan jumlah pesanan customer.
                      </p>
                    </div>
                  </div>
                )}

                {/* Insufficient Stock Warning Banner */}
                {hasInsufficientStock && !hasExceededOrder && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3.5 text-xs text-red-900 flex items-start gap-2.5 font-medium shadow-xs">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-extrabold text-red-800 block text-sm">
                        Tahapan Konfirmasi Tidak Dapat Dilanjutkan
                      </span>
                      <p className="text-red-700 leading-relaxed">
                        Sisa stok gudang tidak mencukupi untuk kuantitas yang dikonfirmasi (&gt; 0 kg).<br />
                        Silakan kurangi jumlah konfirmasi sesuai stok yang tersedia, atau ubah menjadi <strong>0 kg</strong> agar produk dialokasikan ke <strong>Multi-Trip selanjutnya</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {isAllZero && !hasInsufficientStock && !hasExceededOrder && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5 font-medium shadow-xs">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-amber-800 block text-sm">
                        Semua Item Bernilai 0 Kg
                      </span>
                      <p className="text-amber-800 leading-relaxed">
                        Minimal 1 item pesanan harus memiliki kuantitas lebih dari 0 kg untuk dikirim pada Trip 1. Jika seluruh stok habis dan tidak ada barang yang dapat dikirim, silakan batalkan pesanan.
                      </p>
                    </div>
                  </div>
                )}

                {/* Pilihan: Penyesuaian Pesanan SO vs Pengiriman Multi-Trip */}
                {hasMultiTripSplit && !isBlocked && (
                  <div className="bg-amber-50/90 border-2 border-amber-300 rounded-xl p-4 space-y-3 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-amber-700 shrink-0" />
                        <div>
                          <span className="font-extrabold text-amber-900 text-sm block">
                            Stok Tidak Lengkap: Pilih Opsi Pemenuhan Pesanan
                          </span>
                          <span className="text-[11px] text-amber-800">
                            Terdapat kuantitas atau item yang tidak dapat dipenuhi penuh saat ini.
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold bg-amber-200 text-amber-950 px-2.5 py-1 rounded-full w-max">
                        Siap Kirim: {totalConfirmedKg} Kg | Sisa: {totalRemainingKg} Kg
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Opsi 1: Menyesuaikan Pesanan SO (Penyesuaian Final) */}
                      <div
                        onClick={() => setFulfillmentMode('ADJUST_SO')}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          fulfillmentMode === 'ADJUST_SO'
                            ? 'border-blue-600 bg-white shadow-sm ring-2 ring-blue-100'
                            : 'border-amber-200/80 bg-white/70 hover:bg-white hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              fulfillmentMode === 'ADJUST_SO' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                            }`}>
                              {fulfillmentMode === 'ADJUST_SO' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                            1. Menyesuaikan Pesanan SO (Final)
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Tanpa Trip 2
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Pesanan disesuaikan secara final menjadi <strong>{totalConfirmedKg} Kg</strong>. Item/kuantitas yang kosong dihapus dari pesanan dan <strong>tidak ada pengiriman susulan (Trip 2)</strong>.
                        </p>
                      </div>

                      {/* Opsi 2: Pengiriman Multi-Trip (Kirim Bertahap) */}
                      <div
                        onClick={() => setFulfillmentMode('MULTI_TRIP')}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          fulfillmentMode === 'MULTI_TRIP'
                            ? 'border-blue-600 bg-white shadow-sm ring-2 ring-blue-100'
                            : 'border-amber-200/80 bg-white/70 hover:bg-white hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              fulfillmentMode === 'MULTI_TRIP' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                            }`}>
                              {fulfillmentMode === 'MULTI_TRIP' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                            2. Pengiriman Multi-Trip (Bertahap)
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            Trip 1 + Trip 2
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Bagi pesanan menjadi 2 tahap: <strong>Trip 1 ({totalConfirmedKg} Kg)</strong> siap dikirim sekarang, dan sisa <strong>Trip 2 ({totalRemainingKg} Kg)</strong> menunggu ketersediaan stok gudang.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pengaturan Ongkos Kirim (FRANCO / LOCO) */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-blue-600" />
                      Ketentuan &amp; Biaya Ongkos Kirim
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">Pilih tipe pengiriman untuk pesanan ini</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShippingType('FRANCO');
                        setShippingCost(0);
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        shippingType === 'FRANCO'
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipping_type"
                        checked={shippingType === 'FRANCO'}
                        onChange={() => {
                          setShippingType('FRANCO');
                          setShippingCost(0);
                        }}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          FRANCO (Gratis Ongkir)
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-extrabold">GRATIS</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Biaya kirim ditanggung oleh PT Artaroma Jayatama (Rp 0)
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShippingType('LOCO')}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        shippingType === 'LOCO'
                          ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipping_type"
                        checked={shippingType === 'LOCO'}
                        onChange={() => setShippingType('LOCO')}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          LOCO (Ditanggung Customer)
                          <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded font-extrabold">BERBAYAR</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Biaya kirim ditagihkan ke invoice pesanan customer
                        </div>
                      </div>
                    </button>
                  </div>

                  {shippingType === 'LOCO' && (
                    <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-700">
                        Nominal Ongkos Kirim (Rp):
                      </label>
                      <div className="relative w-full sm:w-64">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 font-mono">Rp</span>
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          placeholder="Contoh: 150000"
                          value={shippingCost || ''}
                          onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                          className="w-full pl-9 pr-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Invoice Breakdown Calculation Card */}
                {(() => {
                  let calculatedGoods = 0;
                  order.items.forEach((item) => {
                    const initialOrderedQty = item.original_qty_kg !== undefined ? item.original_qty_kg : item.qty_kg;
                    const confirmedQty = itemConfirmedKgs[item.id] !== undefined ? itemConfirmedKgs[item.id] : initialOrderedQty;
                    const price = item.unit_price_per_kg || 1500000;
                    calculatedGoods += confirmedQty * price;
                  });
                  const ppn = Math.round(calculatedGoods * 0.11);
                  const ship = shippingType === 'FRANCO' ? 0 : Number(shippingCost || 0);
                  const grandTotal = calculatedGoods + ppn + ship;

                  return (
                    <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-xl p-4 space-y-2">
                      <div className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-600" /> Rincian Tagihan Invoice yang Akan Diterbitkan:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 border-t border-blue-100">
                        <div>
                          <span className="text-slate-500 block text-[11px]">Subtotal Nilai Barang:</span>
                          <span className="font-mono font-bold text-slate-800 text-sm">{formatIDR(calculatedGoods)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">PPN (11%):</span>
                          <span className="font-mono font-bold text-slate-800 text-sm">{formatIDR(ppn)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Ongkos Kirim ({shippingType}):</span>
                          <span className="font-mono font-bold text-slate-800 text-sm">{ship > 0 ? formatIDR(ship) : 'Rp 0 (GRATIS)'}</span>
                        </div>
                        <div>
                          <span className="text-blue-900 font-bold block text-[11px]">Total Tagihan Invoice:</span>
                          <span className="font-mono font-extrabold text-blue-700 text-base">{formatIDR(grandTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isBlocked}
                    onClick={handleConfirmPrices}
                    className={`font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm inline-flex items-center gap-2 transition-all cursor-pointer ${
                      isBlocked
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    {isBlocked
                      ? (isPendingSuperAdminApproval
                          ? 'Menunggu Approval Super Admin (Konfirmasi Dikunci)'
                          : hasExceededOrder
                          ? 'Melebihi Pesanan Customer (Konfirmasi Dikunci)'
                          : hasInsufficientStock
                          ? 'Stok Tidak Mencukupi (Konfirmasi Dikunci)'
                          : 'Kuantitas 0 Kg Semua (Minimal 1 Item)')
                      : (hasMultiTripSplit
                          ? (fulfillmentMode === 'ADJUST_SO'
                              ? `Sesuaikan Pesanan SO & Terbitkan Invoice (${totalConfirmedKg} Kg)`
                              : `Konfirmasi Multi-Trip & Terbitkan Invoice (Trip 1: ${totalConfirmedKg} Kg)`)
                          : 'Konfirmasi Stok & Terbitkan Invoice Resmi')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelOrder}
                    className="bg-red-50 hover:bg-red-100 text-red-750 border border-red-200 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    ✕ Batalkan Pesanan
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Action Step 2: DIKONFIRMASI -> Tim Keuangan verifies payment, edits items & issues Surat Jalan -> PROSES_GUDANG */}
          {order.status === 'DIKONFIRMASI' && (
            <div className="bg-white p-6 rounded-xl border border-blue-100 text-xs space-y-4">
              <div className="font-bold text-slate-800 flex items-center justify-between border-b border-gray-150 pb-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <FileCheck className="w-5 h-5 text-blue-600" />
                  Langkah 2: Konfirmasi Finansial, Edit Varian & Penerbitan Surat Jalan
                </div>
                <button
                  onClick={() => setIsEditingItems(!isEditingItems)}
                  className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 transition-all flex items-center gap-1.5 shadow-sm text-[11px]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isEditingItems ? 'Selesai Edit' : 'Edit Item / Tambah Varian'}
                </button>
              </div>

              {/* Bukti Transfer Box (Customer Upload + Admin Manual Upload - Opsional) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span className="font-extrabold text-slate-800 text-xs">
                      Bukti Transfer Pembayaran Customer
                    </span>
                    <span className="text-[10px] bg-slate-200/80 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                      Bersifat Opsional
                    </span>
                  </div>

                  {paymentProofUrl ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-max">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Bukti Transfer Tersedia (Customer / Admin)
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-max">
                      <Clock className="w-3 h-3 text-slate-500" /> Belum Ada Bukti (Bisa Diunggah Manual)
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {paymentProofUrl ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={paymentProofUrl}
                        alt="Bukti Transfer"
                        className="h-16 w-16 object-cover rounded-lg border border-gray-300 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => window.open(paymentProofUrl)}
                        title="Klik untuk melihat ukuran penuh"
                      />
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>Resi Pembayaran Terlampir</span>
                          <button
                            type="button"
                            onClick={() => window.open(paymentProofUrl)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 underline font-bold"
                          >
                            Lihat Foto / Dokumen
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {invoice?.invoice_number ? `No. Invoice: ${invoice.invoice_number}` : `Nomor SO: ${order.so_number}`}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 leading-relaxed">
                      Bukti transfer dapat diunggah sendiri oleh customer via halaman akun customer mereka, atau Admin/Finance dapat mengunggahnya langsung jika customer mengirimkan resi via WhatsApp/email.
                    </div>
                  )}

                  {/* Upload Action Button for Admin */}
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{paymentProofUrl ? 'Ganti Bukti Transfer' : 'Upload Bukti Transfer (Admin)'}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleAdminProofFileChange}
                        className="hidden"
                      />
                    </label>
                    {paymentProofUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Hapus bukti transfer ini?')) {
                            setPaymentProofUrl(null);
                            const currentInvs = getStoredInvoices();
                            const updatedInvs = currentInvs.map((inv) =>
                              inv.id === invoice?.id || inv.so_id === order.id
                                ? { ...inv, payment_proof_url: undefined }
                                : inv
                            );
                            saveStoredInvoices(updatedInvs);
                            const currentOrders = getStoredOrders();
                            const updatedOrders = currentOrders.map((o) =>
                              o.id === order.id || o.so_number === order.so_number
                                ? { ...o, payment_proof_url: undefined }
                                : o
                            );
                            saveStoredOrders(updatedOrders, false);
                            setInvoices(updatedInvs);
                            setSalesOrders(updatedOrders);
                          }
                        }}
                        className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Hapus Bukti Transfer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Items Panel */}
              {isEditingItems ? (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-700">Daftar Varian dalam Pesanan:</div>
                  <div className="space-y-2">
                    {editingItems.map((item) => {
                      const prod = products.find((p) => p.id === item.product_id);
                      const getPackSizeFromName = (name: string): number => {
                        const clean = (name || '').toUpperCase().trim();
                        if (clean.endsWith('25K')) return 25;
                        if (clean.endsWith('5K')) return 5;
                        if (clean.endsWith('1K')) return 1;
                        return 25;
                      };
                      const sizeKg = getPackSizeFromName(item.product_name);
                      const stockKg = prod?.variant_stocks?.[String(sizeKg)] ?? 0;
                      const stockUnits = Math.max(0, Math.round(stockKg / sizeKg));
                      const isInsufficient = stockKg < item.qty_kg;

                      return (
                        <div
                          key={item.id}
                          className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border shadow-xs transition-colors ${
                            isInsufficient
                              ? 'bg-red-50/50 border-red-300'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="space-y-1 min-w-[200px]">
                            <div className="font-bold text-slate-800 text-sm">{item.product_name}</div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  isInsufficient
                                    ? 'bg-red-100 text-red-700 border-red-300'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                Sisa Stok: {stockUnits} Unit ({formatKg(stockKg)})
                              </span>
                              {isInsufficient && (
                                <span className="bg-red-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow-2xs">
                                  STOK TIDAK CUKUP
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-gray-500 font-medium">Qty (Kg):</span>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={item.qty_kg}
                                onChange={(e) => handleUpdateItemQty(item.id, Number(e.target.value))}
                                className={`w-20 bg-white border rounded px-2 py-1 font-mono font-bold text-center focus:outline-none ${
                                  isInsufficient
                                    ? 'border-red-400 text-red-700 bg-red-50/30'
                                    : 'border-gray-300 text-slate-800'
                                }`}
                              />
                            </div>

                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-gray-500 font-medium">Harga/Kg:</span>
                              <input
                                type="number"
                                step="50000"
                                value={item.unit_price_per_kg || 1500000}
                                onChange={(e) => handleUpdateItemPrice(item.id, Number(e.target.value))}
                                className="w-32 bg-white border border-gray-300 rounded px-2 py-1 font-mono font-bold text-slate-800 text-center"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded font-bold text-[11px] cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add New Variant Widget */}
                  <div className="border-t border-slate-200 pt-3 mt-2 space-y-2">
                    <div className="font-bold text-slate-700">Tambah Varian Baru ke Pesanan:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <select
                        value={addVariantId}
                        onChange={(e) => {
                          const varId = e.target.value;
                          setAddVariantId(varId);
                          const sel = allVariantsList.find(v => v.id === varId);
                          if (sel) setAddPricePerKg(sel.defaultPrice);
                        }}
                        className="bg-white border border-gray-300 rounded-lg p-2 text-slate-800 text-xs focus:outline-none"
                      >
                        <option value="">-- Pilih Varian Produk --</option>
                        {allVariantsList.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name} (Stok: {v.stockUnits} Unit / {v.stockKg} Kg • {formatIDR(v.defaultPrice)}/Kg)
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        placeholder="Kuantitas (Kg)"
                        value={addQtyKg || ''}
                        onChange={(e) => setAddQtyKg(Number(e.target.value))}
                        className="bg-white border border-gray-300 rounded-lg p-2 font-mono font-bold text-slate-850 text-xs"
                      />

                      <input
                        type="number"
                        placeholder="Harga / Kg (IDR)"
                        value={addPricePerKg || ''}
                        onChange={(e) => setAddPricePerKg(Number(e.target.value))}
                        className="bg-white border border-gray-300 rounded-lg p-2 font-mono font-bold text-slate-850 text-xs"
                      />

                      <button
                        type="button"
                        onClick={handleAddNewItem}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg p-2 transition-colors text-xs cursor-pointer"
                      >
                        + Tambah ke Daftar
                      </button>
                    </div>

                    {(() => {
                      const selectedVar = allVariantsList.find((v) => v.id === addVariantId);
                      if (!selectedVar) return null;
                      const isAddExceed = addQtyKg > selectedVar.stockKg;
                      return (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-100 p-2 rounded-lg border border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 font-medium">Sisa Stok Varian:</span>
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded border ${
                                selectedVar.stockKg <= 0
                                  ? 'bg-red-100 text-red-700 border-red-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {selectedVar.stockUnits} Unit ({formatKg(selectedVar.stockKg)})
                            </span>
                          </div>
                          {isAddExceed && (
                            <span className="text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded border border-red-300 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              Kuantitas ({addQtyKg} Kg) melebihi stok yang tersedia ({formatKg(selectedVar.stockKg)})
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  <div className="font-bold text-slate-700">Preview Varian Pesanan Saat Ini:</div>
                  <div className="space-y-1.5">
                    {editingItems.map((item) => {
                      const prod = products.find((p) => p.id === item.product_id);
                      const getPackSizeFromName = (name: string): number => {
                        const clean = (name || '').toUpperCase().trim();
                        if (clean.endsWith('25K')) return 25;
                        if (clean.endsWith('5K')) return 5;
                        if (clean.endsWith('1K')) return 1;
                        return 25;
                      };
                      const sizeKg = getPackSizeFromName(item.product_name);
                      const stockKg = prod?.variant_stocks?.[String(sizeKg)] ?? 0;
                      const stockUnits = Math.max(0, Math.round(stockKg / sizeKg));
                      const isInsufficient = stockKg < item.qty_kg;

                      return (
                        <div
                          key={item.id}
                          className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border text-xs transition-colors ${
                            isInsufficient
                              ? 'bg-red-50/60 border-red-300 text-red-900'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">• {item.product_name}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                isInsufficient
                                  ? 'bg-red-100 text-red-700 border-red-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              Sisa Stok: {stockUnits} Unit ({formatKg(stockKg)})
                            </span>
                            {isInsufficient && (
                              <span className="bg-red-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow-2xs">
                                STOK TIDAK CUKUP
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-slate-800">
                            {formatKg(item.qty_kg)} @ {formatIDR(item.unit_price_per_kg || 1500000)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2 Insufficient Stock Global Alert */}
              {(() => {
                const hasStep2InsufficientStock = editingItems.some((item) => {
                  const prod = products.find((p) => p.id === item.product_id);
                  const getPackSizeFromName = (name: string): number => {
                    const clean = (name || '').toUpperCase().trim();
                    if (clean.endsWith('25K')) return 25;
                    if (clean.endsWith('5K')) return 5;
                    if (clean.endsWith('1K')) return 1;
                    return 25;
                  };
                  const sizeKg = getPackSizeFromName(item.product_name);
                  const stockKg = prod?.variant_stocks?.[String(sizeKg)] ?? 0;
                  return stockKg < item.qty_kg;
                });

                if (!hasStep2InsufficientStock) return null;

                return (
                  <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 text-xs text-red-900 flex items-start gap-2.5 font-medium shadow-xs">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-red-800 block text-sm">
                        Peringatan: Sisa Stok Gudang Tidak Mencukupi
                      </span>
                      <p className="text-red-700 leading-relaxed">
                        Terdapat varian dalam pesanan dengan kuantitas yang melebihi sisa stok gudang yang tersedia. Mohon sesuaikan kuantitas varian sebelum menerbitkan Surat Jalan dan mengirim pesanan ke gudang.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Surat Jalan Details Form */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-3">
                <div className="font-bold text-blue-900">Penerbitan Surat Jalan (SBBK)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">Nomor Surat Jalan:</label>
                    <input
                      type="text"
                      id="sjNumberInput"
                      defaultValue={order.surat_jalan_number || `SJ-ART-2026-${order.so_number.split('-').pop() || '001'}`}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2.5 font-mono font-bold text-slate-850"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Nama Kurir Pengirim:</label>
                    <select
                      id="courierNameInput"
                      defaultValue={order.courier_name || (courierList[0]?.name ? `${courierList[0].name} (${courierList[0].vehicle_number || ''})` : 'Rian Pratama (Blind Van B 9482 SXZ)')}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2.5 font-bold text-slate-800 focus:outline-none"
                    >
                      {courierList.map((c) => {
                        const valueText = `${c.name} ${c.vehicle_number ? `(${c.vehicle_number})` : ''}`.trim();
                        return (
                          <option key={c.id} value={valueText}>
                            {c.name} {c.vehicle_number ? `(${c.vehicle_number})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap justify-between items-center gap-3 w-full">
                  <div className="font-bold text-slate-700 text-[11px]">
                    Total Tagihan Baru (Inc. PPN + Ongkir): <span className="font-mono text-sm text-blue-700">
                      {formatIDR((() => {
                        const goods = editingItems.reduce((sum, item) => sum + (item.unit_price_per_kg || 1500000) * item.qty_kg, 0);
                        const ppn = Math.round(goods * 0.11);
                        const ship = (order.shipping_type || shippingType) === 'FRANCO' ? 0 : Number(order.shipping_cost ?? shippingCost ?? 0);
                        return goods + ppn + ship;
                      })())}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      disabled={isApproving}
                      onClick={() => {
                        const sjNum = (document.getElementById('sjNumberInput') as HTMLInputElement)?.value || '';
                        const courier = (document.getElementById('courierNameInput') as HTMLInputElement)?.value || '';
                        handleConfirmAndIssueSuratJalan(sjNum, courier);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-lg shadow inline-flex items-center gap-1.5 transition-colors"
                    >
                      {isApproving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Memproses Alokasi FEFO...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Terbitkan Surat Jalan & Kirim ke Gudang
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelOrder}
                      className="bg-red-50 hover:bg-red-100 text-red-750 border border-red-200 font-bold px-4 py-2.5 rounded-lg shadow inline-flex items-center gap-1.5 transition-colors"
                    >
                      ✕ Batalkan Pesanan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Step 3: DIBAYAR (Compatibility fallback for old orders) -> PROSES GUDANG */}
          {order.status === 'DIBAYAR' && (
            <div className="bg-white p-4 rounded-lg border border-blue-100 text-xs space-y-3">
              <div className="font-bold text-purple-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                Langkah 3: Pembayaran Diterima (Migrasi Alur Lama)
              </div>
              <button
                onClick={handleAcceptPayment}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Terima Pembayaran (Teruskan ke Gudang: PROSES GUDANG)
              </button>
            </div>
          )}

          {/* Action Step 4: PROSES_GUDANG -> Dispatch -> DIKIRIM (Kurir) or DITERIMA (Ambil Langsung) */}
          {order.status === 'PROSES_GUDANG' && (
            <div className="bg-white p-4 rounded-lg border border-blue-100 text-xs space-y-3">
              <div className="font-bold text-indigo-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                <PackageCheck className="w-4.5 h-4.5 text-indigo-655" />
                Langkah 3: Petugas Gudang Mempersiapkan Varian Stok & No Batch
              </div>
              
              {/* Surat Jalan Detail Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Surat Jalan (SBBK) Terbit: #{order.surat_jalan_number || `SJ-ART-2026-${order.so_number.split('-').pop()}`}
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono font-bold text-[9px]">
                    DASAR SELEKSI BATCH
                  </span>
                </div>
                <div className="space-y-4 mt-2">
                  {order.items.map((item) => {
                    // Extract pack size from product name (e.g. "Oud Royale Intense (Agarwood) 25K" -> 25)
                    const resolvedName = getProductName(item);
                    const match = resolvedName.match(/(\d+)K$/);
                    const itemPackSize = match ? parseInt(match[1]) : null;

                    // Filter active batches of this product that match the specific packaging variant
                    const matchedBatches = batches
                      .filter((b) => {
                        const isSameProduct = b.product_id === item.product_id;
                        const hasStock = Number(b.current_qty_kg) > 0 || (Array.isArray(item.assigned_batches) && item.assigned_batches.some((ab: any) => ab.batch_number === b.batch_number));
                        if (!isSameProduct || !hasStock) return false;
                        
                        if (itemPackSize !== null) {
                          return b.pack_size_kg === itemPackSize;
                        }
                        return true;
                      })
                      .sort((a, b) => {
                        // FEFO: Earliest expiry date first at the top (posisi teratas)
                        const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
                        const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
                        return dateA - dateB;
                      });

                    // Calculate current total allocated across all lots for this item
                    const itemAlloc = multiBatchInputs[item.id] || {};
                    const totalAllocated = Object.values(itemAlloc).reduce((sum, q) => sum + (Number(q) || 0), 0);
                    const targetQty = Number(item.qty_kg) || 0;
                    const isQtyMatched = totalAllocated === targetQty;
                    const isQtyUnder = totalAllocated < targetQty;

                    return (
                      <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                        {/* Header Item: Product Name & Requirement */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-900 text-sm font-bold">{getProductName(item)}</span>
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
                              Dibutuhkan: {formatKg(targetQty)}
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => autoAllocateFEFOForItem(item, matchedBatches)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Auto Alokasi FEFO
                          </button>
                        </div>

                        {/* Lot Selection Table (Matching Spreadsheet Mockup) */}
                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                                <th className="py-2.5 px-3">Lot</th>
                                <th className="py-2.5 px-3">Expired Date</th>
                                <th className="py-2.5 px-3 text-right">Sisa Stok (kg)</th>
                                <th className="py-2.5 px-3 text-right w-44">Kuantitas (kg)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {matchedBatches.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-4 text-center text-slate-400 italic font-medium">
                                    Tidak ada stok batch lot aktif untuk varian ini di gudang.
                                  </td>
                                </tr>
                              ) : (
                                matchedBatches.map((b, bIdx) => {
                                  const isTopFEFO = bIdx === 0;
                                  const expDate = b.expiry_date
                                    ? new Date(b.expiry_date).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: '2-digit',
                                      }).replace(/ /g, '-')
                                    : '-';
                                  const daysLeft = b.expiry_date
                                    ? Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                    : null;
                                  const qtyValue = itemAlloc[b.id] !== undefined ? (itemAlloc[b.id] === 0 ? '' : itemAlloc[b.id]) : '';

                                  return (
                                    <tr key={b.id} className={`hover:bg-slate-50/80 transition-colors ${Number(qtyValue) > 0 ? 'bg-blue-50/40' : ''}`}>
                                      {/* Lot Column */}
                                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span>{b.batch_number}</span>
                                          {isTopFEFO && (
                                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-300">
                                              ⭐ FEFO Teratas
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* Expired Date Column */}
                                      <td className="py-2.5 px-3 text-slate-600 font-mono">
                                        <span>{expDate}</span>
                                        {daysLeft !== null && (
                                          <span className={`text-[10px] ml-1.5 font-semibold ${daysLeft <= 30 ? 'text-red-500' : 'text-slate-400'}`}>
                                            ({daysLeft <= 0 ? 'Expired' : `${daysLeft} hr`})
                                          </span>
                                        )}
                                      </td>

                                      {/* Sisa Stok (kg) Column */}
                                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                                        {Number(b.current_qty_kg) || 0}
                                      </td>

                                      {/* Kuantitas (kg) Input Column */}
                                      <td className="py-2.5 px-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <input
                                            type="number"
                                            min="0"
                                            max={Number(b.current_qty_kg) || 0}
                                            step="1"
                                            placeholder="0"
                                            value={qtyValue}
                                            onChange={(e) => handleBatchQtyChange(item.id, b.id, e.target.value, Number(b.current_qty_kg) || 0)}
                                            className={`w-24 border rounded-lg px-2.5 py-1 text-right font-mono font-bold text-xs focus:outline-none transition-colors ${
                                              Number(qtyValue) > 0
                                                ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-200'
                                                : 'bg-white border-slate-300 text-slate-800 focus:border-blue-500'
                                            }`}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const currentTotalOther = Object.entries(multiBatchInputs[item.id] || {})
                                                .filter(([key]) => key !== b.id)
                                                .reduce((sum, [_, q]) => sum + (Number(q) || 0), 0);
                                              const needed = Math.max(0, targetQty - currentTotalOther);
                                              const fillQty = Math.min(Number(b.current_qty_kg) || 0, needed);
                                              handleBatchQtyChange(item.id, b.id, String(fillQty), Number(b.current_qty_kg) || 0);
                                            }}
                                            title="Isi sisa kuantitas yang dibutuhkan"
                                            className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors"
                                          >
                                            Sisa
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Status Validation Bar per Item */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-600 font-semibold">Status Alokasi Lot:</span>
                            {isQtyMatched ? (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                Jumlah Sesuai ({totalAllocated} / {targetQty} Kg)
                              </span>
                            ) : isQtyUnder ? (
                              <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                Kurang {targetQty - totalAllocated} Kg lagi ({totalAllocated} / {targetQty} Kg)
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-800 border border-red-300 px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                                Berlebih +{totalAllocated - targetQty} Kg ({totalAllocated} / {targetQty} Kg)
                              </span>
                            )}
                          </div>

                          <span className="text-[11px] text-slate-400 font-medium">
                            Total Terpilih: <strong className="text-slate-700 font-mono">{totalAllocated} Kg</strong> dari <strong className="text-slate-700 font-mono">{targetQty} Kg</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[10px] text-slate-400 mt-2 font-medium flex justify-between items-center border-t border-slate-200 pt-2">
                  <span>Kurir Delivery: <strong className="text-slate-600">{order.courier_name || 'Rian Pratama'}</strong></span>
                  <span className="text-slate-600 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    Tabel Lot FEFO: Urutan Teratas &amp; Multi-Batch Diaktifkan
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleOpenCourierModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow inline-flex items-center gap-1.5 transition-colors"
                >
                  <Truck className="w-4 h-4" /> Serahkan ke Kurir (Kirim Kurir: Status DIKIRIM)
                </button>
                <button
                  onClick={handleOpenPODModal}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow inline-flex items-center gap-1.5 transition-colors"
                >
                  <UserCheck className="w-4 h-4" /> Serahkan ke Customer (Ambil Langsung: Status DITERIMA)
                </button>
              </div>
            </div>
          )}

          {/* Action Step 5: DIKIRIM -> Customer signs POD -> DITERIMA or CANCELLED */}
          {order.status === 'DIKIRIM' && (
            <div className="bg-white p-4 rounded-lg border border-blue-100 text-xs space-y-3">
              <div className="font-bold text-teal-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-teal-600" />
                Langkah 4: Barang Dalam Perjalanan (Kirim Kurir)
              </div>
              <div className="text-slate-650 leading-relaxed">
                Kurir sedang mengirimkan barang. Pada tahap ini pesanan tidak dapat diedit/mundur ke tahap sebelumnya. Kurir memvalidasi muatan yang dibawa, lalu customer membubuhkan tanda tangan digital pada penerimaan.
              </div>
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <button
                  onClick={handleOpenPODModal}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" /> Selesaikan Serah Terima POD & Tanda Tangan (Status: DITERIMA)
                </button>
                <button
                  onClick={handleCancelOrder}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs px-4 py-2 rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" /> Batalkan Pesanan & Kembalikan Stok
                </button>
              </div>
            </div>
          )}

          {/* Action Step 6: DITERIMA */}
          {order.status === 'DITERIMA' && (
            <div className="bg-white p-5 rounded-lg border border-emerald-200 text-xs space-y-3.5 text-slate-700 shadow-sm">
              <div className="font-bold text-emerald-700 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Pesanan Telah Diterima oleh Customer & POD Terverifikasi
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <div className="text-slate-400 font-semibold mb-0.5">Tanggal Penerimaan:</div>
                  <div className="font-bold text-slate-800">{order.delivered_date || '22 JUL 2026 20:31'}</div>
                  <div className="text-slate-400 font-semibold mt-2.5 mb-0.5">Nama Penerima:</div>
                  <div className="font-bold text-slate-800">{order.received_by || order.customer_name || 'Customer PIC'}</div>
                </div>
                {order.received_photo && (
                  <div>
                    <div className="text-slate-400 font-semibold mb-1">Foto Bukti Penerimaan:</div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-1 max-w-[150px] shadow-sm">
                      <img src={order.received_photo} alt="Foto Penerimaan" className="w-full h-auto max-h-[100px] object-contain rounded" />
                    </div>
                  </div>
                )}
                {order.received_signature && (
                  <div>
                    <div className="text-slate-400 font-semibold mb-1">Tanda Tangan Digital:</div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50 p-1 max-w-[150px] shadow-sm">
                      <img src={order.received_signature} alt="Tanda Tangan" className="w-full h-auto max-h-[100px] object-contain rounded bg-white" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Item Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-slate-800">
              Item ({order.items.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wide font-semibold">
                  <th className="px-6 py-3">Material / Bibit Parfum</th>
                  <th className="px-6 py-3">Pesanan (Kg)</th>
                  <th className="px-6 py-3">Alasan / Catatan</th>
                  <th className="px-6 py-3">Dikonfirmasi (Rp/Kg)</th>
                  <th className="px-6 py-3">Dialokasikan (Batch FEFO)</th>
                  <th className="px-6 py-3">Dikirim</th>
                  <th className="px-6 py-3">Diterima</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    {/* Material */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{getProductName(item)}</div>
                      <div className="text-xs text-blue-600 font-mono">
                        Ref SKU: FO-{item.product_id.toUpperCase()}
                      </div>
                    </td>

                    {/* Pesanan */}
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">
                      {formatKg(item.qty_kg)}
                    </td>

                    {/* Alasan */}
                    <td className="px-6 py-4 text-xs text-slate-500">
                      Formulasi Eceran Presisi
                    </td>

                    {/* Dikonfirmasi */}
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">
                      {item.unit_price_per_kg ? (
                        formatIDR(item.unit_price_per_kg)
                      ) : (
                        <span className="text-xs text-amber-600 italic">Menunggu Harga</span>
                      )}
                    </td>

                    {/* Dialokasikan (Batch) */}
                    <td className="px-6 py-4 text-xs">
                      {item.assigned_batches && item.assigned_batches.length > 0 ? (
                        <div className="space-y-1">
                          {item.assigned_batches.map((b, idx) => (
                            <span
                              key={idx}
                              className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-mono font-semibold block text-center"
                            >
                              {b.batch_number}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belum Alokasi</span>
                      )}
                    </td>

                    {/* Dikirim */}
                    <td className="px-6 py-4 font-mono font-semibold text-slate-700">
                      {order.status === 'DIKIRIM' || order.status === 'DITERIMA'
                        ? formatKg(item.qty_kg)
                        : '-'}
                    </td>

                    {/* Diterima */}
                    <td className="px-6 py-4 font-mono font-semibold text-emerald-700">
                      {order.status === 'DITERIMA' ? (
                        <>
                          {formatKg(item.qty_kg)}
                          <div className="text-[11px] text-blue-600 cursor-pointer underline font-normal">
                            Lihat Varian Produk
                          </div>
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <POPDFModal
        isOpen={isPOPDFOpen}
        onClose={() => setIsPOPDFOpen(false)}
        po={{
          id: 'po-sample',
          po_number: `PO-ART-2026-${order.so_number.split('-').pop() || '001'}`,
          distributor_id: 'dist-001',
          distributor_name: 'PT Givaudan Fragrances Indonesia',
          status: 'DITERIMA',
          order_date: order.order_date.split(' ')[0],
          total_amount: order.grand_total || 29500000,
          items: order.items.map((item, idx) => ({
            id: `poi-${idx}`,
            po_id: 'po-sample',
            product_id: item.product_id,
            product_name: item.product_name,
            qty_ordered_kg: item.qty_kg,
            cost_per_kg: item.unit_price_per_kg || 1180000,
            subtotal: item.subtotal || item.qty_kg * (item.unit_price_per_kg || 1180000),
          })),
        }}
      />

      {isPODModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-250 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Truck className="w-5 h-5 text-blue-600 animate-pulse" />
                Bukti Penerimaan Barang (Proof of Delivery)
              </h3>
              <button
                onClick={() => setIsPODModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Recipient Name */}
              <div className="space-y-1">
                <label className="text-slate-600 font-bold block">Nama Penerima (PIC):</label>
                <input
                  type="text"
                  value={podReceivedBy}
                  onChange={(e) => setPodReceivedBy(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-300 rounded-lg p-2.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Masukkan nama penerima barang..."
                />
              </div>

              {/* Photo Attachment */}
              <div className="space-y-1.5">
                <label className="text-slate-600 font-bold block">Foto Bukti Penerimaan:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('podPhotoFileInput');
                      if (input) input.click();
                    }}
                    className="bg-white hover:bg-slate-50 border border-gray-300 text-slate-700 font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <FileText className="w-4 h-4 text-slate-500" /> Unggah Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPodPhoto(`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%23475569">Bukti Penerimaan - PT Artaroma Fragrance</text></svg>`);
                    }}
                    className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    📷 Kamera (Simulasi)
                  </button>
                  <input
                    type="file"
                    id="podPhotoFileInput"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            setPodPhoto(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                {podPhoto ? (
                  <div className="mt-2 relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center p-2">
                    <img src={podPhoto} alt="Preview Bukti Foto" className="max-h-[120px] rounded object-contain" />
                    <button
                      type="button"
                      onClick={() => setPodPhoto('')}
                      className="absolute top-1 right-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold p-1 rounded-full text-[9px] w-5 h-5 flex items-center justify-center shadow-sm"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center text-slate-400 text-[10px]">
                    Belum ada bukti foto diunggah
                  </div>
                )}
              </div>

              {/* Signature Pad */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-slate-600 font-bold block">Tanda Tangan Penerima:</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-red-500 hover:text-red-700 font-bold text-[10px]"
                    >
                      Bersihkan
                    </button>
                    <span className="text-slate-200">|</span>
                    <button
                      type="button"
                      onClick={useDefaultSignature}
                      className="text-blue-500 hover:text-blue-700 font-bold text-[10px]"
                    >
                      Tanda Tangan Cepat
                    </button>
                  </div>
                </div>
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-slate-50 shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={350}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full bg-white block cursor-crosshair touch-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPODModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const canvas = canvasRef.current;
                  const finalSig = canvas ? canvas.toDataURL() : '';
                  handleConfirmPOD(podReceivedBy, podPhoto, finalSig);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-xs transition-colors shadow-md flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Konfirmasi Penerimaan
              </button>
            </div>
          </div>
        </div>
      )}

      {isCourierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-250 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Truck className="w-5 h-5 text-indigo-600 animate-bounce" />
                Konfirmasi Muatan Kurir (Handover)
              </h3>
              <button
                onClick={() => setIsCourierModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 space-y-1">
                <div className="text-slate-700">Nama Kurir: <strong className="text-indigo-900 font-bold">{order.courier_name || 'Rian Pratama'}</strong></div>
                <div className="text-[10px] text-indigo-700 font-medium">Harap periksa dan tandai setiap produk di bawah untuk mengonfirmasi muatan telah dimuat ke dalam kendaraan.</div>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {order.items.map((item) => {
                  const selectedBatchId = selectedBatches[item.id];
                  const batchObj = batches.find((b) => b.id === selectedBatchId);
                  const batchNum = batchObj ? batchObj.batch_number : 'LOT-2026-FEFO';
                  const qtyTaken = batchQuantities[item.id] !== undefined ? batchQuantities[item.id] : item.qty_kg;

                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                        checkedCourierItems[item.id]
                          ? 'bg-indigo-50/30 border-indigo-200'
                          : 'bg-white border-gray-200 hover:bg-slate-50/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!checkedCourierItems[item.id]}
                        onChange={(e) =>
                          setCheckedCourierItems({
                            ...checkedCourierItems,
                            [item.id]: e.target.checked,
                          })
                        }
                        className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <div className="flex-1 space-y-0.5">
                        <div className="font-bold text-slate-800">{getProductName(item)}</div>
                        <div className="text-[10px] text-slate-500 flex justify-between">
                          <span>No. Batch: <strong className="text-slate-700 font-mono font-bold">{batchNum}</strong></span>
                          <span>Jumlah: <strong className="text-indigo-750 font-bold">{formatKg(qtyTaken)}</strong></span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 flex gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCourierModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={order.items.some((item) => !checkedCourierItems[item.id])}
                onClick={() => {
                  handleDispatchOrder();
                  setIsCourierModalOpen(false);
                }}
                className={`flex-1 font-bold py-2.5 rounded-lg text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 ${
                  order.items.some((item) => !checkedCourierItems[item.id])
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <Check className="w-3.5 h-3.5" /> Konfirmasi & Kirim
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Dialog: Konfirmasi Alasan Pembatalan Pesanan */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-extrabold text-base">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </div>
                <span>Konfirmasi Pembatalan Pesanan</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Warning Message */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed font-medium">
              Apakah Anda yakin ingin membatalkan pesanan <strong>{order.so_number}</strong>? Status pesanan akan diubah menjadi <span className="font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">CANCELLED</span>.
            </div>

            {/* Input Alasan Pembatalan */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Pilih / Tuliskan Alasan Pembatalan <span className="text-red-500">*</span>
              </label>

              {/* Quick Template Choices */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Permintaan Customer (Batal Beli)',
                  'Stok Gudang Tidak Mencukupi',
                  'Gagal / Ditolak Verifikasi Pembayaran',
                  'Duplikasi / Kesalahan Input Pesanan',
                  'Lainnya',
                ].map((reasonOption) => {
                  const isSelected = cancelReason === reasonOption;
                  return (
                    <button
                      key={reasonOption}
                      type="button"
                      onClick={() => setCancelReason(reasonOption)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-colors text-left ${
                        isSelected
                          ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-300'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {reasonOption}
                    </button>
                  );
                })}
              </div>

              {/* Detailed Notes Field */}
              <div className="pt-1">
                <textarea
                  rows={3}
                  value={cancelCustomNotes}
                  onChange={(e) => setCancelCustomNotes(e.target.value)}
                  placeholder={
                    cancelReason === 'Lainnya'
                      ? 'Tuliskan alasan pembatalan secara rinci di sini...'
                      : 'Catatan tambahan alasan pembatalan...'
                  }
                  className="w-full text-xs bg-slate-50 border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 rounded-xl p-3 text-slate-800 focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Kembali (Jangan Batalkan)
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors flex items-center gap-1.5"
              >
                ✕ Konfirmasi Batalkan Pesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Surat Jalan (SBBK) PDF Modal */}
      <SuratJalanPDFModal
        isOpen={isSuratJalanPDFOpen}
        onClose={() => setIsSuratJalanPDFOpen(false)}
        order={order}
        selectedTripNumber={selectedSuratJalanTrip}
        companyConfig={companyConfig}
      />

      {/* Sales Order PDF Modal */}
      <SalesOrderPDFModal
        isOpen={isSalesOrderPDFOpen}
        onClose={() => setIsSalesOrderPDFOpen(false)}
        order={order}
        companyConfig={companyConfig}
      />

      {/* Invoice PDF Modal */}
      <InvoicePDFModal
        isOpen={isInvoicePDFOpen}
        onClose={() => setIsInvoicePDFOpen(false)}
        order={order}
        invoice={invoice}
        companyConfig={companyConfig}
      />

      {/* Print Label Modal */}
      <PrintLabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        order={order}
        companyConfig={companyConfig}
      />

      {/* Print Shipping Address Modal */}
      <PrintShippingAddressModal
        isOpen={isShippingAddressModalOpen}
        onClose={() => setIsShippingAddressModalOpen(false)}
        order={order}
        companyConfig={companyConfig}
      />
    </div>
  );
}
