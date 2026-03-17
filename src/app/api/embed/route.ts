import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { noteId } = await (req.json() as Promise<{ noteId: string }>)
    if (!noteId) return NextResponse.json({ error: 'Missing noteId' }, { status: 400 })

    // 1. Fetch note content
    const { data: note, error: noteError } = await supabaseAdmin
      .from('notes')
      .select('title, content, user_id')
      .eq('id', noteId)
      .single()

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (note.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized note access' }, { status: 403 })
    }

    // 2. Call Gemini API to embed
    const textToEmbed = `Title: ${note.title}\n\nContent: ${note.content}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: {
            parts: [{ text: textToEmbed }],
          },
          outputDimensionality: 768
        }),
      }
    )

    if (!geminiRes.ok) {
      const e = await geminiRes.text()
      console.error('Gemini error:', e)
      return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 })
    }

    const embedData = await geminiRes.json()
    const vector = embedData.embedding.values // number[] (768 dims)

    // 3. Upsert into Supabase (requires admin client because of how we set RLS for server-side operations)
    const { error: upsertError } = await supabaseAdmin.from('embeddings').upsert({
      note_id: noteId,
      vector: vector,
      model: 'gemini-embedding-001',
      updated_at: new Date().toISOString(),
    })

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save embedding' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
