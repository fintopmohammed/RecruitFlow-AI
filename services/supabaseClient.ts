import { createClient } from '@supabase/supabase-js';

// Credentials provided by the user
const supabaseUrl = 'https://nfpkwxkntgbpcxgayqjh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcGt3eGtudGdicGN4Z2F5cWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMTc2NzgsImV4cCI6MjA4MDY5MzY3OH0.fx-urfzMarBJ6icPHTu1apGl7Sae0TJPv5Y3TcmFMTk';

export const supabase = createClient(supabaseUrl, supabaseKey);