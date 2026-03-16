'use server'

import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Note } from '@/lib/supabase'

export async function getNotes() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data, error } = await supabaseAdmin
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as Note[]
}

export async function getNote(id: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data, error } = await supabaseAdmin
    .from('notes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  if (data.user_id !== userId) throw new Error('Unauthorized')
  return data as Note
}

export async function createNote() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data, error } = await supabaseAdmin
    .from('notes')
    .insert({ user_id: userId, title: 'Untitled', content: '' })
    .select()
    .single()

  if (error) throw error
  return data as Note
}

export async function updateNote(id: string, title: string, content: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // Verify ownership
  const existing = await getNote(id)
  if (!existing) throw new Error('Note not found')

  const { data, error } = await supabaseAdmin
    .from('notes')
    .update({ title, content })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Note
}

export async function deleteNote(id: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // Verify ownership
  const existing = await getNote(id)
  if (!existing) throw new Error('Note not found')

  const { error } = await supabaseAdmin.from('notes').delete().eq('id', id)
  if (error) throw error
  return true
}
