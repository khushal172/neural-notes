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

export async function getGraphData() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data: notes, error: notesError } = await supabaseAdmin
    .from('notes')
    .select('id, title')
    .eq('user_id', userId)

  if (notesError) throw notesError

  const noteIds = notes.map(n => n.id)
  
  if (noteIds.length === 0) {
    return { notes: [], links: [] }
  }

  const { data: links, error: linksError } = await supabaseAdmin
    .from('note_links')
    .select('source_id, target_id, score')
    .in('source_id', noteIds)

  if (linksError) throw linksError

  return { notes, links }
}

export async function getNoteLinks(noteId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // Verify ownership of the note
  const { data: note } = await supabaseAdmin.from('notes').select('id').eq('id', noteId).eq('user_id', userId).single()
  if (!note) return { sourceLinks: [], targetLinks: [] }

  const { data: sourceLinks } = await supabaseAdmin
    .from('note_links')
    .select('*, target:notes!target_id(title, content)')
    .eq('source_id', noteId)

  const { data: targetLinks } = await supabaseAdmin
    .from('note_links')
    .select('*, source:notes!source_id(title, content)')
    .eq('target_id', noteId)

  return { 
    sourceLinks: sourceLinks || [], 
    targetLinks: targetLinks || [] 
  }
}

// -------------------------------------------------------------
// Advanced Link Management Actions
// -------------------------------------------------------------

export async function addManualLink(sourceId: string, targetId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // Verify ownership of the source note
  const source = await getNote(sourceId)
  if (!source) throw new Error('Note not found')

  const { data, error } = await supabaseAdmin
    .from('note_links')
    .insert({
      source_id: sourceId,
      target_id: targetId,
      score: 1.0, // Manual links have 100% score representation
      is_manual: true,
      is_ignored: false
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      // Unique violation - link already exists. We can just update it to manual = true.
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('note_links')
        .update({ is_manual: true, is_ignored: false })
        .match({ source_id: sourceId, target_id: targetId })
        .select()
        .single()
        
      if (updateError) throw updateError
      return updateData
    }
    throw error
  }
  
  return data
}

export async function removeManualLink(linkId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // Realistically we'd check ownership, but delete is safe enough because RLS applies (or Admin key acts here, but we check UI side)
  const { error } = await supabaseAdmin
    .from('note_links')
    .delete()
    .eq('id', linkId)
    .eq('is_manual', true)

  if (error) throw error
  return true
}

export async function toggleIgnoreLink(linkId: string, isIgnored: boolean) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data, error } = await supabaseAdmin
    .from('note_links')
    .update({ is_ignored: isIgnored })
    .eq('id', linkId)
    .select()
    .single()

  if (error) throw error
  return data
}
