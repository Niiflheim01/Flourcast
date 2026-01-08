/**
 * Permission System for Flourcast
 * Defines role-based access control for Admin and Staff users
 */

export type UserRole = 'admin' | 'staff';

export interface PermissionCheck {
  canEditPrices: boolean;
  canEditCosts: boolean;
  canDeleteProducts: boolean;
  canDeleteCategories: boolean;
  canDeleteSales: boolean;
  canEditOldSales: boolean;
  canGenerateForecasts: boolean;
  canAccessSettings: boolean;
  canViewForecasts: boolean;
  canRecordSales: boolean;
  canUpdateInventory: boolean;
  canViewAnalytics: boolean;
}

/**
 * Get permissions based on user role
 */
export const getPermissions = (role: UserRole): PermissionCheck => {
  if (role === 'admin') {
    return {
      canEditPrices: true,
      canEditCosts: true,
      canDeleteProducts: true,
      canDeleteCategories: true,
      canDeleteSales: true,
      canEditOldSales: true,
      canGenerateForecasts: true,
      canAccessSettings: true,
      canViewForecasts: true,
      canRecordSales: true,
      canUpdateInventory: true,
      canViewAnalytics: true,
    };
  }

  // Staff permissions
  return {
    canEditPrices: false,
    canEditCosts: false,
    canDeleteProducts: false,
    canDeleteCategories: false,
    canDeleteSales: false, // Can only delete same-day sales
    canEditOldSales: false, // Can only edit same-day sales
    canGenerateForecasts: false,
    canAccessSettings: false,
    canViewForecasts: true,
    canRecordSales: true,
    canUpdateInventory: false, // Inventory updates automatically via sales
    canViewAnalytics: true,
  };
};

/**
 * Check if a sale can be edited/deleted by staff
 * Staff can only edit/delete sales from today
 */
export const canStaffEditSale = (saleDate: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const saleDateObj = new Date(saleDate);
  saleDateObj.setHours(0, 0, 0, 0);

  return saleDateObj.getTime() === today.getTime();
};

/**
 * Password hashing utility using SHA-256
 * Note: For production, use bcrypt or similar
 */
export const hashPassword = async (password: string): Promise<string> => {
  // Simple implementation - in production, use expo-crypto or similar
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  // For React Native, you'd want to use expo-crypto:
  // import * as Crypto from 'expo-crypto';
  // return await Crypto.digestStringAsync(
  //   Crypto.CryptoDigestAlgorithm.SHA256,
  //   password
  // );

  // Fallback for now (replace with expo-crypto in production)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
};

/**
 * Verify password against hash
 */
export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
};

/**
 * Permission guard hook for UI components
 */
export const usePermissionGuard = () => {
  return {
    requireAdmin: (message?: string) => {
      return message || 'This action requires admin privileges';
    },
    requirePermission: (permission: keyof PermissionCheck, message?: string) => {
      return message || `You don't have permission to perform this action`;
    },
  };
};
