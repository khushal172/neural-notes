'use client'

import { useEffect, useRef, useState } from 'react'
import { Network } from 'vis-network'
import { supabase, type Note, type NoteLink } from '@/lib/supabase'

interface GraphViewProps {
  onSelectNote: (noteId: string) => void
  onClose: () => void
}

export default function GraphView({ onSelectNote, onClose }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<Network | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadGraph = async () => {
      // 1. Fetch all notes for nodes
      const { data: notes } = await supabase.from('notes').select('id, title')
      if (!notes) return

      // 2. Fetch all links for edges
      const { data: links } = await supabase.from('note_links').select('source_id, target_id, score')
      if (!links) return

      if (!active || !containerRef.current) return

      // Format data for vis-network
      const nodes = notes.map((n) => ({
        id: n.id,
        label: n.title || 'Untitled',
        title: n.title, // Hover tooltip
        shape: 'dot',
        size: 15,
        color: {
          background: '#4f46e5', // indigo-600
          border: '#818cf8', // indigo-400
          highlight: { background: '#6366f1', border: '#a5b4fc' },
          hover: { background: '#6366f1', border: '#a5b4fc' },
        },
        font: { color: '#d1d5db', size: 12 },
      }))

      const edges = links.map((l) => ({
        from: l.source_id,
        to: l.target_id,
        value: l.score, // Thickness based on confidence score
        color: { color: 'rgba(255,255,255,0.1)', highlight: 'rgba(99,102,241,0.5)' },
        smooth: { enabled: true, type: 'continuous', roundness: 0.5 },
      }))

      // Filter out notes with no edges to keep the graph clean (optional, but good for large vaults)
      // const connectedNodeIds = new Set(edges.flatMap(e => [e.from, e.to]))
      // const connectedNodes = nodes.filter(n => connectedNodeIds.has(n.id))

      const data = { nodes, edges }

      const options = {
        interaction: { hover: true, tooltipDelay: 200 },
        physics: {
          forceAtlas2Based: { gravitationalConstant: -50, centralGravity: 0.01, springLength: 100, springConstant: 0.08 },
          maxVelocity: 50,
          solver: 'forceAtlas2Based',
          timestep: 0.35,
          stabilization: { iterations: 150 },
        },
        edges: { width: 1, selectionWidth: 2 },
      }

      networkRef.current = new Network(containerRef.current, data, options)

      // Handle node click
      networkRef.current.on('click', (params) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0]
          onSelectNote(nodeId as string)
          onClose() // Close graph view after selecting a node
        }
      })

      setLoading(false)
    }

    loadGraph()

    return () => {
      active = false
      if (networkRef.current) {
        networkRef.current.destroy()
        networkRef.current = null
      }
    }
  }, [onSelectNote, onClose])

  return (
    <div className="fixed inset-0 z-50 bg-[#06080c]/90 backdrop-blur flex flex-col items-center justify-center p-8">
      <div className="absolute top-6 right-6 flex items-center gap-4">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Close graph view"
        >
          ✕
        </button>
      </div>

      <div className="w-full max-w-6xl h-full max-h-[80vh] bg-black/50 border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-indigo-400 animate-pulse">
            Analyzing specific gravity of thought nodes...
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>

      <div className="mt-4 text-center text-sm text-gray-500">
        <p>Your Second Brain 🧠</p>
        <p className="text-xs mt-1">Drag nodes to rearrange, scroll to zoom, click to open.</p>
      </div>
    </div>
  )
}
