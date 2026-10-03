# TKI

A Tetris knowledge and community platform built with Next.js and Supabase. Features a study system for sharing Tetris strategies, a puzzle hub with Perfect Clear challenges, and community tools for discussing and improving at the game.

## Features

- **Study System** — Create and share multi-chapter Tetris studies with interactive board states, chapter commentary, and tip blocks. Vote on community studies, save favorites, and browse by topic (Openings, Perfect Clear, Combos, Multiplayer, and more).
- **Puzzle Hub** — Curated Perfect Clear puzzles by difficulty (Easy / Medium / Hard) with a rotating Daily Puzzle. Includes a community puzzle submission and review pipeline, a puzzle editor, and per-user solve tracking.
- **User Accounts** — Email/password auth via Supabase. Profile with customizable username, avatar (tetromino presets or uploaded photo), and banner. Settings tab for password changes. Public profile pages at `/u/[id]`.
- **Content Moderation** — Anonymous study submissions go to a pending queue; signed-in users publish immediately. Community puzzles go through an approval flow accessible via a secret review token URL.

## Routes

| Route | Description |
|---|---|
| `/` | Home — Daily Puzzle hero + topic browse + recent studies |
| `/study` | Study listing — browse, search, filter by topic, favorites, my studies |
| `/study/new` | Create a new study |
| `/study/[id]` | Read a study |
| `/study/[id]/edit` | Edit your study |
| `/study/what-are-studies` | Explainer page for new users |
| `/puzzle` | Puzzle hub — curated puzzles by difficulty |
| `/puzzle/[id]` | Play a puzzle |
| `/puzzle/community` | Community-submitted puzzles |
| `/puzzle/editor` | Puzzle editor / submission form |
| `/puzzle/review/[token]` | Admin puzzle review queue (token-gated) |
| `/profile` | Your profile (auth required) |
| `/profile/settings` | Account settings — username, password, avatar, banner |
| `/profile/studies` | Your published and draft studies |
| `/profile/puzzles` | Your puzzle solve history |
| `/u/[id]` | Public user profile |
| `/login` | Sign in (includes inline forgot-password flow) |
| `/register` | Create an account |
| `/reset-password` | Set a new password (landed from email reset link) |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Backend / Auth / DB**: Supabase (Postgres + RLS + Auth)
- **Email**: Custom SMTP via Brevo (configured in Supabase Auth settings)
- **Styling**: Inline styles with CSS custom property tokens (`--tt-*`)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a new project, then grab your **Project URL** and **anon/public key** from **Settings → API**.

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
PUZZLE_REVIEW_TOKEN=your-secret-token   # any random string, e.g. openssl rand -hex 12
```

### 4. Run the database migrations

In the Supabase SQL editor, run each of these files in order:

1. `supabase-profiles.sql` — user profiles table and RLS
2. `supabase-puzzles.sql` — puzzle submissions and votes
3. `supabase-study.sql` — study posts and votes

### 5. Configure email (optional but recommended)

In Supabase **Auth → SMTP Settings**, enable custom SMTP and point it at your provider (Brevo, Gmail, etc.) so confirmation and password-reset emails look branded. Update the email templates under **Auth → Email Templates** to match your design.

### 6. Run the dev server

```bash
npm run dev
```

The app runs on [http://localhost:3000](http://localhost:3000) by default.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key (safe to expose client-side) |
| `PUZZLE_REVIEW_TOKEN` | Yes | Secret token for the `/puzzle/review/[token]` admin route |

## Project Structure

```
app/                   Next.js App Router pages
  study/               Study routes (listing, create, read, edit)
  puzzle/              Puzzle routes (hub, play, editor, community, review)
  profile/             Profile hub (settings, studies, puzzles)
  u/[id]/              Public user profiles
  login/               Sign-in page
  register/            Sign-up page
  reset-password/      Password reset landing
components/            React components and hooks
  useAuth.ts           Auth state, sign-in/up/out, profile updates
  useStudy.ts          Study data hooks (posts, votes, favorites)
  puzzleData.ts        Puzzle definitions and community fetching
  StudyEditorPage.tsx  Rich study editor with board states
  StudyPostPage.tsx    Study reader with chapter navigation
  PuzzleHub.tsx        Puzzle listing with thumbnails
supabase-*.sql         Database schema and RLS policies
public/                Static assets
```
