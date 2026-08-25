import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { UserRole } from './types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'artaroma_secure_jwt_secret_key_2026_b2b_hub_auth'
);

export const AUTH_COOKIE_NAME = 'artaroma_auth_token';

export interface JWTPayload {
  id: string;
  name: string;
  email: string;
  role?: UserRole | string;
  is_super_admin?: boolean;
  allowed_modules: string[];
  linked_entity_name?: string;
  customer_id?: string;
  [key: string]: any;
}

/**
 * Sign a new JWT token using 'jose' (Compatible with Edge and Node runtime)
 */
export async function signJWT(payload: JWTPayload, expiresIn: string = '7d'): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare password (supports bcrypt hash and plaintext fallback for seamless migrations)
 */
export async function comparePassword(plainPassword: string, storedPasswordHash: string): Promise<boolean> {
  if (!storedPasswordHash || !plainPassword) return false;
  
  // Direct plaintext match check
  if (plainPassword === storedPasswordHash) {
    return true;
  }

  // Bcrypt match check
  try {
    return await bcrypt.compare(plainPassword, storedPasswordHash);
  } catch {
    return false;
  }
}

/**
 * Determine redirect path based on allowed modules or role
 */
export function getRedirectPath(user: { allowed_modules?: string[]; role?: string; is_super_admin?: boolean }): string {
  if (user.is_super_admin) {
    return '/admin';
  }

  const mods = user.allowed_modules || [];

  if (mods.includes('Dashboard')) return '/admin';
  if (mods.includes('Sales Order (SO)')) return '/admin/sales-orders';
  if (mods.includes('Purchase Order (PO)')) return '/admin/procurement';
  if (mods.includes('Lihat Stok (Gudang)')) return '/admin/stock';
  if (mods.includes('Manajemen Kas') || mods.includes('Finance & Invoice')) return '/admin/finance/cash';
  if (mods.includes('Master Data')) return '/admin/master';
  if (mods.includes('Aplikasi Kurir')) return '/courier';
  if (mods.includes('Katalog Customer')) return '/customer/catalog';

  return '/admin';
}

/**
 * Get default home/redirect path based on user role (fallback)
 */
export function getRedirectPathByRole(role: UserRole | string): string {
  switch (role) {
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/admin';
    case 'SALES':
      return '/admin/sales-orders';
    case 'FINANCE':
      return '/admin/sales-orders';
    case 'WAREHOUSE':
      return '/admin/stock';
    case 'COURIER':
      return '/courier';
    case 'CUSTOMER':
      return '/customer/catalog';
    default:
      return '/admin';
  }
}

/**
 * Check if a user has permission to export data to Excel (.xlsx)
 */
export function canUserExportXLSX(user: any): boolean {
  if (!user) return false;
  if (
    user.is_super_admin ||
    user.role === 'SUPER ADMIN' ||
    user.role === 'SUPER_ADMIN' ||
    user.role === 'ADMIN'
  ) {
    return true;
  }
  if (Array.isArray(user.allowed_modules)) {
    return (
      user.allowed_modules.includes('Ekspor Data (XLSX)') ||
      user.allowed_modules.includes('Ekspor XLSX') ||
      user.allowed_modules.includes('Ekspor Excel')
    );
  }
  return false;
}
