import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { findTopSimilar } from '@/lib/vectors'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { noteId } = await req.json()
    if (!noteId) return NextResponse.json({ error: 'Missing noteId' }, { status: 400 })

    // 1. Get the target note's embedding
    const { data: targetEmbedding, error: targetError } = await supabaseAdmin
      .from('embeddings')
      .select('vector')
      .eq('note_id', noteId)
      .single()

    if (targetError || !targetEmbedding) {
      return NextResponse.json({ error: 'Target embedding not found' }, { status: 404 })
    }

    // 2. Get ALL notes for this user (to ensure we only compare against their own notes)
    // We only need the note IDs.
    const { data: userNotes, error: notesError } = await supabaseAdmin
      .from('notes')
      .select('id')
      .eq('user_id', userId)
      .neq('id', noteId) // exclude self

    if (notesError || !userNotes || userNotes.length === 0) {
      return NextResponse.json({ links: [] }) // Nothing to link to
    }

    const noteIds = userNotes.map((n) => n.id)

    // 3. Get embeddings for those notes
    const { data: candidateEmbeddings, error: candidatesError } = await supabaseAdmin
      .from('embeddings')
      .select('note_id, vector')
      .in('note_id', noteIds)

    if (candidatesError || !candidateEmbeddings || candidateEmbeddings.length === 0) {
      return NextResponse.json({ links: [] })
    }

    // Format for findTopSimilar
    const candidates = candidateEmbeddings.map((c) => ({
      id: c.note_id,
      vector: JSON.parse(c.vector as unknown as string), // pgvector returns string array like "[0.1, 0.2, ...]" via JS client sometimes, or actual array. Handle string cast:
    })).map(c => ({
      id: c.id,
      vector: typeof c.vector === 'string' ? JSON.parse(c.vector) : c.vector
    }))

    const targetVector = typeof targetEmbedding.vector === 'string' 
      ? JSON.parse(targetEmbedding.vector) 
      : targetEmbedding.vector

    // 4. Calculate similarity locally (faster than repeatedly doing pgvector similarity search across tiny vaults, though pgvector could do this directly in SQL)
    const threshold = 0.60 // Minimum confidence score lowered to ensure semantic connections happen more frequently
    const topMatches = findTopSimilar(targetVector, candidates, threshold, 5)

    if (topMatches.length === 0) {
      return NextResponse.json({ links: [] })
    }

    // 5. Upsert the links into note_links
    const linksToInsert = topMatches.map((match) => ({
      source_id: noteId,
      target_id: match.id,
      score: match.score,
    }))

    // We do an upsert so if a link already exists, we just update the score and keep any existing explanation
    const { error: insertError } = await supabaseAdmin
      .from('note_links')
      .upsert(linksToInsert, { onConflict: 'source_id,target_id' })

    if (insertError) {
      console.error('Failed to insert links:', insertError)
      return NextResponse.json({ error: 'Failed to save links' }, { status: 500 })
    }

    return NextResponse.json({ links: topMatches })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
