'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, type Note } from '@/lib/supabase'
import { useUser } from '@clerk/nextjs'

interface SidebarProps {
  selectedNoteId: string | null
  onSelectNote: (id: string) => void
  onNewNote: (note: Note) => void
}

export default function Sidebar({ selectedNoteId, onSelectNote, onNewNote }: SidebarProps) {
  const { user } = useUser()
  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchNotes = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('notes')
      .select('id, title, content, created_at, updated_at, user_id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    if (data) setNotes(data as Note[])
  }, [user])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const handleNewNote = async () => {
    if (!user || creating) return
    setCreating(true)
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, title: 'Untitled', content: '' })
      .select()
      .single()
    setCreating(false)
    if (!error && data) {
      setNotes((prev) => [data as Note, ...prev])
      onNewNote(data as Note)
    }
  }

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <aside className="w-64 shrink-0 border-r border-white/10 flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-sm font-semibold text-white flex items-center gap-1.5">
            🧠 <span>NeuralNotes</span>
          </h1>
          <button
            onClick={handleNewNote}
            disabled={creating}
            title="New note"
            className="w-7 h-7 flex items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-lg leading-none transition-colors disabled:opacity-50"
          >
            +
          </button>
        </div>
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
        />
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-4 text-xs text-gray-600 text-center mt-4">
            {notes.length === 0 ? 'No notes yet. Hit + to create one!' : 'No results.'}
          </p>
        ) : (
          filtered.map((note) => (
            <button
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors group ${
                selectedNoteId === note.id ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : ''
              }`}
            >
              <p className={`text-sm font-medium truncate ${selectedNoteId === note.id ? 'text-indigo-300' : 'text-gray-200'}`}>
                {note.title || 'Untitled'}
              </p>
              <p className="text-xs text-gray-600 truncate mt-0.5">
                {note.content?.slice(0, 60) || 'Empty note'}
              </p>
              <p className="text-xs text-gray-700 mt-0.5">
                {new Date(note.updated_at).toLocaleDateString()}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Footer: note count */}
      <div className="p-3 border-t border-white/5 text-xs text-gray-700 text-center">
        {notes.length} {notes.length === 1 ? 'note' : 'notes'}
      </div>
    </aside>
  )
}
