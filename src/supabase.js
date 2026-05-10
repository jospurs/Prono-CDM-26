import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://abvnmxtzyiletjjymfhj.supabase.co'   // ← colle ta Project URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidm5teHR6eWlsZXRqanltZmhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjc0MTksImV4cCI6MjA5Mzg0MzQxOX0.MvXmTDvI9gJICwVTbmZrnsirGFT96iwpe32KbckXou4'                 // ← colle ta anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
