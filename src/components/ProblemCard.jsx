import {
  Archive,
  Bookmark,
  BookmarkCheck,
  CalendarCheck,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileText,
  MoreHorizontal,
  PlayCircle,
  Star,
  Trash2
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { getProblemStatus, STATUS_LABELS } from "../utils/analytics";
import { humanDate, isOverdue } from "../utils/date";
import NotesDialog from "./NotesDialog";
import RevisionSession from "./RevisionSession";

const difficultyClass = {
  Easy: "easy",
  Medium: "medium",
  Hard: "hard",
  Unknown: "unknown"
};

function useOutsideClick(active, onOutside) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    function handlePointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) onOutside();
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") onOutside();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, onOutside]);

  return ref;
}

const MENU_VIEWPORT_MARGIN = 8;
const MENU_GAP = 6;

// Fixed-position coordinates for the row overflow menu, computed from the trigger's and
// panel's live rects so it can escape .problemList's overflow:hidden and flip above the
// row when there isn't enough space below it in the viewport.
function computeRowMenuPosition(triggerRect, panelRect) {
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const spaceBelow = viewportHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  const openUp = spaceBelow < panelRect.height + MENU_GAP && spaceAbove > spaceBelow;

  const top = openUp
    ? Math.max(MENU_VIEWPORT_MARGIN, triggerRect.top - panelRect.height - MENU_GAP)
    : Math.min(triggerRect.bottom + MENU_GAP, viewportHeight - panelRect.height - MENU_VIEWPORT_MARGIN);

  const rawLeft = triggerRect.right - panelRect.width;
  const left = Math.max(MENU_VIEWPORT_MARGIN, Math.min(rawLeft, viewportWidth - panelRect.width - MENU_VIEWPORT_MARGIN));

  return { top, left, openUp };
}

function useRowMenuPosition(menuOpen, onClose, menuRef, panelRef) {
  const [menuPos, setMenuPos] = useState(null);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPos(null);
      return;
    }
    if (!menuRef.current || !panelRef.current) return;
    const triggerRect = menuRef.current.getBoundingClientRect();
    const panelRect = panelRef.current.getBoundingClientRect();
    setMenuPos(computeRowMenuPosition(triggerRect, panelRect));
  }, [menuOpen, menuRef, panelRef]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    // Close on scroll/resize rather than continuously repositioning - the trigger row
    // moves with the page, so a stale fixed position would otherwise drift off it.
    function handleViewportChange() {
      onClose();
    }
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    return () => {
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [menuOpen, onClose]);

  return menuPos;
}

export default function ProblemCard({ problem, onEdit, onDelete, compact = false, futureMode = false, layout = "card" }) {
  const { toggleFavorite, toggleArchive, togglePracticeLater, markPracticeDone, markRecentlyViewed } = useApp();
  const [notesOpen, setNotesOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const notesPreview = problem.description || problem.notes || problem.revisionNotes?.approach;
  const manualPractice = futureMode || problem.practiceLater;
  const status = getProblemStatus(problem);
  const dueOverdue = !manualPractice && isOverdue(problem.nextRevisionDate);
  const menuRef = useOutsideClick(menuOpen, () => setMenuOpen(false));
  const menuPanelRef = useRef(null);
  const menuPos = useRowMenuPosition(menuOpen, () => setMenuOpen(false), menuRef, menuPanelRef);

  function closeMenuThen(action) {
    return () => {
      setMenuOpen(false);
      action();
    };
  }

  if (layout === "row") {
    const dueText = manualPractice
      ? "No scheduled date"
      : `${dueOverdue ? "Overdue since" : "Due"} ${humanDate(problem.nextRevisionDate)}`;

    return (
      <article className={`problemRow ${dueOverdue ? "overdue" : ""}`}>
        <button
          className={`rowFavorite ${problem.favorite ? "favoriteOn" : ""}`}
          type="button"
          onClick={() => toggleFavorite(problem.id)}
          aria-label="Toggle favorite"
          aria-pressed={problem.favorite}
          title="Favorite"
        >
          <Star size={17} fill={problem.favorite ? "currentColor" : "none"} />
        </button>

        <div className="problemRowMain">
          <button className="linkButton problemRowTitle" type="button" onClick={() => markRecentlyViewed(problem.id)}>
            {problem.name}
          </button>
          <div className="problemRowTags">
            <span className={`difficulty ${difficultyClass[problem.difficulty]}`}>{problem.difficulty}</span>
            <span className="rowMetaText">{problem.platform}</span>
            <span className={`rowStatus ${status}`}>
              <i className="statusDot" />
              {STATUS_LABELS[status]}
            </span>
          </div>
          <div className={`problemRowDue ${dueOverdue ? "overdue" : ""}`}>
            <CalendarCheck size={13} /> {dueText}
          </div>
        </div>

        <div className="problemRowActions">
          {manualPractice ? (
            <button className="button primary" type="button" onClick={() => markPracticeDone(problem.id)}>
              <CheckCircle2 size={15} /> Mark practiced
            </button>
          ) : (
            <button className="button primary" type="button" onClick={() => setSessionOpen(true)}>
              <PlayCircle size={15} /> Start Revision
            </button>
          )}
          <a
            className="rowIconAction"
            href={problem.url || "#"}
            target="_blank"
            rel="noreferrer"
            title="Open problem"
            aria-label="Open problem"
          >
            <ExternalLink size={16} />
          </a>
          <div className="rowMenuWrap" ref={menuRef}>
            <button
              className="rowIconAction"
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="More actions"
              title="More actions"
            >
              <MoreHorizontal size={17} />
            </button>
            {menuOpen && (
              <div
                className={`rowMenuPanel ${menuPos?.openUp ? "openUp" : ""}`}
                role="menu"
                ref={menuPanelRef}
                style={
                  menuPos
                    ? { top: menuPos.top, left: menuPos.left, visibility: "visible" }
                    : { top: 0, left: 0, visibility: "hidden" }
                }
              >
                <button className="rowMenuItem" type="button" role="menuitem" onClick={closeMenuThen(() => setNotesOpen(true))}>
                  <FileText size={15} /> Notes
                </button>
                {!futureMode && (
                  <button className="rowMenuItem" type="button" role="menuitem" onClick={closeMenuThen(() => onEdit(problem))}>
                    <Edit3 size={15} /> Edit
                  </button>
                )}
                <button
                  className="rowMenuItem"
                  type="button"
                  role="menuitem"
                  onClick={closeMenuThen(() => togglePracticeLater(problem.id))}
                >
                  {problem.practiceLater ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                  {problem.practiceLater ? "Remove from future practice" : "Save for future practice"}
                </button>
                {!futureMode && (
                  <>
                    <button
                      className="rowMenuItem"
                      type="button"
                      role="menuitem"
                      onClick={closeMenuThen(() => toggleArchive(problem.id))}
                    >
                      <Archive size={15} /> {problem.archived ? "Restore" : "Archive"}
                    </button>
                    <button
                      className="rowMenuItem danger"
                      type="button"
                      role="menuitem"
                      onClick={closeMenuThen(() => onDelete(problem))}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {notesOpen && <NotesDialog problem={problem} onClose={() => setNotesOpen(false)} />}
        {sessionOpen && <RevisionSession problem={problem} onClose={() => setSessionOpen(false)} />}
      </article>
    );
  }

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
            <span className={`statusBadge ${status}`}>{STATUS_LABELS[status]}</span>
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
          <span className={dueOverdue ? "overdueMeta" : ""}>
            <CalendarCheck size={15} /> {dueOverdue ? "Overdue since" : "Due"} {humanDate(problem.nextRevisionDate)}
          </span>
        )}
        <span>{manualPractice ? "Manual practice" : `${problem.revisionCount || 0} revisions logged`}</span>
      </div>

      <div className="problemActions">
        {manualPractice ? (
          <button className="button primary" type="button" onClick={() => markPracticeDone(problem.id)}>
            <CheckCircle2 size={16} /> Mark practiced
          </button>
        ) : (
          <button className="button primary" type="button" onClick={() => setSessionOpen(true)}>
            <PlayCircle size={16} /> Start Revision
          </button>
        )}
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
      {sessionOpen && <RevisionSession problem={problem} onClose={() => setSessionOpen(false)} />}
    </article>
  );
}
