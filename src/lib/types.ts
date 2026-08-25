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
  pack_size_kg?: number; // 25, 5, 1, or sample sizes (0.05, 0.1, 0.25, 0.5)
  unit_count?: number; // e.g. 10 jerigen/botol
  po_item_id?: string;
  production_date: string;
  expiry_date: string;
  initial_qty_kg: number;
  current_qty_kg: number;
  unit_cost_per_kg: number;
  is_expired: boolean;
  created_at: string;
  is_sample?: boolean;
  supplier_name?: string;
  sample_target?: string;
  sample_notes?: string;
  sample_status?: 'UJI_COBA' | 'DISETUJUI_PO' | 'DITOLAK' | 'HABIS';
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
  'Manajemen Kas',
  'Log Book & Arsip',
  'Aplikasi Kurir',
  'Katalog Customer',
  'Lihat Nilai Finansial (PO/SO)',
  'Lihat Nilai Finansial (Dashboard)',
  'Ekspor Data (XLSX)',
] as const;

export type SystemModule = (typeof SYSTEM_MODULES)[number];

export interface NotificationPreferences {
  orders?: boolean;      // 📦 Pesanan Baru Masuk (Sales Orders)
  payments?: boolean;    // 💳 Bukti Transfer Pembayaran Diunggah
  dues?: boolean;        // ⚠️ Tagihan Piutang Jatuh Tempo & Overdue
  stock?: boolean;       // 🧪 Peringatan Stok Menipis & Expired (FEFO)
  deliveries?: boolean;  // 🛵 Pengiriman & Foto Serah Terima Kurir (POD)
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
  linked_entity_name?: string;
  allowed_modules?: string[];
  notification_preferences?: NotificationPreferences;
  registered_devices_count?: number;
  registered_devices?: Array<{ id: string; user_agent?: string; updated_at?: string }>;
  is_active: boolean;
  is_hidden?: boolean;
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
  unit_price?: number;
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

export interface POPaymentRecord {
  id?: string;
  payment_date: string;
  amount: number;
  remaining_after: number;
  bank_account_id?: string;
  bank_name?: string;
  reference_no?: string;
  payment_proof_url?: string;
  payment_notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  distributor_id: string;
  distributor_name: string;
  status: POStatus;
  payment_method?: 'TUNAI' | 'KREDIT';
  payment_terms_days?: number;
  due_date?: string;
  currency?: string;
  exchange_rate?: number;
  foreign_total_amount?: number;
  order_date: string;
  total_amount: number;
  paid_amount?: number;
  payment_status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  payment_proof_url?: string;
  payment_reference_no?: string;
  payment_bank_id?: string;
  payment_bank_name?: string;
  payment_history?: POPaymentRecord[];
  last_payment_date?: string;
  items: POItem[];
  shipments?: POShipment[];
  created_by?: string;
  shipped_by?: string;
  received_by?: string;
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
  payment_status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  payment_proof_url?: string;
  received_by?: string;
  received_photo?: string;
  received_signature?: string;
  created_by?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  warehouse_processed_by?: string;
  warehouse_processed_at?: string;
  shipped_by?: string;
  shipped_at?: string;
  // Cancellation fields
  cancellation_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  // Super Admin Credit Approval fields (Plafon Kredit / Overdue Invoice)
  requires_super_admin_approval?: boolean;
  credit_approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  credit_approval_by?: string;
  credit_approval_date?: string;
  credit_warning?: 'MELEBIHI_PLAFON' | 'OVERDUE_INVOICE' | 'MELEBIHI_PLAFON_DAN_OVERDUE';
  credit_limit_amount?: number;
  current_piutang_amount?: number;
  projected_piutang_amount?: number;
  credit_approval_notes?: string;
}

export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

export interface InvoicePaymentRecord {
  id: string;
  payment_date: string;
  amount: number;
  remaining_after: number;
  bank_account_id?: string;
  bank_name?: string;
  payment_proof_url?: string;
  payment_notes?: string;
  verified_by?: string;
  created_at?: string;
}

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
  payment_notes?: string;
  last_payment_date?: string;
  payment_history?: InvoicePaymentRecord[];
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

// Cash & Treasury Management Types
export type CashAccountType =
  | 'KAS_BESAR_BANK'
  | 'KAS_BESAR_TUNAI'
  | 'KAS_KANTOR'
  | 'KAS_KECIL'
  | 'KAS_SALES';

export type CashTxType = 'IN' | 'OUT' | 'TRANSFER';

export type CashCategory =
  | 'PENJUALAN_SO'
  | 'PEMBELIAN_PO'
  | 'TOPUP_KAS'
  | 'OPERASIONAL_KANTOR'
  | 'PETTY_CASH'
  | 'SALES_OPS'
  | 'SETOR_BALIK'
  | 'GAJI_KARYAWAN'
  | 'PAJAK'
  | 'MODAL_PEMILIK'
  | 'LAINNYA';

export interface CashAccount {
  id: string;
  name: string;
  type: CashAccountType;
  account_number?: string;
  bank_name?: string;
  holder_name?: string;
  initial_balance: number;
  current_balance: number;
  pic_name?: string;
  description?: string;
  badge_color?: string;
  is_active: boolean;
}

export interface CashTransaction {
  id: string;
  tx_number: string; // e.g. BKM-202608-0001, BKK-202608-0001, TRF-202608-0001
  date: string;
  account_id: string;
  account_name: string;
  tx_type: CashTxType;
  category: CashCategory;
  amount: number;
  balance_after: number;
  recipient_or_payer: string;
  reference_number?: string; // No. SO / No. Invoice / No. PO / No. Pengajuan
  notes?: string;
  proof_url?: string;
  created_by?: string;
  transfer_pair_id?: string; // Links transfer in & transfer out
  status: 'VERIFIED' | 'DRAFT';
  created_at?: string;
}

export type UserRole = 'ADMIN' | 'FINANCE' | 'SALES' | 'CUSTOMER' | 'COURIER' | 'WAREHOUSE';

export interface StockOpnameDraftItem {
  batch_id: string;
  product_id: string;
  product_name?: string;
  variant_sku?: string;
  batch_number: string;
  pack_size_kg: number;
  system_qty_kg: number;
  physical_qty_kg: number;
  difference_qty_kg: number;
  notes?: string;
}

export interface StockOpnameDraft {
  id: string;
  draft_number: string;
  title: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  created_at: string;
  created_by: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  general_notes?: string;
  total_items: number;
  total_system_kg: number;
  total_physical_kg: number;
  total_difference_kg: number;
  items: StockOpnameDraftItem[];
}
