export interface DisposalReason {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
}

const DISPOSAL_REASONS_KEY = 'artaroma_disposal_reasons_v1';

export const DEFAULT_DISPOSAL_REASONS: DisposalReason[] = [
  {
    id: 'reason-1',
    name: 'Rusak / Kontaminasi',
    description: 'Kerusakan fisik, perubahan aroma, atau penurunan kualitas bibit parfum.',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'reason-2',
    name: 'Kadaluwarsa (Expired)',
    description: 'Melewati batas tanggal simpan dan uji stabilitas kualitas di gudang FEFO.',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'reason-3',
    name: 'Tumpah / Bocor di Gudang',
    description: 'Insiden kebocoran drum/jerigen atau tumpah saat penanganan di gudang.',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'reason-4',
    name: 'Diambil untuk Sampel Uji Coba',
    description: 'Pengambilan sampel laboratorium, tester customer, atau quality control R&D.',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'reason-5',
    name: 'Rusak dalam Perjalanan / Ekspedisi',
    description: 'Kerusakan segel kemasan atau cacat fisik saat pengiriman logistik / vendor.',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

export function getStoredDisposalReasons(): DisposalReason[] {
  if (typeof window === 'undefined') return DEFAULT_DISPOSAL_REASONS;
  try {
    const stored = localStorage.getItem(DISPOSAL_REASONS_KEY);
    if (!stored) {
      localStorage.setItem(DISPOSAL_REASONS_KEY, JSON.stringify(DEFAULT_DISPOSAL_REASONS));
      return DEFAULT_DISPOSAL_REASONS;
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_DISPOSAL_REASONS;
  } catch {
    return DEFAULT_DISPOSAL_REASONS;
  }
}

export function saveStoredDisposalReasons(reasons: DisposalReason[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISPOSAL_REASONS_KEY, JSON.stringify(reasons));
    window.dispatchEvent(new Event('artaroma_disposal_reasons_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn('Failed to save disposal reasons:', e);
  }
}
