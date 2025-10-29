import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iskyywveqgzphvkblgta.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlza3l5d3ZlcWd6cGh2a2JsZ3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjMxMDcsImV4cCI6MjA3NzEzOTEwN30.Iub_hMTQB8YbHQVnD1IT-a--7utz-RPc9Lj9UGP1O3Q'
export const supabase = createClient(supabaseUrl, supabaseKey)