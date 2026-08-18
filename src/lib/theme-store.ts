'use client';

export interface ThemeSettings {
  colorPreset: 'blue' | 'emerald' | 'violet' | 'amber' | 'slate' | 'custom';
  primaryColor: string;       // Primary brand/action color hex
  primaryHover: string;       // Hover shade hex
  primaryLight: string;       // Light background tint hex
  primaryText: string;        // Text on light background hex
  fontSize: 'compact' | 'normal' | 'medium' | 'large';
  tableDensity: 'compact' | 'normal' | 'spacious';
  borderRadius: 'sharp' | 'normal' | 'soft';
  backgroundTone: 'slate' | 'warm' | 'white';
  highContrast: boolean;
}

export interface ThemePreset {
  id: 'blue' | 'emerald' | 'violet' | 'amber' | 'slate';
  name: string;
  subtitle: string;
  primaryColor: string;
  primaryHover: string;
  primaryLight: string;
  primaryText: string;
  backgroundTone: 'slate' | 'warm' | 'white';
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  blue: {
    id: 'blue',
    name: 'Artaroma Signature (Royal Blue)',
    subtitle: 'Warna standar Artaroma Hub — Profesional & Elegan',
    primaryColor: '#1d4ed8',
    primaryHover: '#1e40af',
    primaryLight: '#eff6ff',
    primaryText: '#1e40af',
    backgroundTone: 'slate',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Luxury (Forest Perfumery)',
    subtitle: 'Nuansa botol parfum mewah & aromatics alami',
    primaryColor: '#059669',
    primaryHover: '#047857',
    primaryLight: '#ecfdf5',
    primaryText: '#065f46',
    backgroundTone: 'slate',
  },
  violet: {
    id: 'violet',
    name: 'Violet Royale (Floral Fragrance)',
    subtitle: 'Nuansa floral mewah, kreatif & inspiratif',
    primaryColor: '#7c3aed',
    primaryHover: '#6d28d9',
    primaryLight: '#f5f3ff',
    primaryText: '#5b21b6',
    backgroundTone: 'slate',
  },
  amber: {
    id: 'amber',
    name: 'Amber Gold (Oriental Warmth)',
    subtitle: 'Nuansa emas mewah, hangat & ramah di mata',
    primaryColor: '#d97706',
    primaryHover: '#b45309',
    primaryLight: '#fffbeb',
    primaryText: '#92400e',
    backgroundTone: 'warm',
  },
  slate: {
    id: 'slate',
    name: 'Slate Charcoal (Minimalist Corporate)',
    subtitle: 'Gaya monokrom bersih, kontras tinggi & fokus data',
    primaryColor: '#334155',
    primaryHover: '#1e293b',
    primaryLight: '#f8fafc',
    primaryText: '#0f172a',
    backgroundTone: 'slate',
  },
};

export const DEFAULT_THEME: ThemeSettings = {
  colorPreset: 'blue',
  primaryColor: '#1d4ed8',
  primaryHover: '#1e40af',
  primaryLight: '#eff6ff',
  primaryText: '#1e40af',
  fontSize: 'normal',
  tableDensity: 'normal',
  borderRadius: 'normal',
  backgroundTone: 'slate',
  highContrast: false,
};

export const THEME_STORAGE_KEY = 'artaroma_theme_settings_v1';

export function getThemeSettings(): ThemeSettings {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_THEME, ...parsed };
  } catch (err) {
    console.warn('Failed to parse theme settings from localStorage:', err);
    return DEFAULT_THEME;
  }
}

export function applyThemeToDOM(theme: ThemeSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // 1. Primary Colors
  root.style.setProperty('--artaroma-primary', theme.primaryColor);
  root.style.setProperty('--artaroma-primary-hover', theme.primaryHover);
  root.style.setProperty('--artaroma-primary-light', theme.primaryLight);
  root.style.setProperty('--artaroma-primary-text', theme.primaryText);

  // 2. Font Size Scaling
  const fontSizes = {
    compact: '13px',
    normal: '14px',
    medium: '15px',
    large: '16px',
  };
  root.style.setProperty('--artaroma-font-size-base', fontSizes[theme.fontSize] || '14px');
  root.setAttribute('data-font-size', theme.fontSize);

  // 3. Table Density
  const tablePaddings = {
    compact: '6px 12px',
    normal: '10px 16px',
    spacious: '14px 20px',
  };
  root.style.setProperty('--artaroma-table-padding', tablePaddings[theme.tableDensity] || '10px 16px');
  root.setAttribute('data-density', theme.tableDensity);

  // 4. Border Radius
  const radii = {
    sharp: '6px',
    normal: '12px',
    soft: '18px',
  };
  root.style.setProperty('--artaroma-radius', radii[theme.borderRadius] || '12px');
  root.setAttribute('data-radius', theme.borderRadius);

  // 5. Background Tone
  const bgColors = {
    slate: '#f5f7fa',
    warm: '#faf8f5',
    white: '#ffffff',
  };
  const currentBg = bgColors[theme.backgroundTone] || '#f5f7fa';
  root.style.setProperty('--artaroma-bg', currentBg);
  root.setAttribute('data-bg-tone', theme.backgroundTone);

  if (document.body) {
    document.body.style.backgroundColor = currentBg;
    if (theme.backgroundTone === 'warm') {
      document.body.classList.add('bg-warm-tone');
    } else {
      document.body.classList.remove('bg-warm-tone');
    }
  }

  // 6. High Contrast Flag
  if (theme.highContrast) {
    root.classList.add('artaroma-high-contrast');
  } else {
    root.classList.remove('artaroma-high-contrast');
  }
}

export function saveThemeSettings(theme: ThemeSettings): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    applyThemeToDOM(theme);
    window.dispatchEvent(new CustomEvent('artaroma_theme_updated', { detail: theme }));
    return true;
  } catch (err) {
    console.error('Failed to save theme settings:', err);
    return false;
  }
}

export function resetThemeSettings(): ThemeSettings {
  saveThemeSettings(DEFAULT_THEME);
  return DEFAULT_THEME;
}
