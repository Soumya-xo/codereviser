# CodeRevise

CodeRevise is a modern React application for programmers who want to retain coding problem patterns through spaced repetition. It tracks solved problems, automatically schedules revision dates, surfaces today's revision queue, and gives useful analytics about topic balance, streaks, completion rate, and weak areas.

## Features

- Dashboard with streak, due revisions, solved count, completion percentage, weakest topic, upcoming revisions, and recent activity
- Full problem management: add, edit, delete, favorite, archive, and revise
- Adaptive, recall-based spaced repetition: rate each revision Forgot / Hard / Good / Easy and the next date is scheduled accordingly
- Guided revision sessions: open the original problem, attempt it, rate your recall, then record approach/mistake/key-insight notes
- Full revision history per problem, including the rating and notes recorded at each attempt
- Search by problem name with recent search history
- Filters for topic, difficulty, platform, favorites, due revisions, and completed problems
- Today's revision page with quick actions and original problem links
- Analytics page with total solved, total revisions, completion rate, streaks, topic distribution, difficulty distribution, weakest topic, and most practiced topic
- Monthly calendar with red due indicators, green completed indicators, and blue today indicators
- Settings for light/dark mode, reset data, export JSON, and import JSON
- Firebase Authentication and Firestore cloud sync when configured
- Local Storage fallback when Firebase environment variables are not configured
- Chrome extension for one-click problem capture from coding sites
- Responsive dashboard UI with sidebar navigation, loading skeletons, empty states, toast notifications, and delete confirmation dialogs

## Screenshots

> Add screenshots here after running the app locally.

- Dashboard screenshot
- Problems library screenshot
- Today's revision queue screenshot
- Analytics screenshot
- Calendar screenshot

## Installation

```bash
npm install
npm run dev
```

Open the local URL printed by Vite in your browser.

## Cloud Sync Setup

CodeRevise supports Firebase email/password authentication and Firestore sync.

1. Create a Firebase project.
2. Enable **Authentication > Email/Password**.
3. Create a **Firestore Database**.
4. Copy `.env.example` to `.env.local`.
5. Fill in your Firebase web app keys:

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

Each user's data is isolated under `users/{userId}`, `users/{userId}/problems/{problemId}`, and
`users/{userId}/problems/{problemId}/revisions/{revisionId}`, scoped to `request.auth.uid == userId`. If you
previously ran an earlier version of CodeRevise, the app automatically migrates any legacy single-document
`users/{userId}.problems` array into the `problems` subcollection the first time each user signs in — the legacy
document is left in place (not deleted) as a safety net.

If Firebase keys are missing, the app still works using Local Storage only.

## Browser Extension

The Chrome extension lives in `extension/`.

Local setup:

1. Start CodeRevise with `npm run dev`.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the `codereviser/extension` folder.
6. Open a coding problem page and click the CodeRevise extension button.

The extension opens `/capture`, where the app auto-detects details from the URL and saves the problem to the logged-in account.

## Folder Structure

```text
src/
  assets/
  components/
  context/
  data/
  hooks/
  pages/
  utils/
```

## Technologies

- React with JavaScript
- React Router
- Context API
- Local Storage
- Firebase Auth and Firestore
- CSS Modules-style organization through modular component structure and global design tokens
- Lucide React icons
- Vite

## Adaptive Revision Logic

When a problem is added, CodeRevise schedules the first revision one day after the solved date
(`src/utils/revision.js`). From there, every revision is a guided session:

1. Open the original problem and attempt it without looking at previous notes.
2. Return to CodeRevise and rate your recall: **Forgot**, **Hard**, **Good**, or **Easy**.
3. Record approach, mistake, and key-insight notes for next time.

The next revision date is scheduled from the rating:

```text
Forgot → +1 day
Hard   → +2 days
Good   → +5 days
Easy   → +10 days
```

The scheduling algorithm is isolated in `src/utils/revision.js` so it can be swapped for a more advanced
algorithm (e.g. one that also factors in the previous interval) without touching the UI. After 5 completed
revisions a problem is flagged `completed`, the same mastery milestone the app used before: it graduates out
of Today's queue and counts toward the Analytics/Dashboard completion-rate stat. It can still be found and
manually revised again from the Problems page.

## Future Improvements

- Custom revision intervals
- CSV import/export
- Rich Markdown notes
- More chart types and weekly progress summaries
- Test suite with React Testing Library
