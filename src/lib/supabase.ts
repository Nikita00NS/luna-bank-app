import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lffdzsbqnrjmhdneolrh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZmR6c2JxbnJqbWhkbmVvbHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDQ5NjMsImV4cCI6MjA5NjMyMDk2M30.Sqa-diKgVKhPNEKEZYKNxFfkZIuPM5pXJxAZgddn_dc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
