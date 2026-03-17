'use client'

import { useEffect, useState, useCallback } from 'react'
import { type NoteLink, type Note } from '@/lib/supabase'
import { getNoteLinks, getNote, getNotes, addManualLink, removeManualLink, toggleIgnoreLink } from '@/app/actions'

interface LinksPanelProps {
  noteId: string | null
  onSelectNote: (id: string) => void
}

type LinkWithTarget = NoteLink & { targetTitle: string; targetContent: string }

export default function LinksPanel({ noteId, onSelectNote }: LinksPanelProps) {
  const [links, setLinks] = useState<LinkWithTarget[]>([])
  const [allNotes, setAllNotes] = useState<Note[]>([])
  const [selectedNoteToLink, setSelectedNoteToLink] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [explaining, setExplaining] = useState<string | null>(null)

  const fetchLinks = useCallback(async () => {
    if (!noteId) {
      setLinks([])
      return
    }
    setLoading(true)

    const { sourceLinks, targetLinks } = await getNoteLinks(noteId)
    const allLinks: LinkWithTarget[] = []

    if (sourceLinks) {
      sourceLinks.forEach((link: any) => {
        allLinks.push({
          ...link,
          target_id: link.target_id,
          targetTitle: link.target?.title || 'Untitled',
          targetContent: link.target?.content || '',
        })
      })
    }
    if (targetLinks) {
      targetLinks.forEach((link: any) => {
        allLinks.push({
          ...link,
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

  // Fetch all notes for the manual link dropdown
  useEffect(() => {
    async function loadNotes() {
      if (!noteId) return
      setLoadingNotes(true)
      try {
        const notes = await getNotes()
        // Filter out the current note and any already-linked notes
        setAllNotes(notes.filter(n => n.id !== noteId))
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingNotes(false)
      }
    }
    loadNotes()
  }, [noteId, links]) // Reload notes list when links change so we can exclude already linked notes if needed

  useEffect(() => {
    const handleRefresh = (e: CustomEvent) => {
      if (e.detail?.noteId === noteId) fetchLinks()
    }
    window.addEventListener('refresh-links' as any, handleRefresh)
    return () => window.removeEventListener('refresh-links' as any, handleRefresh)
  }, [noteId, fetchLinks])

  const requestExplanation = async (linkId: string, otherNoteId: string, otherTitle: string, otherContent: string) => {
    if (!noteId) return
    setExplaining(linkId)
    try {
      const currentNote = await getNote(noteId)
      if (!currentNote) return
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
      if (res.ok) await fetchLinks()
    } catch (e) {
      console.error(e)
    } finally {
      setExplaining(null)
    }
  }

  const handleAddManualLink = async () => {
    if (!noteId || !selectedNoteToLink) return
    try {
      await addManualLink(noteId, selectedNoteToLink)
      setSelectedNoteToLink('')
      await fetchLinks()
    } catch (e) {
      console.error(e)
    }
  }

  const handleRemoveManualLink = async (linkId: string) => {
    try {
      await removeManualLink(linkId)
      await fetchLinks()
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleIgnore = async (linkId: string, ignore: boolean) => {
    try {
      await toggleIgnoreLink(linkId, ignore)
      await fetchLinks()
    } catch (e) {
      console.error(e)
    }
  }

  if (!noteId) return null

  // Categorize links
  const manualLinks = links.filter(l => l.is_manual)
  const aiLinks = links.filter(l => !l.is_manual && !l.is_ignored)
  const dismissedLinks = links.filter(l => !l.is_manual && l.is_ignored)

  // Filter notes that are already linked from the dropdown
  const linkedTargetIds = new Set(links.map(l => l.target_id))
  const availableNotesToLink = allNotes.filter(n => !linkedTargetIds.has(n.id))

  return (
    <aside className="w-80 shrink-0 border-l border-white/10 flex flex-col h-full bg-[#0d1117]">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Neural Links</h2>
        {loading && <span className="text-xs text-indigo-400">Loading...</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Manual Linking Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Manual Links</h3>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedNoteToLink}
              onChange={(e) => setSelectedNoteToLink(e.target.value)}
              className="flex-1 appearance-none bg-[#161b22] border border-white/10 rounded px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/70 transition-all shadow-sm cursor-pointer hover:border-white/20"
              disabled={loadingNotes || availableNotesToLink.length === 0}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path শাস্ত্র='%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em 1em', paddingRight: '2rem' }}
            >
              <option value="" className="bg-[#161b22] text-gray-400">{availableNotesToLink.length === 0 ? "No notes to link" : "Select a note to link..."}</option>
              {availableNotesToLink.map(n => (
                <option key={n.id} value={n.id} className="bg-[#161b22] text-gray-200">{n.title}</option>
              ))}
            </select>
            <button
              onClick={handleAddManualLink}
              disabled={!selectedNoteToLink}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-500 hover:bg-indigo-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {manualLinks.length === 0 ? (
              <p className="text-xs text-gray-600 italic">No manual links created.</p>
            ) : (
              manualLinks.map(link => (
                <div key={link.id} className="bg-white/5 border border-white/10 rounded p-2.5 text-sm flex items-center justify-between gap-2 group">
                  <button
                    onClick={() => onSelectNote(link.target_id)}
                    className="font-medium text-white hover:text-indigo-300 text-left line-clamp-1 truncate flex-1"
                  >
                    🔗 {link.targetTitle}
                  </button>
                  <button
                    onClick={() => handleRemoveManualLink(link.id)}
                    className="text-gray-500 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove manual link"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* AI recommended Section */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>✨</span> Recommended
          </h3>
          
          <div className="space-y-3">
            {aiLinks.length === 0 ? (
              <p className="text-xs text-gray-600 italic">No AI recommendations yet.</p>
            ) : (
              aiLinks.map(link => (
                <div key={link.id} className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3 text-sm flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => onSelectNote(link.target_id)}
                      className="font-medium text-indigo-300 hover:text-indigo-200 text-left line-clamp-2"
                    >
                      {link.targetTitle}
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        {Math.round(link.score * 100)}%
                      </span>
                      <button
                        onClick={() => handleToggleIgnore(link.id, true)}
                        className="text-gray-500 hover:text-red-400"
                        title="Dismiss recommendation"
                      >
                        ✕
                      </button>
                    </div>
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
        </section>

        {/* Dismissed Section */}
        {dismissedLinks.length > 0 && (
          <section className="space-y-3 pt-4 border-t border-white/5 opacity-60">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dismissed</h3>
            <div className="space-y-2">
              {dismissedLinks.map(link => (
                <div key={link.id} className="bg-black/20 border border-white/5 rounded p-2.5 text-sm flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectNote(link.target_id)}
                    className="text-gray-500 hover:text-gray-300 text-left line-clamp-1 truncate flex-1 text-xs"
                  >
                    {link.targetTitle}
                  </button>
                  <button
                    onClick={() => handleToggleIgnore(link.id, false)}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </aside>
  )
}
