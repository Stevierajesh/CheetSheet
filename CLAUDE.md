@AGENTS.md

# CheetSheet — Document Editor

A Google Docs–style web document editor built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand, and react-rnd. Cloud-backed: Supabase provides auth, per-user document storage, image storage, and an admin observability dashboard.

## Tech Stack

- **Next.js 16** App Router (client-only rendering, SSR disabled for editor; root `proxy.ts` replaces middleware)
- **React 19** — uses `use()` for async params in client components
- **Zustand 5** — state management with debounced auto-save (1.5s, network)
- **Supabase** — auth (email/password), Postgres persistence with RLS, image storage (`@supabase/supabase-js` + `@supabase/ssr`)
- **react-rnd** — drag-and-resize for blocks on the canvas
- **KaTeX** — live LaTeX formula rendering
- **jsPDF + html2canvas** — PDF export
- **Tailwind CSS 4** — styling
- **uuid** — document and block ID generation

## Project Structure

```
proxy.ts                — Session refresh + route gating (Next 16 middleware replacement)

app/
  page.tsx              — Home page: user's document listing (Google Docs style) + sign out
  login/page.tsx        — Sign in / sign up
  auth/confirm/route.ts — Email confirmation link handler (verifyOtp)
  admin/page.tsx        — Superuser dashboard (server component, service-role data access)
  editor/[id]/page.tsx  — Editor route, loads doc by ID
  layout.tsx            — Root layout (Geist fonts, KaTeX CSS)
  globals.css

components/editor/
  EditorShell.tsx       — Main editor wrapper; async doc load with loading/not-found states
  Header.tsx            — Top bar: home link, save, new, file menu, title, save status, undo
  WordToolbar.tsx       — Horizontal toolbar with contextual groups + overflow » menu
  PageCanvas.tsx        — Scrollable multi-page canvas with zoom + lasso selection
  PageTabs.tsx          — Tab bar for multi-page navigation (click scrolls to page)
  EditableBlock.tsx     — Drag/resize/edit wrapper for each block (react-rnd)
  BlockRenderer.tsx     — Read-only rendering of each block type
  RightInspector.tsx    — (legacy, not rendered)
  LeftSidebar.tsx       — (legacy, not rendered)

lib/
  supabase/client.ts    — Browser Supabase client (publishable key)
  supabase/server.ts    — Server Supabase client (async cookies(), Next 16)
  supabase/admin.ts     — Service-role client, `server-only`, admin dashboard exclusively
  document/store.ts     — Zustand store: all editor state + actions
  document/seed.ts      — Sample physics cheat sheet seed document
  storage/supabase.ts   — Cloud CRUD: documents, summaries, image upload, one-time local migration
  storage/localStorage.ts — Legacy; still used for JSON import/export helpers + migration source
  export/pdf.ts         — PDF export via jsPDF + html2canvas

types/document.ts       — All TypeScript types (DocumentModel, PageModel, BlockModel, etc.)
hooks/useKeyboardShortcuts.ts — Delete, Ctrl+Z, Ctrl+C/V, Ctrl+S
```

## Cloud Backend (Supabase)

Project ref `mpuaradigitvdekczsee`. Env vars in `.env.local` (gitignored):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` (server-only, admin dashboard). The Supabase MCP server is configured in `.mcp.json` for schema work.

### Schema

- `documents` — `id uuid pk`, `user_id uuid default auth.uid()`, `title`, `content jsonb` (full DocumentModel), `page_count` (generated), `created_at`, `updated_at`.
- `audit_events` — append-only trail written by DB triggers on `documents` (created/edited/deleted). Rapid autosaves collapse to one `edited` event per 15-minute window. No client access (no grants, RLS with no policies); read via service role only.
- `admin_usage_stats()` — SECURITY DEFINER RPC returning usage JSON; execute granted to `service_role` only.
- Storage bucket `doc-images` — public-read by URL; per-user folder (`{userId}/...`) write/list policies.

### Security model (RLS)

- Owners have full CRUD on their own documents (`auth.uid() = user_id`; UPDATE has both USING and WITH CHECK so rows can't be reassigned).
- Admins (JWT `app_metadata.role = 'admin'`) can **read** all documents but never write others' — the admin dashboard is read-only by design.
- The admin role lives in `raw_app_meta_data` (server-controlled). NEVER key authorization off `user_metadata` (user-editable). Grant admin via SQL: `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'`.
- New tables are NOT auto-exposed to the Data API (Supabase, April 2026) — grant to `authenticated` explicitly, and revoke from `anon`/`authenticated` on private tables.

### Auth flow

- `proxy.ts` refreshes the session (via `getClaims()` — never trust `getSession()` for authz), redirects signed-out users to `/login`, gates `/admin` by the admin claim, and lets `/?code=...` through for email-confirmation redirects.
- `/admin` re-verifies the claim server-side before using the service-role client.
- Email confirmation is currently disabled in the Supabase dashboard (dev). Re-enable + real SMTP for production; the built-in mailer allows only ~2 emails/hour.

## Block Types

7 block types, all drag-and-resizable via react-rnd:

| Type | Description |
|------|-------------|
| `text` | Plain text, auto-grows height |
| `heading` | Bold heading text |
| `bullet-list` | Dot / dash / numbered list |
| `formula` | LaTeX via KaTeX, live rendering |
| `image` | Storage URL (base64 fallback if upload fails), upload via toolbar |
| `divider` | Horizontal rule with thickness/color |
| `box` | Colored rectangle with border |

## Key Behaviors

### Editing
- **Double-click** a text-like block (text, heading, formula, bullet-list) to enter edit mode
- **Formula blocks**: invisible textarea captures keystrokes while KaTeX renders live on top — no raw source visible
- Empty blocks show placeholder text: "Edit text here" (italic gray, disappears on first edit)

### Font Scaling on Resize
- Text-like blocks track `naturalWidth`, `naturalHeight`, `naturalFontSize` as a baseline
- Shrinking below natural width scales font: `ratio = min(1, newWidth / naturalWidth)`
- Font size is written directly into `block.styles.fontSize` in `handleResizeStop`
- A hidden measurement `<textarea>` (`measureRef`) auto-grows block height when content overflows

### Multi-Select
- **Lasso**: click+drag on empty canvas/page background to draw selection rectangle
- **Shift+click**: add/remove individual blocks from selection
- Selected blocks show blue outline (single) or teal outline (multi)
- **Move together**: drag one selected block → all others move in real-time via `batchMoveBlocks` (no snap-on-release)
- **Bulk style edits**: toolbar changes (font, color, alignment, etc.) apply to all selected blocks
- **Bulk delete**: Delete key or toolbar button removes all selected

### Multi-Page
- All pages render vertically in a scrollable canvas (like Google Docs)
- `IntersectionObserver` tracks which page is most visible → updates `currentPageIndex`
- Page tabs appear when > 1 page; clicking a tab smooth-scrolls to that page
- Zoom works via CSS `transform: scale()` with explicit wrapper sizing to preserve layout

### Toolbar
- Single horizontal bar (Word-style) with contextual groups:
  - **Insert**: 7 block types + Add Page
  - **Text** (when text-like block selected): font size, bold, weight, alignment, colors, bullet style
  - **Block** (when any block selected): X/Y/W/H, border, padding, image upload, divider controls, fwd/back/dup/del
  - **Page/Zoom** (always, right-aligned): page size, bg color, add/delete page, zoom
- `ResizeObserver` detects overflow → shows `»` button with dropdown containing all groups

### Home Page (per-user)
- `/` — grid of the signed-in user's documents with mini previews, title, last-edited time
- Fetches lightweight summaries (`content->pages->0->blocks` JSON path), not full documents
- Create new, import JSON, delete; account email + sign out; Admin button for superusers
- One-time migration: pre-cloud localStorage docs upload on first load (`mvp-docs-migrated-to-cloud` flag)

### Admin Dashboard (`/admin`, superuser only)
- Usage stat tiles (accounts, docs/pages, 7-day active users, bytes stored)
- 14-day activity mini charts (documents created, edit sessions) — server-rendered SVG
- Recent-activity audit trail (last 30 events with account emails)
- Accounts section: every user with their documents, last sign-in, storage footprint
- Read-only: RLS blocks admin writes to others' docs regardless of UI

### Persistence
- Auto-save: debounced 1.5s after every store change → Supabase upsert; `saveStatus`
  (`idle|saving|saved|error`) shown in editor Header; `beforeunload` flushes pending saves
- Manual save: Ctrl+S or Save button (`flushPendingSave`)
- Export: PDF (all pages) or JSON. Import: JSON file picker, creates new document with fresh ID
- Images upload to the `doc-images` bucket; document JSON stores only the URL

## Store Shape (Zustand)

Key state fields:
- `document: DocumentModel` — the current document
- `currentPageIndex: number` — which page is active
- `selectedBlockIds: string[]` — multi-select support (was `selectedBlockId`)
- `clipboard: BlockModel | null` — for copy/paste
- `zoom: number` — canvas zoom level
- `history: HistoryEntry[]` — undo stack (max 50)
- `saveStatus: SaveStatus` — cloud save indicator

Key actions:
- `selectBlock`, `selectBlocks`, `toggleBlockInSelection` — selection
- `batchMoveBlocks(moves)` — atomic multi-block position update (no save, used during drag)
- `moveSelectedBlocks(dx, dy)` — delta-based multi-move
- `updateSelectedBlockStyles(patch)` — bulk style changes
- `deleteSelectedBlocks()` — bulk delete
- `pushHistory()` — snapshot for undo
- `initializeStore(id)` — async cloud load; returns false if not found/unauthorized
- `flushPendingSave()` (module export) — immediate save, cancels pending debounce

## Development

```bash
npm run dev    # http://localhost:3000 — requires .env.local (see Cloud Backend)
```

## Important Conventions

- Next.js 16 uses `params: Promise<{ id: string }>` with `use()` in client components — NOT direct destructuring
- Next.js 16 renamed middleware to **`proxy.ts`** (root level, exports `proxy` function); `cookies()` is async
- All editor components are `'use client'`; `/admin` is a server component
- The editor is loaded with `dynamic()` + `ssr: false` to avoid SSR issues with react-rnd
- Block positions/sizes are in page coordinates (not screen); zoom is applied via CSS transform
- `debouncedSave` is used everywhere except `batchMoveBlocks` (which fires every drag frame — save happens on dragStop)
- Schema changes go through the Supabase MCP (`apply_migration` for DDL); run security advisors after DDL
