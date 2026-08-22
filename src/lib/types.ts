export type FragranceFamily = 'Floral' | 'Citrus' | 'Woody' | 'Oriental' | 'Fresh' | 'Gourmand';

export interface Product {
  id: string;
  sku: string;
  name: string;
  applications: string[]; // e.g. ['Industry', 'Fine Fragrance']
  application?: string;
  fragrance_family?: string;
  pack_sizes?: number[]; // e.g. [25, 5, 1] (Kg)
  top_notes: string;
  middle_notes: string;
  base_notes: string;
  density?: number;
  min_stock_kg: number;
  selling_price_per_kg: number;
  selling_price_usd_per_kg?: number;
  variant_prices?: Record<number, number>;
  variant_names?: Record<number, string>;
  variant_skus?: Record<number, string>;
  variants?: ProductVariant[];
  variant_stocks?: Record<string, number>;
  is_active: boolean;
  total_stock_kg?: number;
  image_url?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_sku: string; // e.g. 'FO-VAN-001-25K'
  variant_name: string; // e.g. 'Vanilla Bourbon Super Pure 25K'
  pack_size_kg: number; // 25, 5, or 1
  selling_price_per_kg: number; // e.g. 3850000
  selling_price_usd_per_kg?: number;
  min_stock_kg?: number;
  is_active?: boolean;
  created_at?: string;
  sku?: string;
  label?: string;
  stock_units?: number;
  total_stock_kg?: number;
}

export interface StockBatch {
  id: string;
  batch_number: string;
  product_id: string;
  product_name?: string;
  variant_sku?: string; // e.g. 'FO-VAN-001-25K'
  pack_size_kg?: number; // 25, 5, or 1
  unit_count?: number; // e.g. 10 jerigen/botol
  po_item_id?: string;
  production_date: string;
  expiry_date: string;
  initial_qty_kg: number;
  current_qty_kg: number;
  unit_cost_per_kg: number;
  is_expired: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  code: string;
  company_name: string;
  pic_name: string;
  email: string;
  username?: string;
  password?: string;
  phone: string;
  pic_name_2?: string;
  phone_2?: string;
  pic_name_3?: string;
  phone_3?: string;
  address: string;
  office_address?: string;
  shipping_lat?: string;
  shipping_lng?: string;
  default_courier_id?: string;
  default_courier_name?: string;
  default_shipping_cost?: number;
  default_shipping_type?: 'FRANCO' | 'LOCO';
  delivery_notes?: string;
  npwp?: string;
  ktp_file?: string;        // filename/URL of uploaded KTP scan
  npwp_file?: string;       // filename/URL of uploaded NPWP scan
  bank_name?: string;       // e.g. 'BCA', 'Mandiri'
  bank_account_number?: string;
  bank_account_name?: string;
  is_credit_eligible?: boolean;
  credit_limit: number;
  credit_terms_days: number;
  current_piutang: number;
  has_overdue: boolean;
  is_active: boolean;
  allowed_product_ids?: string[];
  created_at: string;
}

export interface Distributor {
  id: string;
  code: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  top_payable_days?: number;
  bank_account?: string;
  npwp?: string;
  notes?: string;
  supplied_product_ids?: string[];
  created_at?: string;
}

export interface Courier {
  id: string;
  code: string;
  name: string;
  phone: string;
  vehicle_number: string;
  courier_type?: 'INTERNAL' | 'EKSTERNAL';
  service_type?: string;
  notes?: string;
  is_active: boolean;
  linked_user_id?: string | null;
  linked_user_email?: string | null;
  has_login_account?: boolean;
}

export const SYSTEM_MODULES = [
  'Dashboard',
  'Master Data',
  'Purchase Order (PO)',
  'Sales Order (SO)',
  'Lihat Stok (Gudang)',
  'Edit Batch & ED (Gudang)',
  'Finance & Invoice',
  'Log Book & Arsip',
  'Aplikasi Kurir',
  'Katalog Customer',
  'Lihat Nilai Finansial (PO/SO)',
  'Lihat Nilai Finansial (Dashboard)',
  'Ekspor Data (XLSX)',
] as const;

export type SystemModule = (typeof SYSTEM_MODULES)[number];

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
  linked_entity_name?: string;
  allowed_modules?: string[];
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export type POStatus =
  | 'BUAT_EMAIL'
  | 'DIKIRIM'
  | 'DITERIMA'
  | 'CANCELLED'
  | 'DIBATALKAN';

export interface POItem {
  id: string;
  po_id: string;
  product_id: string;
  variant_sku?: string;   // e.g. 'FO-VAN-001-25K'
  product_name: string;   // variant name, e.g. 'Vanilla Bourbon Super Pure 25K'
  qty_ordered_kg: number;
  qty_shipped_kg?: number;
  foreign_cost_per_kg?: number;
  foreign_subtotal?: number;
  cost_per_kg: number;
  subtotal: number;
}

export interface POShipmentItem {
  po_item_id?: string;   // links back to the specific POItem (not just the product)
  product_id: string;
  qty_shipped_kg: number;
}

export interface POShipment {
  id: string;
  trip_number: number;
  shipment_date: string;
  surat_jalan_number?: string;
  surat_jalan_name?: string;
  surat_jalan_data?: string; // base64 or URL of the uploaded document
  status: 'DIKIRIM' | 'DITERIMA';
  items: POShipmentItem[];
  received_date?: string;
  batch_number?: string;
  expiry_date?: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  distributor_id: string;
  distributor_name: string;
  status: POStatus;
  payment_method?: 'TUNAI' | 'KREDIT';
  payment_terms_days?: number;
  currency?: string;
  exchange_rate?: number;
  foreign_total_amount?: number;
  order_date: string;
  total_amount: number;
  items: POItem[];
  shipments?: POShipment[];
  // Cancellation fields
  cancellation_note?: string;
  cancelled_at?: string;
  cancelled_by?: string;
}

export type PaymentMethod = 'LUNAS_TRANSFER' | 'TEMPO';

export type SOStatus =
  | 'DIAJUKAN'
  | 'PENDING_APPROVAL'
  | 'DIKONFIRMASI'
  | 'APPROVED'
  | 'DIBAYAR'
  | 'PROSES_GUDANG'
  | 'DIKIRIM'
  | 'DITERIMA'
  | 'CANCELLED';

export interface SOItem {
  id: string;
  so_id: string;
  product_id: string;
  product_name: string;
  qty_kg: number;
  original_qty_kg?: number;
  unit_price_per_kg?: number;
  subtotal?: number;
  assigned_batches?: { batch_number: string; qty_taken_kg: number }[];
}

export interface SOShipmentItem {
  so_item_id?: string;
  product_id: string;
  product_name?: string;
  qty_shipped_kg: number;
  assigned_batches?: { batch_number: string; qty_taken_kg: number }[];
}

export interface SOShipment {
  id: string;
  trip_number: number;
  surat_jalan_number: string;
  shipment_date: string;
  status: 'MENUNGGU_GUDANG' | 'PROSES_GUDANG' | 'DIKIRIM' | 'DITERIMA';
  courier_name?: string;
  items: SOShipmentItem[];
  received_by?: string;
  received_photo?: string;
  received_signature?: string;
  delivered_date?: string;
  notes?: string;
}

export interface SalesOrder {
  id: string;
  so_number: string;
  customer_id: string;
  customer_name: string;
  customer_company: string;
  courier_id?: string;
  courier_name?: string;
  surat_jalan_number?: string;
  status: SOStatus;
  payment_method: PaymentMethod;
  shipping_type?: 'FRANCO' | 'LOCO';
  shipping_cost?: number;
  total_goods_amount?: number;
  grand_total?: number;
  order_date: string;
  delivered_date?: string;
  items: SOItem[];
  shipments?: SOShipment[];
  invoice_id?: string;
  received_by?: string;
  received_photo?: string;
  received_signature?: string;
  // Cancellation fields
  cancellation_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string;
}

export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

export interface Invoice {
  id: string;
  invoice_number: string;
  so_id: string;
  so_number: string;
  customer_id: string;
  customer_name: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  shipping_type?: 'FRANCO' | 'LOCO';
  shipping_cost?: number;
  total_amount: number;
  paid_amount: number;
  faktur_pajak_file_url?: string;
  payment_proof_url?: string;
  payment_verification_status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

export interface DeliveryCheckitem {
  product_id: string;
  product_name: string;
  batch_number: string;
  qty_kg: number;
  pack_size_kg?: number;
  verified: boolean;
}

export interface DeliveryTask {
  id: string;
  so_id: string;
  so_number: string;
  surat_jalan_number?: string;
  courier_id: string;
  customer_id?: string;
  customer_name: string;
  company_name: string;
  delivery_address: string;
  phone: string;
  status: 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'PENDING';
  items: DeliveryCheckitem[];
  recipient_name?: string;
  proof_photo_url?: string;
  digital_signature_url?: string;
  delivered_at?: string;
}

export type UserRole = 'ADMIN' | 'FINANCE' | 'SALES' | 'CUSTOMER' | 'COURIER' | 'WAREHOUSE';
