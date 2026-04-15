// src/lib/supabaseClient.ts
// Skeleton Supabase setup for future-proofing database queries.
// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'skeleton-anon-key';

// export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * MOCK ASYNC UTILITY
 * Usage: Await this helper inside context functions to mimic network latency.
 * Once real Supabase queries are written, this wrapper can be safely deleted.
 */
export const executeAsyncMock = async <T>(mockData: T, latencyMs: number = 600): Promise<T> => {
    return new Promise((resolve) => setTimeout(() => resolve(mockData), latencyMs));
};
