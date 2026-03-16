import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const { userId } = await auth()

  // Already signed in → go straight to notes
  if (userId) redirect('/notes')

  return (
    <main className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center px-4">
      {/* Glow blob */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl">
        {/* Logo */}
        <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-sm">
          <span className="text-lg">🧠</span>
          <span>AI-powered knowledge linking</span>
        </div>

        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
          NeuralNotes
        </h1>
        <p className="text-xl text-gray-400 mb-10 leading-relaxed">
          Write your thoughts. AI discovers the connections.
          <br />
          Your notes, automatically linked into a knowledge graph.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/sign-up"
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors"
          >
            Get started — it&apos;s free
          </Link>
          <Link
            href="/sign-in"
            className="px-8 py-3 border border-white/20 hover:border-white/40 rounded-lg font-semibold text-gray-300 hover:text-white transition-colors"
          >
            Sign in
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-16 flex flex-wrap justify-center gap-3 text-sm text-gray-500">
          {['AI Auto-Linking', 'Confidence Scores', 'Connection Explanations', 'Knowledge Graph', 'Open Source'].map((f) => (
            <span key={f} className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
              {f}
            </span>
          ))}
        </div>
      </div>
    </main>
  )
}
