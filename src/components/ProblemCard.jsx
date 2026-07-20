import {
  Archive,
  Bookmark,
  BookmarkCheck,
  CalendarCheck,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileText,
  Star,
  Trash2
} from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { humanDate } from "../utils/date";
import NotesDialog from "./NotesDialog";

const difficultyClass = {
  Easy: "easy",
  Medium: "medium",
  Hard: "hard"
};

export default function ProblemCard({ problem, onEdit, onDelete, compact = false, futureMode = false }) {
  const {
    toggleFavorite,
    toggleArchive,
    togglePracticeLater,
    markPracticeDone,
    completeRevision,
    markRecentlyViewed
  } = useApp();
  const [notesOpen, setNotesOpen] = useState(false);
  const notesPreview = problem.description || problem.notes || problem.revisionNotes?.approach;
  const manualPractice = futureMode || problem.practiceLater;

  return (
    <article className={`card problemCard ${compact ? "compact" : ""}`}>
      <div className="problemHeader">
        <div>
          <button className="linkButton titleButton" type="button" onClick={() => markRecentlyViewed(problem.id)}>
            {problem.name}
          </button>
          <div className="tagRow">
            <span>{problem.topic}</span>
            <span className={`difficulty ${difficultyClass[problem.difficulty]}`}>{problem.difficulty}</span>
            <span>{problem.platform}</span>
          </div>
        </div>
        <button
          className={`iconButton ${problem.favorite ? "favoriteOn" : ""}`}
          type="button"
          onClick={() => toggleFavorite(problem.id)}
          aria-label="Toggle favorite"
          title="Favorite"
        >
          <Star size={18} />
        </button>
      </div>

      <p className="notesPreview">{notesPreview || "No description or notes yet."}</p>

      <div className="problemMeta">
        {manualPractice ? (
          <span>
            <BookmarkCheck size={15} /> No scheduled date
          </span>
        ) : (
          <span>
            <CalendarCheck size={15} /> Due {humanDate(problem.nextRevisionDate)}
          </span>
        )}
        <span>{manualPractice ? "Manual practice" : `Stage ${problem.revisionStage}/5`}</span>
      </div>

      <div className="problemActions">
        <button
          className="button primary"
          type="button"
          onClick={() => (manualPractice ? markPracticeDone(problem.id) : completeRevision(problem.id))}
        >
          <CheckCircle2 size={16} /> {manualPractice ? "Mark practiced" : "Mark revised"}
        </button>
        <a className="button secondary" href={problem.url || "#"} target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> Open
        </a>
        <button className="iconButton" type="button" onClick={() => setNotesOpen(true)} title="Notes">
          <FileText size={17} />
        </button>
        {!compact && !futureMode && (
          <>
            <button className="iconButton" type="button" onClick={() => onEdit(problem)} title="Edit">
              <Edit3 size={17} />
            </button>
            <button
              className={`iconButton ${problem.practiceLater ? "favoriteOn" : ""}`}
              type="button"
              onClick={() => togglePracticeLater(problem.id)}
              title={problem.practiceLater ? "Remove from future practice" : "Save for future practice"}
              aria-label={problem.practiceLater ? "Remove from future practice" : "Save for future practice"}
            >
              {problem.practiceLater ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
            </button>
            <button
              className="iconButton"
              type="button"
              onClick={() => toggleArchive(problem.id)}
              title={problem.archived ? "Restore from archive" : "Archive"}
              aria-label={problem.archived ? "Restore from archive" : "Archive"}
            >
              <Archive size={17} />
            </button>
            <button className="iconButton dangerIcon" type="button" onClick={() => onDelete(problem)} title="Delete">
              <Trash2 size={17} />
            </button>
          </>
        )}
        {futureMode && (
          <button className="button secondary" type="button" onClick={() => togglePracticeLater(problem.id)}>
            <Bookmark size={16} /> Remove
          </button>
        )}
      </div>
      {notesOpen && <NotesDialog problem={problem} onClose={() => setNotesOpen(false)} />}
    </article>
  );
}
