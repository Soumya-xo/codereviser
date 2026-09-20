import { CheckCheck } from "lucide-react";
import EmptyState from "../components/EmptyState";
import ProblemCard from "../components/ProblemCard";
import { useApp } from "../context/AppContext";
import { getDueProblems } from "../utils/analytics";
import { isOverdue } from "../utils/date";

export default function Today() {
  const { problems } = useApp();
  const due = getDueProblems(problems);
  const overdue = due.filter((problem) => isOverdue(problem.nextRevisionDate));
  const dueToday = due.filter((problem) => !isOverdue(problem.nextRevisionDate));

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Today</span>
          <h1>Revision queue</h1>
          <p>Overdue problems are shown first, then problems due today.</p>
        </div>
        <div className="countBadge">
          <CheckCheck size={18} /> {due.length} due
        </div>
      </div>

      {due.length ? (
        <>
          {overdue.length > 0 && (
            <section className="todaySection">
              <h2 className="sectionLabel overdueLabel">Overdue ({overdue.length})</h2>
              <div className="problemGrid">
                {overdue.map((problem) => (
                  <ProblemCard key={problem.id} problem={problem} compact />
                ))}
              </div>
            </section>
          )}
          {dueToday.length > 0 && (
            <section className="todaySection">
              <h2 className="sectionLabel">Due today ({dueToday.length})</h2>
              <div className="problemGrid">
                {dueToday.map((problem) => (
                  <ProblemCard key={problem.id} problem={problem} compact />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <EmptyState title="All clear today" description="No revisions are due. Your memory queue gets a quiet moment." />
      )}
    </div>
  );
}
