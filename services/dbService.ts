import { supabase } from './supabaseClient';
import { Candidate } from '../types';

// Flag to prevent spamming errors if the table doesn't exist
let isOfflineMode = false;

export const dbService = {
  /**
   * Resets offline mode and attempts to fetch candidates to verify connection.
   */
  async retryConnection(): Promise<boolean> {
    isOfflineMode = false; // Reset flag to try again
    const { error } = await this.getAllCandidates();
    // If we get data or a normal empty list, we are connected.
    // If we get 'missing_table', we are still offline.
    return error !== 'missing_table';
  },

  /**
   * Fetches all candidates from the database.
   * Returns data and potential error state.
   */
  async getAllCandidates(): Promise<{ data: Candidate[]; error: string | null }> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      // Handle missing table specifically
      if (error.code === 'PGRST205' || error.code === '42P01') {
        isOfflineMode = true;
        console.warn('Supabase table missing. Application running in local mode.');
        return { data: [], error: 'missing_table' };
      }
      
      console.error('Supabase Error (getAllCandidates):', JSON.stringify(error, null, 2));
      return { data: [], error: error.message };
    }

    if (!data) return { data: [], error: null };

    const mappedData = data.map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      status: (row.status as Candidate['status']) || 'pending',
      originalRow: row.original_row || {}
    }));

    return { data: mappedData, error: null };
  },

  /**
   * Adds new candidates to the database.
   */
  async addCandidates(candidates: Candidate[]) {
    if (isOfflineMode || candidates.length === 0) return;

    const rows = candidates.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      status: c.status,
      original_row: c.originalRow
    }));

    const { error } = await supabase
      .from('candidates')
      .upsert(rows);

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
          isOfflineMode = true;
          return;
      }
      console.error('Supabase Error (addCandidates):', JSON.stringify(error, null, 2));
    }
  },

  /**
   * Updates the status of a specific candidate.
   */
  async updateStatus(id: string, status: Candidate['status']) {
    if (isOfflineMode) return;

    const { error } = await supabase
      .from('candidates')
      .update({ status })
      .eq('id', id);

    if (error) {
       if (error.code === 'PGRST205' || error.code === '42P01') {
          isOfflineMode = true;
          return;
       }
      console.error('Supabase Error (updateStatus):', JSON.stringify(error, null, 2));
    }
  },

  /**
   * Clears all candidates from the database (used for Start Over).
   */
  async clearCandidates() {
    if (isOfflineMode) return;

    const { error } = await supabase
      .from('candidates')
      .delete()
      .neq('id', 'placeholder'); // Deletes all rows

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
          isOfflineMode = true;
          return;
      }
      console.error('Supabase Error (clearCandidates):', JSON.stringify(error, null, 2));
    }
  }
};