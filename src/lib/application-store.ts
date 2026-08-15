const APPLICATION_KEY = 'artaroma_applications_v1';
export const DEFAULT_APPLICATIONS = ['Industry', 'Fine Fragrance'];

export function getApplications(): string[] {
  if (typeof window === 'undefined') return DEFAULT_APPLICATIONS;
  try {
    const stored = localStorage.getItem(APPLICATION_KEY);
    if (!stored) {
      localStorage.setItem(APPLICATION_KEY, JSON.stringify(DEFAULT_APPLICATIONS));
      return DEFAULT_APPLICATIONS;
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_APPLICATIONS;
  } catch {
    return DEFAULT_APPLICATIONS;
  }
}

export function saveApplications(apps: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(APPLICATION_KEY, JSON.stringify(apps));
    window.dispatchEvent(new Event('artaroma_applications_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn('Failed to save applications:', e);
  }
}

export function addApplicationCategory(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return getApplications();
  const current = getApplications();
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    saveApplications(updated);
    return updated;
  }
  return current;
}

export function updateApplicationCategory(oldName: string, newName: string): string[] {
  const trimmed = newName.trim();
  if (!trimmed) return getApplications();
  const current = getApplications();
  const updated = current.map((app) => (app === oldName ? trimmed : app));
  saveApplications(updated);
  return updated;
}

export function deleteApplicationCategory(name: string): string[] {
  const current = getApplications();
  if (current.length <= 1) return current; // Keep at least 1
  const updated = current.filter((app) => app !== name);
  saveApplications(updated);
  return updated;
}
