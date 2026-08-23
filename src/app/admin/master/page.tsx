'use client';

import React, { useState, useEffect } from 'react';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import {
  initialProducts,
  initialCustomers,
  initialDistributors,
  initialCouriers,
  initialAppUsers,
} from '@/lib/mock-data';
import { Customer, Product, Distributor, Courier, AppUser, FragranceFamily, UserRole } from '@/lib/types';
import { formatIDR, formatKg } from '@/lib/utils';
import { getUsdExchangeRate, setUsdExchangeRate, convertUsdToIdr } from '@/lib/currency-store';
import {
  getApplications,
  addApplicationCategory,
  updateApplicationCategory,
  deleteApplicationCategory,
} from '@/lib/application-store';
import {
  Database,
  Plus,
  Search,
  Building2,
  Truck,
  Users,
  Package,
  ShieldAlert,
  CheckCircle2,
  Pencil,
  Trash2,
  Settings,
  X,
  Check,
  Save,
  Key,
  Lock,
  UserCheck,
  Mail,
  CreditCard,
  Shield,
  ShieldCheck,
  RotateCcw,
  Tag,
  Landmark,
  Banknote,
  FileText,
  TrendingUp,
  Loader2,
  Info,
  Coins,
  Globe,
  FileSpreadsheet,
  Palette,
  Sparkles,
  Sliders,
  Sun,
  Moon,
  Contrast,
  LayoutGrid,
  Type,
  Eye,
  Zap,
  Upload,
} from 'lucide-react';
import {
  exportUsersToXLSX,
  exportProductsToXLSX,
  exportPricelistToXLSX,
  exportPricelistTemplateXLSX,
  exportCustomersToXLSX,
  exportDistributorsToXLSX,
  exportCouriersToXLSX,
  exportToXLSX,
} from '@/lib/export-excel';
import BulkPriceModal from '@/components/admin/bulk-price-modal';
import ImportPricelistModal from '@/components/admin/import-pricelist-modal';
import { canUserExportXLSX } from '@/lib/auth';
import {
  ThemeSettings,
  THEME_PRESETS,
  getThemeSettings,
  saveThemeSettings,
  resetThemeSettings,
} from '@/lib/theme-store';

type Tab = 'products' | 'customers' | 'distributors' | 'couriers' | 'users' | 'finance' | 'access' | 'pricelist' | 'config' | 'appearance';

const TAB_LABELS: Record<string, string> = {
  products: 'PRODUK',
  customers: 'CUSTOMER',
  distributors: 'SUPLIER',
  couriers: 'KURIR',
  users: 'PENGGUNA',
  finance: 'KEUANGAN & BANK',
  access: 'AKSES PENGGUNA',
  pricelist: 'PRICELIST UMUM',
  config: 'PENGATURAN',
  appearance: 'TAMPILAN & TEMA',
};

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [usdRate, setUsdRate] = useState<number>(16250);
  const [usdRateInput, setUsdRateInput] = useState<number>(16250);
  const [isRateSavedAlert, setIsRateSavedAlert] = useState<boolean>(false);

  // Pricelist states
  const [isPricelistModalOpen, setIsPricelistModalOpen] = useState(false);
  const [selectedProductForPricelist, setSelectedProductForPricelist] = useState<Product | null>(null);
  const [pricelistForm, setPricelistForm] = useState<Record<string, { currency: 'IDR' | 'USD'; value: number }>>({});
  const [isPricelistSubmitting, setIsPricelistSubmitting] = useState(false);
  const [pricelistSubTab, setPricelistSubTab] = useState<'active' | 'history'>('active');
  const [priceLogs, setPriceLogs] = useState<any[]>([]);
  const [priceLogsLoading, setPriceLogsLoading] = useState(false);
  const [selectedProductIdsForFilter, setSelectedProductIdsForFilter] = useState<string[]>([]);
  const [isProductFilterDropdownOpen, setIsProductFilterDropdownOpen] = useState(false);

  // Company profile / warehouse config states
  const [companyConfig, setCompanyConfig] = useState<any>({
    company_name: 'PT Artaroma Jayatama',
    company_tagline: 'B2B Fragrance Oil Supplier & Management Hub',
    warehouse_address: 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272',
    logistics_pic: 'Tim Gudang FEFO Engine',
    delivery_schedule_rule: 'Max 7 Hari setelah PO diterbitkan',
    bank_accounts: [
      { bank: 'Bank Central Asia (BCA)', no: '882-019-3881', atas_nama: 'PT Artaroma Jayatama', jenis: 'Rekening Operasional', badge: 'bg-blue-100 text-blue-800' },
      { bank: 'Bank Mandiri', no: '156-00-1928374-1', atas_nama: 'PT Artaroma Jayatama', jenis: 'Rekening Giro Bisnis', badge: 'bg-yellow-100 text-yellow-800' },
      { bank: 'Bank BNI', no: '009-445-8876', atas_nama: 'PT Artaroma Jayatama', jenis: 'Rekening Cadangan', badge: 'bg-orange-100 text-orange-800' },
    ],
    payment_settings: {
      top_payable: '30 Hari',
      top_receivable: '30 Hari',
      late_fee: '1.5%',
      currency: 'IDR (Rupiah Indonesia)',
      ppn: '11%'
    },
    tax_documents: {
      npwp: '01.987.654.3-041.000',
      nppkp: '01.987.654.3-041.000',
      nib: '1234567890123',
      legal_name: 'PT Artaroma Jayatama',
      address: 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272'
    }
  });
  const [configSaving, setConfigSaving] = useState(false);

  // States for Finance & Bank Modals
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBankIndex, setEditingBankIndex] = useState<number | null>(null);
  const [bankForm, setBankForm] = useState({
    bank: '',
    no: '',
    atas_nama: '',
    jenis: '',
    badge: 'bg-blue-100 text-blue-800'
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    top_payable: '30 Hari',
    top_receivable: '30 Hari',
    late_fee: '1.5%',
    currency: 'IDR (Rupiah Indonesia)',
    ppn: '11%'
  });

  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [taxForm, setTaxForm] = useState({
    npwp: '01.987.654.3-041.000',
    nppkp: '01.987.654.3-041.000',
    nib: '1234567890123',
    legal_name: 'PT Artaroma Jayatama',
    address: 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272'
  });

  // Product Creation Type State: TEMPLATE vs VARIANT
  const [productEntryType, setProductEntryType] = useState<'TEMPLATE' | 'VARIANT'>('TEMPLATE');
  const [selectedParentProductId, setSelectedParentProductId] = useState<string>('');
  const [variantPackSize, setVariantPackSize] = useState<number>(25);
  const [variantPricePerKg, setVariantPricePerKg] = useState<number>(1850000);
  const [variantMinStockKg, setVariantMinStockKg] = useState<number>(25);
  const [variantNameInput, setVariantNameInput] = useState<string>('');
  const [variantSkuInput, setVariantSkuInput] = useState<string>('');

  // Application Categories state for Super Admin management
  const [applicationCategories, setApplicationCategories] = useState<string[]>(['Industry', 'Fine Fragrance']);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ oldName: string; newName: string } | null>(null);

  // Bulk Price Adjustment & Import Pricelist States
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [isImportPricelistModalOpen, setIsImportPricelistModalOpen] = useState(false);

  // Appearance & Theme Settings States & Handlers
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => getThemeSettings());
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSavedAlert, setThemeSavedAlert] = useState<string | null>(null);

  const handleApplyPreset = (presetKey: string) => {
    const preset = THEME_PRESETS[presetKey];
    if (!preset) return;
    const updated: ThemeSettings = {
      ...themeSettings,
      colorPreset: preset.id,
      primaryColor: preset.primaryColor,
      primaryHover: preset.primaryHover,
      primaryLight: preset.primaryLight,
      primaryText: preset.primaryText,
      backgroundTone: preset.backgroundTone,
    };
    setThemeSettings(updated);
    saveThemeSettings(updated);
    setThemeSavedAlert(`Tema "${preset.name}" berhasil diaktifkan dan diterapkan!`);
    setTimeout(() => setThemeSavedAlert(null), 3500);
  };

  const handleUpdateThemeField = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    const updated = { ...themeSettings, [key]: value };
    if (key === 'primaryColor') {
      updated.colorPreset = 'custom';
    }
    setThemeSettings(updated);
    saveThemeSettings(updated);
  };

  const handleSaveAppearance = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setThemeSaving(true);
    saveThemeSettings(themeSettings);
    setTimeout(() => {
      setThemeSaving(false);
      setThemeSavedAlert('Pengaturan tampilan berhasil disimpan dan diterapkan ke seluruh sistem!');
      setTimeout(() => setThemeSavedAlert(null), 3500);
    }, 250);
  };

  const handleResetAppearance = () => {
    if (confirm('Kembalikan seluruh pengaturan tampilan ke default pabrik Artaroma?')) {
      const def = resetThemeSettings();
      setThemeSettings(def);
      setThemeSavedAlert('Pengaturan tampilan telah dikembalikan ke default pabrik.');
      setTimeout(() => setThemeSavedAlert(null), 3500);
    }
  };

  React.useEffect(() => {
    const rate = getUsdExchangeRate();
    setUsdRate(rate);
    setUsdRateInput(rate);
    setApplicationCategories(getApplications());
    setThemeSettings(getThemeSettings());

    const handleUpdate = () => {
      const updatedRate = getUsdExchangeRate();
      setUsdRate(updatedRate);
      setUsdRateInput(updatedRate);
      setApplicationCategories(getApplications());
    };
    window.addEventListener('artaroma_currency_updated', handleUpdate);
    window.addEventListener('artaroma_applications_updated', handleUpdate);
    return () => {
      window.removeEventListener('artaroma_currency_updated', handleUpdate);
      window.removeEventListener('artaroma_applications_updated', handleUpdate);
    };
  }, []);

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (usdRateInput > 0) {
      setUsdExchangeRate(usdRateInput);
      setUsdRate(usdRateInput);
      setIsRateSavedAlert(true);
      setTimeout(() => setIsRateSavedAlert(false), 4000);
    }
  };

  // Main Data States
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [distributors, setDistributors] = useState<Distributor[]>(initialDistributors);
  const [couriers, setCouriers] = useState<Courier[]>(initialCouriers);
  const [appUsers, setAppUsers] = useState<AppUser[]>(initialAppUsers);
  const [batches, setBatches] = useState<any[]>([]);

  const tabs = [
    { key: 'products' as Tab, icon: Package, label: TAB_LABELS.products, count: products.length },
    { key: 'pricelist' as Tab, icon: Tag, label: TAB_LABELS.pricelist, count: products.length },
    { key: 'customers' as Tab, icon: Users, label: TAB_LABELS.customers, count: customers.length },
    { key: 'distributors' as Tab, icon: Building2, label: TAB_LABELS.distributors, count: distributors.length },
    { key: 'couriers' as Tab, icon: Truck, label: TAB_LABELS.couriers, count: couriers.length },
    { key: 'users' as Tab, icon: ShieldCheck, label: TAB_LABELS.users, count: appUsers.length },
    { key: 'finance' as Tab, icon: Landmark, label: TAB_LABELS.finance, count: 0 },
    { key: 'config' as Tab, icon: Settings, label: TAB_LABELS.config, count: 1 },
    { key: 'appearance' as Tab, icon: Palette, label: TAB_LABELS.appearance, count: 0 },
  ];

  const fetchPriceLogs = async () => {
    setPriceLogsLoading(true);
    try {
      const res = await fetch('/api/products/pricelist', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPriceLogs(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch price logs:', err);
    } finally {
      setPriceLogsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCustomers(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch customers:', err);
    }
  };

  const fetchDistributors = async () => {
    try {
      const res = await fetch('/api/distributors', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDistributors(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch distributors:', err);
    }
  };

  const fetchCouriers = async () => {
    try {
      const res = await fetch('/api/couriers', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCouriers(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch couriers:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setProducts(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch products in Master Data:', err);
    }
  };

  React.useEffect(() => {
    fetchProducts();

    fetch('/api/stock-batches', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setBatches(json.data);
        }
      })
      .catch((err) => console.warn('Failed to fetch batches in Master Data:', err));

    fetchPriceLogs();
    fetchCustomers();
    fetchDistributors();
    fetchCouriers();

    // Fetch company / warehouse settings
    fetch('/api/company-settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCompanyConfig(json.data);
        }
      })
      .catch((err) => console.warn('Failed to fetch settings in Master Data:', err));
  }, []);

  React.useEffect(() => {
    if (selectedParentProductId && products.length > 0) {
      const parent = products.find((p) => p.id === selectedParentProductId);
      if (parent && parent.selling_price_per_kg) {
        setVariantPricePerKg(parent.selling_price_per_kg);
      }
    }
  }, [selectedParentProductId, products]);

  // Super Admin Catalog Mapping Modal State
  const [mappingCustomer, setMappingCustomer] = useState<Customer | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Add Data Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Edit Data Modal State
  const [editingItem, setEditingItem] = useState<{
    type: Tab | 'variant';
    data: any;
  } | null>(null);

  // Form states for Product creation/editing
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    applications: ['Fine Fragrance'] as string[],
    pack_sizes: [25, 5, 1, 0.1] as number[],
    top_notes: '',
    middle_notes: '',
    base_notes: '',
    selling_price_per_kg: 1500000,
    min_stock_kg: 0.1,
  });

  const handleToggleAppCategoryInForm = (catName: string) => {
    setProductForm({ ...productForm, applications: [catName] });
  };

  const handleTogglePackSizeInForm = (size: number) => {
    const current = productForm.pack_sizes || [];
    if (current.includes(size)) {
      if (current.length <= 1) return; // Keep at least 1 size
      setProductForm({ ...productForm, pack_sizes: current.filter((s) => s !== size) });
    } else {
      setProductForm({ ...productForm, pack_sizes: [...current, size].sort((a, b) => b - a) });
    }
  };

  // Form states for Customer creation/editing
  const [customerForm, setCustomerForm] = useState({
    code: '',
    company_name: '',
    pic_name: '',
    email: '',
    username: '',
    password: 'Artaroma2026!',
    phone: '',
    pic_name_2: '',
    phone_2: '',
    pic_name_3: '',
    phone_3: '',
    address: '',
    office_address: '',
    shipping_lat: '',
    shipping_lng: '',
    npwp: '',
    ktp_file: '' as string,
    npwp_file: '' as string,
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    is_credit_eligible: true,
    credit_limit: 40000000,
    credit_terms_days: 30,
    default_courier_id: '',
    default_courier_name: '',
    default_shipping_cost: 0,
    default_shipping_type: 'FRANCO' as 'FRANCO' | 'LOCO',
    delivery_notes: '',
    allowed_product_ids: [] as string[],
    special_prices: {} as Record<string, number>, // variantKey -> price_per_kg
  });

  // Inner-tab state for Customer form modal: 'info' | 'bank' | 'shipping' | 'price'
  const [customerFormTab, setCustomerFormTab] = useState<'info' | 'bank' | 'shipping' | 'price'>('info');
  // Per-variant price input mode: 'pct' (percent discount) | 'fix' (fixed price)
  const [specialPriceMode, setSpecialPriceMode] = useState<Record<string, 'pct' | 'fix'>>({});
  // Per-variant discount percent input (temporary, for pct mode)
  const [specialPricePct, setSpecialPricePct] = useState<Record<string, number>>({});

  const allowedProducts = products.filter((p) => 
    Boolean(customerForm.allowed_product_ids && customerForm.allowed_product_ids.includes(p.id))
  );


  // Form states for Distributor creation/editing
  const [distributorForm, setDistributorForm] = useState({
    code: '',
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    top_payable_days: 30,
    bank_account: '',
    npwp: '',
    notes: '',
    supplied_product_ids: [] as string[],
  });

  // Inner-tab state for Distributor form modal: 'info' | 'finance'
  const [distributorFormTab, setDistributorFormTab] = useState<'info' | 'finance'>('info');

  // Form states for Courier creation/editing
  const [courierForm, setCourierForm] = useState({
    code: '',
    name: '',
    phone: '',
    vehicle_number: '',
    courier_type: 'INTERNAL' as 'INTERNAL' | 'EKSTERNAL',
    service_type: '',
    notes: '',
    create_user_account: true,
    login_email: '',
    password: 'Artaroma2026!',
  });

  // Form states for AppUser creation/editing
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'ADMIN' as UserRole,
    linked_entity_name: 'Artaroma HQ (Kantor Pusat)',
    password: 'Artaroma2026!',
  });

  // Current logged in user info for permission checks
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch((err) => console.warn('Failed to load user in master page:', err));
  }, []);

  // Per-user module access state (Super Admin can assign freely)
  const ALL_MODULES = [
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
  ];
  const defaultModulesByRole: Record<string, string[]> = {
    ADMIN: [
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
    ],
    SALES: ['Dashboard', 'Sales Order (SO)', 'Lihat Stok (Gudang)', 'Log Book & Arsip', 'Lihat Nilai Finansial (PO/SO)', 'Lihat Nilai Finansial (Dashboard)', 'Ekspor Data (XLSX)'],
    FINANCE: ['Dashboard', 'Purchase Order (PO)', 'Finance & Invoice', 'Log Book & Arsip', 'Lihat Nilai Finansial (PO/SO)', 'Lihat Nilai Finansial (Dashboard)', 'Ekspor Data (XLSX)'],
    WAREHOUSE: ['Dashboard', 'Purchase Order (PO)', 'Lihat Stok (Gudang)', 'Edit Batch & ED (Gudang)', 'Log Book & Arsip', 'Ekspor Data (XLSX)'],
    COURIER: ['Aplikasi Kurir'],
    CUSTOMER: ['Katalog Customer'],
  };
  const [userModuleAccess, setUserModuleAccess] = useState<Record<string, string[]>>({});
  const [editingAccessUserId, setEditingAccessUserId] = useState<string | null>(null);
  const [draftModules, setDraftModules] = useState<string[]>([]);

  const fetchUsers = () => {
    fetch('/api/users', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setAppUsers(json.data);
          const accessMap: Record<string, string[]> = {};
          json.data.forEach((u: any) => {
            accessMap[u.id] = Array.isArray(u.allowed_modules) && u.allowed_modules.length > 0
              ? u.allowed_modules
              : (defaultModulesByRole[u.role || 'ADMIN'] ?? ['Dashboard']);
          });
          setUserModuleAccess(accessMap);
        }
      })
      .catch((err) => console.warn('Failed to load users from DB:', err));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStartEditAccess = (userId: string) => {
    setEditingAccessUserId(userId);
    setDraftModules(userModuleAccess[userId] ?? []);
  };

  const handleToggleDraftModule = (mod: string) => {
    setDraftModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleSelectAllModules = () => {
    setDraftModules([...ALL_MODULES]);
  };

  const handleClearAllModules = () => {
    setDraftModules([]);
  };

  const handleSaveAccess = async (userId: string) => {
    try {
      await fetch('/api/users/access', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, allowed_modules: draftModules }),
      });
      setUserModuleAccess((prev) => ({ ...prev, [userId]: draftModules }));
      setAppUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, allowed_modules: draftModules } : u))
      );
      setEditingAccessUserId(null);
    } catch (err) {
      console.error('Failed to save module access:', err);
    }
  };

  // --- PRICELIST MODAL HANDLERS ---
  const openPricelistModal = (prod: Product) => {
    setSelectedProductForPricelist(prod);
    const initialForm: Record<string, { currency: 'IDR' | 'USD'; value: number }> = {};
    if (prod.variants && Array.isArray(prod.variants)) {
      prod.variants.forEach((v: any) => {
        const hasUsd = Number(v.selling_price_usd_per_kg || 0) > 0;
        initialForm[v.id] = {
          currency: hasUsd ? 'USD' : 'IDR',
          value: hasUsd ? Number(v.selling_price_usd_per_kg || 0) : Number(v.selling_price_per_kg || 0)
        };
      });
    }
    setPricelistForm(initialForm);
    setIsPricelistModalOpen(true);
  };

  const handleValueChange = (vId: string, val: number) => {
    setPricelistForm((prev) => ({
      ...prev,
      [vId]: {
        ...prev[vId],
        value: val
      }
    }));
  };

  const handleCurrencyChange = (vId: string, curr: 'IDR' | 'USD') => {
    setPricelistForm((prev) => {
      const item = prev[vId];
      if (!item) return prev;
      // Convert value appropriately when switching currencies to keep same magnitude or reset
      let newValue = item.value;
      if (curr === 'IDR' && item.currency === 'USD') {
        newValue = Math.round(item.value * usdRate);
      } else if (curr === 'USD' && item.currency === 'IDR') {
        newValue = Number((item.value / usdRate).toFixed(2));
      }
      return {
        ...prev,
        [vId]: {
          ...item,
          currency: curr,
          value: newValue
        }
      };
    });
  };

  const handleSavePricelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForPricelist) return;

    setIsPricelistSubmitting(true);
    try {
      const pricesArray = Object.keys(pricelistForm).map((vId) => {
        const item = pricelistForm[vId];
        let idr = 0;
        let usd = 0;
        if (item.currency === 'USD') {
          usd = item.value;
          idr = Math.round(item.value * usdRate);
        } else {
          idr = item.value;
          usd = 0;
        }
        return {
          variant_id: vId,
          selling_price_per_kg: idr,
          selling_price_usd_per_kg: usd,
          currency: item.currency
        };
      });

      const res = await fetch('/api/products/pricelist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProductForPricelist.id,
          prices: pricesArray
        })
      });

      const json = await res.json();
      if (json.success) {
        setIsPricelistModalOpen(false);
        // Refresh products list
        const prodRes = await fetch('/api/products', { cache: 'no-store' });
        const prodJson = await prodRes.json();
        if (prodJson.success && Array.isArray(prodJson.data)) {
          setProducts(prodJson.data);
        }
        // Refresh price history logs
        fetchPriceLogs();
        alert('Pricelist varian produk berhasil diperbarui!');
      } else {
        alert(`Gagal memperbarui pricelist: ${json.message}`);
      }
    } catch (err: any) {
      alert(`Error koneksi: ${err.message}`);
    } finally {
      setIsPricelistSubmitting(false);
    }
  };

  // --- OPEN ADD MODAL ---
  const handleOpenAddModal = () => {
    if (activeTab === 'products') {
      setProductEntryType('TEMPLATE');
      if (products.length > 0) {
        setSelectedParentProductId(products[0].id);
      }
      setVariantPackSize(25);
      setProductForm({
        sku: `FO-NEW-${String(products.length + 1).padStart(3, '0')}`,
        name: '',
        applications: [applicationCategories[0] || 'Fine Fragrance'],
        pack_sizes: [25, 5, 1],
        top_notes: 'Bergamot, Pink Pepper',
        middle_notes: 'Rose, Jasmine Sambac',
        base_notes: 'Amber, Cedarwood, Musk',
        selling_price_per_kg: 1850000,
        min_stock_kg: 3.0,
      });
    } else if (activeTab === 'customers') {
      setCustomerForm({
        code: `CUST-00${customers.length + 1}`,
        company_name: '',
        pic_name: '',
        email: '',
        username: '',
        password: 'Artaroma2026!',
        phone: '',
        pic_name_2: '',
        phone_2: '',
        pic_name_3: '',
        phone_3: '',
        address: '',
        office_address: '',
        shipping_lat: '',
        shipping_lng: '',
        npwp: '',
        ktp_file: '',
        npwp_file: '',
        bank_name: '',
        bank_account_number: '',
        bank_account_name: '',
        is_credit_eligible: true,
        credit_limit: 40000000,
        credit_terms_days: 30,
        default_courier_id: '',
        default_courier_name: '',
        default_shipping_cost: 0,
        default_shipping_type: 'FRANCO',
        delivery_notes: '',
        allowed_product_ids: [],
        special_prices: {},
      });
      setCustomerFormTab('info');
    } else if (activeTab === 'distributors') {
      setDistributorForm({
        code: `DIST-NEW-0${distributors.length + 1}`,
        name: '',
        contact_name: '',
        email: '',
        phone: '',
        address: '',
        top_payable_days: 30,
        bank_account: '',
        npwp: '',
        notes: '',
        supplied_product_ids: products.map((p) => p.id),
      });
      setDistributorFormTab('info');
    } else if (activeTab === 'couriers') {
      setCourierForm({
        code: `KUR-0${couriers.length + 1}`,
        name: '',
        phone: '',
        vehicle_number: 'B 7721 KFP (Blind Van)',
        courier_type: 'INTERNAL',
        service_type: 'Cargo Darat / Box Van',
        notes: '',
        create_user_account: true,
        login_email: '',
        password: 'Artaroma2026!',
      });
    } else if (activeTab === 'users' || activeTab === 'access') {
      setUserForm({
        name: '',
        email: '',
        role: 'ADMIN',
        linked_entity_name: 'Artaroma HQ (Kantor Pusat)',
        password: 'Artaroma2026!',
      });
      setDraftModules(['Dashboard', 'Sales Order (SO)', 'Lihat Stok (Gudang)']);
    }
    setIsAddModalOpen(true);
  };

  // --- OPEN EDIT MODAL ---
  const handleOpenEditModal = (type: Tab, item: any) => {
    setEditingItem({ type, data: item });

    if (type === 'products') {
      const p = item as Product;
      const initialApps = p.applications && p.applications.length > 0
        ? [p.applications[0]]
        : [p.application || p.fragrance_family || 'Fine Fragrance'];

      setProductForm({
        sku: p.sku,
        name: p.name,
        applications: initialApps,
        pack_sizes: p.pack_sizes || [],
        top_notes: p.top_notes,
        middle_notes: p.middle_notes,
        base_notes: p.base_notes,
        selling_price_per_kg: p.selling_price_per_kg,
        min_stock_kg: p.min_stock_kg,
      });
    } else if (type === 'customers') {
      const c = item as Customer;
      setCustomerForm({
        code: c.code,
        company_name: c.company_name,
        pic_name: c.pic_name,
        email: c.email,
        username: c.username || c.email,
        password: c.password || 'Artaroma2026!',
        phone: c.phone,
        pic_name_2: (c as any).pic_name_2 || '',
        phone_2: (c as any).phone_2 || '',
        pic_name_3: (c as any).pic_name_3 || '',
        phone_3: (c as any).phone_3 || '',
        address: c.address,
        office_address: (c as any).office_address || '',
        shipping_lat: (c as any).shipping_lat || '',
        shipping_lng: (c as any).shipping_lng || '',
        default_courier_id: (c as any).default_courier_id || '',
        default_courier_name: (c as any).default_courier_name || '',
        default_shipping_cost: Number((c as any).default_shipping_cost) || 0,
        default_shipping_type: (c as any).default_shipping_type || 'FRANCO',
        delivery_notes: (c as any).delivery_notes || '',
        npwp: c.npwp || '',
        ktp_file: c.ktp_file || '',
        npwp_file: c.npwp_file || '',
        bank_name: c.bank_name || '',
        bank_account_number: c.bank_account_number || '',
        bank_account_name: c.bank_account_name || '',
        is_credit_eligible: c.is_credit_eligible ?? (c.credit_limit > 0),
        credit_limit: c.credit_limit,
        credit_terms_days: c.credit_terms_days || 30,
        allowed_product_ids: Array.isArray(c.allowed_product_ids) ? c.allowed_product_ids : [],
        special_prices: (c as any).special_prices || {},
      });
      setCustomerFormTab('info');
    } else if (type === 'distributors') {
      const d = item as Distributor;
      setDistributorForm({
        code: d.code,
        name: d.name,
        contact_name: d.contact_name,
        email: d.email,
        phone: d.phone,
        address: d.address,
        top_payable_days: d.top_payable_days ?? 30,
        bank_account: d.bank_account || '',
        npwp: d.npwp || '',
        notes: d.notes || '',
        supplied_product_ids: d.supplied_product_ids && d.supplied_product_ids.length > 0
          ? d.supplied_product_ids
          : products.map((p) => p.id),
      });
      setDistributorFormTab('info');
    } else if (type === 'couriers') {
      const k = item as Courier;
      setCourierForm({
        code: k.code,
        name: k.name,
        phone: k.phone,
        vehicle_number: k.vehicle_number || '',
        courier_type: (k as any).courier_type || 'INTERNAL',
        service_type: (k as any).service_type || '',
        notes: (k as any).notes || '',
        create_user_account: false,
        login_email: (k as any).linked_user_email || '',
        password: 'Artaroma2026!',
      });
    } else if (type === 'users') {
      const u = item as AppUser;
      setUserForm({
        name: u.name,
        email: u.email,
        role: u.role || 'ADMIN',
        linked_entity_name: u.linked_entity_name || 'Artaroma HQ',
        password: 'Artaroma2026!',
      });
      setDraftModules(userModuleAccess[u.id] || ['Dashboard']);
    }
  };

  const handleOpenEditVariantModal = (product: Product, packSize: number) => {
    const currentPrice = product.variant_prices?.[packSize] ?? (product.selling_price_per_kg || 1500000);
    const currentName = product.variant_names?.[packSize] ?? `${product.name} ${packSize}K`;
    const currentSku = product.variant_skus?.[packSize] ?? `${product.sku}-${packSize}K`;

    setEditingItem({
      type: 'variant',
      data: { product, packSize },
    });
    setVariantPackSize(packSize);
    setVariantPricePerKg(currentPrice);
    setVariantNameInput(currentName);
    setVariantSkuInput(currentSku);
  };

  // --- SUBMIT ADD NEW DATA ---
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'products') {
      if (productEntryType === 'TEMPLATE') {
        const tempId = `prod-${Date.now()}`;
        const newProd: Product = {
          id: tempId,
          sku: productForm.sku,
          name: productForm.name.toUpperCase().trim(),
          applications: productForm.applications,
          application: productForm.applications[0] || 'Fine Fragrance',
          fragrance_family: productForm.applications[0] || 'Fine Fragrance',
          pack_sizes: [25, 5, 1, 0.1],
          top_notes: productForm.top_notes,
          middle_notes: productForm.middle_notes,
          base_notes: productForm.base_notes,
          selling_price_per_kg: 0,
          min_stock_kg: Number(productForm.min_stock_kg),
          is_active: true,
          total_stock_kg: 0,
          image_url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=500&auto=format&fit=crop&q=60',
        };

        setProducts([newProd, ...products]);

        fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: newProd.sku,
            name: newProd.name,
            fragrance_family: newProd.fragrance_family,
            top_notes: newProd.top_notes,
            middle_notes: newProd.middle_notes,
            base_notes: newProd.base_notes,
            density: 1.0,
            min_stock_kg: newProd.min_stock_kg,
            selling_price_per_kg: 0,
          }),
        })
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            // Also seed the variants in database for this new product!
            const newProdId = json.data.id;
            fetch('/api/products/pricelist', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product_id: newProdId,
                prices: [
                  {
                    variant_id: `var-${newProd.sku.toLowerCase().replace(/[^a-z0-9]/gi, '')}-25`,
                    selling_price_per_kg: 0,
                    selling_price_usd_per_kg: 0,
                    currency: 'IDR'
                  },
                  {
                    variant_id: `var-${newProd.sku.toLowerCase().replace(/[^a-z0-9]/gi, '')}-5`,
                    selling_price_per_kg: 0,
                    selling_price_usd_per_kg: 0,
                    currency: 'IDR'
                  },
                  {
                    variant_id: `var-${newProd.sku.toLowerCase().replace(/[^a-z0-9]/gi, '')}-1`,
                    selling_price_per_kg: 0,
                    selling_price_usd_per_kg: 0,
                    currency: 'IDR'
                  },
                  {
                    variant_id: `var-${newProd.sku.toLowerCase().replace(/[^a-z0-9]/gi, '')}-0-1`,
                    selling_price_per_kg: 0,
                    selling_price_usd_per_kg: 0,
                    currency: 'IDR'
                  }
                ]
              })
            }).then(() => fetchProducts());
          }
        })
        .catch((err) => console.error('Error creating product:', err));

      } else {
        // productEntryType === 'VARIANT'
        const parent = products.find((p) => p.id === selectedParentProductId) || products[0];
        if (parent) {
          const size = Number(variantPackSize) || 25;
          const price = 0;
          const minStock = Number(variantMinStockKg) || parent.min_stock_kg || size;
          const variantSku = `${parent.sku}-${size}K`;

          const updatedPackSizes = Array.from(new Set([...(parent.pack_sizes || [25, 5, 1]), size])).sort((a, b) => b - a);
          const updatedVariantPrices = { ...(parent.variant_prices || {}) };
          updatedVariantPrices[size] = price;

          setProducts(
            products.map((p) => {
              if (p.id === parent.id) {
                return {
                  ...p,
                  pack_sizes: updatedPackSizes,
                  variant_prices: updatedVariantPrices,
                  min_stock_kg: minStock,
                  selling_price_per_kg: price,
                  selling_price_usd_per_kg: price / usdRate,
                  total_stock_kg: (p.total_stock_kg || 0) + size,
                };
              }
              return p;
            })
          );

          // Update parent product
          fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: parent.id,
              pack_sizes: JSON.stringify(updatedPackSizes),
              variant_prices: JSON.stringify(updatedVariantPrices),
            }),
          })
          .then((res) => res.json())
          .then((json) => {
            if (json.success) {
              // Add to product_variants table
              fetch('/api/products/pricelist', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  product_id: parent.id,
                  prices: [
                    {
                      variant_id: `var-${parent.sku.toLowerCase().replace(/[^a-z0-9]/gi, '')}-${size}`,
                      selling_price_per_kg: price,
                      selling_price_usd_per_kg: price / usdRate,
                      currency: 'IDR'
                    }
                  ]
                })
              }).then(() => fetchProducts());
            }
          });

          // Register FEFO batch lot entry
          try {
            fetch('/api/stock-batches', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                batch_number: `LOT-2026-${parent.sku.replace(/[^A-Z0-9]/gi, '')}-${size}K-A1`,
                product_id: parent.id,
                variant_sku: variantSku,
                pack_size_kg: size,
                unit_count: 1,
                production_date: new Date().toISOString().split('T')[0],
                expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                initial_qty_kg: size,
                unit_cost_per_kg: price * 0.7,
              }),
            }).catch((err) => console.warn('Batch creation notice:', err));
          } catch (err) {
            console.warn('Batch creation notice:', err);
          }
        }
      }
    } else if (activeTab === 'customers') {
      const payload = {
        code: customerForm.code,
        company_name: customerForm.company_name,
        pic_name: customerForm.pic_name,
        email: customerForm.email,
        phone: customerForm.phone,
        pic_name_2: customerForm.pic_name_2 || '',
        phone_2: customerForm.phone_2 || '',
        pic_name_3: customerForm.pic_name_3 || '',
        phone_3: customerForm.phone_3 || '',
        address: customerForm.address,
        office_address: (customerForm as any).office_address || '',
        shipping_lat: (customerForm as any).shipping_lat || '',
        shipping_lng: (customerForm as any).shipping_lng || '',
        default_courier_id: customerForm.default_courier_id || '',
        default_courier_name: customerForm.default_courier_name || '',
        default_shipping_cost: Number(customerForm.default_shipping_cost) || 0,
        default_shipping_type: customerForm.default_shipping_type || 'FRANCO',
        delivery_notes: customerForm.delivery_notes || '',
        npwp: customerForm.npwp,
        is_credit_eligible: customerForm.is_credit_eligible,
        credit_limit: customerForm.is_credit_eligible ? Number(customerForm.credit_limit) : 0,
        credit_terms_days: customerForm.is_credit_eligible ? Number(customerForm.credit_terms_days) : 0,
        special_prices: customerForm.special_prices,
        allowed_product_ids: customerForm.allowed_product_ids,
      };

      fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          fetchCustomers();
        } else {
          alert('Gagal menyimpan customer: ' + json.message);
        }
      })
      .catch((err) => console.error('Save customer error:', err));
    } else if (activeTab === 'distributors') {
      const newDist = {
        code: distributorForm.code,
        name: distributorForm.name,
        contact_name: distributorForm.contact_name,
        email: distributorForm.email,
        phone: distributorForm.phone,
        address: distributorForm.address,
        top_payable_days: Number(distributorForm.top_payable_days) || 30,
        bank_account: distributorForm.bank_account,
        npwp: distributorForm.npwp,
        notes: distributorForm.notes,
        supplied_product_ids: distributorForm.supplied_product_ids,
      };

      fetch('/api/distributors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDist),
      })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          fetchDistributors();
        } else {
          alert('Gagal menyimpan supplier: ' + json.message);
        }
      })
      .catch((err) => console.error('Save distributor error:', err));
    } else if (activeTab === 'couriers') {
      const payload = {
        id: `cour-${Date.now()}`,
        code: courierForm.code,
        name: courierForm.name,
        phone: courierForm.phone,
        vehicle_number: courierForm.vehicle_number,
        courier_type: courierForm.courier_type,
        service_type: courierForm.service_type,
        notes: courierForm.notes,
        is_active: true,
        create_user_account: courierForm.create_user_account,
        login_email: courierForm.login_email,
        password: courierForm.password,
      };
      fetch('/api/couriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          fetchCouriers();
          fetchUsers();
        } else {
          alert('Gagal menyimpan kurir: ' + json.message);
        }
      })
      .catch((err) => console.error('Save courier error:', err));
    } else if (activeTab === 'users' || activeTab === 'access') {
      const newUserId = `user-${Date.now()}`;
      const newUser: AppUser = {
        id: newUserId,
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        linked_entity_name: userForm.linked_entity_name,
        is_active: true,
        last_login: 'Baru mendaftar',
        created_at: new Date().toISOString().split('T')[0],
      };
      setAppUsers([newUser, ...appUsers]);
      setUserModuleAccess((prev) => ({
        ...prev,
        [newUserId]: draftModules.length > 0 ? draftModules : (defaultModulesByRole[userForm.role] ?? ['Dashboard', 'Sales Order (SO)']),
      }));
    }

    setIsAddModalOpen(false);
  };

  // --- SUBMIT EDIT EXISTING DATA ---
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (editingItem.type === 'variant') {
      const { product, packSize } = editingItem.data;

      const updatedVariantNames = { ...(product.variant_names || {}) };
      const updatedVariantSkus = { ...(product.variant_skus || {}) };

      updatedVariantNames[packSize] = variantNameInput;
      updatedVariantSkus[packSize] = variantSkuInput;

      setProducts(
        products.map((p) => {
          if (p.id === product.id) {
            return {
              ...p,
              variant_names: updatedVariantNames,
              variant_skus: updatedVariantSkus,
            };
          }
          return p;
        })
      );

      fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          variant_names: JSON.stringify(updatedVariantNames),
          variant_skus: JSON.stringify(updatedVariantSkus),
        }),
      })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          fetchProducts();
        } else {
          alert('Gagal menyimpan perubahan varian: ' + json.message);
        }
      })
      .catch((err) => console.error('Error updating variant details:', err));

      setEditingItem(null);
    } else if (editingItem.type === 'products') {
      const payload = {
        id: editingItem.data.id,
        sku: productForm.sku,
        name: productForm.name.toUpperCase().trim(),
        applications: JSON.stringify(productForm.applications),
        application: productForm.applications[0] || 'Fine Fragrance',
        fragrance_family: productForm.applications[0] || 'Fine Fragrance',
        top_notes: productForm.top_notes,
        middle_notes: productForm.middle_notes,
        base_notes: productForm.base_notes,
        min_stock_kg: Number(productForm.min_stock_kg),
      };

      setProducts(
        products.map((p) =>
          p.id === editingItem.data.id
            ? {
                ...p,
                sku: productForm.sku,
                name: productForm.name.toUpperCase().trim(),
                applications: productForm.applications,
                application: productForm.applications[0] || 'Fine Fragrance',
                fragrance_family: productForm.applications[0] || 'Fine Fragrance',
                top_notes: productForm.top_notes,
                middle_notes: productForm.middle_notes,
                base_notes: productForm.base_notes,
                min_stock_kg: Number(productForm.min_stock_kg),
              }
            : p
        )
      );

      fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          fetchProducts();
        } else {
          alert('Gagal menyimpan perubahan produk induk: ' + json.message);
        }
      })
      .catch((err) => console.error('Error updating parent product:', err));

      setEditingItem(null);
    } else if (editingItem.type === 'customers') {
      const payload = {
        id: editingItem.data.id,
        code: customerForm.code,
        company_name: customerForm.company_name,
        pic_name: customerForm.pic_name,
        email: customerForm.email,
        phone: customerForm.phone,
        pic_name_2: customerForm.pic_name_2 || '',
        phone_2: customerForm.phone_2 || '',
        pic_name_3: customerForm.pic_name_3 || '',
        phone_3: customerForm.phone_3 || '',
        address: customerForm.address,
        office_address: (customerForm as any).office_address || '',
        shipping_lat: (customerForm as any).shipping_lat || '',
        shipping_lng: (customerForm as any).shipping_lng || '',
        default_courier_id: customerForm.default_courier_id || '',
        default_courier_name: customerForm.default_courier_name || '',
        default_shipping_cost: Number(customerForm.default_shipping_cost) || 0,
        default_shipping_type: customerForm.default_shipping_type || 'FRANCO',
        delivery_notes: customerForm.delivery_notes || '',
        credit_limit: customerForm.is_credit_eligible ? Number(customerForm.credit_limit) : 0,
        credit_terms_days: customerForm.is_credit_eligible ? Number(customerForm.credit_terms_days) : 0,
        special_prices: customerForm.special_prices,
        allowed_product_ids: customerForm.allowed_product_ids,
      };

      fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          fetchCustomers();
        } else {
          alert('Gagal memperbarui customer: ' + json.message);
        }
      })
      .catch((err) => console.error('Update customer error:', err));
    } else if (editingItem.type === 'distributors') {
      const payload = {
        id: editingItem.data.id,
        code: distributorForm.code,
        name: distributorForm.name,
        contact_name: distributorForm.contact_name,
        email: distributorForm.email,
        phone: distributorForm.phone,
        address: distributorForm.address,
        top_payable_days: Number(distributorForm.top_payable_days) || 30,
        bank_account: distributorForm.bank_account,
        npwp: distributorForm.npwp,
        notes: distributorForm.notes,
        supplied_product_ids: distributorForm.supplied_product_ids,
      };

      fetch('/api/distributors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          fetchDistributors();
        } else {
          alert('Gagal memperbarui supplier: ' + json.message);
        }
      })
      .catch((err) => console.error('Update distributor error:', err));
    } else if (editingItem.type === 'couriers') {
      const updatedData = {
        code: courierForm.code,
        name: courierForm.name,
        phone: courierForm.phone,
        vehicle_number: courierForm.vehicle_number,
        courier_type: courierForm.courier_type,
        service_type: courierForm.service_type,
        notes: courierForm.notes,
        is_active: editingItem.data.is_active,
      };
      fetch(`/api/couriers/${editingItem.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          fetchCouriers();
          fetchUsers();
        } else {
          alert('Gagal memperbarui kurir: ' + json.message);
        }
      })
      .catch((err) => console.error('Update courier error:', err));
    } else if (editingItem.type === 'users') {
      const userId = editingItem.data.id;
      
      // Update core profile details
      fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          linked_entity_name: userForm.linked_entity_name,
          is_active: editingItem.data.is_active !== undefined ? editingItem.data.is_active : true,
        }),
      })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          alert('Gagal memperbarui profil pengguna: ' + json.message);
        } else {
          // Update allowed modules/access
          fetch('/api/users/access', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, allowed_modules: draftModules }),
          })
          .then((res) => res.json())
          .then((accessJson) => {
            if (accessJson.success) {
              fetchUsers();
            } else {
              alert('Gagal memperbarui hak akses pengguna: ' + accessJson.message);
            }
          })
          .catch((err) => console.error('Save access error on edit:', err));
        }
      })
      .catch((err) => console.error('Update user details error:', err));

      setUserModuleAccess((prev) => ({ ...prev, [userId]: draftModules }));
      setAppUsers(
        appUsers.map((u) =>
          u.id === userId
            ? {
                ...u,
                name: userForm.name,
                email: userForm.email,
                role: userForm.role,
                linked_entity_name: userForm.linked_entity_name,
                allowed_modules: draftModules,
              }
            : u
        )
      );
    }

    setEditingItem(null);
  };

  // --- EXPORT TO XLSX HANDLER ---
  const handleExportCurrentTab = () => {
    if (!canUserExportXLSX(currentUser)) {
      alert('Akses Ditolak: Akun Anda tidak memiliki hak akses modul "Ekspor Data (XLSX)". Silakan hubungi Super Admin.');
      return;
    }

    if (activeTab === 'products') {
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.application || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      exportProductsToXLSX(searchTerm.trim() ? filtered : products);
    } else if (activeTab === 'pricelist') {
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
      exportPricelistToXLSX(searchTerm.trim() ? filtered : products, usdRate);
    } else if (activeTab === 'customers') {
      const filtered = customers.filter((c) =>
        c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.pic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      exportCustomersToXLSX(searchTerm.trim() ? filtered : customers);
    } else if (activeTab === 'distributors') {
      const filtered = distributors.filter((d) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.contact_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      exportDistributorsToXLSX(searchTerm.trim() ? filtered : distributors);
    } else if (activeTab === 'couriers') {
      const filtered = couriers.filter((k) =>
        k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        k.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        k.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
      exportCouriersToXLSX(searchTerm.trim() ? filtered : couriers);
    } else if (activeTab === 'users' || activeTab === 'access') {
      const filtered = appUsers.filter((u) =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (userModuleAccess[u.id] || []).join(' ').toLowerCase().includes(searchTerm.toLowerCase())
      );
      exportUsersToXLSX(searchTerm.trim() ? filtered : appUsers, userModuleAccess);
    } else if (activeTab === 'finance') {
      const bankData = (companyConfig.bank_accounts || []).map((b: any, i: number) => ({
        'No': i + 1,
        'Bank': b.bank,
        'Nomor Rekening': b.no,
        'Atas Nama': b.atas_nama,
        'Jenis Rekening': b.jenis,
      }));
      exportToXLSX(bankData, {
        fileName: `Rekening_Bank_Artaroma_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Rekening Bank',
      });
    }
  };

  const handleExportUsers = handleExportCurrentTab;

  // --- RESET PASSWORD ACTION ---
  const handleResetPassword = (userName: string, email: string) => {
    alert(`Password untuk pengguna ${userName} (${email}) berhasil di-reset!\n\nPassword Sementara: Artaroma2026!`);
  };

  // --- DELETE ACTION ---
  const handleDelete = (type: Tab, id: string, name: string) => {
    if (type === 'products') {
      const prod = products.find((p) => p.id === id);
      if (prod) {
        const totalStock = prod.total_stock_kg ?? Object.values(prod.variant_stocks || {}).reduce((s, v) => s + (v || 0), 0);
        if (totalStock > 0) {
          alert(`Tidak dapat menghapus produk induk '${name}' karena masih terdapat stok aktif sebesar ${Math.round(totalStock)} Kg di gudang.`);
          return;
        }
      }
    }
    if (confirm(`Apakah Anda yakin ingin menghapus data ${name}?`)) {
      if (type === 'products') {
        fetch(`/api/products?id=${id}`, {
          method: 'DELETE',
        })
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            fetchProducts();
          } else {
            alert('Gagal menghapus produk: ' + json.message);
          }
        })
        .catch((err) => console.error('Delete product error:', err));
      }
      if (type === 'customers') setCustomers(customers.filter((c) => c.id !== id));
      if (type === 'distributors') {
        fetch(`/api/distributors?id=${id}`, {
          method: 'DELETE',
        })
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            fetchDistributors();
          } else {
            alert('Gagal menghapus supplier: ' + json.message);
          }
        })
        .catch((err) => console.error('Delete distributor error:', err));
      }
      if (type === 'couriers') {
        fetch(`/api/couriers/${id}`, {
          method: 'DELETE',
        })
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            fetchCouriers();
          } else {
            alert('Gagal menghapus kurir: ' + json.message);
          }
        })
        .catch((err) => console.error('Delete courier error:', err));
      }
      if (type === 'users') setAppUsers(appUsers.filter((u) => u.id !== id));
    }
  };

  // --- DELETE VARIANT ACTION ---
  const handleDeleteVariant = (productId: string, packSize: number, variantSku: string) => {
    const parent = products.find((p) => p.id === productId);
    if (parent) {
      const sizeKey = String(Math.round(packSize));
      const variantStock = parent.variant_stocks?.[sizeKey] ?? 0;
      if (variantStock > 0) {
        alert(`Tidak dapat menghapus varian ${variantSku} karena masih terdapat stok aktif sebesar ${Math.round(variantStock)} Kg di gudang.`);
        return;
      }

      if (confirm(`Apakah Anda yakin ingin menghapus Produk Varian ${variantSku}?`)) {
        const updatedPackSizes = (parent.pack_sizes || []).filter((sz) => sz !== packSize);
        const updatedVariantPrices = { ...(parent.variant_prices || {}) };
        delete updatedVariantPrices[packSize];

        const updatedVariantNames = { ...(parent.variant_names || {}) };
        delete updatedVariantNames[packSize];

        const updatedVariantSkus = { ...(parent.variant_skus || {}) };
        delete updatedVariantSkus[packSize];

        fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: productId,
            pack_sizes: JSON.stringify(updatedPackSizes),
            variant_prices: JSON.stringify(updatedVariantPrices),
            variant_names: JSON.stringify(updatedVariantNames),
            variant_skus: JSON.stringify(updatedVariantSkus),
          }),
        })
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            fetchProducts();
          } else {
            alert('Gagal menghapus varian: ' + json.message);
          }
        })
        .catch((err) => console.error('Error deleting variant:', err));
      }
    }
  };

  // --- CATALOG MAPPING MODAL ---
  const handleOpenCatalogMapping = (c: Customer) => {
    setMappingCustomer(c);
    setSelectedProductIds(Array.isArray(c.allowed_product_ids) ? c.allowed_product_ids : []);
  };

  const handleToggleProductCheck = (prodId: string) => {
    if (selectedProductIds.includes(prodId)) {
      setSelectedProductIds(selectedProductIds.filter((id) => id !== prodId));
    } else {
      setSelectedProductIds([...selectedProductIds, prodId]);
    }
  };

  const handleSaveCatalogMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappingCustomer) return;

    setCustomers(
      customers.map((c) =>
        c.id === mappingCustomer.id
          ? { ...c, allowed_product_ids: selectedProductIds }
          : c
      )
    );

    setMappingCustomer(null);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    try {
      const res = await fetch('/api/company-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyConfig),
      });
      const json = await res.json();
      if (json.success) {
        window.dispatchEvent(new Event('artaroma_company_settings_updated'));
        alert('Pengaturan profil & alamat warehouse berhasil disimpan!');
      } else {
        alert('Gagal menyimpan pengaturan: ' + json.message);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setConfigSaving(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    let updatedAccounts = [...(companyConfig.bank_accounts || [])];
    if (editingBankIndex !== null) {
      updatedAccounts[editingBankIndex] = bankForm;
    } else {
      updatedAccounts.push(bankForm);
    }

    const newConfig = { ...companyConfig, bank_accounts: updatedAccounts };
    setCompanyConfig(newConfig);

    try {
      await fetch('/api/company-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      window.dispatchEvent(new Event('artaroma_company_settings_updated'));
      alert('Data rekening bank berhasil disimpan!');
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    }
    setIsBankModalOpen(false);
  };

  const handleDeleteBank = async (idx: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus rekening bank ini?')) {
      const updatedAccounts = (companyConfig.bank_accounts || []).filter((_: any, i: number) => i !== idx);
      const newConfig = { ...companyConfig, bank_accounts: updatedAccounts };
      setCompanyConfig(newConfig);

      try {
        await fetch('/api/company-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newConfig),
        });
        window.dispatchEvent(new Event('artaroma_company_settings_updated'));
        alert('Data rekening bank berhasil dihapus!');
      } catch (err: any) {
        alert('Gagal menghapus: ' + err.message);
      }
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig = { ...companyConfig, payment_settings: paymentForm };
    setCompanyConfig(newConfig);

    try {
      await fetch('/api/company-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      alert('Pengaturan term pembayaran berhasil disimpan!');
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    }
    setIsPaymentModalOpen(false);
  };

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig = { ...companyConfig, tax_documents: taxForm };
    setCompanyConfig(newConfig);

    try {
      await fetch('/api/company-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      alert('Data dokumen pajak berhasil disimpan!');
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    }
    setIsTaxModalOpen(false);
  };



  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-20">
      <AdminTopNav />

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Master Data Management
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Kelola database Produk Bibit Parfum, Pendaftaran Customer B2B, Suplier, Armada Kurir, & Manajemen Pengguna (Users)
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {canUserExportXLSX(currentUser) && activeTab !== 'config' && activeTab !== 'appearance' && (
              <button
                onClick={handleExportCurrentTab}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                title={`Ekspor Data ${TAB_LABELS[activeTab] ?? activeTab} ke Excel (.xlsx)`}
              >
                <FileSpreadsheet className="w-4 h-4" /> Ekspor ke XLSX
              </button>
            )}
            {activeTab !== 'finance' && activeTab !== 'config' && activeTab !== 'pricelist' && activeTab !== 'appearance' && (
              <button
                onClick={handleOpenAddModal}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" /> Tambah Data {TAB_LABELS[activeTab] ?? activeTab.toUpperCase()} Baru
              </button>
            )}
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 px-6 flex items-center gap-0 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.key !== 'appearance' && (
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                      activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Toolbar */}
          {activeTab !== 'config' && activeTab !== 'appearance' && (
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={`Cari ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Bulk Price Update & Excel Import for Products & Pricelist */}
                {(activeTab === 'products' || activeTab === 'pricelist') && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsBulkPriceModalOpen(true)}
                      className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      title="Penyesuaian Harga Massal (% atau Nominal Rp)"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-600" /> Penyesuaian Harga Massal
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsImportPricelistModalOpen(true)}
                      className="text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      title="Impor Harga Produk dari File Excel (.xlsx)"
                    >
                      <Upload className="w-3.5 h-3.5 text-teal-600" /> Impor Excel Pricelist
                    </button>
                  </>
                )}
                {canUserExportXLSX(currentUser) && (
                  <button
                    type="button"
                    onClick={handleExportCurrentTab}
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    title={`Ekspor Data ${TAB_LABELS[activeTab] ?? activeTab} ke Excel (.xlsx)`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Ekspor XLSX
                  </button>
                )}
                {activeTab === 'products' && (
                  <button
                    type="button"
                    onClick={() => setIsAppModalOpen(true)}
                    className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" /> Kelola Pilihan Aplikasi
                  </button>
                )}
                {activeTab !== 'pricelist' && activeTab !== 'finance' && (
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah {activeTab.slice(0, -1)} baru
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB: Products */}
          {activeTab === 'products' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wide font-semibold">
                    <th className="px-6 py-3">Produk Induk & Varian Satuan (SKU)</th>
                    <th className="px-6 py-3">Pilihan Aplikasi</th>
                    <th className="px-6 py-3">Aroma Notes</th>
                    <th className="px-6 py-3 text-right">Aksi Super Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products
                    .filter((p) =>
                      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (p.application && p.application.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map((p) => {
                      const packSizes = p.pack_sizes || [];
                      const baseUsd = p.selling_price_usd_per_kg || (p.selling_price_per_kg / usdRate);
                      const baseIdr = convertUsdToIdr(baseUsd, usdRate);

                      return (
                        <React.Fragment key={p.id}>
                          {/* MASTER ROW: PRODUK INDUK */}
                          <tr className="bg-slate-50/70 border-t-2 border-slate-200">
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded tracking-wide uppercase shadow-2xs">
                                  Produk Induk
                                </span>
                                <span className="font-mono text-xs font-bold text-slate-500">
                                  SKU Induk: {p.sku}
                                </span>
                              </div>
                              <div className="font-extrabold text-slate-900 text-base mt-1">{p.name}</div>
                            </td>
                            <td className="px-6 py-3.5 align-top pt-3.5">
                              <div className="flex flex-wrap gap-1">
                                {(() => {
                                  const app = (p.applications && p.applications.length > 0 ? p.applications[0] : p.application) || 'Fine Fragrance';
                                  return (
                                    <span
                                      key={app}
                                      className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap shadow-2xs"
                                    >
                                      {app}
                                    </span>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="px-6 py-3.5 align-top pt-3.5 max-w-xs text-xs space-y-0.5 text-slate-600">
                              <div><strong className="text-amber-600">T:</strong> {p.top_notes}</div>
                              <div><strong className="text-amber-600">M:</strong> {p.middle_notes}</div>
                              <div className="text-slate-400"><strong className="text-slate-400">B:</strong> {p.base_notes}</div>
                            </td>
                            <td className="px-6 py-3.5 align-top pt-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditModal('products', p)}
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs px-2.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 transition-colors"
                                  title="Edit Template"
                                >
                                  <Pencil className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDelete('products', p.id, p.name)}
                                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs p-1.5 rounded-lg transition-colors"
                                  title="Hapus Master Template"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* PRODUK VARIAN SUB-HEADER & SUB-ROWS */}
                          {packSizes.length > 0 && (
                            <tr className="bg-white">
                              <td colSpan={4} className="px-6 py-1 bg-purple-50/40 border-b border-purple-100">
                                <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider">
                                  PRODUK VARIAN :
                                </span>
                              </td>
                            </tr>
                          )}

                          {packSizes.map((sz) => {
                            const vSku = p.variant_skus?.[sz] ?? `${p.sku}-${sz}K`;
                            const vName = p.variant_names?.[sz] ?? `${p.name} ${sz}K`;
                            const vPriceIdr = p.variant_prices?.[sz] ?? (p.selling_price_per_kg || 1500000);

                            return (
                              <tr key={vSku} className="bg-white hover:bg-purple-50/30 transition-colors border-b border-gray-100">
                                <td className="px-6 py-2.5 pl-10">
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-slate-800 text-xs font-sans min-w-[130px]">
                                      {vName}
                                    </span>
                                    <div className="inline-flex items-center gap-1 bg-purple-50/80 border border-purple-200 px-2 py-0.5 rounded-md font-mono text-xs">
                                      <span className="font-extrabold text-purple-900">{vSku}</span>
                                      <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.2 rounded font-extrabold">
                                        {sz} Kg
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-2.5"></td>
                                <td className="px-6 py-2.5"></td>
                                <td className="px-6 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleOpenEditVariantModal(p, sz)}
                                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1 transition-colors"
                                    >
                                      <Pencil className="w-3.5 h-3.5" /> Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteVariant(p.id, sz, vSku)}
                                      className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs p-1.5 rounded-lg transition-colors"
                                      title="Hapus Varian Ini"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: Pricelist Umum */}
          {activeTab === 'pricelist' && (
            <div>
              {/* Sub-tab Navigation */}
              <div className="flex border-b border-gray-200 px-6 bg-slate-50/50 py-2 items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setPricelistSubTab('active')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      pricelistSubTab === 'active'
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    Daftar Pricelist Aktif
                  </button>
                  <button
                    onClick={() => setPricelistSubTab('history')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      pricelistSubTab === 'history'
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Riwayat Perubahan Harga
                    {priceLogs.length > 0 && (
                      <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ml-1">
                        {priceLogs.length}
                      </span>
                    )}
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  Acuan penetapan harga dasar produk (Rupiah & USD)
                </div>
              </div>

              {/* SUPER ADMIN USD EXCHANGE RATE INPUT CONTROL WIDGET */}
              <div className="mx-6 my-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-700 rounded-2xl p-5 text-white shadow-md">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        PENGATURAN KURS HARIAN MULTI-CURRENCY
                      </span>
                      <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                        BASE: USD ($) &rarr; IDR (Rp)
                      </span>
                    </div>
                    <h2 className="text-base font-bold flex items-center gap-2 text-white mt-1">
                      <Coins className="w-5 h-5 text-amber-400" />
                      Pengaturan Kurs Harian USD / IDR
                    </h2>
                    <p className="text-xs text-slate-300">
                      Perubahan nilai kurs otomatis mengonversi harga jual Rupiah untuk seluruh varian bibit parfum berbasis USD di katalog customer & sistem order.
                    </p>
                  </div>

                  {/* Kurs Form */}
                  <form onSubmit={handleSaveRate} className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    <div className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono font-bold">1 USD = Rp</span>
                      <input
                        type="number"
                        step="50"
                        min="10000"
                        max="30000"
                        value={usdRateInput}
                        onChange={(e) => setUsdRateInput(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1 text-sm font-mono font-bold text-amber-300 text-right w-28 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Save className="w-4 h-4" /> Simpan & Terapkan Kurs
                    </button>
                  </form>
                </div>

                {isRateSavedAlert && (
                  <div className="mt-3 bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 animate-fade-in font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Kurs USD Rp {new Intl.NumberFormat("id-ID").format(usdRate)} BERHASIL DITERAPKAN! Seluruh harga jual Rupiah otomatis disesuaikan.
                    </span>
                  </div>
                )}
              </div>

              {pricelistSubTab === 'active' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wide font-semibold">
                        <th className="px-6 py-3">Produk Induk (SKU)</th>
                        <th className="px-6 py-3 text-center">Varian 25 Kg (IDR & USD / Kg)</th>
                        <th className="px-6 py-3 text-center">Varian 5 Kg (IDR & USD / Kg)</th>
                        <th className="px-6 py-3 text-center">Varian 1 Kg (IDR & USD / Kg)</th>
                        <th className="px-6 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {products
                        .filter((p) =>
                          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((p) => {
                          const v25 = p.variants?.find((v: any) => Number(v.pack_size_kg) === 25);
                          const v5 = p.variants?.find((v: any) => Number(v.pack_size_kg) === 5);
                          const v1 = p.variants?.find((v: any) => Number(v.pack_size_kg) === 1);

                          const formatVariantPrice = (v: any) => {
                            if (!v) return <span className="text-slate-400 font-medium font-sans">Belum Diatur</span>;
                            const idr = v.selling_price_per_kg;
                            const usd = v.selling_price_usd_per_kg;
                            return (
                              <div className="space-y-0.5 text-xs">
                                <div className="font-mono font-bold text-blue-600">
                                  {usd && Number(usd) > 0 ? `$${Number(usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
                                </div>
                                <div className="font-mono font-bold text-slate-800">{formatIDR(idr)}</div>
                              </div>
                            );
                          };

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-800">{p.name}</div>
                                <div className="font-mono text-xs text-slate-500 mt-0.5">{p.sku}</div>
                              </td>
                              <td className="px-6 py-4 text-center">{formatVariantPrice(v25)}</td>
                              <td className="px-6 py-4 text-center">{formatVariantPrice(v5)}</td>
                              <td className="px-6 py-4 text-center">{formatVariantPrice(v1)}</td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => openPricelistModal(p)}
                                  className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1 inline-flex hover:bg-blue-100 transition-colors shadow-2xs"
                                >
                                  <Pencil className="w-3.5 h-3.5" /> Atur Harga
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div>
                  {/* Backdrop to close dropdown on outside click */}
                  {isProductFilterDropdownOpen && (
                    <div 
                      className="fixed inset-0 z-20 cursor-default" 
                      onClick={() => setIsProductFilterDropdownOpen(false)} 
                    />
                  )}

                  {/* Filter Bar khusus Riwayat */}
                  <div className="px-6 py-3 bg-slate-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 relative">
                    <div className="flex items-center gap-3 flex-wrap z-30">
                      <span className="text-xs font-bold text-slate-600">Filter Produk:</span>
                      
                      {/* Custom Multi-select Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsProductFilterDropdownOpen(!isProductFilterDropdownOpen)}
                          className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 flex items-center gap-1.5 hover:border-gray-300 transition-colors shadow-2xs"
                        >
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {selectedProductIdsForFilter.length === 0
                              ? 'Semua Produk'
                              : `${selectedProductIdsForFilter.length} Produk Terpilih`}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">▼</span>
                        </button>

                        {isProductFilterDropdownOpen && (
                          <div className="absolute left-0 mt-1 z-35 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-3 space-y-2">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100 text-[10px]">
                              <button
                                type="button"
                                onClick={() => setSelectedProductIdsForFilter(products.map((p) => p.id))}
                                className="text-blue-600 hover:underline font-bold"
                              >
                                Pilih Semua
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedProductIdsForFilter([])}
                                className="text-red-500 hover:underline font-bold"
                              >
                                Hapus Pilihan
                              </button>
                            </div>
                            
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 font-sans">
                              {products.map((p) => {
                                const isChecked = selectedProductIdsForFilter.includes(p.id);
                                return (
                                  <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setSelectedProductIdsForFilter(
                                            selectedProductIdsForFilter.filter((id) => id !== p.id)
                                          );
                                        } else {
                                          setSelectedProductIdsForFilter([...selectedProductIdsForFilter, p.id]);
                                        }
                                      }}
                                      className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span className="text-[11px] font-bold text-slate-700 truncate" title={p.name}>
                                      {p.name}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 font-medium z-10">
                      Menampilkan {
                        priceLogs.filter((log) => {
                          const matchesSearch = log.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                log.variant_sku.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesProductFilter = selectedProductIdsForFilter.length === 0 ||
                                                       selectedProductIdsForFilter.includes(log.product_id);
                          return matchesSearch && matchesProductFilter;
                        }).length
                      } riwayat perubahan harga
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {priceLogsLoading ? (
                      <div className="text-center py-12 text-slate-400 font-medium">
                        Memuat data riwayat...
                      </div>
                    ) : priceLogs.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 font-medium">
                        Belum ada riwayat perubahan harga tercatat.
                      </div>
                    ) : (
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-slate-500 uppercase tracking-wide font-semibold text-[10px]">
                            <th className="px-6 py-3">Waktu Perubahan</th>
                            <th className="px-6 py-3">Produk & SKU Varian</th>
                            <th className="px-6 py-3 text-center">Kemasan</th>
                            <th className="px-6 py-3 text-right">Harga Lama</th>
                            <th className="px-6 py-3 text-center">Arah</th>
                            <th className="px-6 py-3 text-right">Harga Baru</th>
                            <th className="px-6 py-3 text-center">Pengubah</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 font-medium text-slate-700">
                          {priceLogs
                            .filter((log) => {
                              const matchesSearch = log.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    log.variant_sku.toLowerCase().includes(searchTerm.toLowerCase());
                              const matchesProductFilter = selectedProductIdsForFilter.length === 0 ||
                                                           selectedProductIdsForFilter.includes(log.product_id);
                              return matchesSearch && matchesProductFilter;
                            })
                            .map((log) => {
                              const oldUsd = Number(log.old_price_usd || 0);
                              const newUsd = Number(log.new_price_usd || 0);
                              const oldIdr = Number(log.old_price_idr || 0);
                              const newIdr = Number(log.new_price_idr || 0);

                              let isIncrease = false;
                              let isDecrease = false;

                              if (newUsd !== oldUsd) {
                                isIncrease = newUsd > oldUsd;
                                isDecrease = newUsd < oldUsd;
                              } else {
                                isIncrease = newIdr > oldIdr;
                                isDecrease = newIdr < oldIdr;
                              }
                              
                              const formattedDate = new Date(log.created_at).toLocaleString('id-ID', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              });

                              return (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-3.5 font-mono text-slate-500 whitespace-nowrap">{formattedDate}</td>
                                  <td className="px-6 py-3.5">
                                    <div className="font-bold text-slate-800">{log.product_name}</div>
                                    <div className="font-mono text-[10px] text-purple-700 mt-0.5">{log.variant_sku}</div>
                                  </td>
                                  <td className="px-6 py-3.5 text-center">
                                    <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded font-bold">
                                      {Number(log.pack_size_kg)} Kg
                                    </span>
                                  </td>
                                  <td className="px-6 py-3.5 text-right font-mono text-xs">
                                    <div className="font-bold text-blue-600">${Number(log.old_price_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    <div className="font-bold text-slate-700">{formatIDR(log.old_price_idr)}</div>
                                  </td>
                                  <td className="px-6 py-3.5 text-center">
                                    {isIncrease ? (
                                      <span className="text-emerald-600 font-bold text-sm" title="Harga Naik">▲</span>
                                    ) : isDecrease ? (
                                      <span className="text-red-500 font-bold text-sm" title="Harga Turun">▼</span>
                                    ) : (
                                      <span className="text-slate-400 font-bold text-sm" title="Harga Tetap">➔</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-3.5 text-right font-mono text-xs">
                                    <div className={`font-bold ${isIncrease ? 'text-emerald-600' : isDecrease ? 'text-red-600' : 'text-blue-600'}`}>
                                      ${Number(log.new_price_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div className={`font-bold ${isIncrease ? 'text-emerald-600' : isDecrease ? 'text-red-600' : 'text-slate-850'}`}>
                                      {formatIDR(log.new_price_idr)}
                                    </div>
                                  </td>
                                  <td className="px-6 py-3.5 text-center font-bold text-slate-500">
                                    <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                                      {log.changed_by}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Customers */}
          {activeTab === 'customers' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wide font-semibold">
                    <th className="px-6 py-3">Kode / Perusahaan</th>
                    <th className="px-6 py-3">PIC & Akun Login B2B (Username)</th>
                    <th className="px-6 py-3">Plafon Kredit B2B</th>
                    <th className="px-6 py-3">Status Tempo</th>
                    <th className="px-6 py-3">Kurir & Ongkir Default</th>
                    <th className="px-6 py-3">Tampilan Katalog Produk</th>
                    <th className="px-6 py-3 text-right">Aksi Super Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers
                    .filter((c) =>
                      c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      c.pic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      ((c as any).pic_name_2 && (c as any).pic_name_2.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      ((c as any).pic_name_3 && (c as any).pic_name_3.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      c.email.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .sort((a, b) => (a.company_name || '').localeCompare(b.company_name || '', 'id', { sensitivity: 'base' }))
                    .map((c) => {
                      const allowedCount = Array.isArray(c.allowed_product_ids) ? c.allowed_product_ids.length : 0;

                      const isCreditActive = (c.is_credit_eligible ?? true) && c.credit_limit > 0;
                      const courierName = (c as any).default_courier_name || ((c as any).default_courier_id ? couriers.find(k => k.id === (c as any).default_courier_id)?.name : null);
                      const shippingType = (c as any).default_shipping_type || 'FRANCO';
                      const shippingCost = Number((c as any).default_shipping_cost) || 0;

                      return (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="font-semibold text-slate-800">{c.company_name}</div>
                            <span className="font-mono text-[11px] text-blue-600">{c.code}</span>
                          </td>

                          <td className="px-6 py-3.5 text-xs">
                            <div className="font-medium text-slate-800">{c.pic_name} {c.phone ? `| ${c.phone}` : ''}</div>
                            {(c as any).pic_name_2 && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                <span className="font-semibold text-slate-600">PIC 2:</span> {(c as any).pic_name_2} {(c as any).phone_2 ? `(${(c as any).phone_2})` : ''}
                              </div>
                            )}
                            {(c as any).pic_name_3 && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                <span className="font-semibold text-slate-600">PIC 3:</span> {(c as any).pic_name_3} {(c as any).phone_3 ? `(${(c as any).phone_3})` : ''}
                              </div>
                            )}
                            <div className="text-blue-700 font-mono font-semibold flex items-center gap-1 mt-1">
                              <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{c.username || c.email}</span>
                            </div>
                          </td>

                          <td className="px-6 py-3.5">
                            {isCreditActive ? (
                              <>
                                <div className="font-mono font-bold text-slate-800">{formatIDR(c.credit_limit)}</div>
                                <div className="text-[11px] text-slate-400">TOP {c.credit_terms_days} Hari</div>
                              </>
                            ) : (
                              <span className="bg-gray-100 text-gray-700 border border-gray-200 text-[11px] px-2 py-0.5 rounded font-bold">
                                CASH / LUNAS TRANSFER
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-3.5">
                            {c.has_overdue ? (
                              <span className="bg-red-50 text-red-600 border border-red-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-max">
                                <ShieldAlert className="w-3 h-3" /> BLOCKED
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-max">
                                <CheckCircle2 className="w-3 h-3" /> AKTIF
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-3.5 text-xs">
                            {courierName ? (
                              (() => {
                                const matched = couriers.find((k) => k.id === (c as any).default_courier_id || k.name === courierName);
                                const isExt = matched ? (matched as any).courier_type === 'EKSTERNAL' : false;
                                return (
                                  <div className="space-y-0.5">
                                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                                      {isExt ? (
                                        <span title="Ekspedisi Eksternal" className="inline-flex">
                                          <Truck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                        </span>
                                      ) : (
                                        <span title="Kurir Internal" className="inline-flex">
                                          <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        </span>
                                      )}
                                      <span className="truncate max-w-[140px]" title={courierName}>{courierName}</span>
                                    </div>
                                    <div className="font-mono text-[11px] flex items-center gap-1">
                                      {isExt && (
                                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 font-bold">EXT</span>
                                      )}
                                      {shippingType === 'FRANCO' ? (
                                        <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">FRANCO (Gratis)</span>
                                      ) : (
                                        <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                          LOCO: {formatIDR(shippingCost)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">— Default (Manual) —</span>
                            )}
                          </td>

                          <td className="px-6 py-3.5">
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-bold">
                              {allowedCount} dari {products.length} Produk Tampil
                            </span>
                          </td>

                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal('customers', c)}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs px-2.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>

                              <button
                                onClick={() => handleDelete('customers', c.id, c.company_name)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs p-1.5 rounded-lg transition-colors"
                                title="Hapus Customer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: Distributors */}
          {activeTab === 'distributors' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wide font-semibold">
                    <th className="px-6 py-3">Kode / Nama Suplier</th>
                    <th className="px-6 py-3">Contact & TOP Hutang</th>
                    <th className="px-6 py-3">Telepon & Email</th>
                    <th className="px-6 py-3">Rekening & NPWP</th>
                    <th className="px-6 py-3">Produk Dipesan</th>
                    <th className="px-6 py-3">Alamat & Catatan</th>
                    <th className="px-6 py-3 text-right">Aksi Super Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {distributors
                    .filter((d) =>
                      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (d.contact_name && d.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      (d.code && d.code.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }))
                    .map((d) => {
                    const suppliedProducts = products.filter((p) => (d.supplied_product_ids || []).includes(p.id));
                    return (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="font-semibold text-slate-800">{d.name}</div>
                          <span className="font-mono text-[11px] text-blue-600 font-bold">{d.code}</span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="font-medium text-slate-800">{d.contact_name}</div>
                          <span className="bg-purple-100 text-purple-800 border border-purple-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold inline-block mt-0.5">
                            TOP: {d.top_payable_days ?? 30} Hari
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600 font-mono">
                          <div>{d.phone}</div>
                          <div className="text-slate-500 font-sans">{d.email}</div>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600 font-mono max-w-xs">
                          {d.bank_account ? (
                            <div className="font-bold text-slate-800 truncate" title={d.bank_account}>
                              💳 {d.bank_account}
                            </div>
                          ) : (
                            <div className="text-gray-400 italic">-</div>
                          )}
                          {d.npwp && <div className="text-[11px] text-slate-500 mt-0.5">NPWP: {d.npwp}</div>}
                        </td>
                        <td className="px-6 py-3.5 text-xs max-w-xs">
                          {suppliedProducts.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {suppliedProducts.map((sp) => (
                                <span key={sp.id} className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded-md font-bold">
                                  {sp.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-[11px] italic">Semua Produk Induk</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-500 max-w-xs">
                          <div className="truncate" title={d.address}>{d.address}</div>
                          {d.notes && (
                            <div className="text-[11px] text-amber-700 italic mt-0.5 truncate" title={d.notes}>
                              📝 {d.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal('distributors', d)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs px-2.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete('distributors', d.id, d.name)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs p-1.5 rounded-lg transition-colors"
                              title="Hapus Suplier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: Couriers */}
          {activeTab === 'couriers' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wide font-semibold">
                    <th className="px-6 py-3">Kode / Nama Kurir & Ekspedisi</th>
                    <th className="px-6 py-3">Tipe Kurir</th>
                    <th className="px-6 py-3">Nomor HP / Kontak</th>
                    <th className="px-6 py-3">Kendaraan / Layanan</th>
                    <th className="px-6 py-3">Akun Login Aplikasi Mobile</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Aksi Super Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {couriers
                    .filter((k) =>
                      k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (k.code && k.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      (k.phone && k.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      ((k as any).vehicle_number && (k as any).vehicle_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      ((k as any).service_type && (k as any).service_type.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }))
                    .map((k) => {
                      const isExternal = (k as any).courier_type === 'EKSTERNAL';

                      return (
                        <tr key={k.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              {isExternal ? (
                                <Package className="w-4 h-4 text-amber-600 shrink-0" />
                              ) : (
                                <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                              )}
                              <span>{k.name}</span>
                            </div>
                            <span className="font-mono text-[11px] text-blue-600 font-bold block mt-0.5">{k.code}</span>
                            {(k as any).notes && (
                              <div className="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate" title={(k as any).notes}>
                                📝 {(k as any).notes}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-3.5">
                            {isExternal ? (
                              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
                                <Package className="w-3 h-3" /> EKSTERNAL
                              </span>
                            ) : (
                              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
                                <Truck className="w-3 h-3" /> INTERNAL
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-3.5 font-mono text-slate-600 text-xs">{k.phone}</td>

                          <td className="px-6 py-3.5 text-xs">
                            <div className="font-semibold text-amber-800">{k.vehicle_number || (k as any).service_type || '—'}</div>
                            {isExternal && (
                              <div className="text-[10px] text-slate-400">Vendor Cargo Ekspedisi</div>
                            )}
                          </td>

                          <td className="px-6 py-3.5 text-xs">
                            {isExternal ? (
                              <span className="text-slate-400 italic text-[11px] bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                — Ekspedisi Luar (Tanpa Login) —
                              </span>
                            ) : (k as any).linked_user_email ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> {(k as any).linked_user_email}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                Belum terhubung akun login
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-3.5">
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-bold">
                              SIAP TUGAS
                            </span>
                          </td>

                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal('couriers', k)}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs px-2.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => handleDelete('couriers', k.id, k.name)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs p-1.5 rounded-lg transition-colors"
                                title="Hapus Kurir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: Users Management (New 5th Column) */}
          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wide font-semibold">
                    <th className="px-6 py-3">Nama Pengguna &amp; Email</th>
                    <th className="px-6 py-3">Modul yang Dapat Diakses</th>
                    <th className="px-6 py-3">Entitas / Unit Terkait</th>
                    <th className="px-6 py-3">Terakhir Login</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Aksi Super Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {appUsers
                    .filter((u) =>
                      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (userModuleAccess[u.id] || []).join(' ').toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }))
                    .map((u) => {
                      const assigned = userModuleAccess[u.id] || [];
                      return (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <UserCheck className="w-4 h-4 text-blue-600" />
                              {u.name}
                            </div>
                            <div className="font-mono text-xs text-slate-500">{u.email}</div>
                          </td>

                          <td className="px-6 py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-md">
                              {assigned.length > 0 ? (
                                assigned.map((mod) => (
                                  <span
                                    key={mod}
                                    className="bg-violet-50 text-violet-700 border border-violet-200 text-[10px] px-2 py-0.5 rounded-full font-bold"
                                  >
                                    {mod}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 text-xs italic">Belum ada modul</span>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-3.5 text-xs text-slate-700 font-medium">
                            {u.linked_entity_name || 'Artaroma HQ'}
                          </td>

                        <td className="px-6 py-3.5 text-xs text-slate-500 font-mono">
                          {u.last_login || 'Belum Login'}
                        </td>

                        <td className="px-6 py-3.5">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-bold">
                            AKTIF
                          </span>
                        </td>

                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleResetPassword(u.name, u.email)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs px-2.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 transition-colors"
                              title="Reset Password Pengguna"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Reset Pass
                            </button>
                            <button
                              onClick={() => handleOpenEditModal('users', u)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs px-2.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete('users', u.id, u.name)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs p-1.5 rounded-lg transition-colors"
                              title="Hapus Akun Pengguna"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {appUsers.filter((u) =>
                    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (userModuleAccess[u.id] || []).join(' ').toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">Tidak ada data pengguna yang sesuai.</p>
                        {searchTerm && <p className="text-xs mt-1 text-slate-400">Coba ubah kata kunci pencarian Anda.</p>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: Keuangan & Bank */}
          {activeTab === 'finance' && (
            <div className="p-6 space-y-6">
              {/* Header info banner */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl p-5 flex items-start gap-4 shadow-md">
                <Landmark className="w-10 h-10 opacity-80 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-bold text-lg">Data Keuangan & Rekening Bank Perusahaan</h2>
                  <p className="text-emerald-100 text-sm mt-0.5">
                    Kelola informasi rekening bank perusahaan, pengaturan term pembayaran default, dan ringkasan posisi hutang kepada suplier.
                  </p>
                </div>
              </div>

              {/* Grid Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Card: Rekening Bank Perusahaan */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="bg-blue-700 text-white px-5 py-3.5 flex items-center gap-2">
                    <Landmark className="w-4 h-4" />
                    <h3 className="font-bold text-sm">Rekening Bank Perusahaan (Artaroma)</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {(companyConfig.bank_accounts || []).map((rek: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                        <div className="bg-blue-600 text-white rounded-lg w-8 h-8 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                          {rek.bank.split(' ').map((w: string) => w[0]).slice(0, 3).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800 text-xs">{rek.bank}</div>
                          <div className="font-mono text-slate-900 text-sm font-extrabold tracking-wider mt-0.5">{rek.no}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">a.n {rek.atas_nama}</div>
                          <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${rek.badge}`}>{rek.jenis}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => {
                              setEditingBankIndex(i);
                              setBankForm({ ...rek });
                              setIsBankModalOpen(true);
                            }}
                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg border border-transparent hover:border-blue-200 transition-colors"
                            title="Edit Rekening"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBank(i)}
                            className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                            title="Hapus Rekening"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setEditingBankIndex(null);
                        setBankForm({
                          bank: '',
                          no: '',
                          atas_nama: 'PT Artaroma Jayatama',
                          jenis: 'Rekening Operasional',
                          badge: 'bg-blue-100 text-blue-800'
                        });
                        setIsBankModalOpen(true);
                      }}
                      className="w-full border-2 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Rekening Bank
                    </button>
                  </div>
                </div>

                {/* Card: Hutang Kepada Suplier */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="bg-purple-700 text-white px-5 py-3.5 flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    <h3 className="font-bold text-sm">Hutang Usaha kepada Suplier</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {distributors.map((d) => {
                      const top = d.top_payable_days ?? 30;
                      return (
                        <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50/40 transition-colors">
                          <div className="bg-purple-100 text-purple-800 rounded-lg w-8 h-8 flex items-center justify-center text-xs font-extrabold flex-shrink-0">
                            {d.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 text-xs truncate">{d.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{d.code}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="bg-purple-100 text-purple-800 border border-purple-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold">
                              TOP {top} Hari
                            </span>
                            <div className="text-[11px] text-slate-500 mt-0.5 font-mono truncate max-w-[120px]" title={d.bank_account ?? ''}>
                              {d.bank_account ? `💳 ${d.bank_account}` : <span className="text-gray-300 italic">No Rek. belum diisi</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {distributors.length === 0 && (
                      <div className="text-center text-slate-400 text-sm py-8">Tidak ada data suplier.</div>
                    )}
                  </div>
                </div>

                {/* Card: Pengaturan Term Pembayaran Default */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="bg-amber-600 text-white px-5 py-3.5 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <h3 className="font-bold text-sm">Pengaturan Term Pembayaran Default</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {[
                      { label: 'TOP Hutang ke Suplier (Default)', value: companyConfig.payment_settings?.top_payable || '30 Hari', color: 'text-purple-700', icon: '📤' },
                      { label: 'TOP Piutang dari Customer B2B (Default)', value: companyConfig.payment_settings?.top_receivable || '30 Hari', color: 'text-blue-700', icon: '📥' },
                      { label: 'Denda Keterlambatan Bayar (%/Bulan)', value: companyConfig.payment_settings?.late_fee || '1.5%', color: 'text-red-700', icon: '⚠️' },
                      { label: 'Mata Uang Pelaporan', value: companyConfig.payment_settings?.currency || 'IDR (Rupiah Indonesia)', color: 'text-emerald-700', icon: '🇮🇩' },
                      { label: 'Pajak PPN Berlaku (%)', value: companyConfig.payment_settings?.ppn || '11%', color: 'text-slate-700', icon: '🧾' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <span>{item.icon}</span>
                          {item.label}
                        </div>
                        <div className={`font-extrabold font-mono text-xs ${item.color}`}>{item.value}</div>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setPaymentForm({
                          top_payable: companyConfig.payment_settings?.top_payable || '30 Hari',
                          top_receivable: companyConfig.payment_settings?.top_receivable || '30 Hari',
                          late_fee: companyConfig.payment_settings?.late_fee || '1.5%',
                          currency: companyConfig.payment_settings?.currency || 'IDR (Rupiah Indonesia)',
                          ppn: companyConfig.payment_settings?.ppn || '11%'
                        });
                        setIsPaymentModalOpen(true);
                      }}
                      className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors mt-1"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Ubah Pengaturan Pembayaran
                    </button>
                  </div>
                </div>

                {/* Card: Catatan Keuangan & Dokumen Pajak */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="bg-teal-700 text-white px-5 py-3.5 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <h3 className="font-bold text-sm">Dokumen Pajak Perusahaan (Artaroma)</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {[
                      { label: 'NPWP Perusahaan', value: companyConfig.tax_documents?.npwp || '01.987.654.3-041.000', badge: 'bg-teal-100 text-teal-800' },
                      { label: 'NPPKP (PKP)', value: companyConfig.tax_documents?.nppkp || '01.987.654.3-041.000', badge: 'bg-blue-100 text-blue-800' },
                      { label: 'NIB (Nomor Induk Berusaha)', value: companyConfig.tax_documents?.nib || '1234567890123', badge: 'bg-emerald-100 text-emerald-800' },
                      { label: 'Nama Legal Perusahaan', value: companyConfig.tax_documents?.legal_name || 'PT Artaroma Nusantara', badge: 'bg-slate-100 text-slate-800' },
                      { label: 'Alamat Terdaftar (Fiskal)', value: companyConfig.tax_documents?.address || 'Jl. Industri Parfum No. 88, Jakarta Barat', badge: 'bg-gray-100 text-gray-700' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                        <div className="text-xs text-slate-500 flex-shrink-0">{item.label}</div>
                        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${item.badge} text-right`}>{item.value}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setTaxForm({
                          npwp: companyConfig.tax_documents?.npwp || '01.987.654.3-041.000',
                          nppkp: companyConfig.tax_documents?.nppkp || '01.987.654.3-041.000',
                          nib: companyConfig.tax_documents?.nib || '1234567890123',
                          legal_name: companyConfig.tax_documents?.legal_name || 'PT Artaroma Nusantara',
                          address: companyConfig.tax_documents?.address || 'Jl. Industri Parfum No. 88, Jakarta Barat'
                        });
                        setIsTaxModalOpen(true);
                      }}
                      className="w-full bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors mt-1"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Ubah Data Pajak Perusahaan
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: Akses Pengguna (Super Admin Only) */}
          {activeTab === 'access' && (
            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="bg-gradient-to-r from-violet-700 to-indigo-800 text-white rounded-xl p-5 flex items-start gap-4 shadow-md">
                <Key className="w-10 h-10 opacity-80 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-bold text-lg">Manajemen Hak Akses Pengguna</h2>
                  <p className="text-violet-200 text-sm mt-0.5">
                    Super Admin dapat memberikan atau mencabut akses ke modul manapun secara bebas untuk setiap pengguna — tanpa terbatas oleh role.
                  </p>
                </div>
              </div>

              {/* Users table */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-violet-700 text-white px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <h3 className="font-bold text-sm">Daftar Pengguna &amp; Hak Akses Modul</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-violet-200 text-[11px] hidden sm:inline">{appUsers.length} pengguna terdaftar</span>
                    <button
                      onClick={handleOpenAddModal}
                      className="bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Pengguna &amp; Akses Baru
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {appUsers.map((u) => {
                    const isEditing = editingAccessUserId === u.id;
                    const assignedMods = userModuleAccess[u.id] ?? [];

                    return (
                      <div key={u.id} className={`px-5 py-4 transition-colors ${isEditing ? 'bg-violet-50/50' : 'hover:bg-gray-50/60'}`}>
                        {/* User info row */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 font-extrabold text-xs flex items-center justify-center flex-shrink-0 border-2 border-violet-200">
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 text-sm">{u.name}</div>
                              <div className="text-slate-400 text-[11px] font-mono truncate">{u.email}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Status badge */}
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              u.is_active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'
                            }`}>
                              {u.is_active ? <><CheckCircle2 className="w-3 h-3" /> Aktif</> : <><X className="w-3 h-3" /> Non-Aktif</>}
                            </span>

                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveAccess(u.id)}
                                  className="bg-violet-600 hover:bg-violet-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
                                >
                                  <Save className="w-3.5 h-3.5" /> Simpan
                                </button>
                                <button
                                  onClick={() => setEditingAccessUserId(null)}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs px-2.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" /> Batal
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEditAccess(u.id)}
                                  className="bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-xs px-2.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 transition-colors"
                                >
                                  <Shield className="w-3.5 h-3.5" /> Kelola Akses
                                </button>
                                <button
                                  onClick={() => handleResetPassword(u.name, u.email)}
                                  className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs p-1.5 rounded-lg transition-colors"
                                  title="Reset Password"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Module chips / checkboxes */}
                        <div className="mt-3 ml-12">
                          {isEditing ? (
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-[10px] text-violet-600 font-bold uppercase tracking-wide">Pilih modul yang dapat diakses:</div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={handleSelectAllModules}
                                    className="text-[10px] text-violet-700 hover:text-violet-900 font-bold underline cursor-pointer"
                                  >
                                    Pilih Semua
                                  </button>
                                  <span className="text-violet-300">|</span>
                                  <button
                                    type="button"
                                    onClick={handleClearAllModules}
                                    className="text-[10px] text-slate-500 hover:text-slate-700 font-medium underline cursor-pointer"
                                  >
                                    Kosongkan
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {ALL_MODULES.map((mod) => {
                                  const checked = draftModules.includes(mod);
                                  return (
                                    <button
                                      key={mod}
                                      type="button"
                                      onClick={() => handleToggleDraftModule(mod)}
                                      className={`inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-bold border-2 transition-all ${
                                        checked
                                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                          : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600'
                                      }`}
                                    >
                                      {checked ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3 opacity-40" />}
                                      {mod}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="mt-2 text-[10px] text-slate-400">
                                {draftModules.length} dari {ALL_MODULES.length} modul dipilih
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {assignedMods.length > 0 ? assignedMods.map((mod) => (
                                <span key={mod} className="bg-violet-50 text-violet-700 border border-violet-200 text-[10px] px-2 py-0.5 rounded-full font-semibold">{mod}</span>
                              )) : (
                                <span className="text-slate-400 text-xs italic">Belum ada modul yang diberikan</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {appUsers.length === 0 && (
                    <div className="text-center text-slate-400 text-sm py-10">Belum ada pengguna terdaftar.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Pengaturan / Profil Perusahaan */}
          {activeTab === 'config' && (
            <div className="p-6 max-w-2xl mx-auto space-y-6">
              <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-xl p-5 flex items-start gap-4 shadow-md">
                <Settings className="w-10 h-10 opacity-80 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-bold text-lg">Pengaturan Profil & Warehouse Perusahaan</h2>
                  <p className="text-blue-150 text-xs mt-0.5 leading-relaxed">
                    Konfigurasi ini disimpan di database dan digunakan sebagai data Penerima pada dokumen Purchase Order (PO) dan modul logistik gudang.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveConfig} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Perusahaan / Penerima <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyConfig.company_name}
                    onChange={(e) => setCompanyConfig({ ...companyConfig, company_name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                    placeholder="Contoh: PT Artaroma Jayatama"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tagline / Sub-Header Kop Surat Dokumen <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyConfig.company_tagline || ''}
                    onChange={(e) => setCompanyConfig({ ...companyConfig, company_tagline: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                    placeholder="Contoh: B2B Fragrance Oil Supplier & Management Hub"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Teks ini tampil sebagai sub-header di bawah nama perusahaan pada kop surat dokumen PDF (SO, Faktur / Invoice, Surat Jalan SBBK, dan PO).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Lengkap Warehouse Utama <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={companyConfig.warehouse_address}
                    onChange={(e) => setCompanyConfig({ ...companyConfig, warehouse_address: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-medium resize-none"
                    placeholder="Tulis alamat lengkap gudang FEFO..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      UP Logistik (PIC Gudang) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companyConfig.logistics_pic}
                      onChange={(e) => setCompanyConfig({ ...companyConfig, logistics_pic: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                      placeholder="Contoh: Tim Gudang FEFO Engine"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ketentuan Jadwal Terima Barang PO <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companyConfig.delivery_schedule_rule}
                      onChange={(e) => setCompanyConfig({ ...companyConfig, delivery_schedule_rule: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                      placeholder="Contoh: Max 7 Hari setelah PO diterbitkan"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={configSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-md flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {configSaving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Simpan Perubahan</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: KUSTOMISASI TAMPILAN & TEMA */}
          {activeTab === 'appearance' && (
            <div className="p-6 max-w-5xl mx-auto space-y-6">
              {/* Header Banner */}
              <div
                className="text-white rounded-2xl p-6 shadow-lg relative overflow-hidden transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, ${themeSettings.primaryColor} 0%, #1e1b4b 100%)`,
                }}
              >
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center flex-shrink-0 border border-white/20">
                      <Palette className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-white/20 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                          UI ERGONOMICS &amp; BRANDING
                        </span>
                        <span className="bg-emerald-400/25 text-emerald-200 border border-emerald-300/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold">
                          LIVE CSS SYNC
                        </span>
                      </div>
                      <h2 className="font-extrabold text-xl mt-1">Kustomisasi Tampilan &amp; Tema Antarmuka</h2>
                      <p className="text-white/80 text-xs mt-1 max-w-2xl leading-relaxed">
                        Sesuaikan palet warna aksen, ukuran font, kerapatan tabel data, dan nuansa latar belakang. Perubahan langsung aktif di layar dan tersimpan otomatis.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetAppearance}
                    className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3.5 py-2 rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-sm flex-shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset ke Default
                  </button>
                </div>
              </div>

              {/* Alert Notification */}
              {themeSavedAlert && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl p-4 flex items-center gap-3 shadow-xs animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div className="text-xs font-semibold">{themeSavedAlert}</div>
                </div>
              )}

              {/* SECTION 1: 1-Click Preset Theme Gallery */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Pilihan Tema Cepat (1-Klik Preset)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Pilih salah satu preset tema siap pakai yang dirancang khusus untuk Artaroma Hub</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {Object.values(THEME_PRESETS).map((preset) => {
                    const isActive = themeSettings.colorPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset.id)}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                          isActive
                            ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/30 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/60 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-full shadow-inner flex-shrink-0 border border-black/10"
                              style={{ backgroundColor: preset.primaryColor }}
                            />
                            <span className="font-bold text-xs text-slate-800">{preset.name}</span>
                          </div>
                          {isActive && (
                            <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              <Check className="w-3 h-3 stroke-[3]" /> Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{preset.subtitle}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: Custom Controls & Live Preview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Form: Detailed Settings (7 Cols) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5 text-xs">
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 pb-3 border-b border-gray-100">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      Detail Kustomisasi Antarmuka
                    </h3>

                    {/* 1. Primary Hue */}
                    <div className="space-y-2">
                      <label className="block font-bold text-slate-700">
                        1. Warna Aksen Utama (*Primary Color*)
                      </label>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {[
                          { name: 'Royal Blue', hex: '#1d4ed8', hover: '#1e40af', light: '#eff6ff', text: '#1e40af' },
                          { name: 'Indigo', hex: '#4338ca', hover: '#3730a3', light: '#eef2ff', text: '#3730a3' },
                          { name: 'Emerald', hex: '#059669', hover: '#047857', light: '#ecfdf5', text: '#065f46' },
                          { name: 'Teal', hex: '#0f766e', hover: '#115e59', light: '#f0fdfa', text: '#115e59' },
                          { name: 'Violet', hex: '#7c3aed', hover: '#6d28d9', light: '#f5f3ff', text: '#5b21b6' },
                          { name: 'Rose', hex: '#e11d48', hover: '#be123c', light: '#fff1f2', text: '#9f1239' },
                          { name: 'Amber', hex: '#d97706', hover: '#b45309', light: '#fffbeb', text: '#92400e' },
                          { name: 'Slate', hex: '#334155', hover: '#1e293b', light: '#f8fafc', text: '#0f172a' },
                        ].map((swatch) => {
                          const isSelected = themeSettings.primaryColor.toLowerCase() === swatch.hex.toLowerCase();
                          return (
                            <button
                              key={swatch.hex}
                              type="button"
                              onClick={() => {
                                const updated: ThemeSettings = {
                                  ...themeSettings,
                                  colorPreset: 'custom',
                                  primaryColor: swatch.hex,
                                  primaryHover: swatch.hover,
                                  primaryLight: swatch.light,
                                  primaryText: swatch.text,
                                };
                                setThemeSettings(updated);
                                saveThemeSettings(updated);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-slate-800 ring-2 ring-slate-400/40 bg-slate-50 text-slate-900 shadow-2xs font-bold'
                                  : 'border-gray-200 hover:border-gray-300 text-slate-700 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                                style={{ backgroundColor: swatch.hex }}
                              />
                              {swatch.name}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Hex input */}
                      <div className="flex items-center gap-3 pt-2">
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-slate-500 font-medium">Kustom Hex:</label>
                          <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1 bg-white">
                            <input
                              type="color"
                              value={themeSettings.primaryColor}
                              onChange={(e) => {
                                const hex = e.target.value;
                                handleUpdateThemeField('primaryColor', hex);
                              }}
                              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                            />
                            <input
                              type="text"
                              value={themeSettings.primaryColor}
                              onChange={(e) => {
                                const hex = e.target.value;
                                handleUpdateThemeField('primaryColor', hex);
                              }}
                              className="w-20 text-xs font-mono text-slate-700 focus:outline-none"
                              placeholder="#1d4ed8"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Font Size Scaling */}
                    <div className="space-y-2 pt-3 border-t border-gray-100">
                      <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-blue-600" />
                        2. Ukuran Font Antarmuka (*Font Scaling*)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'compact', name: 'Kompak', size: '13px', desc: 'Data Padat' },
                          { id: 'normal', name: 'Standar', size: '14px', desc: 'Default' },
                          { id: 'medium', name: 'Nyaman', size: '15px', desc: 'Mudah Dibaca' },
                          { id: 'large', name: 'Besar', size: '16px', desc: 'Ekstra Jelas' },
                        ].map((item) => {
                          const isSelected = themeSettings.fontSize === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleUpdateThemeField('fontSize', item.id as any)}
                              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold ring-1 ring-blue-500'
                                  : 'border-gray-200 hover:border-gray-300 text-slate-700 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="text-xs font-bold">{item.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{item.size} • {item.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Table Density */}
                    <div className="space-y-2 pt-3 border-t border-gray-100">
                      <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                        <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
                        3. Kerapatan Baris Tabel (*Table Density*)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'compact', name: 'Padat / Compact', desc: 'Padding 6px (Muat banyak baris)' },
                          { id: 'normal', name: 'Standar / Normal', desc: 'Padding 10px (Seimbang)' },
                          { id: 'spacious', name: 'Longgar / Relaxed', desc: 'Padding 15px (Rileks)' },
                        ].map((item) => {
                          const isSelected = themeSettings.tableDensity === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleUpdateThemeField('tableDensity', item.id as any)}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold ring-1 ring-blue-500'
                                  : 'border-gray-200 hover:border-gray-300 text-slate-700 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="text-xs font-bold">{item.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. Border Radius */}
                    <div className="space-y-2 pt-3 border-t border-gray-100">
                      <label className="block font-bold text-slate-700">
                        4. Kebulatan Sudut Kartu &amp; Tombol (*Border Radius*)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'sharp', name: 'Tajam / Sharp (6px)' },
                          { id: 'normal', name: 'Modern (12px)' },
                          { id: 'soft', name: 'Soft Pill (18px)' },
                        ].map((item) => {
                          const isSelected = themeSettings.borderRadius === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleUpdateThemeField('borderRadius', item.id as any)}
                              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold ring-1 ring-blue-500'
                                  : 'border-gray-200 hover:border-gray-300 text-slate-700 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="text-xs font-bold">{item.name}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 5. Background Tone */}
                    <div className="space-y-2 pt-3 border-t border-gray-100">
                      <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-blue-600" />
                        5. Nuansa Latar Belakang (*Background Tone*)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'slate', name: 'Cool Slate', color: '#f5f7fa', desc: 'Standar Artaroma' },
                          { id: 'warm', name: 'Warm Paper', color: '#faf8f5', desc: 'Sangat Ramah di Mata' },
                          { id: 'white', name: 'Pure White', color: '#ffffff', desc: 'Kontras Bersih' },
                        ].map((item) => {
                          const isSelected = themeSettings.backgroundTone === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleUpdateThemeField('backgroundTone', item.id as any)}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold ring-1 ring-blue-500'
                                  : 'border-gray-200 hover:border-gray-300 text-slate-700 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: item.color }} />
                                <span className="text-xs font-bold">{item.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">{item.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 6. High Contrast Mode Toggle */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Contrast className="w-3.5 h-3.5 text-blue-600" />
                          Mode Kontras Tinggi (*High Contrast Borders*)
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Memperjelas garis batas tabel dan kontras teks untuk visibilitas maksimal di monitor redup</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateThemeField('highContrast', !themeSettings.highContrast)}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                          themeSettings.highContrast ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                            themeSettings.highContrast ? 'left-6.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Interactive Preview (5 Cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 sticky top-6">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-emerald-600" />
                        Pratinjau Langsung (*Live UI Preview*)
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        REAL-TIME
                      </span>
                    </div>

                    {/* Preview Box Container */}
                    <div
                      className="p-4 rounded-xl border border-gray-200 space-y-4 transition-all"
                      style={{
                        backgroundColor:
                          themeSettings.backgroundTone === 'warm'
                            ? '#faf8f5'
                            : themeSettings.backgroundTone === 'white'
                            ? '#ffffff'
                            : '#f5f7fa',
                      }}
                    >
                      {/* Sample Card */}
                      <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-xs shadow-2xs"
                              style={{ backgroundColor: themeSettings.primaryColor }}
                            >
                              A
                            </div>
                            <div>
                              <div className="font-bold text-xs text-slate-800">Artaroma Fragrance</div>
                              <div className="text-[10px] text-slate-400">Order Penjualan #SO-2026-091</div>
                            </div>
                          </div>
                          <span
                            className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: themeSettings.primaryLight,
                              color: themeSettings.primaryText,
                            }}
                          >
                            DIPROSES
                          </span>
                        </div>

                        {/* Sample Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            className="text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1"
                            style={{ backgroundColor: themeSettings.primaryColor }}
                          >
                            <Save className="w-3 h-3" /> Tombol Utama
                          </button>
                          <button
                            type="button"
                            className="bg-gray-100 hover:bg-gray-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200"
                          >
                            Batal
                          </button>
                        </div>
                      </div>

                      {/* Sample Table with Density */}
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-slate-700">
                          Contoh Tabel Data
                        </div>
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50/70 border-b border-gray-200 text-[10px] uppercase font-bold text-slate-400">
                              <th className="px-3 py-1.5">Produk</th>
                              <th className="px-2 py-1.5 text-center">Batch</th>
                              <th className="px-3 py-1.5 text-right">Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            <tr>
                              <td className="px-3 py-2 font-medium text-slate-800">Vanilla Deluxe</td>
                              <td className="px-2 py-2 text-center text-slate-500 font-mono text-[11px]">B-8821</td>
                              <td className="px-3 py-2 text-right font-bold text-slate-800">25.0 Kg</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium text-slate-800">Black Opium Lux</td>
                              <td className="px-2 py-2 text-center text-slate-500 font-mono text-[11px]">B-8834</td>
                              <td className="px-3 py-2 text-right font-bold text-slate-800">50.0 Kg</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleSaveAppearance}
                        disabled={themeSaving}
                        className="w-full text-white font-bold text-xs py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                        style={{ backgroundColor: themeSettings.primaryColor }}
                      >
                        {themeSaving ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Menerapkan Tema...</>
                        ) : (
                          <><Save className="w-4 h-4" /> Simpan Pengaturan Tampilan</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* DYNAMIC MODAL: ADD NEW DATA */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="bg-blue-700 px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <h3 className="font-bold text-base">
                  Tambah Data Baru — {TAB_LABELS[activeTab] ?? activeTab.toUpperCase()}
                </h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Active Tab = PRODUCTS */}
              {activeTab === 'products' && (
                <>
                  {/* MODE SELECTION TOGGLE: PRODUK TEMPLATE vs PRODUK VARIAN */}
                  <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1.5 mb-3 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setProductEntryType('TEMPLATE')}
                      className={`flex-1 py-2.5 px-3 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-2 ${
                        productEntryType === 'TEMPLATE'
                          ? 'bg-blue-700 text-white shadow'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      <span>1. Produk Induk Baru</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProductEntryType('VARIANT');
                        if (!selectedParentProductId && products.length > 0) {
                          setSelectedParentProductId(products[0].id);
                        }
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-2 ${
                        productEntryType === 'VARIANT'
                          ? 'bg-purple-700 text-white shadow'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Tag className="w-4 h-4" />
                      <span>2. Produk Varian Baru</span>
                    </button>
                  </div>

                  {/* OPTION 1: CREATE BRAND NEW PRODUK INDUK */}
                  {productEntryType === 'TEMPLATE' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Kode SKU Induk</label>
                          <input
                            type="text"
                            required
                            value={productForm.sku}
                            onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Kategori Aplikasi <span className="text-[10px] text-slate-500 font-normal">(1 Produk = 1 Aplikasi)</span> <span className="text-purple-600 font-mono">*</span>
                          </label>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {applicationCategories.map((app) => {
                              const isSelected = (productForm.applications || [])[0] === app;
                              return (
                                <button
                                  key={app}
                                  type="button"
                                  onClick={() => handleToggleAppCategoryInForm(app)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                    isSelected
                                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                      : 'bg-white text-slate-600 border-gray-300 hover:border-purple-300'
                                  }`}
                                >
                                  <div
                                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                                      isSelected ? 'bg-white border-white' : 'border-gray-400 bg-white'
                                    }`}
                                  >
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-purple-700" />}
                                  </div>
                                  <span>{app}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Nama Produk Induk</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: AMBERGRIS SECRET LUXURY"
                          value={productForm.name}
                          onChange={(e) => setProductForm({ ...productForm, name: e.target.value.toUpperCase() })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-bold text-xs uppercase"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-amber-700 block mb-1">Top Notes</label>
                        <input
                          type="text"
                          required
                          value={productForm.top_notes}
                          onChange={(e) => setProductForm({ ...productForm, top_notes: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-amber-700 block mb-1">Middle Notes</label>
                        <input
                          type="text"
                          required
                          value={productForm.middle_notes}
                          onChange={(e) => setProductForm({ ...productForm, middle_notes: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-gray-500 block mb-1">Base Notes</label>
                        <input
                          type="text"
                          required
                          value={productForm.base_notes}
                          onChange={(e) => setProductForm({ ...productForm, base_notes: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                        />
                      </div>
                    </>
                  )}

                  {/* OPTION 2: CREATE NEW PRODUK VARIAN FOR AN EXISTING PRODUK INDUK */}
                  {productEntryType === 'VARIANT' && (
                    <div className="space-y-4">
                      <div>
                        <label className="font-bold text-slate-800 block mb-1">
                          Pilih Produk Induk <span className="text-purple-600 font-mono">*</span>
                        </label>
                        <select
                          value={selectedParentProductId}
                          onChange={(e) => setSelectedParentProductId(e.target.value)}
                          className="w-full bg-blue-50/60 border border-blue-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold text-xs focus:outline-none focus:border-blue-600"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (SKU Induk: {p.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-800 block mb-1">
                          Pilih Ukuran Satuan Kemasan Varian Baru
                        </label>
                        <div className="flex items-center gap-2 pt-1">
                          {[25, 5, 1].map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => {
                                setVariantPackSize(sz);
                                setVariantMinStockKg(sz);
                              }}
                              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                                variantPackSize === sz
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                  : 'bg-white text-slate-700 border-gray-300 hover:border-amber-400'
                              }`}
                            >
                              {sz} Kg
                            </button>
                          ))}
                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="text-slate-400 text-xs">Custom:</span>
                            <input
                              type="number"
                              min="0.1"
                              max="1000"
                              step="any"
                              value={variantPackSize}
                              onChange={(e) => {
                                const sz = Number(e.target.value);
                                setVariantPackSize(sz);
                                setVariantMinStockKg(sz);
                              }}
                              className="w-20 bg-white border border-gray-300 rounded-lg px-2 py-1 text-center font-mono font-bold text-xs"
                            />
                            <span className="text-xs text-slate-500 font-bold">Kg</span>
                          </div>
                        </div>
                      </div>

                      {/* MIN. STOK WARNING THRESHOLD FIELD (UNTUK PRODUK VARIAN) */}
                      <div>
                        <label className="font-bold text-slate-800 block mb-1">
                          Min. Stok Warning Threshold (Kelipatan {variantPackSize} Kg) <span className="text-purple-600 font-mono">*</span>
                        </label>
                        <input
                          type="number"
                          step={variantPackSize || 1}
                          min={variantPackSize || 1}
                          required
                          value={variantMinStockKg}
                          onChange={(e) => setVariantMinStockKg(Number(e.target.value))}
                          className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-purple-600"
                        />
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">
                          Satuan disamakan dengan kelipatan kemasan varian <strong className="text-purple-700 font-bold">{variantPackSize} Kg</strong> (Setara <strong className="text-amber-700 font-bold">{Math.round((variantMinStockKg || 0) / (variantPackSize || 1))} Jerigen {variantPackSize} Kg</strong>)
                        </div>
                      </div>

                      {/* AUTO GENERATED VARIANT DETAILS CARD */}
                      {(() => {
                        const parent = products.find((p) => p.id === selectedParentProductId) || products[0];
                        const vName = parent ? `${parent.name} – ${variantPackSize} K` : '';
                        const vSku = parent ? `${parent.sku}-${variantPackSize}K` : '';

                        return (
                          <div className="bg-purple-900 text-white rounded-xl p-4 space-y-2 font-mono shadow-md border border-purple-700">
                            <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider flex items-center gap-1">
                              <span>🏷️ Detail Produk Varian Baru (Otomatis Dihasilkan):</span>
                            </div>
                            <div className="space-y-1.5">
                              <div className="text-xs text-slate-200">
                                Nama Varian: <strong className="text-white text-sm block font-sans font-extrabold">{vName}</strong>
                              </div>
                              <div className="text-xs text-slate-300 flex items-center justify-between pt-2 border-t border-purple-800">
                                <span>Kode SKU Varian:</span>
                                <span className="bg-purple-800 text-amber-300 px-2.5 py-0.5 rounded font-extrabold text-xs">
                                  {vSku}
                                </span>
                              </div>
                              <div className="text-xs text-slate-300 flex items-center justify-between">
                                <span>Kemasan Satuan:</span>
                                <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded font-extrabold text-xs">
                                  {variantPackSize} Kg
                                </span>
                              </div>
                              <div className="text-xs text-slate-300 flex items-center justify-between">
                                <span>Min. Stok Warning:</span>
                                <span className="text-amber-300 font-extrabold text-xs">
                                  {variantMinStockKg} Kg ({Math.round((variantMinStockKg || 0) / (variantPackSize || 1))} Jerigen)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}

              {/* Active Tab = CUSTOMERS */}
              {activeTab === 'customers' && (
                <>
                  {/* ── Inner Tab Navigator ── */}
                  <div className="flex border border-gray-200 rounded-xl overflow-hidden mb-1">
                    <button
                      type="button"
                      onClick={() => setCustomerFormTab('info')}
                      className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        customerFormTab === 'info'
                          ? 'bg-blue-600 text-white shadow-inner'
                          : 'bg-gray-50 text-slate-500 hover:bg-gray-100'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" /> Informasi Umum
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerFormTab('bank')}
                      className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-l border-gray-200 ${
                        customerFormTab === 'bank'
                          ? 'bg-emerald-700 text-white shadow-inner'
                          : 'bg-gray-50 text-slate-500 hover:bg-gray-100'
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5" /> Data Bank & Dokumen
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerFormTab('shipping')}
                      className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-l border-gray-200 ${
                        customerFormTab === 'shipping'
                          ? 'bg-blue-700 text-white shadow-inner'
                          : 'bg-gray-50 text-slate-500 hover:bg-gray-100'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" /> Pengiriman & Kurir
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerFormTab('price')}
                      className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-l border-gray-200 ${
                        customerFormTab === 'price'
                          ? 'bg-orange-600 text-white shadow-inner'
                          : 'bg-gray-50 text-slate-500 hover:bg-gray-100'
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5" /> Harga Khusus
                    </button>
                  </div>

                  {/* ── TAB 1: Informasi Umum ── */}
                  {customerFormTab === 'info' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Kode Customer</label>
                          <input
                            type="text"
                            required
                            value={customerForm.code}
                            onChange={(e) => setCustomerForm({ ...customerForm, code: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Nama Perusahaan B2B</label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: PT Wangi Abadi Sejahtera"
                            value={customerForm.company_name}
                            onChange={(e) => setCustomerForm({ ...customerForm, company_name: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-bold text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Nama PIC (Utama)</label>
                          <input
                            type="text"
                            required
                            placeholder="Nama PIC 1"
                            value={customerForm.pic_name}
                            onChange={(e) => setCustomerForm({ ...customerForm, pic_name: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Nomor Telepon (PIC 1)</label>
                          <input
                            type="text"
                            required
                            placeholder="0812-xxxx-xxxx"
                            value={customerForm.phone}
                            onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Nama PIC 2 <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span></label>
                          <input
                            type="text"
                            placeholder="Nama PIC 2"
                            value={customerForm.pic_name_2 || ''}
                            onChange={(e) => setCustomerForm({ ...customerForm, pic_name_2: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Nomor Telepon (PIC 2) <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span></label>
                          <input
                            type="text"
                            placeholder="08xx-xxxx-xxxx"
                            value={customerForm.phone_2 || ''}
                            onChange={(e) => setCustomerForm({ ...customerForm, phone_2: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Nama PIC 3 <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span></label>
                          <input
                            type="text"
                            placeholder="Nama PIC 3"
                            value={customerForm.pic_name_3 || ''}
                            onChange={(e) => setCustomerForm({ ...customerForm, pic_name_3: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Nomor Telepon (PIC 3) <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span></label>
                          <input
                            type="text"
                            placeholder="08xx-xxxx-xxxx"
                            value={customerForm.phone_3 || ''}
                            onChange={(e) => setCustomerForm({ ...customerForm, phone_3: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-blue-800 block mb-1 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-blue-600 inline" /> Email Resmi B2B (Sekaligus Username Login Portal)
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="info@perusahaan.com"
                          value={customerForm.email}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              email: e.target.value,
                              username: e.target.value,
                            })
                          }
                          className="w-full bg-blue-50/50 border border-blue-300 rounded-lg px-3 py-2 text-slate-800 font-mono font-bold text-xs"
                        />
                      </div>

                      {/* Kredensial Login */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-blue-900 font-bold text-xs">
                          <span className="flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-blue-700" /> Kredensial Akun Login B2B Otomatis
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">AKTIF</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-gray-500 block font-medium">Username (Email):</span>
                            <span className="font-mono font-bold text-blue-700 truncate block">
                              {customerForm.email || 'email@perusahaan.com'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 block font-medium">Password Default:</span>
                            <input
                              type="text"
                              required
                              value={customerForm.password}
                              onChange={(e) => setCustomerForm({ ...customerForm, password: e.target.value })}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-0.5 text-slate-800 font-mono font-bold text-[11px]"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Alamat Kantor / Rumah</label>
                        <textarea
                          rows={2}
                          placeholder="Alamat kantor atau rumah PIC customer..."
                          value={(customerForm as any).office_address || ''}
                          onChange={(e) => setCustomerForm({ ...customerForm, office_address: e.target.value } as any)}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-800 text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Alamat Pengiriman Cargo</label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Alamat lengkap pabrik / gudang customer..."
                          value={customerForm.address}
                          onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-800 text-xs"
                        />
                      </div>

                      {/* Koordinat GPS Pengiriman */}
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                            📍 Koordinat GPS Lokasi Pengiriman
                          </label>
                          {(customerForm as any).shipping_lat && (customerForm as any).shipping_lng && (
                            <a
                              href={`https://www.google.com/maps?q=${(customerForm as any).shipping_lat},${(customerForm as any).shipping_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                            >
                              🗺️ Lihat di Google Maps
                            </a>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold block mb-1">Lintang (Latitude)</label>
                            <input
                              type="text"
                              placeholder="-6.200000"
                              value={(customerForm as any).shipping_lat || ''}
                              onChange={(e) => setCustomerForm({ ...customerForm, shipping_lat: e.target.value } as any)}
                              className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1.5 text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold block mb-1">Bujur (Longitude)</label>
                            <input
                              type="text"
                              placeholder="106.816666"
                              value={(customerForm as any).shipping_lng || ''}
                              onChange={(e) => setCustomerForm({ ...customerForm, shipping_lng: e.target.value } as any)}
                              className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1.5 text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-400">
                          Contoh Jakarta: Lat -6.200000 / Lng 106.816666 &middot; Salin dari Google Maps (klik kanan &rarr; koordinat)
                        </p>
                      </div>

                      {/* Plafon Kredit */}
                      <div className="bg-slate-50 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
                          <input
                            type="checkbox"
                            checked={customerForm.is_credit_eligible}
                            onChange={(e) =>
                              setCustomerForm({
                                ...customerForm,
                                is_credit_eligible: e.target.checked,
                                credit_limit: e.target.checked ? (customerForm.credit_limit || 40000000) : 0,
                                credit_terms_days: e.target.checked ? (customerForm.credit_terms_days || 30) : 0,
                              })
                            }
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-4 h-4 text-emerald-600" /> Dapat Fasilitas Plafon Kredit & Pembayaran Tempo (TOP)
                          </span>
                        </label>
                        {customerForm.is_credit_eligible ? (
                          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200/60">
                            <div>
                              <label className="font-bold text-slate-700 block mb-1">Plafon Kredit (IDR)</label>
                              <input
                                type="number"
                                step="5000000"
                                required={customerForm.is_credit_eligible}
                                value={customerForm.credit_limit}
                                onChange={(e) => setCustomerForm({ ...customerForm, credit_limit: Number(e.target.value) })}
                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs font-bold text-emerald-700"
                              />
                            </div>
                            <div>
                              <label className="font-bold text-slate-700 block mb-1">Credit Terms (TOP Hari)</label>
                              <input
                                type="number"
                                required={customerForm.is_credit_eligible}
                                value={customerForm.credit_terms_days}
                                onChange={(e) => setCustomerForm({ ...customerForm, credit_terms_days: Number(e.target.value) })}
                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium">
                            ℹ️ Customer ini <strong>TIDAK MENDAPATKAN Plafon Kredit</strong>. Metode pembayaran wajib <strong>Lunas Transfer (Cash Before Delivery)</strong>.
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCustomerFormTab('bank')}
                        className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Landmark className="w-3.5 h-3.5" /> Lanjut: Isi Data Bank & Dokumen →
                      </button>
                    </div>
                  )}

                  {/* ── TAB 2: Data Bank & Dokumen ── */}
                  {customerFormTab === 'bank' && (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
                        <Landmark className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="text-[11px] text-emerald-800 font-medium">
                          Data rekening bank customer <strong>{customerForm.company_name || '—'}</strong> untuk keperluan pembayaran dan verifikasi identitas bisnis (KYC).
                        </div>
                      </div>

                      {/* NPWP Teks */}
                      <div>
                        <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-teal-600" /> NPWP Perusahaan
                        </label>
                        <input
                          type="text"
                          placeholder="01.234.567.8-012.000"
                          value={customerForm.npwp}
                          onChange={(e) => setCustomerForm({ ...customerForm, npwp: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs"
                        />
                      </div>

                      {/* Upload KTP */}
                      <div>
                        <label className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-blue-600" /> Upload Scan KTP Direktur / PIC
                        </label>
                        <div className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                          customerForm.ktp_file ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/30'
                        }`}>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setCustomerForm({ ...customerForm, ktp_file: file.name });
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          {customerForm.ktp_file ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-blue-600" />
                              <div className="text-left">
                                <div className="text-xs font-bold text-blue-700">KTP berhasil dipilih:</div>
                                <div className="text-[11px] text-blue-600 font-mono">{customerForm.ktp_file}</div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCustomerForm({ ...customerForm, ktp_file: '' }); }}
                                className="ml-auto text-red-400 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="text-blue-400 text-2xl mb-1">📄</div>
                              <div className="text-xs font-bold text-slate-600">Klik untuk upload KTP</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, atau PDF — Maks 5MB</div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Upload NPWP */}
                      <div>
                        <label className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-teal-600" /> Upload Scan NPWP Perusahaan
                        </label>
                        <div className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                          customerForm.npwp_file ? 'border-teal-400 bg-teal-50' : 'border-gray-300 bg-gray-50 hover:border-teal-300 hover:bg-teal-50/30'
                        }`}>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setCustomerForm({ ...customerForm, npwp_file: file.name });
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          {customerForm.npwp_file ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-teal-600" />
                              <div className="text-left">
                                <div className="text-xs font-bold text-teal-700">NPWP berhasil dipilih:</div>
                                <div className="text-[11px] text-teal-600 font-mono">{customerForm.npwp_file}</div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCustomerForm({ ...customerForm, npwp_file: '' }); }}
                                className="ml-auto text-red-400 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="text-teal-400 text-2xl mb-1">🧾</div>
                              <div className="text-xs font-bold text-slate-600">Klik untuk upload NPWP</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, atau PDF — Maks 5MB</div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Data Rekening Bank */}
                      <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden">
                        <div className="bg-emerald-700 text-white px-4 py-2.5 flex items-center gap-2">
                          <Landmark className="w-4 h-4" />
                          <span className="font-bold text-sm">Rekening Bank Customer (untuk Pembayaran / Refund)</span>
                        </div>
                        <div className="p-3.5 space-y-3">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Nama Bank</label>
                            <select
                              value={customerForm.bank_name}
                              onChange={(e) => setCustomerForm({ ...customerForm, bank_name: e.target.value })}
                              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 text-xs"
                            >
                              <option value="">— Pilih Bank —</option>
                              {['BCA', 'Bank Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'Bank Permata', 'Danamon', 'BTN', 'Bank Mega', 'Bank Syariah Indonesia (BSI)', 'Lainnya'].map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Nomor Rekening</label>
                            <input
                              type="text"
                              placeholder="Contoh: 1234-5678-9012"
                              value={customerForm.bank_account_number}
                              onChange={(e) => setCustomerForm({ ...customerForm, bank_account_number: e.target.value })}
                              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Nama Pemilik Rekening</label>
                            <input
                              type="text"
                              placeholder="Nama sesuai buku tabungan / rekening"
                              value={customerForm.bank_account_name}
                              onChange={(e) => setCustomerForm({ ...customerForm, bank_account_name: e.target.value })}
                              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 text-xs"
                            />
                          </div>

                          {/* Preview Card */}
                          {(customerForm.bank_name && customerForm.bank_account_number) && (
                            <div className="bg-gradient-to-br from-emerald-900 to-teal-900 text-white rounded-xl p-3.5 font-mono space-y-1.5">
                              <div className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">Ringkasan Rekening:</div>
                              <div className="text-base font-extrabold tracking-widest">{customerForm.bank_account_number}</div>
                              <div className="text-emerald-200 text-xs">{customerForm.bank_name}</div>
                              <div className="text-white text-xs font-bold border-t border-emerald-700 pt-1.5 mt-1.5">
                                a.n {customerForm.bank_account_name || customerForm.company_name || '—'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomerFormTab('info')}
                          className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-slate-600 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          ← Kembali ke Informasi Umum
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomerFormTab('shipping')}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          Lanjut ke Pengiriman & Kurir →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── TAB 3: Pengiriman & Kurir ── */}
                  {customerFormTab === 'shipping' && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5">
                        <Truck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-blue-900">Pengaturan Ekspedisi & Ongkir Default</h4>
                          <div className="text-[11px] text-blue-700 mt-0.5">
                            Pilih kurir/ekspedisi langganan dan tentukan tarif ongkos kirim default yang otomatis terpasang saat membuat Sales Order (SO) untuk customer ini.
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                        {/* Pilihan Kurir Default */}
                        <div>
                          <label className="font-bold text-slate-700 block mb-1 text-xs flex items-center justify-between">
                            <span>Kurir / Ekspedisi Default</span>
                            <span className="text-[10px] text-blue-600 font-normal">Tersedia {couriers.length} Pilihan</span>
                          </label>
                          <select
                            value={customerForm.default_courier_id}
                            onChange={(e) => {
                              const selId = e.target.value;
                              const found = couriers.find((k) => k.id === selId);
                              setCustomerForm({
                                ...customerForm,
                                default_courier_id: selId,
                                default_courier_name: found ? `${found.name} (${found.vehicle_number || (found as any).service_type || 'Armada'})` : ''
                              });
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">— Belum Ditentukan (Pilih saat buat SO) —</option>
                            {couriers.map((k) => {
                              const isExt = (k as any).courier_type === 'EKSTERNAL';
                              return (
                                <option key={k.id} value={k.id}>
                                  {isExt ? '📦 [Eksternal]' : '🚚 [Internal]'} {k.name} — {k.vehicle_number || (k as any).service_type || 'Armada'} ({k.code})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Tipe Ongkir & Nominal */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-xs">Skema Ongkir Default</label>
                            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-lg border border-gray-200">
                              <button
                                type="button"
                                onClick={() => setCustomerForm({ ...customerForm, default_shipping_type: 'FRANCO', default_shipping_cost: 0 })}
                                className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all ${
                                  customerForm.default_shipping_type === 'FRANCO'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-gray-200'
                                }`}
                              >
                                FRANCO (Gratis)
                              </button>
                              <button
                                type="button"
                                onClick={() => setCustomerForm({ ...customerForm, default_shipping_type: 'LOCO' })}
                                className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all ${
                                  customerForm.default_shipping_type === 'LOCO'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-gray-200'
                                }`}
                              >
                                LOCO (Dikenakan)
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              {customerForm.default_shipping_type === 'FRANCO'
                                ? 'FRANCO: Ongkir ditanggung penjual (Artaroma).'
                                : 'LOCO: Ongkir ditagihkan ke customer pada Invoice.'}
                            </span>
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-xs">Nominal Default Ongkir (Rp)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">Rp</span>
                              <input
                                type="number"
                                min="0"
                                step="5000"
                                disabled={customerForm.default_shipping_type === 'FRANCO'}
                                value={customerForm.default_shipping_cost}
                                onChange={(e) => setCustomerForm({ ...customerForm, default_shipping_cost: Number(e.target.value) })}
                                className={`w-full border rounded-lg pl-9 pr-3 py-2 text-slate-800 font-mono font-bold text-xs ${
                                  customerForm.default_shipping_type === 'FRANCO'
                                    ? 'bg-gray-100 border-gray-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-white border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                                }`}
                                placeholder="0"
                              />
                            </div>
                            {customerForm.default_shipping_type === 'LOCO' && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {[50000, 100000, 150000, 250000].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setCustomerForm({ ...customerForm, default_shipping_cost: preset })}
                                    className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded border border-gray-200 transition-colors"
                                  >
                                    {preset.toLocaleString('id-ID')}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Catatan / Titik Bongkar Muat */}
                        <div className="pt-2 border-t border-gray-100">
                          <label className="font-bold text-slate-700 block mb-1 text-xs">Instruksi Pengiriman Khusus / Titik Bongkar</label>
                          <textarea
                            rows={2}
                            placeholder="Contoh: Masuk lewat gerbang barat gudang. Harap konfirmasi ke PIC 1 jam sebelum tiba."
                            value={customerForm.delivery_notes || ''}
                            onChange={(e) => setCustomerForm({ ...customerForm, delivery_notes: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-slate-800 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomerFormTab('bank')}
                          className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-slate-600 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          ← Kembali ke Data Bank
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomerFormTab('price')}
                          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          Lanjut ke Harga Khusus →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── TAB 4: Harga Khusus ── */}
                  {customerFormTab === 'price' && (
                    <div className="space-y-4">
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                        <Tag className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="text-[11px] text-orange-800 font-medium">
                          Harga khusus per varian untuk <strong>{customerForm.company_name || 'customer ini'}</strong>. Default produk non-aktif; aktifkan produk yang diizinkan untuk customer ini.
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 px-1">
                        <span className="text-xs text-slate-600 font-medium">
                          Produk Aktif: <strong className="text-blue-700 font-bold">{(customerForm.allowed_product_ids || []).length}</strong> dari {products.length}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCustomerForm({ ...customerForm, allowed_product_ids: products.map(p => p.id) })}
                            className="px-2.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                          >
                            ✓ Aktifkan Semua
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomerForm({ ...customerForm, allowed_product_ids: [] })}
                            className="px-2.5 py-1 text-[10px] font-bold bg-gray-100 text-slate-600 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors"
                          >
                            ✕ Nonaktifkan Semua
                          </button>
                        </div>
                      </div>

                        {products.length === 0 ? (
                          <div className="text-center text-slate-400 text-sm py-8">Belum ada produk terdaftar.</div>
                        ) : (
                          <div className="space-y-3">
                            {products.map((p) => {
                              const isAllowed = Boolean(customerForm.allowed_product_ids && customerForm.allowed_product_ids.includes(p.id));
                              const packSizes = p.pack_sizes && p.pack_sizes.length > 0 ? p.pack_sizes : [25, 5, 1];
                              return (
                                <div key={p.id} className={`bg-white border rounded-xl overflow-hidden transition-all ${isAllowed ? 'border-gray-200 shadow-xs' : 'border-gray-200 opacity-60 bg-gray-50'}`}>
                                  <div className={`px-4 py-2 flex items-center gap-2 text-white ${isAllowed ? 'bg-slate-700' : 'bg-slate-600'}`}>
                                    <Package className="w-3.5 h-3.5 opacity-70 animate-pulse" />
                                    <span className="font-bold text-xs">{p.name}</span>
                                    <span className="text-slate-355 text-[10px] font-mono ml-auto">{p.sku}</span>
                                    <div className="flex items-center gap-1.5 ml-2 border-l border-white/20 pl-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentAllowed = customerForm.allowed_product_ids || [];
                                          let nextAllowed = currentAllowed.includes(p.id)
                                            ? currentAllowed.filter((id) => id !== p.id)
                                            : [...currentAllowed, p.id];
                                          setCustomerForm({ ...customerForm, allowed_product_ids: nextAllowed });
                                        }}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors flex items-center gap-1 ${
                                          isAllowed
                                            ? 'bg-blue-600 border-blue-500 hover:bg-blue-700 text-white'
                                            : 'bg-slate-700 border-slate-600 hover:bg-slate-650 text-slate-350'
                                        }`}
                                      >
                                        {isAllowed ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                                        <span>{isAllowed ? 'AKTIF' : 'SEMBUNYI'}</span>
                                      </button>
                                    </div>
                                  </div>
                                  <div className="divide-y divide-gray-100">
                                    {!isAllowed ? (
                                      <div className="p-4 text-center text-slate-400 text-[11px] font-medium bg-gray-50/40">
                                        🚫 Produk disembunyikan dari katalog B2B customer ini.
                                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">Visibilitas katalog dinonaktifkan. Varian dan harga khusus tidak aktif.</p>
                                      </div>
                                    ) : (
                                      packSizes.map((sz) => {
                                    const variantKey = `${p.id}_${sz}`;
                                    const variant = p.variants?.find((v: any) => Number(v.pack_size_kg) === sz);
                                    const basePricePerKg = variant ? Number(variant.selling_price_per_kg || 0) : (p.selling_price_per_kg ?? 0);
                                    const basePriceUsdPerKg = variant ? Number(variant.selling_price_usd_per_kg || 0) : 0;
                                    const basePrice = basePricePerKg * sz;
                                    const mode = specialPriceMode[variantKey] ?? 'pct';
                                    const pct = specialPricePct[variantKey] ?? 0;
                                    const fixedPrice = customerForm.special_prices[variantKey];
                                    const hasSpecial = fixedPrice !== undefined;
                                    const discountPct = basePrice > 0 && hasSpecial ? (((basePrice - fixedPrice) / basePrice) * 100) : 0;
                                    const discountAmt = hasSpecial ? basePrice - fixedPrice : 0;
                                    return (
                                      <div key={sz} className={`px-4 py-3 ${hasSpecial ? 'bg-orange-50/40' : ''}`}>
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-700 text-xs">{p.sku}-{sz}K <span className="text-slate-400 font-normal">{sz} kg/kemasan</span></div>
                                            <div className="text-[11px] text-slate-500 mt-0.5 space-y-0.5">
                                              <div>
                                                Harga Umum (IDR): <span className="font-mono font-bold text-slate-700">{(basePricePerKg * sz).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}</span>
                                                <span className="text-slate-400"> ({basePricePerKg.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}/kg)</span>
                                              </div>
                                              {basePriceUsdPerKg > 0 && (
                                                <div className="text-blue-600 font-medium">
                                                  Harga Umum (USD): <span className="font-mono font-bold">${(basePriceUsdPerKg * sz).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                  <span className="text-slate-400"> (${basePriceUsdPerKg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg)</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <label className="flex items-center gap-2 cursor-pointer select-none bg-orange-50/50 hover:bg-orange-50 border border-orange-200/60 rounded-lg px-2.5 py-1 transition-all shadow-xs shrink-0">
                                            <input
                                              type="checkbox"
                                              checked={hasSpecial}
                                              onChange={() => {
                                                if (hasSpecial) {
                                                  const next = { ...customerForm.special_prices };
                                                  delete next[variantKey];
                                                  setCustomerForm({ ...customerForm, special_prices: next });
                                                } else {
                                                  setCustomerForm({ ...customerForm, special_prices: { ...customerForm.special_prices, [variantKey]: basePrice } });
                                                  setSpecialPriceMode({ ...specialPriceMode, [variantKey]: 'pct' });
                                                  setSpecialPricePct({ ...specialPricePct, [variantKey]: 0 });
                                                }
                                              }}
                                              className="w-3.5 h-3.5 rounded text-orange-650 border-orange-300 focus:ring-orange-500 cursor-pointer"
                                            />
                                            <span className="text-xs font-bold text-orange-950">Harga Khusus</span>
                                          </label>
                                        </div>
                                        {hasSpecial && (
                                          <div className="mt-3 space-y-2">
                                            <div className="flex rounded-lg overflow-hidden border border-orange-200 w-fit">
                                              <button type="button" onClick={() => setSpecialPriceMode({ ...specialPriceMode, [variantKey]: 'pct' })} className={`px-3 py-1 text-[10px] font-bold transition-colors ${mode === 'pct' ? 'bg-orange-500 text-white' : 'bg-white text-slate-500 hover:bg-orange-50'}`}>% Diskon</button>
                                              <button type="button" onClick={() => setSpecialPriceMode({ ...specialPriceMode, [variantKey]: 'fix' })} className={`px-3 py-1 text-[10px] font-bold border-l border-orange-200 transition-colors ${mode === 'fix' ? 'bg-orange-500 text-white' : 'bg-white text-slate-500 hover:bg-orange-50'}`}>Harga Tetap</button>
                                            </div>
                                            {mode === 'pct' ? (
                                              <div className="flex items-center gap-2">
                                                <div className="relative flex-1 max-w-[140px]">
                                                  <input type="number" min="0" max="100" step="0.5" value={pct}
                                                    onChange={(e) => {
                                                      const p2 = Math.min(100, Math.max(0, Number(e.target.value)));
                                                      setSpecialPricePct({ ...specialPricePct, [variantKey]: p2 });
                                                      setCustomerForm({ ...customerForm, special_prices: { ...customerForm.special_prices, [variantKey]: Math.round(basePrice * (1 - p2 / 100)) } });
                                                    }}
                                                    className="w-full border border-orange-300 rounded-lg px-3 py-1.5 text-xs font-bold text-orange-800 bg-orange-50 focus:outline-none focus:ring-1 focus:ring-orange-400 pr-7"
                                                  />
                                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-600 text-xs font-bold">%</span>
                                                </div>
                                                <div className="text-[11px] text-slate-650 flex flex-col">
                                                  <div>&rarr; <span className="font-bold font-mono text-orange-700">{(fixedPrice ?? 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}</span> <span className="text-slate-400">({sz > 0 ? Math.round((fixedPrice ?? 0) / sz).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }) : '-'}/kg)</span></div>
                                                  {usdRate > 0 && <span className="text-[10px] text-blue-600 font-mono font-medium">Equiv: ${( (fixedPrice ?? 0) / usdRate ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kg</span>}
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-2">
                                                <div className="relative flex-1 max-w-[180px]">
                                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-orange-600 text-xs font-bold">Rp</span>
                                                  <input type="number" min="0" step="10000" value={fixedPrice ?? basePrice}
                                                    onChange={(e) => setCustomerForm({ ...customerForm, special_prices: { ...customerForm.special_prices, [variantKey]: Number(e.target.value) } })}
                                                    className="w-full border border-orange-300 rounded-lg pl-7 pr-3 py-1.5 text-xs font-bold font-mono text-orange-800 bg-orange-50 focus:outline-none focus:ring-1 focus:ring-orange-400"
                                                  />
                                                </div>
                                                <div className="text-[11px] text-slate-650 flex flex-col">
                                                  <span>Diskon: <span className={`font-bold ${discountPct > 0 ? 'text-green-700' : 'text-slate-400'}`}>{discountPct.toFixed(1)}%</span> {discountAmt > 0 && <span className="text-slate-400">(hemat {discountAmt.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })})</span>}</span>
                                                  {usdRate > 0 && <span className="text-[10px] text-blue-600 font-mono font-medium">Equiv: ${( (fixedPrice ?? basePrice) / usdRate ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kg</span>}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 text-center">{Object.keys(customerForm.special_prices).length} varian dengan harga khusus aktif</div>
                      <button type="button" onClick={() => setCustomerFormTab('bank')} className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-slate-600 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                        ← Kembali ke Data Bank & Dokumen
                      </button>
                    </div>
                  )}

                </>
              )}

              {/* Active Tab = DISTRIBUTORS */}
              {activeTab === 'distributors' && (
                <>
                  {/* ── Inner Tab Navigator ── */}
                  <div className="flex border border-gray-200 rounded-xl overflow-hidden mb-1">
                    <button
                      type="button"
                      onClick={() => setDistributorFormTab('info')}
                      className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        distributorFormTab === 'info'
                          ? 'bg-blue-600 text-white shadow-inner'
                          : 'bg-gray-50 text-slate-500 hover:bg-gray-100'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" /> Informasi Umum
                    </button>
                    <button
                      type="button"
                      onClick={() => setDistributorFormTab('finance')}
                      className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-l border-gray-200 ${
                        distributorFormTab === 'finance'
                          ? 'bg-purple-700 text-white shadow-inner'
                          : 'bg-gray-50 text-slate-500 hover:bg-gray-100'
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5" /> Keuangan & Perbankan
                    </button>
                  </div>

                  {/* ── TAB 1: Informasi Umum ── */}
                  {distributorFormTab === 'info' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Kode Suplier</label>
                          <input
                            type="text"
                            required
                            value={distributorForm.code}
                            onChange={(e) => setDistributorForm({ ...distributorForm, code: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Nama Perusahaan Suplier</label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: PT Mane Indonesia"
                            value={distributorForm.name}
                            onChange={(e) => setDistributorForm({ ...distributorForm, name: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-bold text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Contact Person</label>
                          <input
                            type="text"
                            required
                            placeholder="Nama Kontak"
                            value={distributorForm.contact_name}
                            onChange={(e) => setDistributorForm({ ...distributorForm, contact_name: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Telepon</label>
                          <input
                            type="text"
                            required
                            placeholder="021-xxxx-xxxx"
                            value={distributorForm.phone}
                            onChange={(e) => setDistributorForm({ ...distributorForm, phone: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Email Order Suplier</label>
                        <input
                          type="email"
                          required
                          placeholder="order@suplier.com"
                          value={distributorForm.email}
                          onChange={(e) => setDistributorForm({ ...distributorForm, email: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Alamat Kantor / Gudang Suplier</label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Alamat lengkap kantor / gudang suplier..."
                          value={distributorForm.address}
                          onChange={(e) => setDistributorForm({ ...distributorForm, address: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-800 text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Catatan Tambahan Suplier</label>
                        <textarea
                          rows={2}
                          placeholder="Catatan internal suplier, syarat minimum order (MOQ), garansi, dll..."
                          value={distributorForm.notes}
                          onChange={(e) => setDistributorForm({ ...distributorForm, notes: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-800 text-xs"
                        />
                      </div>

                      {/* Daftar Produk Induk */}
                      <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-2">
                        <label className="font-bold text-blue-900 block text-xs flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-blue-600" />
                          Daftar Produk Induk Yang Dipesan Dari Suplier Ini:
                        </label>
                        <div className="grid grid-cols-2 gap-2 pt-1 max-h-32 overflow-y-auto pr-1">
                          {products.map((prod) => {
                            const isSelected = (distributorForm.supplied_product_ids || []).includes(prod.id);
                            return (
                              <label
                                key={prod.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                                    : 'bg-white text-slate-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const current = distributorForm.supplied_product_ids || [];
                                    setDistributorForm({
                                      ...distributorForm,
                                      supplied_product_ids: isSelected
                                        ? current.filter((id) => id !== prod.id)
                                        : [...current, prod.id],
                                    });
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                />
                                <span className="truncate">{prod.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Next step hint */}
                      <button
                        type="button"
                        onClick={() => setDistributorFormTab('finance')}
                        className="w-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Landmark className="w-3.5 h-3.5" /> Lanjut: Isi Data Keuangan & Perbankan →
                      </button>
                    </div>
                  )}

                  {/* ── TAB 2: Keuangan & Perbankan ── */}
                  {distributorFormTab === 'finance' && (
                    <div className="space-y-3">
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2">
                        <Landmark className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div className="text-[11px] text-purple-800 font-medium">
                          Data keuangan suplier <strong>{distributorForm.name || '—'}</strong>: term pembayaran (TOP Hutang), nomor rekening bank, dan NPWP untuk kebutuhan transaksi & perpajakan.
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                            <Banknote className="w-3.5 h-3.5 text-purple-600" /> TOP Hutang (Hari)
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="Contoh: 30"
                            value={distributorForm.top_payable_days}
                            onChange={(e) => setDistributorForm({ ...distributorForm, top_payable_days: Number(e.target.value) })}
                            className="w-full bg-white border border-purple-300 rounded-lg px-3 py-2 text-purple-800 font-mono text-sm font-extrabold focus:outline-none focus:border-purple-600"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Jumlah hari jatuh tempo pembayaran hutang kepada suplier ini.</p>
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-teal-600" /> NPWP Suplier
                          </label>
                          <input
                            type="text"
                            placeholder="01.234.567.8-012.000"
                            value={distributorForm.npwp}
                            onChange={(e) => setDistributorForm({ ...distributorForm, npwp: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Untuk pembuatan Faktur Pajak & dokumen PPN.</p>
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                          <Landmark className="w-3.5 h-3.5 text-blue-600" /> Nomor Rekening Pembayaran
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: BCA 0883-992-111 a.n PT Givaudan Indonesia"
                          value={distributorForm.bank_account}
                          onChange={(e) => setDistributorForm({ ...distributorForm, bank_account: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Format: [Nama Bank] [Nomor Rekening] a.n [Nama Penerima]</p>
                      </div>

                      {/* Summary Card */}
                      {(distributorForm.top_payable_days || distributorForm.bank_account || distributorForm.npwp) ? (
                        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white rounded-xl p-4 space-y-2 font-mono">
                          <div className="text-[10px] uppercase font-bold text-purple-300 tracking-wider flex items-center gap-1">
                            <Landmark className="w-3 h-3" /> Ringkasan Data Keuangan Suplier:
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-purple-300">Nama Suplier:</span>
                              <span className="font-bold text-white">{distributorForm.name || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs border-t border-purple-800 pt-1.5">
                              <span className="text-purple-300">TOP Hutang:</span>
                              <span className="bg-purple-700 text-amber-300 px-2 py-0.5 rounded font-extrabold text-xs">
                                {distributorForm.top_payable_days} Hari
                              </span>
                            </div>
                            {distributorForm.bank_account && (
                              <div className="flex items-start justify-between text-xs gap-2">
                                <span className="text-purple-300 flex-shrink-0">Rek. Bank:</span>
                                <span className="text-amber-200 text-right text-[11px] font-bold">{distributorForm.bank_account}</span>
                              </div>
                            )}
                            {distributorForm.npwp && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-purple-300">NPWP:</span>
                                <span className="text-slate-200">{distributorForm.npwp}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {/* Back button */}
                      <button
                        type="button"
                        onClick={() => setDistributorFormTab('info')}
                        className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-slate-600 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        ← Kembali ke Informasi Umum
                      </button>
                    </div>
                  )}
                </>
              )}


              {activeTab === 'couriers' && (
                <>
                  {/* Pilihan Tipe Kurir */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-xs">Tipe Pengantaran / Kurir</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCourierForm({ ...courierForm, courier_type: 'INTERNAL', create_user_account: true })}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                          courierForm.courier_type === 'INTERNAL'
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-900'
                            : 'bg-white border-gray-200 hover:bg-gray-50 text-slate-600'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${courierForm.courier_type === 'INTERNAL' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-slate-500'}`}>
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs">🏢 Kurir Internal</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                            Staf pengantaran internal Artaroma. Perlu akun login aplikasi mobile.
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCourierForm({ ...courierForm, courier_type: 'EKSTERNAL', create_user_account: false })}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                          courierForm.courier_type === 'EKSTERNAL'
                            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-900'
                            : 'bg-white border-gray-200 hover:bg-gray-50 text-slate-600'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${courierForm.courier_type === 'EKSTERNAL' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-slate-500'}`}>
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs">📦 Ekspedisi Eksternal</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                            Vendor rekanan cargo (JNE, Indah, Dakota, dll). Tanpa akun login.
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">
                        {courierForm.courier_type === 'INTERNAL' ? 'Kode Kurir' : 'Kode Ekspedisi'}
                      </label>
                      <input
                        type="text"
                        required
                        value={courierForm.code}
                        onChange={(e) => setCourierForm({ ...courierForm, code: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">
                        {courierForm.courier_type === 'INTERNAL' ? 'Nama Lengkap Kurir Staf' : 'Nama Ekspedisi / Vendor Cargo'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={courierForm.courier_type === 'INTERNAL' ? 'Contoh: Budi Gunawan' : 'Contoh: Indah Logistik Cargo / JNE Trucking'}
                        value={courierForm.name}
                        onChange={(e) => setCourierForm({ ...courierForm, name: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">
                        {courierForm.courier_type === 'INTERNAL' ? 'Nomor HP / WhatsApp Staf' : 'Nomor Kontak CS / PIC Ekspedisi'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="0813-xxxx-xxxx"
                        value={courierForm.phone}
                        onChange={(e) => setCourierForm({ ...courierForm, phone: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">
                        {courierForm.courier_type === 'INTERNAL' ? 'Nomor Plat Kendaraan Cargo' : 'Jenis Layanan Ekspedisi'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={courierForm.courier_type === 'INTERNAL' ? 'Contoh: B 7721 SXX (Box Truck)' : 'Contoh: Cargo Darat / Trucking FTL'}
                        value={courierForm.vehicle_number}
                        onChange={(e) => setCourierForm({ ...courierForm, vehicle_number: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono font-bold text-xs text-amber-700"
                      />
                    </div>
                  </div>

                  {courierForm.courier_type === 'EKSTERNAL' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1 text-xs">Catatan / Lokasi Drop Point Ekspedisi</label>
                        <textarea
                          rows={2}
                          placeholder="Contoh: Drop point agen Indah Cargo Jl. Raya Daan Mogot No. 45. Tarif langganan diskon 15%."
                          value={courierForm.notes || ''}
                          onChange={(e) => setCourierForm({ ...courierForm, notes: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-slate-800 text-xs"
                        />
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-850">
                        <Package className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Ekspedisi Eksternal dikelola via nomor resi pengiriman. <strong>Tidak memerlukan akun login</strong> ke aplikasi kurir mobile.</span>
                      </div>
                    </div>
                  ) : (
                    /* Auto-provision User Account Section for INTERNAL */
                    <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3.5 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={courierForm.create_user_account}
                          onChange={(e) => setCourierForm({ ...courierForm, create_user_account: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-blue-600" />
                          Buatkan akun login pengguna untuk kurir internal ini
                        </span>
                      </label>

                      {courierForm.create_user_account && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 pl-6">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">Email Login Driver</label>
                            <input
                              type="email"
                              placeholder={
                                courierForm.name
                                  ? `${courierForm.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@artaroma.co.id`
                                  : 'driver@artaroma.co.id'
                              }
                              value={courierForm.login_email}
                              onChange={(e) => setCourierForm({ ...courierForm, login_email: e.target.value })}
                              className="w-full bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">Kata Sandi Default</label>
                            <input
                              type="text"
                              value={courierForm.password}
                              onChange={(e) => setCourierForm({ ...courierForm, password: e.target.value })}
                              className="w-full bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Active Tab = USERS or ACCESS */}
              {(activeTab === 'users' || activeTab === 'access') && (
                <>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nama Lengkap Pengguna</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Farhan Sales Admin"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-blue-800 block mb-1">Email (Username Login)</label>
                    <input
                      type="email"
                      required
                      placeholder="user@artaroma.com"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="w-full bg-blue-50/50 border border-blue-300 rounded-lg px-3 py-2 text-slate-800 font-mono font-bold text-xs"
                    />
                  </div>

                  <div className="bg-violet-50 border border-violet-200 p-3.5 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-violet-900 block text-[11px] uppercase tracking-wide">
                        Pilih Modul yang Diizinkan:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSelectAllModules}
                          className="text-[10px] text-violet-700 hover:text-violet-900 font-bold underline cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                        <span className="text-violet-300">|</span>
                        <button
                          type="button"
                          onClick={handleClearAllModules}
                          className="text-[10px] text-slate-500 hover:text-slate-700 font-medium underline cursor-pointer"
                        >
                          Kosongkan
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_MODULES.map((mod) => {
                        const checked = draftModules.includes(mod);
                        return (
                          <button
                            key={mod}
                            type="button"
                            onClick={() => handleToggleDraftModule(mod)}
                            className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-bold border transition-all ${
                              checked
                                ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                            }`}
                          >
                            {checked ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3 opacity-40" />}
                            {mod}
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-violet-700 font-medium">
                      {draftModules.length} dari {ALL_MODULES.length} modul aktif untuk pengguna ini
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Perusahaan / Entitas Terkait</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Artaroma HQ / PT Parfumerie Indah"
                      value={userForm.linked_entity_name}
                      onChange={(e) => setUserForm({ ...userForm, linked_entity_name: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Password Default</label>
                    <input
                      type="text"
                      required
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono font-bold text-xs"
                    />
                  </div>
                </>
              )}

              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Save className="w-3.5 h-3.5" /> Simpan Data Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DYNAMIC MODAL: EDIT EXISTING DATA */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="bg-blue-700 px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                <h3 className="font-bold text-base">
                  {editingItem.type === 'variant'
                    ? `Edit Produk Varian — ${editingItem.data.product.name} ${editingItem.data.packSize}K`
                    : `Edit Data ${TAB_LABELS[editingItem.type] ?? editingItem.type.toUpperCase()}`}
                </h3>
              </div>
              <button onClick={() => setEditingItem(null)} className="text-blue-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* EDIT SPECIFIC VARIANT */}
              {editingItem.type === 'variant' && (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 space-y-1 font-mono">
                    <div className="text-[10px] font-extrabold uppercase text-purple-700">
                      🏷️ Produk Varian Khusus:
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 font-sans">
                      {editingItem.data.product.name} {variantPackSize}K
                    </div>
                    <div className="text-xs text-purple-900 font-bold">
                      Kode SKU Varian: <span className="bg-white border border-purple-300 px-2 py-0.5 rounded font-mono">{editingItem.data.product.sku}-{variantPackSize}K</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-4 py-3 rounded-xl flex items-start gap-2.5 font-medium shadow-2xs">
                    <span className="text-base select-none">💡</span>
                    <div>
                      <div className="font-bold text-blue-900 mb-0.5">Informasi Pengaturan Harga</div>
                      <p className="text-slate-600 leading-relaxed font-sans">
                        Harga jual varian bibit parfum ini sekarang dikelola secara terpusat di bawah tab <strong>Pricelist Umum</strong>. Perubahan harga tidak lagi dilakukan secara manual per varian produk di sini.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Nama Varian <span className="text-purple-600 font-mono">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={variantNameInput}
                        onChange={(e) => setVariantNameInput(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-sans text-xs font-bold focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Kode SKU Varian <span className="text-purple-600 font-mono">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={variantSkuInput}
                        onChange={(e) => setVariantSkuInput(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs font-bold focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* Detail Summary Card */}
                  <div className="bg-purple-900 text-white rounded-xl p-4 space-y-2 font-mono shadow-md border border-purple-700">
                    <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                      🏷️ Detail Varian:
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs text-slate-200">
                        Nama Varian: <strong className="text-white text-sm block font-sans font-extrabold">{editingItem.data.product.name} {variantPackSize}K</strong>
                      </div>
                      <div className="text-xs text-slate-300 flex items-center justify-between pt-2 border-t border-purple-800">
                        <span>Kode SKU Varian:</span>
                        <span className="bg-purple-800 text-amber-300 px-2.5 py-0.5 rounded font-extrabold text-xs">
                          {editingItem.data.product.sku}-{variantPackSize}K
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 flex items-center justify-between">
                        <span>Kemasan Satuan:</span>
                        <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded font-extrabold text-xs">
                          {variantPackSize} Kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* EDIT MASTER PRODUK INDUK */}
              {editingItem.type === 'products' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Kode SKU Induk</label>
                      <input
                        type="text"
                        required
                        value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Kategori Aplikasi <span className="text-[10px] text-slate-500 font-normal">(1 Produk = 1 Aplikasi)</span> <span className="text-purple-600 font-mono">*</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {applicationCategories.map((app) => {
                          const isSelected = (productForm.applications || [])[0] === app;
                          return (
                            <button
                              key={app}
                              type="button"
                              onClick={() => handleToggleAppCategoryInForm(app)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                  : 'bg-white text-slate-600 border-gray-300 hover:border-purple-300'
                              }`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                                  isSelected ? 'bg-white border-white' : 'border-gray-400 bg-white'
                                }`}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-purple-700" />}
                              </div>
                              <span>{app}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nama Produk Induk</label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value.toUpperCase() })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-bold text-xs uppercase"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-amber-700 block mb-1">Top Notes</label>
                    <input
                      type="text"
                      required
                      value={productForm.top_notes}
                      onChange={(e) => setProductForm({ ...productForm, top_notes: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-amber-700 block mb-1">Middle Notes</label>
                    <input
                      type="text"
                      required
                      value={productForm.middle_notes}
                      onChange={(e) => setProductForm({ ...productForm, middle_notes: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-500 block mb-1">Base Notes</label>
                    <input
                      type="text"
                      required
                      value={productForm.base_notes}
                      onChange={(e) => setProductForm({ ...productForm, base_notes: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                    />
                  </div>
                </>
              )}

              {/* EDIT CUSTOMER */}
              {editingItem.type === 'customers' && (
                <>
                  {/* ── Inner Tab Navigator ── */}
                  <div className="flex border border-gray-200 rounded-xl overflow-hidden mb-1">
                    <button
                      type="button"
                      onClick={() => setCustomerFormTab('info')}
                      className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        customerFormTab === 'info'
                          ? 'bg-blue-600 text-white shadow-inner'
                          : 'bg-gray-50 text-slate-500 hover:bg-gray-100'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" /> Informasi Umum
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerFormTab('bank')}
                      className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-l border-gray-200 ${
                        customerFormTab === 'bank'
                          ? 'bg-emerald-700 text-white shadow-inner'
                          : 'bg-gray-50 text-slate-500 hover:bg-gray-100'
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5" /> Data Bank & Dokumen
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerFormTab('shipping')}
                      className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-l border-gray-200 ${
                        customerFormTab === 'shipping'
                          ? 'bg-blue-700 text-white shadow-inner'
                          : 'bg-gray-50 text-slate-500 hover:bg-gray-100'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" /> Pengiriman & Kurir
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerFormTab('price')}
                      className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-l border-gray-200 ${
                        customerFormTab === 'price'
                          ? 'bg-orange-600 text-white shadow-inner'
                          : 'bg-gray-50 text-slate-500 hover:bg-gray-100'
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5" /> Harga Khusus
                    </button>
                  </div>

                  {/* ── TAB 1: Informasi Umum ── */}
                  {customerFormTab === 'info' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Kode Customer</label>
                          <input
                            type="text"
                            required
                            value={customerForm.code}
                            onChange={(e) => setCustomerForm({ ...customerForm, code: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Nama Perusahaan B2B</label>
                          <input
                            type="text"
                            required
                            value={customerForm.company_name}
                            onChange={(e) => setCustomerForm({ ...customerForm, company_name: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-bold text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Nama PIC (Utama)</label>
                          <input
                            type="text"
                            required
                            placeholder="Nama PIC 1"
                            value={customerForm.pic_name}
                            onChange={(e) => setCustomerForm({ ...customerForm, pic_name: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Nomor Telepon (PIC 1)</label>
                          <input
                            type="text"
                            required
                            placeholder="0812-xxxx-xxxx"
                            value={customerForm.phone}
                            onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Nama PIC 2 <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span></label>
                          <input
                            type="text"
                            placeholder="Nama PIC 2"
                            value={customerForm.pic_name_2 || ''}
                            onChange={(e) => setCustomerForm({ ...customerForm, pic_name_2: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Nomor Telepon (PIC 2) <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span></label>
                          <input
                            type="text"
                            placeholder="08xx-xxxx-xxxx"
                            value={customerForm.phone_2 || ''}
                            onChange={(e) => setCustomerForm({ ...customerForm, phone_2: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Nama PIC 3 <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span></label>
                          <input
                            type="text"
                            placeholder="Nama PIC 3"
                            value={customerForm.pic_name_3 || ''}
                            onChange={(e) => setCustomerForm({ ...customerForm, pic_name_3: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Nomor Telepon (PIC 3) <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span></label>
                          <input
                            type="text"
                            placeholder="08xx-xxxx-xxxx"
                            value={customerForm.phone_3 || ''}
                            onChange={(e) => setCustomerForm({ ...customerForm, phone_3: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-blue-800 block mb-1">Email Resmi B2B (Sekaligus Username Login Portal)</label>
                        <input
                          type="email"
                          required
                          value={customerForm.email}
                          onChange={(e) =>
                            setCustomerForm({ ...customerForm, email: e.target.value, username: e.target.value })
                          }
                          className="w-full bg-blue-50/50 border border-blue-300 rounded-lg px-3 py-2 text-slate-800 font-mono font-bold text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Password Login Customer</label>
                        <input
                          type="text"
                          required
                          value={customerForm.password}
                          onChange={(e) => setCustomerForm({ ...customerForm, password: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Alamat Kantor / Rumah</label>
                        <textarea
                          rows={2}
                          placeholder="Alamat kantor atau rumah PIC customer..."
                          value={(customerForm as any).office_address || ''}
                          onChange={(e) => setCustomerForm({ ...customerForm, office_address: e.target.value } as any)}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-800 text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Alamat Pengiriman Cargo</label>
                        <textarea
                          rows={2}
                          required
                          value={customerForm.address}
                          onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-800 text-xs"
                        />
                      </div>

                      {/* Koordinat GPS Pengiriman */}
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                            📍 Koordinat GPS Lokasi Pengiriman
                          </label>
                          {(customerForm as any).shipping_lat && (customerForm as any).shipping_lng && (
                            <a
                              href={`https://www.google.com/maps?q=${(customerForm as any).shipping_lat},${(customerForm as any).shipping_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                            >
                              🗺️ Lihat di Google Maps
                            </a>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold block mb-1">Lintang (Latitude)</label>
                            <input
                              type="text"
                              placeholder="-6.200000"
                              value={(customerForm as any).shipping_lat || ''}
                              onChange={(e) => setCustomerForm({ ...customerForm, shipping_lat: e.target.value } as any)}
                              className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1.5 text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold block mb-1">Bujur (Longitude)</label>
                            <input
                              type="text"
                              placeholder="106.816666"
                              value={(customerForm as any).shipping_lng || ''}
                              onChange={(e) => setCustomerForm({ ...customerForm, shipping_lng: e.target.value } as any)}
                              className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1.5 text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-400">
                          Contoh Jakarta: Lat -6.200000 / Lng 106.816666 &middot; Salin dari Google Maps (klik kanan &rarr; koordinat)
                        </p>
                      </div>

                      {/* Plafon Kredit */}
                      <div className="bg-slate-50 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
                          <input
                            type="checkbox"
                            checked={customerForm.is_credit_eligible}
                            onChange={(e) =>
                              setCustomerForm({
                                ...customerForm,
                                is_credit_eligible: e.target.checked,
                                credit_limit: e.target.checked ? (customerForm.credit_limit || 40000000) : 0,
                                credit_terms_days: e.target.checked ? (customerForm.credit_terms_days || 30) : 0,
                              })
                            }
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-4 h-4 text-emerald-600" /> Dapat Fasilitas Plafon Kredit & Pembayaran Tempo (TOP)
                          </span>
                        </label>
                        {customerForm.is_credit_eligible ? (
                          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200/60">
                            <div>
                              <label className="font-bold text-slate-700 block mb-1">Plafon Kredit (IDR)</label>
                              <input
                                type="number"
                                step="5000000"
                                required={customerForm.is_credit_eligible}
                                value={customerForm.credit_limit}
                                onChange={(e) => setCustomerForm({ ...customerForm, credit_limit: Number(e.target.value) })}
                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs font-bold text-emerald-700"
                              />
                            </div>
                            <div>
                              <label className="font-bold text-slate-700 block mb-1">Credit Terms (TOP Hari)</label>
                              <input
                                type="number"
                                required={customerForm.is_credit_eligible}
                                value={customerForm.credit_terms_days}
                                onChange={(e) => setCustomerForm({ ...customerForm, credit_terms_days: Number(e.target.value) })}
                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium">
                            ℹ️ Customer ini <strong>TIDAK MENDAPATKAN Plafon Kredit</strong>. Metode pembayaran wajib <strong>Lunas Transfer (Cash Before Delivery)</strong>.
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCustomerFormTab('bank')}
                        className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Landmark className="w-3.5 h-3.5" /> Lihat / Edit Data Bank & Dokumen →
                      </button>
                    </div>
                  )}

                  {/* ── TAB 2: Data Bank & Dokumen ── */}
                  {customerFormTab === 'bank' && (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
                        <Landmark className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="text-[11px] text-emerald-800 font-medium">
                          Data rekening bank customer <strong>{customerForm.company_name || '—'}</strong> untuk keperluan pembayaran dan verifikasi identitas bisnis (KYC).
                        </div>
                      </div>

                      {/* NPWP teks */}
                      <div>
                        <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-teal-600" /> NPWP Perusahaan
                        </label>
                        <input
                          type="text"
                          placeholder="01.234.567.8-012.000"
                          value={customerForm.npwp}
                          onChange={(e) => setCustomerForm({ ...customerForm, npwp: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs"
                        />
                      </div>

                      {/* Upload KTP */}
                      <div>
                        <label className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-blue-600" /> Upload Scan KTP Direktur / PIC
                        </label>
                        <div className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                          customerForm.ktp_file ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/30'
                        }`}>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setCustomerForm({ ...customerForm, ktp_file: file.name });
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          {customerForm.ktp_file ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-blue-600" />
                              <div className="text-left">
                                <div className="text-xs font-bold text-blue-700">KTP tersimpan:</div>
                                <div className="text-[11px] text-blue-600 font-mono">{customerForm.ktp_file}</div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCustomerForm({ ...customerForm, ktp_file: '' }); }}
                                className="ml-auto text-red-400 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="text-blue-400 text-2xl mb-1">📄</div>
                              <div className="text-xs font-bold text-slate-600">Klik untuk upload / ganti KTP</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, atau PDF — Maks 5MB</div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Upload NPWP */}
                      <div>
                        <label className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-teal-600" /> Upload Scan NPWP Perusahaan
                        </label>
                        <div className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                          customerForm.npwp_file ? 'border-teal-400 bg-teal-50' : 'border-gray-300 bg-gray-50 hover:border-teal-300 hover:bg-teal-50/30'
                        }`}>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setCustomerForm({ ...customerForm, npwp_file: file.name });
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          {customerForm.npwp_file ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-teal-600" />
                              <div className="text-left">
                                <div className="text-xs font-bold text-teal-700">NPWP tersimpan:</div>
                                <div className="text-[11px] text-teal-600 font-mono">{customerForm.npwp_file}</div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCustomerForm({ ...customerForm, npwp_file: '' }); }}
                                className="ml-auto text-red-400 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="text-teal-400 text-2xl mb-1">🧾</div>
                              <div className="text-xs font-bold text-slate-600">Klik untuk upload / ganti NPWP</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, atau PDF — Maks 5MB</div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Data Rekening Bank */}
                      <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden">
                        <div className="bg-emerald-700 text-white px-4 py-2.5 flex items-center gap-2">
                          <Landmark className="w-4 h-4" />
                          <span className="font-bold text-sm">Rekening Bank Customer (untuk Pembayaran / Refund)</span>
                        </div>
                        <div className="p-3.5 space-y-3">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Nama Bank</label>
                            <select
                              value={customerForm.bank_name}
                              onChange={(e) => setCustomerForm({ ...customerForm, bank_name: e.target.value })}
                              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 text-xs"
                            >
                              <option value="">— Pilih Bank —</option>
                              {['BCA', 'Bank Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'Bank Permata', 'Danamon', 'BTN', 'Bank Mega', 'Bank Syariah Indonesia (BSI)', 'Lainnya'].map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Nomor Rekening</label>
                            <input
                              type="text"
                              placeholder="Contoh: 1234-5678-9012"
                              value={customerForm.bank_account_number}
                              onChange={(e) => setCustomerForm({ ...customerForm, bank_account_number: e.target.value })}
                              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Nama Pemilik Rekening</label>
                            <input
                              type="text"
                              placeholder="Nama sesuai buku tabungan / rekening"
                              value={customerForm.bank_account_name}
                              onChange={(e) => setCustomerForm({ ...customerForm, bank_account_name: e.target.value })}
                              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 text-xs"
                            />
                          </div>
                          {(customerForm.bank_name && customerForm.bank_account_number) && (
                            <div className="bg-gradient-to-br from-emerald-900 to-teal-900 text-white rounded-xl p-3.5 font-mono space-y-1.5">
                              <div className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">Ringkasan Rekening:</div>
                              <div className="text-base font-extrabold tracking-widest">{customerForm.bank_account_number}</div>
                              <div className="text-emerald-200 text-xs">{customerForm.bank_name}</div>
                              <div className="text-white text-xs font-bold border-t border-emerald-700 pt-1.5 mt-1.5">
                                a.n {customerForm.bank_account_name || customerForm.company_name || '—'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomerFormTab('info')}
                          className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-slate-600 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          ← Kembali ke Informasi Umum
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomerFormTab('shipping')}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          Lanjut ke Pengiriman & Kurir →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── TAB 3: Pengiriman & Kurir (EDIT) ── */}
                  {customerFormTab === 'shipping' && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5">
                        <Truck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-blue-900">Pengaturan Ekspedisi & Ongkir Default</h4>
                          <div className="text-[11px] text-blue-700 mt-0.5">
                            Pilih kurir/ekspedisi langganan dan tentukan tarif ongkos kirim default yang otomatis terpasang saat membuat Sales Order (SO) untuk <strong>{customerForm.company_name || 'customer ini'}</strong>.
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                        {/* Pilihan Kurir Default */}
                        <div>
                          <label className="font-bold text-slate-700 block mb-1 text-xs flex items-center justify-between">
                            <span>Kurir / Ekspedisi Default</span>
                            <span className="text-[10px] text-blue-600 font-normal">Tersedia {couriers.length} Pilihan</span>
                          </label>
                          <select
                            value={customerForm.default_courier_id}
                            onChange={(e) => {
                              const selId = e.target.value;
                              const found = couriers.find((k) => k.id === selId);
                              setCustomerForm({
                                ...customerForm,
                                default_courier_id: selId,
                                default_courier_name: found ? `${found.name} (${found.vehicle_number || (found as any).service_type || 'Armada'})` : ''
                              });
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">— Belum Ditentukan (Pilih saat buat SO) —</option>
                            {couriers.map((k) => {
                              const isExt = (k as any).courier_type === 'EKSTERNAL';
                              return (
                                <option key={k.id} value={k.id}>
                                  {isExt ? '📦 [Eksternal]' : '🚚 [Internal]'} {k.name} — {k.vehicle_number || (k as any).service_type || 'Armada'} ({k.code})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Tipe Ongkir & Nominal */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-xs">Skema Ongkir Default</label>
                            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-lg border border-gray-200">
                              <button
                                type="button"
                                onClick={() => setCustomerForm({ ...customerForm, default_shipping_type: 'FRANCO', default_shipping_cost: 0 })}
                                className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all ${
                                  customerForm.default_shipping_type === 'FRANCO'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-gray-200'
                                }`}
                              >
                                FRANCO (Gratis)
                              </button>
                              <button
                                type="button"
                                onClick={() => setCustomerForm({ ...customerForm, default_shipping_type: 'LOCO' })}
                                className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all ${
                                  customerForm.default_shipping_type === 'LOCO'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-gray-200'
                                }`}
                              >
                                LOCO (Dikenakan)
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              {customerForm.default_shipping_type === 'FRANCO'
                                ? 'FRANCO: Ongkir ditanggung penjual (Artaroma).'
                                : 'LOCO: Ongkir ditagihkan ke customer pada Invoice.'}
                            </span>
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-xs">Nominal Default Ongkir (Rp)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">Rp</span>
                              <input
                                type="number"
                                min="0"
                                step="5000"
                                disabled={customerForm.default_shipping_type === 'FRANCO'}
                                value={customerForm.default_shipping_cost}
                                onChange={(e) => setCustomerForm({ ...customerForm, default_shipping_cost: Number(e.target.value) })}
                                className={`w-full border rounded-lg pl-9 pr-3 py-2 text-slate-800 font-mono font-bold text-xs ${
                                  customerForm.default_shipping_type === 'FRANCO'
                                    ? 'bg-gray-100 border-gray-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-white border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                                }`}
                                placeholder="0"
                              />
                            </div>
                            {customerForm.default_shipping_type === 'LOCO' && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {[50000, 100000, 150000, 250000].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setCustomerForm({ ...customerForm, default_shipping_cost: preset })}
                                    className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded border border-gray-200 transition-colors"
                                  >
                                    {preset.toLocaleString('id-ID')}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Catatan / Titik Bongkar Muat */}
                        <div className="pt-2 border-t border-gray-100">
                          <label className="font-bold text-slate-700 block mb-1 text-xs">Instruksi Pengiriman Khusus / Titik Bongkar</label>
                          <textarea
                            rows={2}
                            placeholder="Contoh: Masuk lewat gerbang barat gudang. Harap konfirmasi ke PIC 1 jam sebelum tiba."
                            value={customerForm.delivery_notes || ''}
                            onChange={(e) => setCustomerForm({ ...customerForm, delivery_notes: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-slate-800 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomerFormTab('bank')}
                          className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-slate-600 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          ← Kembali ke Data Bank
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomerFormTab('price')}
                          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          Lanjut ke Harga Khusus →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── TAB 4: Harga Khusus (EDIT) ── */}
                  {customerFormTab === 'price' && (
                    <div className="space-y-4">
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                        <Tag className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="text-[11px] text-orange-800 font-medium">
                          Harga khusus per varian untuk <strong>{customerForm.company_name || 'customer ini'}</strong>. Default produk non-aktif; aktifkan produk yang diizinkan untuk customer ini.
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 px-1">
                        <span className="text-xs text-slate-600 font-medium">
                          Produk Aktif: <strong className="text-blue-700 font-bold">{(customerForm.allowed_product_ids || []).length}</strong> dari {products.length}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCustomerForm({ ...customerForm, allowed_product_ids: products.map(p => p.id) })}
                            className="px-2.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                          >
                            ✓ Aktifkan Semua
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomerForm({ ...customerForm, allowed_product_ids: [] })}
                            className="px-2.5 py-1 text-[10px] font-bold bg-gray-100 text-slate-600 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors"
                          >
                            ✕ Nonaktifkan Semua
                          </button>
                        </div>
                      </div>

                        {products.length === 0 ? (
                          <div className="text-center text-slate-400 text-sm py-8">Belum ada produk terdaftar.</div>
                        ) : (
                          <div className="space-y-3">
                            {products.map((p) => {
                              const isAllowed = Boolean(customerForm.allowed_product_ids && customerForm.allowed_product_ids.includes(p.id));
                              const packSizes = p.pack_sizes && p.pack_sizes.length > 0 ? p.pack_sizes : [25, 5, 1];
                              return (
                                <div key={p.id} className={`bg-white border rounded-xl overflow-hidden transition-all ${isAllowed ? 'border-gray-200 shadow-xs' : 'border-gray-200 opacity-60 bg-gray-50'}`}>
                                  <div className={`px-4 py-2 flex items-center gap-2 text-white ${isAllowed ? 'bg-slate-700' : 'bg-slate-600'}`}>
                                    <Package className="w-3.5 h-3.5 opacity-70 animate-pulse" />
                                    <span className="font-bold text-xs">{p.name}</span>
                                    <span className="text-slate-355 text-[10px] font-mono ml-auto">{p.sku}</span>
                                    <div className="flex items-center gap-1.5 ml-2 border-l border-white/20 pl-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentAllowed = customerForm.allowed_product_ids || [];
                                          let nextAllowed = currentAllowed.includes(p.id)
                                            ? currentAllowed.filter((id) => id !== p.id)
                                            : [...currentAllowed, p.id];
                                          setCustomerForm({ ...customerForm, allowed_product_ids: nextAllowed });
                                        }}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors flex items-center gap-1 ${
                                          isAllowed
                                            ? 'bg-blue-600 border-blue-500 hover:bg-blue-700 text-white'
                                            : 'bg-slate-700 border-slate-600 hover:bg-slate-650 text-slate-350'
                                        }`}
                                      >
                                        {isAllowed ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                                        <span>{isAllowed ? 'AKTIF' : 'SEMBUNYI'}</span>
                                      </button>
                                    </div>
                                  </div>
                                  <div className="divide-y divide-gray-100">
                                    {!isAllowed ? (
                                      <div className="p-4 text-center text-slate-400 text-[11px] font-medium bg-gray-50/40">
                                        🚫 Produk disembunyikan dari katalog B2B customer ini.
                                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">Visibilitas katalog dinonaktifkan. Varian dan harga khusus tidak aktif.</p>
                                      </div>
                                    ) : (
                                      packSizes.map((sz) => {
                                    const variantKey = `${p.id}_${sz}`;
                                    const variant = p.variants?.find((v: any) => Number(v.pack_size_kg) === sz);
                                    const basePricePerKg = variant ? Number(variant.selling_price_per_kg || 0) : (p.selling_price_per_kg ?? 0);
                                    const basePriceUsdPerKg = variant ? Number(variant.selling_price_usd_per_kg || 0) : 0;
                                    const basePrice = basePricePerKg * sz;
                                    const mode = specialPriceMode[variantKey] ?? 'pct';
                                    const pct = specialPricePct[variantKey] ?? 0;
                                    const fixedPrice = customerForm.special_prices[variantKey];
                                    const hasSpecial = fixedPrice !== undefined;
                                    const discountPct = basePrice > 0 && hasSpecial ? (((basePrice - fixedPrice) / basePrice) * 100) : 0;
                                    const discountAmt = hasSpecial ? basePrice - fixedPrice : 0;
                                    return (
                                      <div key={sz} className={`px-4 py-3 ${hasSpecial ? 'bg-orange-50/40' : ''}`}>
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-700 text-xs">{p.sku}-{sz}K <span className="text-slate-400 font-normal">{sz} kg/kemasan</span></div>
                                            <div className="text-[11px] text-slate-500 mt-0.5 space-y-0.5">
                                              <div>
                                                Harga Umum (IDR): <span className="font-mono font-bold text-slate-700">{(basePricePerKg * sz).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}</span>
                                                <span className="text-slate-400"> ({basePricePerKg.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}/kg)</span>
                                              </div>
                                              {basePriceUsdPerKg > 0 && (
                                                <div className="text-blue-600 font-medium">
                                                  Harga Umum (USD): <span className="font-mono font-bold">${(basePriceUsdPerKg * sz).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                  <span className="text-slate-400"> (${basePriceUsdPerKg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg)</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <label className="flex items-center gap-2 cursor-pointer select-none bg-orange-50/50 hover:bg-orange-50 border border-orange-200/60 rounded-lg px-2.5 py-1 transition-all shadow-xs shrink-0">
                                            <input
                                              type="checkbox"
                                              checked={hasSpecial}
                                              onChange={() => {
                                                if (hasSpecial) {
                                                  const next = { ...customerForm.special_prices };
                                                  delete next[variantKey];
                                                  setCustomerForm({ ...customerForm, special_prices: next });
                                                } else {
                                                  setCustomerForm({ ...customerForm, special_prices: { ...customerForm.special_prices, [variantKey]: basePrice } });
                                                  setSpecialPriceMode({ ...specialPriceMode, [variantKey]: 'pct' });
                                                  setSpecialPricePct({ ...specialPricePct, [variantKey]: 0 });
                                                }
                                              }}
                                              className="w-3.5 h-3.5 rounded text-orange-650 border-orange-300 focus:ring-orange-500 cursor-pointer"
                                            />
                                            <span className="text-xs font-bold text-orange-955">Harga Khusus</span>
                                          </label>
                                        </div>
                                        {hasSpecial && (
                                          <div className="mt-3 space-y-2">
                                            <div className="flex rounded-lg overflow-hidden border border-orange-200 w-fit">
                                              <button type="button" onClick={() => setSpecialPriceMode({ ...specialPriceMode, [variantKey]: 'pct' })} className={`px-3 py-1 text-[10px] font-bold transition-colors ${mode === 'pct' ? 'bg-orange-500 text-white' : 'bg-white text-slate-500 hover:bg-orange-50'}`}>% Diskon</button>
                                              <button type="button" onClick={() => setSpecialPriceMode({ ...specialPriceMode, [variantKey]: 'fix' })} className={`px-3 py-1 text-[10px] font-bold border-l border-orange-200 transition-colors ${mode === 'fix' ? 'bg-orange-500 text-white' : 'bg-white text-slate-500 hover:bg-orange-50'}`}>Harga Tetap</button>
                                            </div>
                                            {mode === 'pct' ? (
                                              <div className="flex items-center gap-2">
                                                <div className="relative flex-1 max-w-[140px]">
                                                  <input type="number" min="0" max="100" step="0.5" value={pct}
                                                    onChange={(e) => {
                                                      const p2 = Math.min(100, Math.max(0, Number(e.target.value)));
                                                      setSpecialPricePct({ ...specialPricePct, [variantKey]: p2 });
                                                      setCustomerForm({ ...customerForm, special_prices: { ...customerForm.special_prices, [variantKey]: Math.round(basePrice * (1 - p2 / 100)) } });
                                                    }}
                                                    className="w-full border border-orange-300 rounded-lg px-3 py-1.5 text-xs font-bold text-orange-800 bg-orange-50 focus:outline-none focus:ring-1 focus:ring-orange-400 pr-7"
                                                  />
                                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-600 text-xs font-bold">%</span>
                                                </div>
                                                <div className="text-[11px] text-slate-650 flex flex-col">
                                                  <div>&rarr; <span className="font-bold font-mono text-orange-700">{(fixedPrice ?? 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}</span> <span className="text-slate-400">({sz > 0 ? Math.round((fixedPrice ?? 0) / sz).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }) : '-'}/kg)</span></div>
                                                  {usdRate > 0 && <span className="text-[10px] text-blue-600 font-mono font-medium">Equiv: ${( (fixedPrice ?? 0) / usdRate ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kg</span>}
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-2">
                                                <div className="relative flex-1 max-w-[180px]">
                                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-orange-600 text-xs font-bold">Rp</span>
                                                  <input type="number" min="0" step="10000" value={fixedPrice ?? basePrice}
                                                    onChange={(e) => setCustomerForm({ ...customerForm, special_prices: { ...customerForm.special_prices, [variantKey]: Number(e.target.value) } })}
                                                    className="w-full border border-orange-300 rounded-lg pl-7 pr-3 py-1.5 text-xs font-bold font-mono text-orange-800 bg-orange-50 focus:outline-none focus:ring-1 focus:ring-orange-400"
                                                  />
                                                </div>
                                                <div className="text-[11px] text-slate-650 flex flex-col">
                                                  <span>Diskon: <span className={`font-bold ${discountPct > 0 ? 'text-green-700' : 'text-slate-400'}`}>{discountPct.toFixed(1)}%</span> {discountAmt > 0 && <span className="text-slate-400">(hemat {discountAmt.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })})</span>}</span>
                                                  {usdRate > 0 && <span className="text-[10px] text-blue-600 font-mono font-medium">Equiv: ${( (fixedPrice ?? basePrice) / usdRate ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kg</span>}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 text-center">{Object.keys(customerForm.special_prices).length} varian dengan harga khusus aktif</div>
                      <button type="button" onClick={() => setCustomerFormTab('bank')} className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-slate-600 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                        ← Kembali ke Data Bank & Dokumen
                      </button>
                    </div>
                  )}
                </>
              )}



              {/* EDIT DISTRIBUTOR */}
              {editingItem.type === 'distributors' && (
                <>
                  {/* ── Inner Tab Navigator ── */}
                  <div className="flex border border-gray-200 rounded-xl overflow-hidden mb-1">
                    <button
                      type="button"
                      onClick={() => setDistributorFormTab('info')}
                      className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        distributorFormTab === 'info'
                          ? 'bg-blue-600 text-white shadow-inner'
                          : 'bg-gray-50 text-slate-500 hover:bg-gray-100'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" /> Informasi Umum
                    </button>
                    <button
                      type="button"
                      onClick={() => setDistributorFormTab('finance')}
                      className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-l border-gray-200 ${
                        distributorFormTab === 'finance'
                          ? 'bg-purple-700 text-white shadow-inner'
                          : 'bg-gray-50 text-slate-500 hover:bg-gray-100'
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5" /> Keuangan & Perbankan
                    </button>
                  </div>

                  {/* ── TAB 1: Informasi Umum ── */}
                  {distributorFormTab === 'info' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Kode Suplier</label>
                          <input
                            type="text"
                            required
                            value={distributorForm.code}
                            onChange={(e) => setDistributorForm({ ...distributorForm, code: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Nama Perusahaan Suplier</label>
                          <input
                            type="text"
                            required
                            value={distributorForm.name}
                            onChange={(e) => setDistributorForm({ ...distributorForm, name: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-bold text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Contact Person</label>
                          <input
                            type="text"
                            required
                            value={distributorForm.contact_name}
                            onChange={(e) => setDistributorForm({ ...distributorForm, contact_name: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Telepon</label>
                          <input
                            type="text"
                            required
                            value={distributorForm.phone}
                            onChange={(e) => setDistributorForm({ ...distributorForm, phone: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Email Order Suplier</label>
                        <input
                          type="email"
                          required
                          value={distributorForm.email}
                          onChange={(e) => setDistributorForm({ ...distributorForm, email: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Alamat Kantor / Gudang Suplier</label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Alamat lengkap kantor / gudang suplier..."
                          value={distributorForm.address}
                          onChange={(e) => setDistributorForm({ ...distributorForm, address: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-800 text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Catatan Tambahan Suplier</label>
                        <textarea
                          rows={2}
                          placeholder="Catatan internal suplier, syarat minimum order (MOQ), garansi, dll..."
                          value={distributorForm.notes}
                          onChange={(e) => setDistributorForm({ ...distributorForm, notes: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-800 text-xs"
                        />
                      </div>

                      {/* Daftar Produk Induk */}
                      <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-2">
                        <label className="font-bold text-blue-900 block text-xs flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-blue-600" />
                          Daftar Produk Induk Yang Dipesan Dari Suplier Ini:
                        </label>
                        <div className="grid grid-cols-2 gap-2 pt-1 max-h-32 overflow-y-auto pr-1">
                          {products.map((prod) => {
                            const isSelected = (distributorForm.supplied_product_ids || []).includes(prod.id);
                            return (
                              <label
                                key={prod.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                                    : 'bg-white text-slate-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const current = distributorForm.supplied_product_ids || [];
                                    setDistributorForm({
                                      ...distributorForm,
                                      supplied_product_ids: isSelected
                                        ? current.filter((id) => id !== prod.id)
                                        : [...current, prod.id],
                                    });
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                />
                                <span className="truncate">{prod.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDistributorFormTab('finance')}
                        className="w-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Landmark className="w-3.5 h-3.5" /> Lihat / Edit Data Keuangan & Perbankan →
                      </button>
                    </div>
                  )}

                  {/* ── TAB 2: Keuangan & Perbankan ── */}
                  {distributorFormTab === 'finance' && (
                    <div className="space-y-3">
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2">
                        <Landmark className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div className="text-[11px] text-purple-800 font-medium">
                          Data keuangan suplier <strong>{distributorForm.name || '—'}</strong>: term pembayaran (TOP Hutang), nomor rekening bank, dan NPWP untuk kebutuhan transaksi & perpajakan.
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                            <Banknote className="w-3.5 h-3.5 text-purple-600" /> TOP Hutang (Hari)
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="Contoh: 30"
                            value={distributorForm.top_payable_days}
                            onChange={(e) => setDistributorForm({ ...distributorForm, top_payable_days: Number(e.target.value) })}
                            className="w-full bg-white border border-purple-300 rounded-lg px-3 py-2 text-purple-800 font-mono text-sm font-extrabold focus:outline-none focus:border-purple-600"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Jumlah hari jatuh tempo pembayaran hutang kepada suplier ini.</p>
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-teal-600" /> NPWP Suplier
                          </label>
                          <input
                            type="text"
                            placeholder="01.234.567.8-012.000"
                            value={distributorForm.npwp}
                            onChange={(e) => setDistributorForm({ ...distributorForm, npwp: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Untuk pembuatan Faktur Pajak & dokumen PPN.</p>
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                          <Landmark className="w-3.5 h-3.5 text-blue-600" /> Nomor Rekening Pembayaran
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: BCA 0883-992-111 a.n PT Givaudan Indonesia"
                          value={distributorForm.bank_account}
                          onChange={(e) => setDistributorForm({ ...distributorForm, bank_account: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Format: [Nama Bank] [Nomor Rekening] a.n [Nama Penerima]</p>
                      </div>

                      {/* Summary Card */}
                      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white rounded-xl p-4 space-y-2 font-mono">
                        <div className="text-[10px] uppercase font-bold text-purple-300 tracking-wider flex items-center gap-1">
                          <Landmark className="w-3 h-3" /> Ringkasan Data Keuangan Suplier:
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-purple-300">Nama Suplier:</span>
                            <span className="font-bold text-white">{distributorForm.name || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs border-t border-purple-800 pt-1.5">
                            <span className="text-purple-300">TOP Hutang:</span>
                            <span className="bg-purple-700 text-amber-300 px-2 py-0.5 rounded font-extrabold text-xs">
                              {distributorForm.top_payable_days} Hari
                            </span>
                          </div>
                          {distributorForm.bank_account && (
                            <div className="flex items-start justify-between text-xs gap-2">
                              <span className="text-purple-300 flex-shrink-0">Rek. Bank:</span>
                              <span className="text-amber-200 text-right text-[11px] font-bold">{distributorForm.bank_account}</span>
                            </div>
                          )}
                          {distributorForm.npwp && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-purple-300">NPWP:</span>
                              <span className="text-slate-200">{distributorForm.npwp}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDistributorFormTab('info')}
                        className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-slate-600 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        ← Kembali ke Informasi Umum
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* EDIT COURIER */}
              {editingItem.type === 'couriers' && (
                <>
                  {/* Pilihan Tipe Kurir */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-xs">Tipe Pengantaran / Kurir</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCourierForm({ ...courierForm, courier_type: 'INTERNAL' })}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                          courierForm.courier_type === 'INTERNAL'
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-900'
                            : 'bg-white border-gray-200 hover:bg-gray-50 text-slate-600'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${courierForm.courier_type === 'INTERNAL' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-slate-500'}`}>
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs">🏢 Kurir Internal</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                            Staf pengantaran internal Artaroma.
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCourierForm({ ...courierForm, courier_type: 'EKSTERNAL' })}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                          courierForm.courier_type === 'EKSTERNAL'
                            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-900'
                            : 'bg-white border-gray-200 hover:bg-gray-50 text-slate-600'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${courierForm.courier_type === 'EKSTERNAL' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-slate-500'}`}>
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs">📦 Ekspedisi Eksternal</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                            Vendor rekanan cargo (tanpa login).
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">
                        {courierForm.courier_type === 'INTERNAL' ? 'Kode Kurir' : 'Kode Ekspedisi'}
                      </label>
                      <input
                        type="text"
                        required
                        value={courierForm.code}
                        onChange={(e) => setCourierForm({ ...courierForm, code: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">
                        {courierForm.courier_type === 'INTERNAL' ? 'Nama Lengkap Kurir' : 'Nama Ekspedisi / Vendor Cargo'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={courierForm.courier_type === 'INTERNAL' ? 'Contoh: Budi Gunawan' : 'Contoh: Indah Logistik Cargo / JNE Trucking'}
                        value={courierForm.name}
                        onChange={(e) => setCourierForm({ ...courierForm, name: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">
                        {courierForm.courier_type === 'INTERNAL' ? 'Nomor HP / WhatsApp' : 'Nomor Kontak CS / PIC Ekspedisi'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="0813-xxxx-xxxx"
                        value={courierForm.phone}
                        onChange={(e) => setCourierForm({ ...courierForm, phone: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">
                        {courierForm.courier_type === 'INTERNAL' ? 'Nomor Plat Kendaraan Cargo' : 'Jenis Layanan Ekspedisi'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={courierForm.courier_type === 'INTERNAL' ? 'Contoh: B 7721 SXX (Box Truck)' : 'Contoh: Cargo Darat / Trucking FTL'}
                        value={courierForm.vehicle_number}
                        onChange={(e) => setCourierForm({ ...courierForm, vehicle_number: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono font-bold text-xs text-amber-700"
                      />
                    </div>
                  </div>

                  {courierForm.courier_type === 'EKSTERNAL' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1 text-xs">Catatan / Lokasi Drop Point Ekspedisi</label>
                        <textarea
                          rows={2}
                          placeholder="Contoh: Drop point agen Indah Cargo Jl. Raya Daan Mogot No. 45. Tarif langganan diskon 15%."
                          value={courierForm.notes || ''}
                          onChange={(e) => setCourierForm({ ...courierForm, notes: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-slate-800 text-xs"
                        />
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-850">
                        <Package className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Ekspedisi Eksternal dikelola via nomor resi pengiriman. <strong>Tidak memerlukan akun login</strong> ke aplikasi kurir mobile.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span>Akun kurir internal terhubung dengan sistem login pengguna untuk aplikasi kurir mobile.</span>
                    </div>
                  )}
                </>
              )}

              {/* EDIT USER */}
              {editingItem.type === 'users' && (
                <>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nama Lengkap Pengguna</label>
                    <input
                      type="text"
                      required
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-blue-800 block mb-1">Email (Username Login)</label>
                    <input
                      type="email"
                      required
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="w-full bg-blue-50/50 border border-blue-300 rounded-lg px-3 py-2 text-slate-800 font-mono font-bold text-xs"
                    />
                  </div>

                  <div className="bg-violet-50 border border-violet-200 p-3.5 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-violet-900 block text-[11px] uppercase tracking-wide">
                        Pilih Modul yang Diizinkan:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSelectAllModules}
                          className="text-[10px] text-violet-700 hover:text-violet-900 font-bold underline cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                        <span className="text-violet-300">|</span>
                        <button
                          type="button"
                          onClick={handleClearAllModules}
                          className="text-[10px] text-slate-500 hover:text-slate-700 font-medium underline cursor-pointer"
                        >
                          Kosongkan
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_MODULES.map((mod) => {
                        const checked = draftModules.includes(mod);
                        return (
                          <button
                            key={mod}
                            type="button"
                            onClick={() => handleToggleDraftModule(mod)}
                            className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-bold border transition-all ${
                              checked
                                ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                            }`}
                          >
                            {checked ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3 opacity-40" />}
                            {mod}
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-violet-700 font-medium">
                      {draftModules.length} dari {ALL_MODULES.length} modul aktif untuk pengguna ini
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Perusahaan / Entitas Terkait</label>
                    <input
                      type="text"
                      required
                      value={userForm.linked_entity_name}
                      onChange={(e) => setUserForm({ ...userForm, linked_entity_name: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 text-xs"
                    />
                  </div>
                </>
              )}

              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Save className="w-3.5 h-3.5" /> Simpan Perubahan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Modal: Map Products Display for Customer Catalog */}
      {mappingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="bg-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-base">Set Tampilan Produk Katalog Customer</h3>
                  <p className="text-xs text-blue-200">Pengaturan Akses Varian Bibit Parfum</p>
                </div>
              </div>
              <button onClick={() => setMappingCustomer(null)} className="text-blue-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCatalogMapping} className="p-6 space-y-4 text-xs">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl space-y-0.5 text-blue-900 font-medium">
                <div>Customer: <strong>{mappingCustomer.company_name}</strong> ({mappingCustomer.code})</div>
                <div>PIC: {mappingCustomer.pic_name} | {mappingCustomer.phone}</div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-bold text-slate-700">
                    Centang Varian Produk yang Boleh Tampil di Katalog:
                  </label>
                  <span className="text-blue-700 font-bold">
                    {selectedProductIds.length} / {products.length} Dilihat
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {products.map((p) => {
                    const isChecked = selectedProductIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleToggleProductCheck(p.id)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                          isChecked
                            ? 'bg-blue-50/70 border-blue-300 text-blue-900'
                            : 'bg-gray-50 border-gray-200 text-slate-500 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center border font-bold ${
                              isChecked
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{p.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              SKU: {p.sku} | {p.fragrance_family}
                            </div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isChecked ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {isChecked ? 'TAMPIL' : 'SEMBUNYI'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setMappingCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Check className="w-3.5 h-3.5" /> Simpan Pengaturan Katalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPER ADMIN APPLICATION CATEGORIES MANAGEMENT MODAL */}
      {isAppModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-purple-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <h3 className="font-bold text-base">Kelola Pilihan Kategori Aplikasi</h3>
              </div>
              <button onClick={() => setIsAppModalOpen(false)} className="text-purple-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Form Add New Category */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newCategoryName.trim()) return;
                  const updated = addApplicationCategory(newCategoryName);
                  setApplicationCategories(updated);
                  setNewCategoryName('');
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Nama Aplikasi Baru (Contoh: Home Care)..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 text-xs font-semibold focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              </form>

              {/* Categories List */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Daftar Pilihan Kategori Aplikasi Aktif:
                </span>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {applicationCategories.map((cat) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between bg-slate-50 border border-gray-200 rounded-xl p-2.5"
                    >
                      {editingCategory?.oldName === cat ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input
                            type="text"
                            value={editingCategory.newName}
                            onChange={(e) =>
                              setEditingCategory({ ...editingCategory, newName: e.target.value })
                            }
                            className="bg-white border border-purple-400 rounded px-2 py-1 text-xs font-bold text-slate-800 flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = updateApplicationCategory(
                                editingCategory.oldName,
                                editingCategory.newName
                              );
                              setApplicationCategories(updated);
                              setEditingCategory(null);
                            }}
                            className="bg-emerald-600 text-white p-1 rounded hover:bg-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategory(null)}
                            className="bg-gray-200 text-gray-700 p-1 rounded hover:bg-gray-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            {cat}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingCategory({ oldName: cat, newName: cat })}
                              className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg border border-transparent hover:border-blue-200"
                              title="Edit Nama Aplikasi"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (applicationCategories.length <= 1) {
                                  alert('Minimal harus ada 1 Kategori Aplikasi.');
                                  return;
                                }
                                const updated = deleteApplicationCategory(cat);
                                setApplicationCategories(updated);

                                // Also remove this application from all products that have it
                                const affectedProducts = products.filter(
                                  (p) => Array.isArray(p.applications) && p.applications.includes(cat)
                                );
                                if (affectedProducts.length > 0) {
                                  const cleanedProducts = products.map((p) =>
                                    Array.isArray(p.applications) && p.applications.includes(cat)
                                      ? { ...p, applications: p.applications.filter((a) => a !== cat) }
                                      : p
                                  );
                                  setProducts(cleanedProducts);
                                  // Sync each affected product to MySQL via API
                                  affectedProducts.forEach((p) => {
                                    const cleanedApps = (p.applications || []).filter((a) => a !== cat);
                                    fetch('/api/products', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ id: p.id, applications: cleanedApps }),
                                    }).catch((err) =>
                                      console.warn(`Failed to clean application from product ${p.id}:`, err)
                                    );
                                  });
                                }
                              }}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg border border-transparent hover:border-red-200"
                              title="Hapus Kategori"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAppModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PRICELIST VARIAN MODAL */}
      {isPricelistModalOpen && selectedProductForPricelist && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-8">
            <div className="bg-blue-900 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-base">Atur Pricelist Varian</h3>
                  <p className="text-xs text-blue-200">{selectedProductForPricelist.name} ({selectedProductForPricelist.sku})</p>
                </div>
              </div>
              <button onClick={() => setIsPricelistModalOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePricelist} className="p-6 space-y-4 text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 text-blue-800">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="leading-relaxed">
                  Tentukan mata uang acuan pada <strong>kolom kiri</strong> dan masukkan nominal harganya. <strong>Kolom kanan</strong> akan otomatis menganalisa & menghitung harga final dalam Rupiah berdasarkan kurs saat ini (<strong>Rp {usdRate.toLocaleString()}</strong>).
                </p>
              </div>

              <div className="space-y-4 divide-y divide-gray-100">
                {selectedProductForPricelist.variants && selectedProductForPricelist.variants.length > 0 ? (
                  selectedProductForPricelist.variants.map((v: any, index: number) => {
                    const formVal = pricelistForm[v.id] || { currency: 'IDR', value: 0 };
                    const isIdrMode = formVal.currency === 'IDR';
                    const finalRupiah = isIdrMode ? formVal.value : Math.round(formVal.value * usdRate);
                    
                    return (
                      <div key={v.id} className={`space-y-2.5 ${index > 0 ? 'pt-4' : ''}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800 text-sm">
                            Varian {v.pack_size_kg} Kg ({v.variant_sku})
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {v.id}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* KOLOM KIRI: INPUT HARGA & MATA UANG */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="font-bold text-slate-700 block">Harga Input</label>
                              
                              {/* Currency Selector (inline) */}
                              <div className="flex items-center gap-2.5">
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`currency-${v.id}`}
                                    checked={isIdrMode}
                                    onChange={() => handleCurrencyChange(v.id, 'IDR')}
                                    className="text-blue-600 focus:ring-blue-500 w-3 h-3"
                                  />
                                  <span className={`text-[10px] font-bold ${isIdrMode ? 'text-slate-800' : 'text-slate-400'}`}>IDR</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`currency-${v.id}`}
                                    checked={!isIdrMode}
                                    onChange={() => handleCurrencyChange(v.id, 'USD')}
                                    className="text-blue-600 focus:ring-blue-500 w-3 h-3"
                                  />
                                  <span className={`text-[10px] font-bold ${!isIdrMode ? 'text-blue-700' : 'text-slate-400'}`}>USD</span>
                                </label>
                              </div>
                            </div>

                            <div className="relative">
                              <span className="absolute left-2.5 top-2 font-bold text-slate-400 text-xs">
                                {isIdrMode ? 'Rp' : '$'}
                              </span>
                              <input
                                type="number"
                                required
                                min="0"
                                step={isIdrMode ? '1000' : '0.01'}
                                value={formVal.value}
                                onChange={(e) => handleValueChange(v.id, Number(e.target.value))}
                                className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-2 py-2 font-mono text-xs font-bold text-slate-850 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* KOLOM KANAN: HARGA AKHIR RUPIAH */}
                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 block">
                              Harga Rupiah Akhir {!isIdrMode ? '(Hasil Kurs)' : '(Sesuai Input)'}
                            </label>
                            <div className="relative font-mono">
                              <span className="absolute left-2.5 top-2 font-bold text-slate-400 text-xs">Rp</span>
                              <input
                                type="text"
                                readOnly
                                value={finalRupiah.toLocaleString('id-ID')}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-2 text-xs font-extrabold text-emerald-600 cursor-not-allowed focus:outline-none shadow-2xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-slate-400 font-medium">
                    Tidak ada varian terdaftar untuk produk induk ini. Silakan tambahkan varian terlebih dahulu di tab PRODUK.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPricelistModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPricelistSubmitting || !(selectedProductForPricelist.variants && selectedProductForPricelist.variants.length > 0)}
                  className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold shadow flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {isPricelistSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    'Simpan Pricelist'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BANK ACCOUNT */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-8">
            <div className="bg-blue-800 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">{editingBankIndex !== null ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'}</h3>
              </div>
              <button onClick={() => setIsBankModalOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBank} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Bank (misal: Bank Central Asia (BCA))</label>
                <input
                  type="text"
                  required
                  value={bankForm.bank}
                  onChange={(e) => setBankForm({ ...bankForm, bank: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  required
                  value={bankForm.no}
                  onChange={(e) => setBankForm({ ...bankForm, no: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Atas Nama</label>
                <input
                  type="text"
                  required
                  value={bankForm.atas_nama}
                  onChange={(e) => setBankForm({ ...bankForm, atas_nama: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Keterangan / Jenis Rekening (Operasional, Giro, dll.)</label>
                <input
                  type="text"
                  required
                  value={bankForm.jenis}
                  onChange={(e) => setBankForm({ ...bankForm, jenis: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Warna Badge Keterangan</label>
                <select
                  value={bankForm.badge}
                  onChange={(e) => setBankForm({ ...bankForm, badge: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:outline-none focus:border-blue-600"
                >
                  <option value="bg-blue-100 text-blue-800">Biru (Operasional)</option>
                  <option value="bg-yellow-100 text-yellow-800">Kuning (Giro)</option>
                  <option value="bg-orange-100 text-orange-800">Oranye (Cadangan)</option>
                  <option value="bg-emerald-100 text-emerald-800">Hijau (Utama)</option>
                  <option value="bg-purple-100 text-purple-800">Ungu (Gaji)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold shadow transition-colors"
                >
                  Simpan Rekening
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PAYMENT SETTINGS */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-8">
            <div className="bg-amber-600 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">Ubah Pengaturan Pembayaran</h3>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-amber-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">TOP Hutang ke Suplier (Default)</label>
                <input
                  type="text"
                  required
                  value={paymentForm.top_payable}
                  onChange={(e) => setPaymentForm({ ...paymentForm, top_payable: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">TOP Piutang dari Customer B2B (Default)</label>
                <input
                  type="text"
                  required
                  value={paymentForm.top_receivable}
                  onChange={(e) => setPaymentForm({ ...paymentForm, top_receivable: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Denda Keterlambatan Bayar (%/Bulan)</label>
                <input
                  type="text"
                  required
                  value={paymentForm.late_fee}
                  onChange={(e) => setPaymentForm({ ...paymentForm, late_fee: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mata Uang Pelaporan</label>
                <input
                  type="text"
                  required
                  value={paymentForm.currency}
                  onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pajak PPN Berlaku (%)</label>
                <input
                  type="text"
                  required
                  value={paymentForm.ppn}
                  onChange={(e) => setPaymentForm({ ...paymentForm, ppn: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow transition-colors"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TAX DOCUMENTS */}
      {isTaxModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-8">
            <div className="bg-teal-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">Ubah Data Pajak Perusahaan</h3>
              </div>
              <button onClick={() => setIsTaxModalOpen(false)} className="text-teal-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTax} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">NPWP Perusahaan</label>
                <input
                  type="text"
                  required
                  value={taxForm.npwp}
                  onChange={(e) => setTaxForm({ ...taxForm, npwp: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">NPPKP (PKP)</label>
                <input
                  type="text"
                  required
                  value={taxForm.nppkp}
                  onChange={(e) => setTaxForm({ ...taxForm, nppkp: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">NIB (Nomor Induk Berusaha)</label>
                <input
                  type="text"
                  required
                  value={taxForm.nib}
                  onChange={(e) => setTaxForm({ ...taxForm, nib: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Legal Perusahaan</label>
                <input
                  type="text"
                  required
                  value={taxForm.legal_name}
                  onChange={(e) => setTaxForm({ ...taxForm, legal_name: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Alamat Terdaftar (Fiskal)</label>
                <textarea
                  required
                  rows={2}
                  value={taxForm.address}
                  onChange={(e) => setTaxForm({ ...taxForm, address: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsTaxModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow transition-colors"
                >
                  Simpan Dokumen Pajak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Bulk Price Adjustment */}
      <BulkPriceModal
        isOpen={isBulkPriceModalOpen}
        onClose={() => setIsBulkPriceModalOpen(false)}
        products={products}
        applicationCategories={applicationCategories}
        usdRate={usdRate}
        onSuccess={() => {
          fetchProducts();
          fetchPriceLogs();
        }}
      />

      {/* MODAL: Import Pricelist Excel */}
      <ImportPricelistModal
        isOpen={isImportPricelistModalOpen}
        onClose={() => setIsImportPricelistModalOpen(false)}
        products={products}
        onSuccess={() => {
          fetchProducts();
          fetchPriceLogs();
        }}
      />
    </div>
  );
}
