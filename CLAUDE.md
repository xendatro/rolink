# RoLink — Claude Code Context

## What is this project?

RoLink is a LinkedIn-style professional profile platform for Roblox developers. Think of it as a better version of Roblox's Talent Hub — which is widely disliked for its broken search, poor UX, and lack of meaningful developer credibility signals.

Developers log in via Roblox OAuth, build a profile, and add games they've contributed to. Other developers can vouch for their skills. The goal is to create a trustworthy, credibility-based directory of Roblox developers that makes it easy to find and evaluate talent.

---

## Tech Stack

- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL via Neon (serverless Postgres)
- **ORM:** Prisma
- **Auth:** NextAuth with Roblox OAuth2 as the only provider
- **Deployment:** Vercel

---

## Key Terminology

- **User** = the person using the RoLink app (could be a developer or someone hiring)
- **Developer** = a Roblox developer whose profile exists on RoLink
- **Experience / Game** = a Roblox game identified by its Universe ID
- **Vouch** = one developer endorsing another developer's skill
- **Notability Score** = a computed credibility score based on game contributions (not yet implemented — defer this)

---

## Core Features (MVP Scope)

### Authentication
- Roblox OAuth2 only — no email/password
- On first login, create a user record in the database
- Session contains the user's Roblox ID and username

### User Profiles
Each profile displays:
- Roblox username, display name, avatar (fetched from Roblox API)
- Verified badge status (from Roblox)
- Follower count (from Roblox)
- Bio / header (user-written, short tagline)
- Description (longer freeform text)
- List of skills (chosen from a predefined list — not custom)
- List of contributed games (manually added by the developer, verified)
- Contact info (Discord handle, X/Twitter link)
- "For hire" toggle + hire info textbox (per-skill pricing, payment type)
- Portfolio links (external URLs only — no image uploads)

### Game Verification
When a developer adds a game to their profile by Universe ID:
1. Fetch the game from Roblox API
2. Check the developer's role in the game's group (if group-owned) OR confirm they are the place owner (if user-owned)
3. Accepted roles/ranks follow the same criteria as DevHub — any rank >= 10 in the group, or direct ownership
4. Store: game name, universe ID, visits, peak CCU, favorites, thumbnail URL, the developer's role, date started (optional), date ended (optional), and what they did (freeform)
5. Cap at 20 games per profile

### Vouching
- Any logged-in user can vouch for a skill on another developer's profile
- Vouches are per-skill (tied to a specific skill from the predefined list)
- A user can unvouch (remove their vouch)
- A user cannot vouch for themselves
- Vouch count is displayed publicly on the profile

### Search / For Hire
- Filter developers by skill
- Filter by "for hire" status
- Results have randomness/salt applied to avoid always showing the same people
- Future: promoted listings, bid system — not in MVP

### Profile Views (Premium Hook)
- Every profile visit is logged (viewer ID, viewed ID, timestamp)
- Free users see: "X people viewed your profile this week" (count only)
- Premium users see: the actual list of who viewed them
- Premium is not implemented in MVP — just log the views so the data is there

---

## Out of Scope for MVP (Do Not Build Yet)

- Job postings / hiring board
- Group pages
- Notability score / leaderboards
- Payment processing or bidding system
- Image uploads
- Direct messaging
- Premium subscription billing

---

## Database Schema (Prisma)

Design with these models in mind. Adjust field names as needed but keep the relationships:

```
User
  - id (cuid)
  - robloxId (unique)
  - username (unique)
  - displayName
  - avatarUrl
  - isVerified (bool)
  - bio (short tagline, optional)
  - description (long text, optional)
  - discordHandle (optional)
  - twitterHandle (optional)
  - isForHire (bool, default false)
  - hireInfo (text, optional — only shown if isForHire)
  - createdAt
  - updatedAt
  - skills       → UserSkill[]
  - games        → Game[]
  - vouchesGiven → Vouch[] (relation: VouchGiver)
  - vouchesReceived → Vouch[] (relation: VouchReceiver)
  - profileViews → ProfileView[] (as the viewed user)

Game
  - id
  - universeId (string)
  - name
  - thumbnailUrl
  - visits
  - favoritedCount
  - peakCcu
  - role (the developer's role/rank in this game)
  - description (what they did — freeform)
  - dateStarted (optional)
  - dateEnded (optional)
  - userId → User
  - createdAt

Skill (lookup table — seeded, not user-created)
  - id
  - name (e.g. "Scripting", "Building", "UI Design", "VFX", "Animation", "Music", "Game Design", "3D Modeling", "Marketing", "Project Management")

UserSkill
  - id
  - userId → User
  - skillId → Skill
  - yearsExperience (optional int)
  - voucheCount (computed or cached)

Vouch
  - id
  - fromUserId → User (VouchGiver)
  - toUserId → User (VouchReceiver)
  - skillId → Skill
  - createdAt
  - @@unique([fromUserId, toUserId, skillId]) — one vouch per skill per pair

ProfileView
  - id
  - viewerId (nullable — allow logged-out views but don't record who)
  - viewedId → User
  - viewedAt
```

---

## Roblox API Usage

The app makes calls to Roblox's public APIs from server-side code only (API routes or Server Components). Never expose these calls to the client directly.

Key endpoints used:
- `https://users.roblox.com/v1/usernames/users` — resolve username to ID
- `https://thumbnails.roblox.com/v1/users/avatar` — get avatar image
- `https://friends.roblox.com/v1/users/{id}/followers/count` — follower count
- `https://games.roblox.com/v1/games?universeIds={id}` — game details
- `https://groups.roblox.com/v2/users/{id}/groups/roles` — user's groups and roles

Rate limiting is a known issue with Roblox's API. Cache Roblox API responses where possible. Game stats (visits, CCU) on profiles are refreshed on page load but can be slightly stale — that's acceptable and should be communicated to users.

---

## Design Philosophy

- **Clean and professional** — this is a professional tool, not a game. Design should feel closer to LinkedIn than to a Roblox fan site
- **No image uploads** — too much moderation risk. Link to external portfolios instead
- **Predefined skills only** — no custom skill tags. Keeps data clean and searchable
- **Transparency about cached data** — if game stats might be stale, say so in the UI
- **Mobile friendly** — use Tailwind responsive classes throughout

---

## Project Conventions

- Use the App Router (`/app` directory) — not the Pages Router
- Server Components by default — only add `'use client'` when hooks or event handlers are needed
- Database queries happen in Server Components or API routes — never in Client Components directly
- Server Actions for form submissions and mutations
- All Roblox API calls go through `/src/lib/roblox.ts` — a centralized helper file
- Prisma client singleton lives at `/src/lib/prisma.ts`
- Auth config lives at `/src/auth.ts`
- shadcn/ui components live in `/src/components/ui/`
- Custom components live in `/src/components/`

---

## Environment Variables Needed

```
DATABASE_URL=            # Neon postgres connection string
NEXTAUTH_SECRET=         # Random secret for NextAuth
NEXTAUTH_URL=            # http://localhost:3000 in dev
ROBLOX_CLIENT_ID=        # From Roblox OAuth app registration
ROBLOX_CLIENT_SECRET=    # From Roblox OAuth app registration
```

---

## Current Status

Project is being scaffolded. Nothing is built yet. Start from scratch.

Suggested build order:
1. Scaffold Next.js app with TypeScript, Tailwind, App Router
2. Install and configure shadcn/ui
3. Set up Prisma + connect to Neon database
4. Write the schema and run initial migration
5. Implement Roblox OAuth via NextAuth
6. Build basic profile page (read-only, pulls from DB)
7. Build profile edit flow (bio, description, skills, contact info)
8. Build game adding flow (Universe ID input → verification → save)
9. Build vouching system
10. Build search / for hire directory
11. Log profile views

---

## Notes

- The developer (me) is a Roblox developer themselves with existing connections in the community — so community adoption is realistic
- Monetization is a future consideration — log profile view data now so premium "see who viewed you" can be unlocked later without backfilling
- Keep the codebase simple and readable — this is a solo project
