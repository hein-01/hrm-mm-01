import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ibkqyfkixncigvvqslkd.supabase.co';
const supabaseKey = 'sb_publishable_zqbbyTySAkcAqssY5FJGrg_GusNWjDW';

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});
