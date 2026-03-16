'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase, type Note } from '@/lib/supabase'

interface EditorProps {
  noteId: string | null
  onNoteUpdate: (note: Note) => void
  onNoteDelete: (id: string) => void
  onTriggerLink: (noteId: string) => void
}

export default function Editor({ noteId, onNoteUpdate, onNoteDelete, onTriggerLink }: EditorProps) {
  const [note, setNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const linkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load note when noteId changes
  useEffect(() => {
    if (!noteId) {
      setNote(null)
      setTitle('')
      setContent('')
      return
    }
    const load = async () => {
      const { data } = await supabase.from('notes').select('*').eq('id', noteId).single()
      if (data) {
        setNote(data as Note)
        setTitle(data.title)
        setContent(data.content)
      }
    }
    load()
  }, [noteId])

  const saveNote = useCallback(
    async (newTitle: string, newContent: string) => {
      if (!noteId) return
      setSaving(true)
      const { data, error } = await supabase
        .from('notes')
        .update({ title: newTitle, content: newContent })
        .eq('id', noteId)
        .select()
        .single()
      setSaving(false)
      if (!error && data) {
        setNote(data as Note)
        onNoteUpdate(data as Note)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    },
    [noteId, onNoteUpdate]
  )

  // Debounced auto-save (1.5s after last keystroke)
  const handleChange = (newTitle: string, newContent: string) => {
    if (newTitle !== title) setTitle(newTitle)
    if (newContent !== content) setContent(newContent)

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveNote(newTitle, newContent)
    }, 1500)

    // Trigger AI linking 3s after last keystroke (debounced separately)
    if (linkTimer.current) clearTimeout(linkTimer.current)
    linkTimer.current = setTimeout(() => {
      if (noteId) onTriggerLink(noteId)
    }, 3000)
  }

  const handleDelete = async () => {
    if (!noteId || !confirm('Delete this note? This cannot be undone.')) return
    await supabase.from('notes').delete().eq('id', noteId)
    onNoteDelete(noteId)
  }

  if (!noteId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-700">
        <div className="text-center">
          <p className="text-4xl mb-3">🧠</p>
          <p className="text-sm">Select a note or create a new one</p>
        </div>
      </div>
    )
  }

  if (!note) {
    return <div className="flex-1 flex items-center justify-center text-gray-700 text-sm">Loading...</div>
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          {saving ? (
            <span className="text-indigo-400">Saving...</span>
          ) : saved ? (
            <span className="text-green-500">✓ Saved</span>
          ) : (
            <span>Last updated {new Date(note.updated_at).toLocaleTimeString()}</span>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
        >
          Delete note
        </button>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        placeholder="Note title..."
        onChange={(e) => handleChange(e.target.value, content)}
        className="px-6 pt-6 pb-2 text-2xl font-bold text-white bg-transparent placeholder-gray-700 focus:outline-none w-full"
      />

      {/* Content */}
      <textarea
        value={content}
        placeholder="Start writing..."
        onChange={(e) => handleChange(title, e.target.value)}
        className="flex-1 px-6 pb-6 text-[15px] leading-relaxed text-gray-300 bg-transparent placeholder-gray-700 focus:outline-none resize-none w-full"
      />
    </div>
  )
}
