import { createClient } from '@supabase/supabase-js';

// Configuration provided by user
const supabaseUrl = 'https://tmhatoufmjhgvdquiosh.supabase.co';
const supabaseKey = 'sb_publishable_Fk3OtkvZew85yDPcQNS1pA_unmLJoJR';

if (!supabaseUrl || !supabaseKey) {
  console.warn("Missing Supabase credentials.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);