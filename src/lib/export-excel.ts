import * as XLSX from 'xlsx';
import { AppUser } from './types';

export interface ExportExcelOptions {
  fileName?: string;
  sheetName?: string;
  autoWidth?: boolean;
}

/**
 * Utility umum untuk mengekspor data array JSON ke file Excel (.xlsx)
 */
export function exportToXLSX<T extends Record<string, any>>(
  data: T[],
  options: ExportExcelOptions = {}
): boolean {
  if (!data || data.length === 0) {
    if (typeof window !== 'undefined') {
      alert('Tidak ada data untuk diekspor ke Excel.');
    }
    return false;
  }

  const {
    fileName = `Export_${new Date().toISOString().split('T')[0]}.xlsx`,
    sheetName = 'Data',
    autoWidth = true,
  } = options;

  try {
    // 1. Buat worksheet dari array objek JSON
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 2. Hitung lebar kolom otomatis
    if (autoWidth) {
      const keys = Object.keys(data[0] || {});
      const colWidths = keys.map((key) => {
        let maxLen = key.length;
        data.forEach((row) => {
          const val = row[key];
          if (val !== undefined && val !== null) {
            const strVal = String(val);
            if (strVal.length > maxLen) {
              maxLen = strVal.length;
            }
          }
        });
        // Beri padding ekstra dan batas minimum/maksimum
        return { wch: Math.min(Math.max(maxLen + 4, 12), 60) };
      });
      worksheet['!cols'] = colWidths;
    }

    // 3. Buat workbook baru dan tambahkan worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31)); // Batas nama sheet Excel 31 karakter

    // 4. Download file xlsx ke client browser
    const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    XLSX.writeFile(workbook, finalFileName);
    return true;
  } catch (error) {
    console.error('Gagal mengekspor data ke Excel:', error);
    if (typeof window !== 'undefined') {
      alert('Terjadi kesalahan saat memproses ekspor Excel.');
    }
    return false;
  }
}

/**
 * Helper khusus untuk mengekspor Master Data Pengguna ke file Excel (.xlsx)
 */
export function exportUsersToXLSX(
  users: AppUser[],
  userModuleAccess: Record<string, string[]> = {},
  customFileName?: string
): boolean {
  if (!users || users.length === 0) {
    if (typeof window !== 'undefined') {
      alert('Tidak ada data pengguna yang dapat diekspor.');
    }
    return false;
  }

  const formattedData = users.map((u, index) => {
    const modules = userModuleAccess[u.id] || u.allowed_modules || [];
    const moduleStr = Array.isArray(modules) && modules.length > 0 ? modules.join(', ') : 'Belum ditentukan';

    return {
      'No': index + 1,
      'Nama Pengguna': u.name || '-',
      'Email': u.email || '-',
      'Peran (Role)': u.role || 'ADMIN',
      'Entitas / Unit Terkait': u.linked_entity_name || 'Artaroma HQ',
      'Modul yang Dapat Diakses': moduleStr,
      'Status Akun': u.is_active !== false ? 'AKTIF' : 'NONAKTIF',
      'Terakhir Login': u.last_login || 'Belum Pernah Login',
      'Tanggal Dibuat': u.created_at || '-',
    };
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = customFileName || `Master_Data_Pengguna_Artaroma_${timestamp}.xlsx`;

  return exportToXLSX(formattedData, {
    fileName,
    sheetName: 'Pengguna Sistem',
  });
}
