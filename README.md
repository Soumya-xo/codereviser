# CodeRevise

CodeRevise is a React application for programmers who want to retain coding problem patterns through spaced repetition. It tracks solved problems, schedules revision dates with an adaptive (ease-factor-based) algorithm, surfaces a daily revision queue, and gives analytics on topic balance, streaks, completion, and weak areas. It works fully offline on Local Storage, or with Firebase Authentication and Firestore for cloud sync across devices, and includes a companion Chrome extension for one-click problem capture.

## Features

**Dashboard**
- A "Today's Focus" summary answering what to do right now: revisions due, a single "Start Today's Session" call to action, and daily solve/revise goal progress
- Streak counter (current and best), completion rate, problems-solved count, and weakest topic
- Upcoming revisions timeline and recent activity list

**Problems library**
- Compact, single-row problem list with search, filters, and sorting (see below)
- Add, edit, delete, favorite, and archive problems
- Per-row overflow menu (notes, edit, future practice, archive, delete) that flips above the row when there isn't room below it

**Today's revision queue**
- Overdue and due-today problems, grouped separately
- Daily/weekly solve and revise goal tracking with an editable goals form
- Future-practice suggestions to help fill a solve goal
- Overall daily completion shown as a radial progress indicator

**Future Practice**
- A separate list for problems bookmarked for open-ended practice with no fixed revision date, independent of the spaced-repetition schedule

**Guided Revision Session**
- Step 1: open the original problem and attempt it without looking at previous notes
- Step 2: rate recall (Forgot / Hard / Good / Easy) — each option previews the interval it will schedule — and record approach, mistake, and key-insight notes
- Step 3: a confirmation screen showing the revision was saved, the next review date (or a "Mastered" badge once the mastery threshold is reached), and today's completed-revision progress

**Adaptive spaced-repetition scheduling** — see [Revision Algorithm](#revision-algorithm) below for the exact behavior.

**Revision history** — every completed revision is recorded per problem with its rating, the interval it produced, and the notes written at that attempt.

**Notes, mistakes, and key insights** — recorded per revision and shown again the next time you review that problem, plus a standalone description field.

**Search, filtering, and sorting**
- Search by problem name, with recent-search history
- Filters for topic, difficulty, platform, status, favorites, due, completed, and archive state, with an active-filter indicator on each control
- Sort by due date, recently added, recently revised, difficulty, or name

**Calendar**
- Monthly grid with due (red), completed (green), and today (blue outline) indicators
- A subtle activity-intensity tint on days with completed revisions, derived from that day's actual completed-revision count
- Click a date to see everything due or completed on it

**Analytics / Study Insights**
- Total solved, total revisions, completion rate, current/best streak
- Weakest topic and most-practiced topic
- Distribution charts for topic, difficulty, recall quality (rating distribution), and status
- Topic-level performance (problem count, revision count, average recall quality)

**Topic and difficulty performance** — surfaced in Analytics via the topic-mastery list and the topic/difficulty distribution charts.

**Problem lifecycle / status** — each problem is one of: **Learning** (no revisions yet), **Reviewing** (at least one revision, not yet mastered), **Mastered** (reached the mastery threshold), **Future practice** (bookmarked with no fixed date), or **Archived**. Status is derived automatically from `archived`, `completed`, `practiceLater`, and `revisionCount` — it isn't set manually.

**Favorites and archive** — favorite any problem for quick access; archive removes a problem from the active queue and analytics without deleting it, and it can be restored at any time.

**Firebase Authentication** — email/password login and registration when Firebase is configured, with change-password and change-email/user-ID flows.

**Firestore cloud sync** — problems, revisions, and settings (theme, search history, recently viewed, goals) sync to Firestore per authenticated user, isolated by security rules (see [Firebase Setup](#firebase-setup-cloud-sync)).

**Local Storage fallback** — if Firebase environment variables aren't set, CodeRevise runs entirely on Local Storage with simple hashed-password, multi-user-ID account separation on the same device.

**Data migration** — still implemented: on first sign-in, any legacy single-document `users/{userId}.problems` array from an earlier version is automatically migrated into the `problems` subcollection structure. The legacy document is left in place (not deleted) as a safety net.

**Chrome extension** — captures the active tab's problem page into CodeRevise in one click (see [Browser Extension](#browser-extension)).

**Supported platforms for extension capture** — LeetCode, GeeksForGeeks, HackerRank, CodeChef, and Codeforces are recognized by URL and get a platform, name, and topic guess; any other URL still captures with platform "Other."

**Automatic difficulty extraction** — currently implemented for LeetCode only: the extension reads the real Easy/Medium/Hard difficulty pill directly off the LeetCode page DOM at capture time (via `activeTab`/`scripting` permissions scoped to the tab you click "Capture" on) and passes it to CodeRevise, overriding the small hardcoded catalog guess. If it can't be read reliably, difficulty is sent as `Unknown` rather than guessed. GeeksForGeeks, Codeforces, CodeChef, and HackerRank do not yet have live-page extraction and continue to fall back to the URL-based guess.

**Responsive UI / dark and light themes** — a light theme and a near-black dark theme (toggled in Settings), with layered surface elevation in dark mode, Inter as the interface font, and JetBrains Mono for numeric readouts (streaks, stats, progress figures). The layout is responsive down to mobile, with an off-canvas sidebar below the desktop breakpoint.

**Empty states, loading states, toasts, and dialogs** — purposeful empty-state messaging (e.g. "Caught up.") with a relevant action where one exists, skeleton loading placeholders on the Dashboard, toast notifications for background actions, and confirmation dialogs for destructive actions like delete.

## Screenshots

> Screenshots have not been captured yet for this build. Run the app locally (`npm run dev`) and add images here.

### Dashboard
_Screenshot coming soon._

### Problems Library
_Screenshot coming soon._

### Today's Revision
_Screenshot coming soon._

### Revision Session
_Screenshot coming soon._

### Calendar
_Screenshot coming soon._

### Analytics
_Screenshot coming soon._

## Technology Stack

- React 18 (JavaScript, functional components + hooks)
- React Router v7
- React Context API for app-wide state (no external state library)
- Vite for dev server and build
- Firebase Authentication and Firestore (`firebase` SDK)
- Local Storage as the offline/no-Firebase data layer
- Lucide React for icons
- Plain CSS with design tokens (CSS custom properties) in `src/styles.css` — no CSS framework
- Chrome Extension (Manifest V3)

## Folder Structure

```text
codereviser/
  extension/              Chrome extension (Manifest V3)
    icons/
    extraction.js          Injected into the active tab to read page metadata (LeetCode difficulty)
    manifest.json
    popup.html / popup.css / popup.js
    README.md
  src/
    components/            Reusable UI: ProblemCard, RevisionSession, Layout (sidebar/topbar),
                            ProblemForm, GoalProgressRow, GoalSettingsForm, NotesDialog,
                            ConfirmDialog, EmptyState, Toast, StatCard, ChartBar, Skeleton
    context/                App state: AppContext, appState (problem/schema helpers),
                            useProblemActions, useAccountActions, useGoalActions,
                            useCloudSync, useToast
    data/                   Static reference data
    hooks/                  useLocalStorage
    pages/                  Dashboard, Problems, Today, FuturePractice, Calendar, Analytics,
                            Capture, Settings, Login
    services/               firebase.js (SDK init/config), firestore.js (Firestore reads/writes,
                            legacy-doc migration)
    utils/                  date, revision (scheduling algorithm), analytics, goals,
                            problemIdentity (URL de-dup/merge), problemMetadata (platform
                            detection from URL)
    App.jsx, main.jsx, styles.css
  firestore.rules
  .env.example
  index.html
  vite.config.js
  package.json
```

## Installation

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Without any Firebase configuration, the app runs immediately on Local Storage.

## Firebase Setup (Cloud Sync)

CodeRevise supports Firebase email/password authentication and Firestore sync. This is optional — if the environment variables below aren't set, the app falls back to Local Storage automatically.

1. Create a Firebase project.
2. Enable **Authentication → Email/Password**.
3. Create a **Firestore Database**.
4. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

5. Fill in your Firebase web app keys in `.env.local` (see the variable names in `.env.example` — do not commit real credentials to the repository):

   ```bash
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

6. Deploy the Firestore security rules checked into this repo at [`firestore.rules`](firestore.rules):

   ```bash
   firebase deploy --only firestore:rules
   ```

Each user's data is isolated under `users/{userId}`, `users/{userId}/problems/{problemId}`, and `users/{userId}/problems/{problemId}/revisions/{revisionId}`, scoped by the rules to `request.auth.uid == userId`. If you previously ran an earlier version of CodeRevise, the app automatically migrates any legacy single-document `users/{userId}.problems` array into the `problems` subcollection the first time each user signs in — the legacy document is left in place, not deleted.

`.env.local` is git-ignored; never commit it or paste real Firebase credentials into this README or any tracked file.

## Browser Extension

The Chrome extension lives in [`extension/`](extension/).

**Local setup:**

1. Start CodeRevise: `npm run dev`
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the `extension/` folder.
5. Open a problem page on LeetCode, GeeksForGeeks, HackerRank, CodeChef, or Codeforces.
6. Click the CodeRevise extension button.

The extension reads the tab's URL and title, and — on LeetCode only — the real difficulty off the page, then opens `/capture` in CodeRevise (reusing an existing CodeRevise tab if one is open). The Capture page detects platform/topic/name from the URL via `problemMetadata.js`, applies the extension's difficulty override when present, and either adds the problem or refreshes an existing one with the same URL.

To point the extension at a deployed app instead of `localhost`, update `CODE_REVISE_CAPTURE_URL` and `CODE_REVISE_ORIGIN` in `extension/popup.js`. See [`extension/README.md`](extension/README.md) for details.

## Revision Algorithm

The scheduling logic lives in `src/utils/revision.js`, applied through `buildRevisionUpdate` in `src/context/appState.js`. This documents the algorithm as it actually runs in the code today — not a fixed table of flat day offsets.

**Initial scheduling.** When a problem is added, its first revision is scheduled exactly one day after `dateSolved` (`getInitialRevisionDate`).

**Rating.** Each completed revision session is rated one of `forgot`, `hard`, `good`, or `easy`.

**Ease factor.** Every problem carries an `easeFactor`, starting at `2.5` (`DEFAULT_EASE_FACTOR`) and never dropping below `1.3` (`MIN_EASE_FACTOR`). After each rating, the ease factor shifts by a fixed delta and is clamped to that floor:

| Rating | Ease factor change |
| --- | --- |
| Forgot | −0.3 |
| Hard | −0.15 |
| Good | 0 |
| Easy | +0.15 |

**Interval progression.** The next interval (`getAdaptiveIntervalDays`) is computed as follows:

- If this is the problem's **first** revision (no previous interval recorded yet), or the rating is **Forgot**, the interval is simply the base value for that rating: Forgot → 1 day, Hard → 2 days, Good → 5 days, Easy → 10 days.
- Otherwise (second+ revision, rating Hard/Good/Easy), the interval grows from the *previous* interval: `previousIntervalDays × easeFactor` (Easy additionally multiplies the ease factor by 1.3 before applying it), rounded to the nearest day, with a floor of that rating's base interval so it never shrinks below the flat value.

In other words, Forgot always resets the problem back to a 1-day interval and lowers its ease factor; Good and Easy compound the interval upward using the ease factor, so problems you consistently recall well get spaced out faster than a fixed schedule, while ones you keep forgetting stay on a short leash.

**How the next review date is calculated.** `nextRevisionDate = getNextRevisionDate(today, intervalDays)`, i.e. today's date plus the interval computed above.

**Mastery / completion threshold.** After `MASTERY_REVISION_COUNT` (5) completed revisions, the problem is flagged `completed: true`. It then graduates out of Today's due queue and Dashboard's upcoming list, and counts toward the completion-rate stat. It is not deleted or locked — it can still be found and manually revised again from the Problems page (its status becomes "Mastered" rather than being removed from the library).

**Lifecycle/status.** Status shown in the UI (`getProblemStatus`) is derived, not stored directly: Archived (if archived) → Mastered (if `completed`) → Future practice (if `practiceLater`) → Learning (no revisions logged yet) → otherwise Reviewing.

**"Mark practiced" (Future Practice).** Problems saved to Future Practice have no fixed schedule; marking one practiced records a `practice` entry in its revision history and updates `lastRevised`, but does **not** touch `nextRevisionDate`, `easeFactor`, or `revisionCount` — the adaptive algorithm above only applies to scheduled (due-queue) revisions.

## UI & Design

- **Themes:** a light theme and a near-black dark theme, switchable in Settings → Appearance, with a layered dark-mode surface system (distinct background/card/hover elevations) rather than a single flat gray.
- **Typography:** Inter for interface text; JetBrains Mono (tabular figures) for numeric readouts — streaks, stat values, goal fractions, progress percentages.
- **Problem rows:** a compact, single-row list layout (rather than large cards) with inline favorite, quick actions, and an overflow menu for secondary actions.
- **Sidebar navigation:** grouped by task (Plan / Practice / Insights / System) with an active-item accent indicator.
- **Focused revision experience:** the Revision Session is a focused, step-by-step flow (attempt → rate → saved confirmation with next-review date), not a single long form.
- **Analytics / Study Insights:** distribution charts and a topic-performance list, organized with a lighter visual hierarchy rather than a wall of equal-weight cards.
- **Calendar activity visualization:** due/completed/today indicators plus a subtle background-intensity cue on days with more completed revisions.
- **Responsive layout:** sidebar collapses to an off-canvas menu on narrow viewports; grids and toolbars stack accordingly.
- **Micro-interactions:** subtle ~150–200ms hover/press/focus transitions throughout (buttons, rows, calendar cells, rating selection), and all of it is disabled for users with `prefers-reduced-motion` set.

## Security / Environment Variables

- Firebase configuration is read from `VITE_FIREBASE_*` environment variables (see `src/services/firebase.js`), sourced from `.env.local`.
- `.env.example` documents the required variable names with placeholder values only — copy it to `.env.local` and fill in your own project's keys.
- `.env.local` is listed in `.gitignore` and must never be committed. This README does not and should not contain real Firebase credentials.
- Firestore access is restricted by [`firestore.rules`](firestore.rules) to the authenticated owner of each `users/{userId}` document tree.
- If Firebase env vars are absent, `isFirebaseConfigured` is `false` and the app runs entirely on Local Storage with locally hashed passwords — no network credentials are involved in that mode.

## Future Improvements

- Live-page difficulty/topic extraction for GeeksForGeeks, Codeforces, CodeChef, and HackerRank (currently LeetCode-only)
- CSV import/export alongside the existing JSON export/import
- Rich Markdown notes
- Additional chart types and longer-range progress trends
- Automated test suite (e.g. React Testing Library)
