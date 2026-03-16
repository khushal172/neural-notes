# NeuralNotes 🧠

> An open-source, AI-powered note-taking app that automatically discovers and explains connections between your notes.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-purple)](https://clerk.com)

## What is NeuralNotes?

NeuralNotes is a minimalist note-taking app inspired by Obsidian's linked knowledge graph — but with a key difference: **you don't have to link notes manually**. Write your thoughts, and AI finds the connections for you.

When you save a note, NeuralNotes:
1. Generates a semantic **embedding** of your note using the Gemini API
2. Compares it against all your other notes using **cosine similarity**
3. Creates links between related notes with a **confidence score** (0–100%)
4. Generates a plain-English **explanation** of why two notes are connected
5. Visualizes your entire note vault as an interactive **knowledge graph**

## Features

- ✍️ **Minimalist markdown editor** — just write, no friction
- 🔗 **AI auto-linking** — connections discovered automatically
- 📊 **Confidence scores** — see how strongly notes are related
- 💬 **Connection explanations** — understand *why* notes are linked
- 🕸️ **Knowledge graph** — visualize your second brain
- 🔐 **Authentication** — Google/GitHub login, access from any device
- ☁️ **Cloud sync** — notes stored in PostgreSQL, synced everywhere

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Clerk |
| Database | Supabase (PostgreSQL + pgvector) |
| AI | Google Gemini API |
| Deployment | Vercel |

## Getting Started

### Prerequisites
- Node.js 18+
- Accounts on: [Supabase](https://supabase.com), [Clerk](https://clerk.com), [Google AI Studio](https://aistudio.google.com)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/neural-notes.git
cd neural-notes
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env.local
```
Fill in your keys — see `.env.example` for details on where to get each one.

### 3. Set up Supabase database
Run the SQL in `supabase/schema.sql` in your Supabase SQL editor.

### 4. Run the app
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── notes/          # Main notes interface
│   ├── sign-in/        # Clerk auth pages
│   ├── sign-up/
│   └── api/
│       ├── embed/      # Gemini embedding endpoint
│       ├── link/       # Auto-linking engine
│       └── explain/    # Connection explanation endpoint
├── components/
│   ├── Sidebar.tsx
│   ├── Editor.tsx
│   ├── LinksPanel.tsx
│   └── GraphView.tsx
└── lib/
    ├── supabase.ts
    └── vectors.ts
```

## License

MIT — see [LICENSE](LICENSE)
