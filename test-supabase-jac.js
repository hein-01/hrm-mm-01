require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase.from('job_activity_changes').select('*').order('createdAt', { ascending: false }).limit(2);
    console.log("job_activity_changes (createdAt):", { error, data });
    
    if (error) {
        const { data: data2, error: error2 } = await supabase.from('job_activity_changes').select('*').order('created_at', { ascending: false }).limit(2);
        console.log("job_activity_changes (created_at):", { error: error2, data: data2 });
    }
}
run();
