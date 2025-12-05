import { getDatabase, generateId } from '@/lib/database';
import { Profile } from '@/types/database';
import { ProfileAvatarStorage } from '@/lib/image-storage';

export class ProfileService {
  static async createProfile(profile: Omit<Profile, 'created_at' | 'updated_at' | 'synced_at'>) {
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

    // If updating avatar, delete old one first
    if (updates.avatar_url !== undefined) {
      const currentProfile = await this.getProfile(userId);
      if (currentProfile?.avatar_url && currentProfile.avatar_url !== updates.avatar_url) {
        await ProfileAvatarStorage.deleteImage(currentProfile.avatar_url);
      }
    }

    // Build dynamic query based on what fields are being updated
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

    // Always update the updated_at timestamp
    fieldsToUpdate.push('updated_at = datetime(\'now\')');

    // Add userId at the end for WHERE clause
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
    
    // Delete avatar image before deleting profile
    const profile = await this.getProfile(userId);
    if (profile?.avatar_url) {
      await ProfileAvatarStorage.deleteImage(profile.avatar_url);
    }
    
    await db.runAsync('DELETE FROM profiles WHERE id = ?', [userId]);
  }
}
