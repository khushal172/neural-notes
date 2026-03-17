import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { linkId, noteATitle, noteAContent, noteBTitle, noteBContent } = await req.json()
    if (!linkId || !noteATitle || !noteBTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Verify the link exists and implies ownership (simplification: we trust the client for titles/content here, but verify link exists)
    const { data: link, error: linkError } = await supabaseAdmin
      .from('note_links')
      .select('id')
      .eq('id', linkId)
      .single()

    if (linkError || !link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    // 2. Call Gemini Flash API for an explanation
    const prompt = `You are an AI assistant in a note-taking app. Your job is to explain why two notes are semantically linked based on their content. Keep it to 1 concise sentence. Do not use generic phrases like "They both talk about", just state the connection directly.

Note 1: "${noteATitle}"
${noteAContent}

Note 2: "${noteBTitle}"
${noteBContent}

Explanation:`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2, // Keep explanations factual and deterministic
            maxOutputTokens: 400, // Gemini 2.5 uses "thinking" tokens, so we need a higher limit
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const e = await geminiRes.text()
      console.error('Gemini error:', e)
      return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 })
    }

    const data = await geminiRes.json()
    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!explanation) {
      return NextResponse.json({ error: 'No explanation generated' }, { status: 500 })
    }

    // 3. Save the explanation back to the link record
    const { error: updateError } = await supabaseAdmin
      .from('note_links')
      .update({ explanation })
      .eq('id', linkId)

    if (updateError) {
      console.error('Failed to save explanation:', updateError)
      return NextResponse.json({ error: 'Failed to save explanation' }, { status: 500 })
    }

    return NextResponse.json({ explanation })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
