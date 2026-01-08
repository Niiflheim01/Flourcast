/**
 * Shared Module
 * Core utilities, types, and database access used across all features
 */

// Types
export * from './types';

// Database
export { getDatabase, initDatabase, resetDatabase, generateId } from './database';

// Utilities
export * from './utils';

// Permissions
export * from './permissions';
