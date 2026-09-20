import { CheckCircle2, ExternalLink, FileText, Save, Trophy, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../context/AppContext";
import { getDueProblems } from "../utils/analytics";
import { formatDate, humanDate } from "../utils/date";
import { countRevisionsCompleted } from "../utils/goals";
import { getAdaptiveIntervalDays, getNextRevisionDate, MASTERY_REVISION_COUNT, RATING_LABELS, RATINGS } from "../utils/revision";

export default function RevisionSession({ problem, onClose }) {
  const { problems, completeRevision } = useApp();
  const [step, setStep] = useState("attempt");
  const [rating, setRating] = useState("");
  const [approach, setApproach] = useState(problem.revisionNotes?.approach || "");
  const [mistake, setMistake] = useState(problem.revisionNotes?.mistake || "");
  const [keyInsight, setKeyInsight] = useState(problem.revisionNotes?.keyInsight || "");
  const [result, setResult] = useState(null);

  const today = formatDate();
  const completedToday = countRevisionsCompleted(problems, today, today);
  const dueToday = getDueProblems(problems);
  const remainingToday = dueToday.some((item) => item.id === problem.id) ? dueToday.length : dueToday.length + 1;
  const totalToday = completedToday + remainingToday;
  const progressPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const contextLines = [];
  if (problem.description) contextLines.push(problem.description);
  if (problem.revisionNotes?.mistake) contextLines.push(`Last mistake: ${problem.revisionNotes.mistake}`);
  if (problem.revisionNotes?.keyInsight) contextLines.push(`Key insight: ${problem.revisionNotes.keyInsight}`);
  const contextText = contextLines.join("\n\n");

  function handleSubmit(event) {
    event.preventDefault();
    if (!rating) return;

    const projectedDays = getAdaptiveIntervalDays({
      previousIntervalDays: problem.lastIntervalDays ?? null,
      easeFactor: problem.easeFactor ?? null,
      rating
    });
    const nextReviewDate = getNextRevisionDate(today, projectedDays);
    const willBeMastered = (problem.revisionCount || 0) + 1 >= MASTERY_REVISION_COUNT;

    completeRevision(problem.id, { rating, approach, mistake, keyInsight });
    setResult({ nextReviewDate, willBeMastered });
    setStep("done");
  }

  return createPortal(
    <div className="dialogLayer" role="presentation">
      <section
        className={`dialog notesDialog sessionDialog ${step === "done" ? "sessionDone" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="revision-session-title"
      >
        <div className="drawerHeader">
          <div>
            <span className="eyebrow">Revision Session</span>
            <p className="sessionProgress">
              {completedToday} / {totalToday} completed today
            </p>
            <div className="progressTrack sessionProgressTrack" aria-label="Today's revision progress">
              <span style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <button className="iconButton" type="button" onClick={onClose} aria-label="Close revision session">
            <X size={18} />
          </button>
        </div>

        {step !== "done" && (
          <div className="sessionSubject">
            <h2 id="revision-session-title">{problem.name}</h2>
            <p className="muted">
              {problem.difficulty} · {problem.platform}
            </p>
          </div>
        )}

        {step === "attempt" && (
          <div className="sessionSteps">
            <p className="muted">
              Open the original problem, attempt it without looking at your previous notes, then come back here to rate
              your recall.
            </p>
            {problem.revisionCount > 0 && (
              <p className="muted">
                You've revised this {problem.revisionCount} time{problem.revisionCount === 1 ? "" : "s"} before
                {problem.lastRevised ? `, last on ${humanDate(problem.lastRevised)}` : ""}.
              </p>
            )}
            {contextText && (
              <article className="noteSection">
                <div>
                  <FileText size={16} />
                  <strong>Problem context</strong>
                </div>
                <p>{contextText}</p>
              </article>
            )}
            <div className="drawerActions">
              <a className="button secondary" href={problem.url || "#"} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> Open original problem
              </a>
              <button className="button primary" type="button" onClick={() => setStep("rate")}>
                I attempted it &rarr;
              </button>
            </div>
          </div>
        )}

        {step === "rate" && (
          <form className="sessionSteps" onSubmit={handleSubmit}>
            <div>
              <span className="eyebrow">How well did you remember this?</span>
              <div className="ratingRow">
                {RATINGS.map((value) => {
                  const projectedDays = getAdaptiveIntervalDays({
                    previousIntervalDays: problem.lastIntervalDays ?? null,
                    easeFactor: problem.easeFactor ?? null,
                    rating: value
                  });
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`ratingButton ${value} ${rating === value ? "selected" : ""}`}
                      onClick={() => setRating(value)}
                      aria-pressed={rating === value}
                    >
                      <strong>{RATING_LABELS[value]}</strong>
                      <span>+{projectedDays}d</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="notesEditor">
              <div>
                <span className="eyebrow">Notes and Mistakes</span>
                <h3>Record what will help next time</h3>
              </div>
              <div className="miniFieldGrid">
                <label>
                  Approach
                  <textarea rows="3" value={approach} onChange={(event) => setApproach(event.target.value)} placeholder="How did you solve it?" />
                </label>
                <label>
                  Mistake
                  <textarea rows="3" value={mistake} onChange={(event) => setMistake(event.target.value)} placeholder="What went wrong?" />
                </label>
              </div>
              <label>
                Key Insight
                <textarea
                  rows="2"
                  value={keyInsight}
                  onChange={(event) => setKeyInsight(event.target.value)}
                  placeholder="The one thing to remember next time..."
                />
              </label>
            </div>

            <div className="drawerActions">
              <button className="button secondary" type="button" onClick={() => setStep("attempt")}>
                Back
              </button>
              <button className="button primary" type="submit" disabled={!rating}>
                <Save size={16} /> Complete revision
              </button>
            </div>
          </form>
        )}

        {step === "done" && result && (
          <div className="sessionSteps sessionDoneBody">
            <div className={`dialogIcon ${result.willBeMastered ? "trophy" : "success"}`}>
              {result.willBeMastered ? <Trophy size={22} /> : <CheckCircle2 size={22} />}
            </div>
            <h2>Revision saved</h2>
            <p className="muted">{problem.name}</p>
            {result.willBeMastered ? (
              <span className="statusBadge mastered">Mastered · 5 revisions complete</span>
            ) : (
              <p className="sessionNextReview">Next review · {humanDate(result.nextReviewDate)}</p>
            )}
            <div className="drawerActions sessionDoneActions">
              <button className="button primary" type="button" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </section>
    </div>,
    document.body
  );
}
