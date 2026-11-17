# Freelancer workspace app: plan

Date: 2026-11-17. A **plan, not an implementation**: nothing here is built, tested or reviewed. It follows the scenario and
recommendation in [CODE-COMPARISON.md](CODE-COMPARISON.md) ("Scenario: a Figma-designed all-in-one freelancer workspace") and the
tie-breakers in its section "Which stack for which app type". Claims about third-party libraries and legal rules are general
knowledge, not re-verified here, and are marked where they matter.

## 1. Product and scope

One Windows 11 desktop app for a freelancer that combines:

- **Issues and projects** (Linear style).
- **CRM and knowledge base** (Notion style): clients, contacts, pipeline, block-editor pages.
- **Invoicing and light ERP**: quotes, invoices, receipts, expenses, reports.

Hebrew and English are both first-class (RTL layout, mixed text, ILS). Data is **local-first**, and the delivery order is fixed in
section 1A: a local desktop app first, then optional sync, then a client-facing portal. Non-goals for v1: team collaboration, any
hosted backend, accounts, email sync (IMAP), mobile apps, a plugin marketplace.

## 1A. Delivery strategy: local-first, then optional sync, then a client portal

| Stage | What ships | Needs a server? | Why in this order |
| --- | --- | --- | --- |
| **v1 Local desktop** | Tauri app on SQLite, works with no account and no network, automatic backups, full export and import | No | Fastest route to a useful product for the first user (the builder). No auth, billing, multi-tenancy or hosting duties before the workflow is proven. Privacy is a selling point. |
| **v2 Optional sync** | End-to-end-encrypted sync between the user's own devices, off by default | Yes (a small relay, content opaque to it) | The most common reason users leave a local-only tool is "my data is stuck on one laptop." |
| **v3 Client portal** | The user publishes chosen documents (an invoice, a quote, a project status page) at a link the client can open, and later pay | Yes (readable only for what was published) | The one cloud feature a freelancer needs from outside their own machine. |
| **Later, only if asked** | A full web client reusing the UI and the Rust core (Svelte and Axum, see section 11) | Yes (full backend) | Adds accounts, authorization and compliance duties, so it waits for demand. |

Why not web first or both at once: a server version means accounts, per-user authorization, billing, uptime and privacy-law duties
over clients' financial data before anyone has confirmed the product is wanted. Why not local-only: no second device, no client
links and no payment path caps the product. Pricing and licensing are **not decided** here.

### Lessons taken from Obsidian (public knowledge, not re-verified here)

Obsidian is the closest precedent for a local-first product that charges for sync and publishing rather than for the app. What the
plan takes from it:

- **You own your data, with no account needed.** The app works fully offline and without sign-in. Everything stays on the user's
  disk, and leaving the product must be easy.
- **Open, documented formats.** Obsidian keeps plain Markdown files. This app keeps a relational database, so the equivalent
  promise is: a documented schema, complete JSON and CSV export, pages exported as Markdown, and attachments as normal files in a
  folder. A scheduled "mirror export" to a user-chosen folder gives the same no-lock-in guarantee.
- **Paid cloud services are separate and optional.** Sync and publishing are add-ons; the local app stays useful without them.
  v2 and v3 follow this shape.
- **Sync is end-to-end encrypted.** Obsidian Sync is described as end-to-end encrypted. Here the v2 relay stores only encrypted
  operation blobs and cannot read them.
- **Publishing is explicit.** The portal (v3) works like a "publish" feature: nothing leaves the machine unless the user publishes
  a specific document, and unpublishing removes it. This is the only place the server holds readable data.
- **Extensibility comes later.** Obsidian's plugin ecosystem is a long-term moat, but a plugin API is out of scope for v1.

### Where this plan deliberately differs from Obsidian

- **A database, not a folder of files.** Invoices, issues and CRM data are relational and need transactions, so the live database
  must **not** sit inside a folder synced by OneDrive, Dropbox or similar (file-sync tools can corrupt an open SQLite database).
  Sync therefore goes through the app (v2), and backups and mirror exports are the way to put data into a synced folder.
- **Financial records carry legal duties**, so issued invoices are frozen and audited (section 4), and export must preserve them
  exactly.
- **Backups are mandatory, not optional.** A local-only tool loses everything with the disk, so v1 includes automatic backups to
  a folder chosen by the user and a visible "last backup" status.

### What v1 must do now so v2 and v3 are cheap

UUIDv7 or ULID IDs, an op-log table with hybrid logical clock timestamps, tombstones instead of hard deletes, the Rust core crate
and the transport-agnostic client interface (section 11), no hard-coded local paths in domain code, and encryption keys derived
and stored through the OS credential store so a later E2EE sync does not require a data migration.

## 2. Stack decision

| Layer | Choice | Why |
| --- | --- | --- |
| Shell | **Tauri v2** (Rust, WebView2) | The UI is made of web-shaped components (block editor, kanban, grids, command palette), the engine is Rust, calls are coarse. See CODE-COMPARISON.md. |
| Frontend | **Svelte 5** (runes), TypeScript, Vite (SvelteKit as an SPA) | Fits the existing skills. **React is the fallback** if the editor spike (section 8) fails. |
| UI primitives | Accessible headless components (bits-ui or shadcn-svelte style), Tailwind or CSS tokens from Figma variables | Accessibility without building primitives. |
| Editor | **TipTap / ProseMirror** | Framework-agnostic; BlockNote or Plate (React) are the alternatives. |
| Lists and tables | TanStack Table and Virtual, pragmatic-drag-and-drop | Virtualization and kanban without a framework lock-in. |
| Data | **SQLite** in Rust (`rusqlite`, bundled build with FTS5) | Section 4. |
| Types across the bridge | Generated TypeScript types from the Rust commands (for example `tauri-specta`) | One source of truth for the command surface. |
| PDF | Decided by spike S2: WebView2 print, or Typst/Rust | Hebrew bidi quality decides. |
| Secrets | Windows Credential Manager through a keyring crate | No tokens in the DB or the web layer. |
| Sync and portal (later, stages v2 and v3) | A small Rust (Axum) service: an opaque encrypted-operation relay for sync, and a separate publish service for portal pages | Section 1A. Not part of v1; chosen later with its own threat model. |

Not chosen: Qt, Avalonia and WinUI 3 (you would build the block editor and tracker pieces), Electron (kept as a reversible
alternative if built-in `printToPDF`, in-process Node modules or identical Chromium on macOS/Linux become necessary),
Flutter (the only credible native contender, but no web editor or grid ecosystem).

## 3. Architecture

```mermaid
flowchart LR
    UI[Svelte 5 UI] -->|typed commands| API[Rust command layer]
    API --> SVC[Domain services]
    SVC --> REPO[Repository layer]
    REPO --> DB[(SQLite, WAL)]
    SVC --> JOBS[Background jobs: PDF, backup, later sync]
    JOBS --> FS[Attachments and exports on disk]
    API --> OS[Windows: tray, notifications, credentials]
```

- **Business rules live in Rust** (invoice numbering, state machines, validation, permissions). The frontend does UX
  validation, optimistic updates and presentation only.
- **The Rust side owns the database.** The frontend never gets a generic SQL channel.
- **Security posture:** minimal Tauri capabilities, local assets only, no remote content, file access only through native
  dialogs, a CSP reviewed per library (the benchmark's `style-src-attr 'none'` would reject many editor and grid libraries).
  Hardening follows the reference project's template in CODE-COMPARISON.md.

## 4. Data layer: why SQLite

The question was SQLite versus ESE (JET Blue) versus an in-memory store with an append-only log. From reading the sample
code (not running it):

| | ESE | In-memory + log (the C# demo) | SQLite |
| --- | --- | --- | --- |
| Platforms | Windows only | Any | Any (matches the macOS/web reach goal) |
| Queries | Hand-built indexes and joins | Same, in RAM | SQL: filters, reports, aging, VAT sums |
| Full-text, Hebrew | None | None | FTS5 (`unicode61`, no stemming) |
| Tooling | Almost none | None | DB browsers, `sqlite3`, migration libraries |
| Rust support | Raw Win32 bindings | N/A | `rusqlite`, mature |
| Sync later | Build it | Log is a natural op-log | Existing sync layers, or an op-log table |

Notes on the two samples, so the ideas are not lost:

- Both store money as `double`. Use integer minor units plus a currency code.
- The ESE sample has circular logging on (no log-based backup or point-in-time recovery) and no migration path.
- The log demo is **not crash-safe as written**: replay throws on a torn final record, so the database can fail to open after a
  power cut (it should truncate a bad tail and fail only on mid-file corruption). Its cascade delete is several separately
  flushed records without a commit marker, so it is not atomic. It has no snapshots, so startup grows with history; checks and
  ID allocation sit outside the lock; a record that fails to apply poisons every later startup; `DateTime.Now` is local time.
  Its speed claims were not measured.
- At freelancer scale (around 10^5 rows) all three should be far inside a 16 ms frame, so speed is not the deciding factor
  (not benchmarked here).
- The event idea belongs **on top of SQLite**: a `changes` op-log for sync and an append-only `invoice_events` table for audit.

### Schema rules

- STRICT tables, `foreign_keys=ON` on every connection, `journal_mode=WAL`, `synchronous=FULL`, a busy timeout, one writer
  connection plus a reader pool.
- IDs: UUIDv7 or ULID text. Money: integer minor units plus ISO currency code. Time: UTC. Soft-delete tombstones.
- Documents: ProseMirror JSON per page (Yjs updates later), with a derived plain-text column feeding FTS5. Attachments on disk,
  content-addressed, hash in the DB.
- Custom fields: a JSON column with generated, indexed columns for the fields that are filtered.
- Migrations by `PRAGMA user_version` with fixture-database tests. Scheduled backups with `VACUUM INTO`, and full export to
  JSON and CSV. Warn against storing the database in a cloud-synced folder. Optional SQLCipher later.
- Hebrew sorting: SQLite's default collation is binary; decide between a registered ICU-style collation and application-side
  sorting (spike S3).

## 5. Features and implementation direction

| Area | What | Direction |
| --- | --- | --- |
| Shell | Sidebar, tabs, Ctrl+K command palette, global search, tray quick-add | Keyboard-first; FTS5 search across issues, pages, clients, invoices; global shortcut and tray in Rust |
| Issues | List, board, saved views, labels, priorities, estimates | Saved views stored as validated query JSON compiled to parameterized SQL (never string-built); fractional-index ordering for drag-and-drop; virtualized lists; billable time can feed invoice lines |
| CRM | Clients, contacts, pipeline, activity timeline, custom fields, CSV import | Pipeline board shares the kanban component with issues; timeline from the `changes` log and notes |
| Pages / KB | Block editor: slash menu, headings, lists, toggles, tables, callouts, mentions, backlinks, templates | TipTap with `dir=auto` per block; links to issues and clients by ID; Markdown and PDF export |
| Invoicing | Products and services, quotes, invoices, receipts, payments, recurring invoices, multi-currency, expenses | Rust state machine draft, issued, paid or void; gap-free numbering per series inside one transaction; issued rows frozen by a trigger; audit in `invoice_events` |
| Reports | Revenue by client, receivables aging, VAT summary, accountant export | SQL views; CSV export |
| Tax and legal | Dated, configurable VAT setting; Israeli tax-authority allocation numbers and document-type rules | **Verify current rules with an accountant before building.** The integration is a later, isolated module behind an interface |
| Windows 11 | Mica on the sidebar, notifications, deep links, signed auto-update | Native caption kept for Snap; plugin behavior to be verified in spike S4 |
| Data safety | Backup, restore, export, language, theme, data location | Restore tested in CI with fixture databases |

## 6. UI direction

- **Look:** Linear's density with Notion's calm: neutral gray scale, one accent, hairline borders, 8 px radius, soft shadows;
  light and dark themes; motion of 120 to 200 ms that respects reduced-motion.
- **Fonts:** Inter and Noto Sans Hebrew (the repo's NeutronStar app already bundles both).
- **Tokens:** Figma variables map to CSS tokens; the Figma file plans RTL (mirrored layouts, logical properties,
  `dir=auto` for user content, `Intl` for ILS and dates; numbers and dates isolated LTR inside RTL text).
- **Layout:** left sidebar (collapsible), top breadcrumb and view switcher, main content, a resizable right detail drawer,
  centered command palette.

```
┌────────────┬──────────────────────────────────────┬──────────────┐
│ Workspace  │ Project ▸ Issues   [List|Board] ⌘K   │ Detail       │
│ Search     │ ─────────────────────────────────────│ drawer       │
│ Inbox      │ ○ ENG-12  Fix invoice PDF   ● High   │ (resizable)  │
│ Issues     │ ○ ENG-13  Client import     ○ Med    │              │
│ Clients    │ ...virtualized rows...               │ Title        │
│ Pages      │                                      │ Status, tags │
│ Invoices   │                                      │ Linked doc   │
└────────────┴──────────────────────────────────────┴──────────────┘
```

## 7. Phases

| Phase | Work | Exit evidence |
| --- | --- | --- |
| P0 spikes (1 to 2 weeks) | S1 to S5 below | Written pass/fail per spike with versions |
| P1 spine | Tauri shell, SQLite and migrations, typed commands, issues, command palette, global search | Migration and crash-recovery tests; keyboard walk-through |
| P2 CRM and pages | Clients, pipeline, block editor, backlinks | Hebrew/English editing checks; export round trips |
| P3 money | Invoicing, numbering, PDF, reports | Accountant review of numbering and VAT model; PDF visual checks |
| P4 backup and export | Automatic backups to a user folder, "last backup" status, full JSON/CSV export and import, Markdown mirror export, restore tested | Round-trip and restore tests on fixture databases |
| P5 optional sync (v2) | End-to-end-encrypted sync over the op-log (Yjs for page text), key handling through the OS credential store, a small relay that sees only ciphertext | Separate plan and threat model; two-device conflict tests |
| P6 client portal (v3) | Explicit publish and unpublish of an invoice, quote or status page to a link; later client payment | Separate plan: hosting, privacy-law review, abuse limits |
| Later | Full web client, macOS, optional database encryption | Only on demand; separate plan |

## 8. Spikes before committing

- **S1 editor:** slash menu, drag handle, table block and mixed Hebrew/English typing in TipTap on Svelte, versus BlockNote on
  React. Decide Svelte or React by the result, not by ecosystem size.
- **S2 PDF:** a Hebrew invoice with ILS, mixed text and numbers through WebView2 print versus Typst.
- **S3 SQLite:** FTS5 search on Hebrew (with and without niqqud), collation choice, migration and backup procedure, a kill-during-
  write test.
- **S4 Windows polish:** Mica, tray, notifications, deep links, global shortcut and updater behavior under Tauri.
- **S5 lists:** a 10,000-row virtualized issue list and drag-and-drop on a mid-range machine.

## 9. Testing

Rust unit tests for domain rules; migration tests on fixture databases; kill-during-write and restore tests; Hebrew/RTL visual
checks; keyboard and screen-reader walk-throughs; end-to-end tests through the WebView2 driver.

## 10. Risks and open questions

- **Sync is a project of its own.** Conflict handling, key recovery (a lost key means unreadable synced data), device
  revocation and a threat model are all unsolved here. Do not promise it before it has a plan.
- **The portal turns you into a data holder.** Published invoices contain clients' names and amounts, which brings privacy-law
  duties, abuse and link-guessing risks, and uptime expectations. Get legal advice before launch.
- **Business model unknown.** Charging for sync and portal follows Obsidian's shape, but pricing, licensing and whether the
  market pays for them are not decided and not tested.
- **Local-only data loss** until backups exist; P4 is therefore required before any real-user release.

- The block editor is the hardest single component; the spike may flip the frontend to React.
- PDF generation with correct Hebrew bidi is not built into Tauri and is untested here.
- Legal invoicing rules (numbering, allocation numbers, document types) must come from an accountant, not from this plan.
- WebView2 availability and servicing; WebKit differences if macOS is added later.
- A CSP compatible with every chosen editor and grid library must be written and reviewed.
- Scope is large for a solo build; P1 to P3 is the minimum useful product, and each phase should ship usable value.

## 11. Shared code and a later web client

The same Svelte UI and Rust rules can serve the desktop app now and a web client later, if the code is organized for it from the
first phase. Retrofitting later is expensive; doing it now is cheap.

```mermaid
flowchart LR
    UI[Shared Svelte UI package] --> CL[Typed client interface]
    CL --> TT[Tauri adapter: invoke]
    CL --> HT[HTTP adapter: fetch to Axum]
    TT --> CORE[Rust core crate: domain rules and repository traits]
    HT --> AX[Axum handlers]
    AX --> CORE
    CORE --> DB[(SQLite locally, server database later)]
```

- **One SvelteKit SPA, two builds.** Use `@sveltejs/adapter-static` with `ssr = false` and an `index.html` fallback. The same app
  builds for Tauri and, later, for any static host. An environment flag picks the transport adapter. Do not use SvelteKit server
  files or form actions (no Node server in the Tauri build); the Rust side takes their place. Astro, if used at all, is for
  marketing pages.
- **Rust core crate.** Domain rules and repository traits live in one crate. Tauri commands and any Axum handlers are thin
  wrappers around the same service functions.
- **Typed client interface in TypeScript.** The UI only calls it (`listIssues`, `issueInvoice` and so on); a Tauri adapter and an
  HTTP adapter implement it. Generate the TypeScript types from the Rust types (`specta` or `ts-rs`).
- **Shared UI package stays plain Svelte.** No `@tauri-apps/*` and no `$app/*` imports in it. Files, dialogs, notifications,
  shortcuts and navigation go behind small interfaces with a desktop and a web implementation.
- **PDF in Rust** (decided by spike S2) so invoices render identically on every target.
- **Deep links and routing:** verify them under the Tauri protocol early (SvelteKit's hash-routing option is a candidate; not
  verified here).

What a web client adds beyond a different transport: accounts, per-user authorization, rate limits, audit of every endpoint,
and a server database (single-user self-hosting could stay on SQLite; multi-tenant service usually means Postgres). Browser
differences (Safari, Firefox) also need testing for the editor and Hebrew bidi. None of that belongs in v1.
