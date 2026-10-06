import { AlertTriangle, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "./EmptyState";

const severityLabel = { high: "High", medium: "Medium", low: "Low" };

function WeakAreaRow({ area, problemsById }) {
  const [open, setOpen] = useState(false);
  const related = area.problemIds.map((id) => problemsById.get(id)).filter(Boolean);

  return (
    <li className={`weakRow ${area.severity}`}>
      <button className="weakRowHead" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="severityDot" aria-hidden="true" />
        <strong className="weakLabel">{area.label}</strong>
        <span className="weakScore" aria-label={`Weakness score ${area.score} out of 100, ${severityLabel[area.severity]}`}>
          {area.score}
        </span>
        <ChevronDown size={16} className={open ? "chevronOpen" : ""} aria-hidden="true" />
      </button>
      <p className="weakReasons">{area.reasons.join(" · ") || "Needs more practice"}</p>
      {open && (
        <ul className="weakProblems">
          {related.map((problem) => (
            <li key={problem.id}>
              <Link to={`/problems/${problem.id}`}>{problem.name}</Link>
              <span className="muted">
                {problem.difficulty} · {problem.platform}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function WeakAreasPanel({ areas, problems }) {
  const problemsById = new Map(problems.map((problem) => [problem.id, problem]));

  return (
    <section className="card listCard">
      <div className="sectionHeader">
        <div>
          <span className="eyebrow">Practice focus</span>
          <h2>Weak areas</h2>
        </div>
        <AlertTriangle size={18} className="muted" aria-hidden="true" />
      </div>
      {areas.length ? (
        <ul className="weakList">
          {areas.map((area) => (
            <WeakAreaRow key={area.label} area={area} problemsById={problemsById} />
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No weak areas detected."
          description="Revise a few problems with varied recall to see where practice should focus."
        />
      )}
    </section>
  );
}
