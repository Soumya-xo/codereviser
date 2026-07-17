# CodeRevise

CodeRevise is a modern React application for programmers who want to retain coding problem patterns through spaced repetition. It tracks solved problems, automatically schedules revision dates, surfaces today's revision queue, and gives useful analytics about topic balance, streaks, completion rate, and weak areas.

## Features

- Dashboard with streak, due revisions, solved count, completion percentage, weakest topic, upcoming revisions, and recent activity
- Full problem management: add, edit, delete, favorite, archive, and complete revision stages
- Spaced repetition schedule: 1 day, 3 days, 7 days, 15 days, and 30 days
- Search by problem name with recent search history
- Filters for topic, difficulty, platform, favorites, due revisions, and completed problems
- Today's revision page with quick actions and original problem links
- Analytics page with total solved, total revisions, completion rate, streaks, topic distribution, difficulty distribution, weakest topic, and most practiced topic
- Monthly calendar with red due indicators, green completed indicators, and blue today indicators
- Settings for light/dark mode, reset data, export JSON, and import JSON
- Local Storage persistence across browser refreshes
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
- CSS Modules-style organization through modular component structure and global design tokens
- Lucide React icons
- Vite

## Spaced Repetition Logic

When a problem is added, CodeRevise schedules the first revision one day after the solved date. Each completed revision advances the stage and calculates the next due date using this sequence:

```text
Revision 1: +1 day
Revision 2: +3 days
Revision 3: +7 days
Revision 4: +15 days
Revision 5: +30 days
```

After the fifth revision, the problem is marked completed.

## Future Improvements

- Cloud sync and authentication
- Custom revision intervals
- CSV import/export
- Browser extension for one-click problem capture
- Rich Markdown notes
- More chart types and weekly progress summaries
- Test suite with React Testing Library
