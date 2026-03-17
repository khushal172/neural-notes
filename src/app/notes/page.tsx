'use client'

import { useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import Sidebar from '@/components/Sidebar'
import Editor from '@/components/Editor'
import LinksPanel from '@/components/LinksPanel'
import GraphView from '@/components/GraphView'

export default function NotesPage() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [isLinking, setIsLinking] = useState(false)
  const [showGraph, setShowGraph] = useState(false)

  // Triggered by Editor after 3s of inactivity
  const handleTriggerLink = async (noteId: string) => {
    setIsLinking(true)
    try {
      // 1. Generate/update embedding for this note
      const embedRes = await fetch('/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      })
      if (!embedRes.ok) throw new Error('Failed to embed')

      // 2. Discover new links based on the new embedding
      const linkRes = await fetch('/api/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      })
      if (!linkRes.ok) throw new Error('Failed to link')

      // 3. Tell LinksPanel to refresh
      window.dispatchEvent(new CustomEvent('refresh-links', { detail: { noteId } }))
    } catch (e) {
      console.error('AI Linking error:', e)
    } finally {
      setIsLinking(false)
    }
  }

  return (
    <main className="h-screen w-full flex bg-[#06080c] overflow-hidden text-white">
      {/* 1. Sidebar - Left Panel */}
      <Sidebar
        selectedNoteId={selectedNoteId}
        onSelectNote={setSelectedNoteId}
        onNewNote={(n) => setSelectedNoteId(n.id)}
      />

      {/* 2. Main Editor - Center Panel */}
      <div className="flex-1 flex flex-col relative bg-[#0a0e14]">


        <Editor
          noteId={selectedNoteId}
          onNoteUpdate={() => {}} // Sidebar auto-updates via query/realtime if we want, but local state works for now since Sidebar refetches on mount
          onNoteDelete={() => setSelectedNoteId(null)}
          onTriggerLink={handleTriggerLink}
          isLinking={isLinking}
          onShowGraph={() => setShowGraph(true)}
        />
      </div>

      {/* 3. Neural Links - Right Panel */}
      <LinksPanel noteId={selectedNoteId} onSelectNote={setSelectedNoteId} />

      {/* 4. Fullscreen Graph View Overlay */}
      {showGraph && (
        <GraphView
          onSelectNote={(id) => {
            setSelectedNoteId(id)
            setShowGraph(false)
          }}
          onClose={() => setShowGraph(false)}
        />
      )}
    </main>
  )
}
