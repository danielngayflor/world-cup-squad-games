# World Cup Squad — Setup

## 1. Supabase (5 min)

1. Go to [supabase.com](https://supabase.com) → New project (free tier)
2. Once created, go to **SQL Editor** and run everything in `supabase-schema.sql`
3. Go to **Settings → API** and copy:
   - **Project URL**
   - **anon public** key

## 2. Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 4. Deploy (optional, so friends don't need you running it)

```bash
npx vercel
```

Then add the same two env vars in the Vercel dashboard under your project → Settings → Environment Variables.

---

## How to play

1. **You** create a squad → get a 6-char code
2. **Share** the invite link with friends
3. **Everyone joins** → once the target number is hit, teams are drawn automatically
4. **Watch** your 4 teams on the live board (auto-refreshes every 10s)
5. **You** (as leader) mark teams eliminated as the tournament progresses
6. Whoever holds the champion wins 🏆
