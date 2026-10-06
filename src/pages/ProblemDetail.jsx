import { Archive, ArchiveRestore, ArrowLeft, BookmarkCheck, Edit3, ExternalLink, Play, Star } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import ProblemForm from "../components/ProblemForm";
import RevisionSession from "../components/RevisionSession";
import { useApp } from "../context/AppContext";
import { humanDate } from "../utils/date";
import { getProblemDetailModel, recallLabel } from "../utils/learning";
import { patternLabel } from "../utils/patternDetection";

function Field({ label, children }) {
  return (
    <div className="detailField">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

function Note({ label, value }) {
  return (
    <article className="detailNote">
      <span>{label}</span>
      <p className={value ? "" : "muted"}>{value || "Not recorded yet."}</p>
    </article>
  );
}

const kindClass = { scheduled: "scheduled", practice: "practice", revision: "revision" };

export default function ProblemDetail() {
  const { problemId } = useParams();
  const { problems, toggleArchive, toggleFavorite, togglePracticeLater, updateProblem } = useApp();
  const [sessionOpen, setSessionOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const problem = problems.find((item) => item.id === problemId);
  if (!problem) {
    return (
      <div className="pageStack">
        <EmptyState
          title="Problem not found"
          description="It may have been deleted or is not in this account."
          action={
            <Link className="button secondary" to="/problems">
              <ArrowLeft size={16} /> Back to problems
            </Link>
          }
        />
      </div>
    );
  }

  const model = getProblemDetailModel(problem);
  const difficultyClass = { Easy: "easy", Medium: "medium", Hard: "hard" }[model.difficulty] || "";

  return (
    <div className="pageStack detailPage">
      <div>
        <Link className="linkButton detailBack" to="/problems">
          <ArrowLeft size={16} /> Problems
        </Link>
      </div>

      <div className="detailHeader">
        <div className="detailTitleBlock">
          <span className="eyebrow">Problem</span>
          <h1>{model.name}</h1>
          <div className="detailMeta">
            <span className={`difficulty ${difficultyClass}`}>{model.difficulty}</span>
            <span className="rowMetaText">{model.platform}</span>
            <span className={`rowStatus ${model.status}`}>
              <i className="statusDot" />
              {model.statusLabel}
            </span>
            {model.favorite && <span className="rowMetaText">Focus list</span>}
          </div>
          <div className="detailChips" aria-label="Patterns and topics">
            <span className="patternChip">{patternLabel(model.patterns)}</span>
            {model.topics.map((topic) => (
              <span key={topic} className="topicChip">
                {topic}
              </span>
            ))}
          </div>
        </div>
        <div className="detailHeaderActions">
          <button
            className={`iconButton ${model.favorite ? "favoriteOn" : ""}`}
            type="button"
            onClick={() => toggleFavorite(problem.id)}
            aria-pressed={model.favorite}
            aria-label={model.favorite ? "Remove from favorites" : "Add to favorites"}
            title="Favorite"
          >
            <Star size={18} fill={model.favorite ? "currentColor" : "none"} />
          </button>
          {model.url && (
            <a className="button secondary" href={model.url} target="_blank" rel="noreferrer">
              <ExternalLink size={16} /> Open original
            </a>
          )}
        </div>
      </div>

      <div className="detailActions">
        <button className="button primary" type="button" onClick={() => setSessionOpen(true)}>
          <Play size={16} /> Start revision
        </button>
        <button className="button secondary" type="button" onClick={() => togglePracticeLater(problem.id)}>
          <BookmarkCheck size={16} /> {model.practiceLater ? "Remove from Future Practice" : "Add to Future Practice"}
        </button>
        <button className="button secondary" type="button" onClick={() => setFormOpen(true)}>
          <Edit3 size={16} /> Edit problem
        </button>
        <button className="button subtle" type="button" onClick={() => toggleArchive(problem.id)}>
          {model.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />} {model.archived ? "Restore" : "Archive"}
        </button>
      </div>

      <div className="detailGrid">
        <section className="card detailCard">
          <span className="eyebrow">Revision</span>
          <div className="detailFields">
            <Field label="Current status">{model.statusLabel}</Field>
            <Field label="Next review">
              {model.nextReview ? (
                <span className={model.overdue ? "overdueText" : ""}>
                  {humanDate(model.nextReview)}
                  {model.overdue ? " · overdue" : ""}
                </span>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Revision count">
              <span className="monoValue">{model.revisionCount}</span>
            </Field>
            <Field label="Ease factor">
              <span className="monoValue">{Number(model.easeFactor).toFixed(2)}</span>
            </Field>
            <Field label="Last revised">{model.lastRevised ? humanDate(model.lastRevised) : "Never"}</Field>
            <Field label="Current interval">
              {model.lastIntervalDays ? <span className="monoValue">{model.lastIntervalDays} days</span> : "—"}
            </Field>
            <Field label="Latest recall">{model.latestRating ? recallLabel(model.latestRating) : "Not rated"}</Field>
          </div>
        </section>

        <section className="card detailCard">
          <span className="eyebrow">Learning</span>
          <div className="detailNotes">
            <Note label="Notes" value={model.notes} />
            <Note label="Approach" value={model.approach} />
            <Note label="Mistakes" value={model.mistake} />
            <Note label="Key insight" value={model.keyInsight} />
          </div>
        </section>
      </div>

      <section className="card detailCard">
        <span className="eyebrow">History</span>
        {model.timeline.length ? (
          <ol className="historyList">
            {model.timeline.map((entry) => {
              const meta = [entry.kindLabel, entry.ratingText, entry.intervalDays ? `next in ${entry.intervalDays}d` : null]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={entry.key} className={`historyItem ${kindClass[entry.kind]}`}>
                  <time className="historyDate" dateTime={entry.date}>
                    {humanDate(entry.date)}
                  </time>
                  <span className="historyDot" aria-hidden="true" />
                  <div className="historyBody">
                    <span className="historyMeta">{meta}</span>
                    {entry.mistake && <p>Forgot or confused: {entry.mistake}</p>}
                    {entry.keyInsight && <p>Remember: {entry.keyInsight}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="muted">No revisions yet. Start a revision to build this timeline.</p>
        )}
      </section>

      {sessionOpen && <RevisionSession problem={problem} onClose={() => setSessionOpen(false)} />}
      {formOpen && (
        <ProblemForm
          initialProblem={problem}
          onSubmit={(form) => updateProblem(problem.id, form)}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}
