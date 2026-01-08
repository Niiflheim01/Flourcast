/**
 * Profile Service
 * Handles local SQLite profile storage and management
 */

import { getDatabase, generateId } from '@/features/shared/database';
import { Profile } from '@/features/shared/types';

export class ProfileService {
  static async createProfile(profile: Pick<Profile, 'id' | 'bakery_name' | 'email' | 'currency' | 'timezone' | 'avatar_url'>) {
    const db = await getDatabase();

    const query = `
      INSERT INTO profiles (id, bakery_name, email, currency, timezone, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await db.runAsync(query, [
      profile.id,
      profile.bakery_name,
      profile.email,
      profile.currency || 'PHP',
      profile.timezone || 'Asia/Manila',
      profile.avatar_url || null
    ]);

    return this.getProfile(profile.id);
  }

  static async getProfile(userId: string): Promise<Profile | null> {
    const db = await getDatabase();

    const query = 'SELECT * FROM profiles WHERE id = ? LIMIT 1';
    const result = await db.getFirstAsync<Profile>(query, [userId]);

    return result || null;
  }

  static async updateProfile(userId: string, updates: Partial<Profile>) {
    const db = await getDatabase();

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];

    if (updates.bakery_name !== undefined) {
      fieldsToUpdate.push('bakery_name = ?');
      values.push(updates.bakery_name);
    }
    if (updates.currency !== undefined) {
      fieldsToUpdate.push('currency = ?');
      values.push(updates.currency);
    }
    if (updates.timezone !== undefined) {
      fieldsToUpdate.push('timezone = ?');
      values.push(updates.timezone);
    }
    if (updates.avatar_url !== undefined) {
      fieldsToUpdate.push('avatar_url = ?');
      values.push(updates.avatar_url);
    }
    if (updates.admin_mode !== undefined) {
      fieldsToUpdate.push('admin_mode = ?');
      values.push(updates.admin_mode ? 1 : 0);
    }
    if (updates.role !== undefined) {
      fieldsToUpdate.push('role = ?');
      values.push(updates.role);
    }
    if (updates.current_role !== undefined) {
      fieldsToUpdate.push('current_role = ?');
      values.push(updates.current_role);
    }
    if (updates.admin_password_hash !== undefined) {
      fieldsToUpdate.push('admin_password_hash = ?');
      values.push(updates.admin_password_hash);
    }
    if (updates.recovery_email !== undefined) {
      fieldsToUpdate.push('recovery_email = ?');
      values.push(updates.recovery_email);
    }
    if (updates.admin_setup_completed !== undefined) {
      fieldsToUpdate.push('admin_setup_completed = ?');
      values.push(updates.admin_setup_completed ? 1 : 0);
    }

    fieldsToUpdate.push('updated_at = datetime(\'now\')');
    values.push(userId);

    const query = `
      UPDATE profiles
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = ?
    `;

    await db.runAsync(query, values);

    return this.getProfile(userId);
  }

  static async deleteProfile(userId: string) {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM profiles WHERE id = ?', [userId]);
  }
}
