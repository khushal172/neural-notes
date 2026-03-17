'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { type Note } from '@/lib/supabase'
import { getNote, updateNote, deleteNote } from '@/app/actions'
import { UserButton } from '@clerk/nextjs'
import dynamic from 'next/dynamic'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

interface EditorProps {
  noteId: string | null
  onNoteUpdate: (note: Note) => void
  onNoteDelete: (id: string) => void
  onTriggerLink: (noteId: string) => void
  isLinking?: boolean
  onShowGraph?: () => void
}

export default function Editor({ noteId, onNoteUpdate, onNoteDelete, onTriggerLink, isLinking, onShowGraph }: EditorProps) {
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
      try {
        const data = await getNote(noteId)
        if (data) {
          setNote(data)
          setTitle(data.title)
          setContent(data.content)
        }
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [noteId])

  const saveNote = useCallback(
    async (newTitle: string, newContent: string) => {
      if (!noteId) return
      setSaving(true)
      try {
        const data = await updateNote(noteId, newTitle, newContent)
        if (data) {
          setNote(data)
          onNoteUpdate(data)
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setSaving(false)
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
    try {
      await deleteNote(noteId)
      onNoteDelete(noteId)
    } catch (e) {
      console.error(e)
    }
  }

  if (!noteId) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Toolbar for empty state */}
        <div className="flex items-center justify-end px-6 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            {onShowGraph && (
              <button
                onClick={onShowGraph}
                className="px-3 py-1 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 rounded-full hover:bg-indigo-500/20 transition-colors flex items-center gap-1.5"
                title="Open Graph View"
              >
                <span>🕸️</span> Graph
              </button>
            )}
            <UserButton
              appearance={{
                elements: { userButtonAvatarBox: 'w-7 h-7 ml-1' }
              }}
            />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-700">
          <div className="text-center">
            <p className="text-4xl mb-3">🧠</p>
            <p className="text-sm">Select a note or create a new one</p>
          </div>
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
        <div className="flex items-center gap-3">
          {isLinking && (
            <span className="text-xs text-indigo-400 animate-pulse bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/20">
              AI Analyzing...
            </span>
          )}
          {onShowGraph && (
            <button
              onClick={onShowGraph}
              className="px-3 py-1 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 rounded-full hover:bg-indigo-500/20 transition-colors flex items-center gap-1.5"
              title="Open Graph View"
            >
              <span>🕸️</span> Graph
            </button>
          )}
          <button
            onClick={handleDelete}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
          >
            Delete
          </button>
          <UserButton
            appearance={{
              elements: { userButtonAvatarBox: 'w-7 h-7 ml-1' }
            }}
          />
        </div>
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
      <div className="flex-1 overflow-hidden relative custom-md-editor pb-4" data-color-mode="dark">
        <MDEditor
          value={content}
          onChange={(val) => handleChange(title, val || '')}
          height="100%"
          className="h-full border-none !bg-transparent"
          preview="live"
          hideToolbar={false}
          visibleDragbar={false}
          textareaProps={{
            placeholder: 'Start writing markdown...'
          }}
        />
      </div>
    </div>
  )
}
