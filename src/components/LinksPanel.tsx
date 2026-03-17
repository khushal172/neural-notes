'use client'

import { useEffect, useState, useCallback } from 'react'
import { type NoteLink } from '@/lib/supabase'
import { getNoteLinks, getNote } from '@/app/actions'

interface LinksPanelProps {
  noteId: string | null
  onSelectNote: (id: string) => void
}

type LinkWithTarget = NoteLink & { targetTitle: string; targetContent: string }

export default function LinksPanel({ noteId, onSelectNote }: LinksPanelProps) {
  const [links, setLinks] = useState<LinkWithTarget[]>([])
  const [loading, setLoading] = useState(false)
  const [explaining, setExplaining] = useState<string | null>(null) // noteLinkId currently being explained

  const fetchLinks = useCallback(async () => {
    if (!noteId) {
      setLinks([])
      return
    }
    setLoading(true)

    // Fetch links where this note is either the source or target
    const { sourceLinks, targetLinks } = await getNoteLinks(noteId)

    const allLinks: LinkWithTarget[] = []

    if (sourceLinks) {
      sourceLinks.forEach((link: any) => {
        allLinks.push({
          ...link,
          target_id: link.target_id, // keep original
          targetTitle: link.target?.title || 'Untitled',
          targetContent: link.target?.content || '',
        })
      })
    }

    if (targetLinks) {
      targetLinks.forEach((link: any) => {
        allLinks.push({
          ...link,
          // Swap target_id conceptually so the UI simple links to "the other note"
          target_id: link.source_id,
          targetTitle: link.source?.title || 'Untitled',
          targetContent: link.source?.content || '',
        })
      })
    }

    // Sort combined by score desc
    allLinks.sort((a, b) => b.score - a.score)
    setLinks(allLinks)
    setLoading(false)
  }, [noteId])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  // Expose a global event listener so the Editor can trigger a links refresh after AI is done
  useEffect(() => {
    const handleRefresh = (e: CustomEvent) => {
      if (e.detail?.noteId === noteId) {
        fetchLinks()
      }
    }
    window.addEventListener('refresh-links' as any, handleRefresh)
    return () => window.removeEventListener('refresh-links' as any, handleRefresh)
  }, [noteId, fetchLinks])

  const requestExplanation = async (linkId: string, otherNoteId: string, otherTitle: string, otherContent: string) => {
    // We already have current note ID (noteId). We need its full text too.
    if (!noteId) return
    setExplaining(linkId)

    try {
      // 1. Get current note
      const currentNote = await getNote(noteId)
      if (!currentNote) return

      // 2. Call our AI explanation API
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId,
          noteATitle: currentNote.title,
          noteAContent: currentNote.content,
          noteBTitle: otherTitle,
          noteBContent: otherContent,
        }),
      })
      
      if (res.ok) {
        // Force refresh to get the new explanation from DB
        await fetchLinks()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setExplaining(null)
    }
  }

  if (!noteId) return null

  return (
    <aside className="w-80 shrink-0 border-l border-white/10 flex flex-col h-full bg-[#0d1117]">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Neural Links</h2>
        {loading && <span className="text-xs text-indigo-400">Loading...</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {links.length === 0 && !loading ? (
          <div className="text-center text-gray-500 text-xs mt-8">
            <p className="text-2xl mb-2">🕸️</p>
            <p>No connections found yet.</p>
            <p className="mt-2 opacity-70">Write more notes to discover AI links.</p>
          </div>
        ) : (
          links.map((link) => (
            <div key={link.id} className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => onSelectNote(link.target_id)}
                  className="font-medium text-indigo-300 hover:text-indigo-200 text-left line-clamp-2"
                >
                  {link.targetTitle}
                </button>
                <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  {Math.round(link.score * 100)}%
                </span>
              </div>

              {link.explanation ? (
                <p className="text-xs text-gray-400 italic leading-relaxed bg-black/20 p-2 rounded">
                  {link.explanation}
                </p>
              ) : (
                <button
                  onClick={() => requestExplanation(link.id, link.target_id, link.targetTitle, link.targetContent)}
                  disabled={explaining === link.id}
                  className="text-xs text-gray-500 hover:text-gray-300 text-left underline decoration-dotted underline-offset-2 transition-colors self-start mt-1"
                >
                  {explaining === link.id ? 'Generating explanation...' : 'Ask AI why these are linked'}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
