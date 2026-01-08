/**
 * Shared Permissions Module
 * Role-based access control for Admin and Staff users
 */

import { UserRole, PermissionCheck } from '../types';

export type { UserRole, PermissionCheck };

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
    canDeleteSales: false,
    canEditOldSales: false,
    canGenerateForecasts: false,
    canAccessSettings: false,
    canViewForecasts: true,
    canRecordSales: true,
    canUpdateInventory: false,
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

  // Parse date without timezone issues
  const [year, month, day] = saleDate.split('-').map(Number);
  const saleDateObj = new Date(year, month - 1, day);
  saleDateObj.setHours(0, 0, 0, 0);

  return saleDateObj.getTime() === today.getTime();
};

/**
 * Password hashing utility
 */
export const hashPassword = async (password: string): Promise<string> => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
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
