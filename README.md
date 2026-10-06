# CodeRevise

CodeRevise is a spaced-repetition planner for coding interview problems. Solved problems are scheduled for revision with an adaptive algorithm, a daily queue ranks what to review first, and analytics show where practice is weakest. A companion Chrome extension captures problems from LeetCode, GeeksforGeeks, Codeforces, CodeChef, and HackerRank in one click.

It runs entirely on Local Storage, or with Firebase Authentication and Firestore for cloud sync across devices.

**Live app:** https://codereviser.vercel.app

## Features

### Problem library
- Capture problems manually or from the browser extension, with name, platform, difficulty, topics, URL, notes, and description
- Compact single-row library with search, filters (topic, pattern, difficulty, platform, status, favorites, due, completed, archived), and sorting
- Favorites, archive and restore, and Future Practice for problems kept outside the revision schedule
- Problem detail page at `/problems/:id` with revision information, a chronological revision history, and learning notes (notes, approach, mistakes, key insight). Actions cover starting a revision, editing, favoriting, archiving, Future Practice, and opening the original problem

### Revision system
- **Adaptive spaced repetition.** Each problem carries an ease factor. Intervals grow from the previous interval using that factor, so problems you recall well are spaced out faster. A Forgot rating resets the interval to one day. See [Revision algorithm](#revision-algorithm).
- **Recall ratings.** The session offers Forgot, Partial, Good, and Perfect. These map to the stored ratings `forgot`, `hard`, `good`, and `easy`, and each option shows the interval it will schedule.
- **Reflection.** Forgot and Partial ask what you forgot or found confusing, and what to remember next time. Good and Perfect offer an optional insight. These are saved to the problem's mistake and key-insight fields and shown in the next session.
- **Daily session.** A guided session per problem: attempt it, rate your recall, record notes. The confirmation shows the next review date and the interval.
- **Revision history.** Each revision and Future Practice session is recorded with its date, rating, and the interval it produced.
- **Mastery.** A problem is marked mastered after five completed revisions. It leaves the due queue but stays in the library.

### Learning insights
- **Today's focus.** A deterministic daily queue ranks problems by priority: overdue, low recent recall, weak area, due today, future practice (when there is capacity), then recently learned quick reviews. Each item states why it was chosen.
- **Weak areas.** Patterns (or topics, when no pattern applies) are scored from recall quality, overdue revisions, repeated mistakes, and whether they have been revised at all. Each area lists its reasons and links to its problems.
- **Topic mastery** with average recall quality per topic.
- **Distributions** for topics, patterns, difficulty, recall quality, and problem status.
- **Consistency.** Current and longest revision streaks, problems revised and captured, recall quality (the share of Good and Perfect ratings), a 7-day activity strip, and a 12-week heatmap. Only real revisions and practice sessions count. Opening or capturing a problem does not.
- **Calendar.** A monthly view with due, completed, and today indicators, plus a subtle tint on days with completed revisions.

### Pattern detection
Patterns are assigned by a deterministic, rule-based heuristic. No AI model or external service is involved.

- Twenty-one patterns are recognized: Hash Map, Two Pointers, Sliding Window, Binary Search, Stack, Queue, Linked List, Tree, Graph, BFS, DFS, Heap / Priority Queue, Greedy, Dynamic Programming, Backtracking, Prefix Sum, Sorting, Intervals, Bit Manipulation, Union Find, and Monotonic Stack.
- Topic tags carry more weight than title and description cues. A pattern is reported only when the combined evidence reaches a minimum score. Weak evidence produces **Uncategorized**, not a guess.
- **Manual patterns override detection.** The problem form has a Patterns field. Once set by hand, those patterns are used as entered, including an intentionally empty list. Automatic detection never overwrites them.

### Chrome extension
The extension is a local, unpublished Chrome extension. It is loaded unpacked from the `extension/` folder and is not listed on the Chrome Web Store.

- **One-click capture.** Click the extension on a supported problem page to open a preview.
- **Preview before saving.** Shows the title, platform, difficulty, topics, a short description, and an extraction checklist. Each field is marked as detected, taken from the tab title, unavailable, or not available on that site.
- **Editable metadata.** Title, difficulty (Easy, Medium, Hard, or Unknown), and comma-separated topics can be corrected before saving.
- **Duplicate detection.** The capture page checks your problem list using the same URL identity the app uses. A duplicate shows "Already captured" with **Open Problem** and **Capture Anyway**.
- **Quick actions after capture.** Open Problem, Add to Future Practice, and Done.
- **Difficulty is never guessed.** If a page does not expose Easy, Medium, or Hard, difficulty stays Unknown. Codeforces ratings and CodeChef numeric ratings are not converted.
- **Permissions:** `tabs`, `windows`, `activeTab`, and `scripting`. The extension has no host permissions and no `<all_urls>`. It reads a page only after you click it.

Extraction by platform:

| Platform | Title | Difficulty | Topics | Description | Verification status |
| --- | --- | --- | --- | --- | --- |
| LeetCode | Page title element, then tab title, then URL slug | Difficulty pill, otherwise Unknown | Tag links | Problem description | Not verified against a live page |
| GeeksforGeeks | Problem heading, then tab title, then URL slug | "Difficulty:" label, otherwise Unknown | Topic Tags section | Problem statement | Matched to the site's page code and styles; not checked in a live browser |
| Codeforces | Problem title, then tab title | Always Unknown (ratings, not levels) | Tag boxes | Not captured | Not verified against a live page |
| CodeChef | Page title, with the "Practice Coding Problem" suffix removed | Always Unknown (numeric ratings) | Not captured | Not captured | Title only, from the page `<title>` |
| HackerRank | Challenge heading, then tab title, then URL slug | Labelled "Difficulty" block, otherwise Unknown | Not captured (none in server markup) | Challenge body | Matched to server-rendered markup; not checked in a live browser |

### Interface
- Light and dark themes, switchable in Settings → Appearance, with a layered dark surface system
- Compact, developer-tool layout: a grouped sidebar (Plan, Practice, Insights, System), problem rows rather than large cards, and restrained blue accents
- Inter for interface text and JetBrains Mono for numeric readouts
- Responsive for desktop, tablet, and mobile. The sidebar becomes an off-canvas menu on narrow screens
- Settings for theme, account (user ID and password), JSON export and import, and a confirmed data reset
- Subtle 150–180 ms transitions, disabled under `prefers-reduced-motion`

## Tech stack

- React 18 with JavaScript (functional components and hooks)
- React Router v7
- React Context for app state
- Vite for the dev server and production build
- Firebase Authentication and Cloud Firestore (optional)
- Local Storage as the data layer when Firebase is not configured
- Plain CSS with design tokens in `src/styles.css`, no CSS framework
- Lucide React for icons
- Chrome Extension APIs (Manifest V3): `chrome.tabs`, `chrome.windows`, `chrome.scripting`, and `activeTab`
- Node's built-in test runner for the extension and learning-logic tests

## Project structure

```text
codereviser/
  extension/                 Chrome extension (Manifest V3, unpacked)
    lib/preview.js           Preview normalization and capture-parameter logic
    extraction.js            Injected into the active tab to read problem metadata
    popup.html / popup.css / popup.js
    manifest.json
    icons/                   16, 32, 48, and 128 px PNG icons
    tests/                   Extraction, preview, capture, success-action, and learning tests
  src/
    components/              ProblemCard, ProblemForm, RevisionSession, WeakAreasPanel,
                             ConsistencyPanel, TodaysFocus, Layout, ChartBar, StatCard, and more
    context/                 AppContext and action hooks (problems, account, goals, cloud sync)
    hooks/                   useLocalStorage
    pages/                   Dashboard, Today, Problems, ProblemDetail, FuturePractice,
                             Analytics, Calendar, Capture, Settings, Login
    services/                firebase.js (SDK setup), firestore.js (reads, writes, migration)
    utils/                   revision (scheduling), learning (insights and queue),
                             patternDetection, analytics, goals, date, problemIdentity,
                             problemMetadata, captureDetails
    App.jsx, main.jsx, styles.css
  firestore.rules            Firestore security rules
  vercel.json                SPA rewrite so routes such as /capture load on Vercel
  .env.example               Firebase variable names with placeholder values
  package.json, vite.config.js, index.html
```

## Getting started

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://127.0.0.1:5173`). Without Firebase configuration, the app runs on Local Storage. Create an account on the login screen to begin.

Other scripts:

```bash
npm test          # extension and learning-logic tests
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

## Firebase setup (optional cloud sync)

CodeRevise supports Firebase email/password authentication and Firestore sync. If the `VITE_FIREBASE_*` variables are not set, the app falls back to Local Storage.

1. Create a Firebase project.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create a **Firestore Database**.
4. Copy the example file and fill in your web app's configuration:

   ```bash
   cp .env.example .env.local
   ```

   The variable names are listed in `.env.example`: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID`.

5. Deploy the security rules in [`firestore.rules`](firestore.rules):

   ```bash
   firebase deploy --only firestore:rules
   ```

6. For a deployed site, add its domain under **Authentication → Settings → Authorized domains**.

Each user's data is stored under `users/{userId}`, `users/{userId}/problems/{problemId}`, and `users/{userId}/problems/{problemId}/revisions/{revisionId}`. The rules allow access only when `request.auth.uid` matches `userId`. Users with data in an earlier single-document format are migrated into the subcollection layout the first time they sign in. The legacy document is kept.

## Browser extension

The extension lives in [`extension/`](extension/). It is not published on the Chrome Web Store.

**Install (unpacked):**

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select the `extension/` folder.

**Target app.** The extension opens `https://codereviser.vercel.app/capture` by default. To test against a local app, run `npm run dev`, set `USE_DEVELOPMENT_APP = true` near the top of `extension/popup.js`, and reload the extension. Set it back to `false` before testing the production app. The development origin is `http://127.0.0.1:5173`.

**Use:** open a problem page on a supported site, click the CodeRevise button, review the preview, optionally edit it, and click **Save Problem**. CodeRevise opens in a new tab, or an existing CodeRevise tab is reused.

## Deployment

The app is deployed at **https://codereviser.vercel.app**. Build with Vite and publish `dist/`. [`vercel.json`](vercel.json) rewrites all paths to `index.html`, so client-side routes such as `/problems/:id` and `/capture` load directly.

The extension's production target is the same origin, so the capture route must be served there.

## Revision algorithm

The scheduling logic is in `src/utils/revision.js` and is applied by `buildRevisionUpdate` in `src/context/appState.js`.

**Initial scheduling.** A new problem's first revision is one day after its solved date.

**Ratings.** Each completed revision is rated `forgot`, `hard`, `good`, or `easy`, shown in the session as Forgot, Partial, Good, and Perfect.

**Ease factor.** Each problem starts at `2.5` and never drops below `1.3`. After each rating the factor changes by a fixed amount:

| Rating | Change |
| --- | --- |
| Forgot | −0.3 |
| Hard (Partial) | −0.15 |
| Good | 0 |
| Easy (Perfect) | +0.15 |

**Intervals.**
- The first revision, and any Forgot rating, uses the base interval for that rating: Forgot 1 day, Partial 2 days, Good 5 days, Perfect 10 days.
- Later Partial, Good, and Perfect ratings grow from the previous interval: previous interval × ease factor, rounded to the nearest day, and never below that rating's base interval. Perfect applies an extra ×1.3 before rounding.

Forgot therefore resets a problem to a one-day interval and lowers its ease factor, while repeated good recall spaces it out.

**Next review date.** Today's date plus the computed interval.

**Mastery.** After five completed revisions a problem is marked complete. It leaves the due queue and counts toward completion, but stays in the library and can still be revised.

**Future Practice.** Marking a Future Practice problem as practiced logs a practice entry and updates `lastRevised`. It does not change the schedule, ease factor, or revision count.

## Testing

```bash
npm test
```

The suite runs 148 tests on Node's built-in test runner. It covers extension extraction (platform dispatch, validation, malformed and unsupported pages, host spoofing, selector scope), the preview and capture-parameter logic, duplicate identity, capture outcomes, the post-capture actions, and the learning logic: pattern detection, weak-area scoring, the daily queue, consistency metrics, revision timelines, and recall mapping.

There are no component or browser tests. The interface is checked by manual testing, and `npm run build` verifies the production bundle.

## Security

- Firebase configuration is read from `VITE_FIREBASE_*` variables in `.env.local`. `.env.local` is listed in `.gitignore`, but that alone does not protect it. Keep your local copy private, and never paste real values into tracked files.
- `.env.example` contains placeholder values only.
- Firestore access is restricted by [`firestore.rules`](firestore.rules) to the signed-in owner of each `users/{userId}` tree. Deploy the rules before relying on cloud sync.
- Local Storage mode keeps accounts in the browser and stores passwords with a simple hash. That suits a personal, single-device planner but is not a secure authentication system. Use Firebase for anything that needs real account security.
- The extension requests only the permissions listed above, and it reads a page only when you click it.

## Future improvements

- Confirm the LeetCode, GeeksforGeeks, and HackerRank selectors in a live browser. The GeeksforGeeks and HackerRank selectors are matched to the sites' markup, not yet checked in a browser.
- Validate pattern detection against a labelled set of problems, and show patterns on problem rows
- Show duplicate detection in the extension popup, not only on the capture page
- Publish the extension to the Chrome Web Store
- CSV import and export alongside the existing JSON format
- Rich Markdown notes
- Component and browser tests for the interface
