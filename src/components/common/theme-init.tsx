'use client';

import { useEffect } from 'react';
import { getThemeSettings, applyThemeToDOM } from '@/lib/theme-store';

export function ThemeInit() {
  useEffect(() => {
    // Initial apply on client mount
    const theme = getThemeSettings();
    applyThemeToDOM(theme);

    // Listen to live theme updates from any page/modal
    const handleThemeUpdate = (e: any) => {
      if (e.detail) {
        applyThemeToDOM(e.detail);
      } else {
        applyThemeToDOM(getThemeSettings());
      }
    };

    window.addEventListener('artaroma_theme_updated', handleThemeUpdate);
    return () => {
      window.removeEventListener('artaroma_theme_updated', handleThemeUpdate);
    };
  }, []);

  return null;
}
