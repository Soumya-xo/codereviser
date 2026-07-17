import { CheckCheck } from "lucide-react";
import EmptyState from "../components/EmptyState";
import ProblemCard from "../components/ProblemCard";
import { useApp } from "../context/AppContext";
import { getDueProblems } from "../utils/analytics";

export default function Today() {
  const { problems } = useApp();
  const due = getDueProblems(problems);

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Today</span>
          <h1>Revision queue</h1>
          <p>Only problems scheduled for today or earlier are shown here.</p>
        </div>
        <div className="countBadge">
          <CheckCheck size={18} /> {due.length} due
        </div>
      </div>

      {due.length ? (
        <div className="problemGrid">
          {due.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} compact />
          ))}
        </div>
      ) : (
        <EmptyState title="All clear today" description="No revisions are due. Your memory queue gets a quiet moment." />
      )}
    </div>
  );
}
