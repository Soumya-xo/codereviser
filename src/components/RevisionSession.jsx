import { ExternalLink, Save, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../context/AppContext";
import { humanDate } from "../utils/date";
import { getAdaptiveIntervalDays, RATING_LABELS, RATINGS } from "../utils/revision";

export default function RevisionSession({ problem, onClose }) {
  const { completeRevision } = useApp();
  const [step, setStep] = useState("attempt");
  const [rating, setRating] = useState("");
  const [approach, setApproach] = useState(problem.revisionNotes?.approach || "");
  const [mistake, setMistake] = useState(problem.revisionNotes?.mistake || "");
  const [keyInsight, setKeyInsight] = useState(problem.revisionNotes?.keyInsight || "");

  function handleSubmit(event) {
    event.preventDefault();
    if (!rating) return;
    completeRevision(problem.id, { rating, approach, mistake, keyInsight });
    onClose();
  }

  return createPortal(
    <div className="dialogLayer" role="presentation">
      <section className="dialog notesDialog" role="dialog" aria-modal="true" aria-labelledby="revision-session-title">
        <div className="drawerHeader">
          <div>
            <span className="eyebrow">Revision Session</span>
            <h2 id="revision-session-title">{problem.name}</h2>
          </div>
          <button className="iconButton" type="button" onClick={onClose} aria-label="Close revision session">
            <X size={18} />
          </button>
        </div>

        {step === "attempt" ? (
          <div className="sessionSteps">
            <p className="muted">
              Open the original problem, attempt it without looking at your previous notes, then come back here to rate
              your recall.
            </p>
            <div className="tagRow">
              <span>{problem.topic}</span>
              <span>{problem.difficulty}</span>
              <span>{problem.platform}</span>
            </div>
            {problem.revisionCount > 0 && (
              <p className="muted">
                You've revised this {problem.revisionCount} time{problem.revisionCount === 1 ? "" : "s"} before
                {problem.lastRevised ? `, last on ${humanDate(problem.lastRevised)}` : ""}.
              </p>
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
        ) : (
          <form className="sessionSteps" onSubmit={handleSubmit}>
            <div>
              <span className="eyebrow">How well did you recall it?</span>
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
      </section>
    </div>,
    document.body
  );
}
