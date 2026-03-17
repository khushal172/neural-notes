import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser-side client (uses anon key, respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export type Note = {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export type Embedding = {
  note_id: string
  vector: number[]
  model: string
  updated_at: string
}

export type NoteLink = {
  id: string
  source_id: string
  target_id: string
  score: number
  explanation: string | null
  created_at: string
  is_manual: boolean
  is_ignored: boolean
}
