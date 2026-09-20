import { CheckCheck, Repeat2, Settings2, Target } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import GoalProgressRow from "../components/GoalProgressRow";
import GoalSettingsForm from "../components/GoalSettingsForm";
import ProblemCard from "../components/ProblemCard";
import { useApp } from "../context/AppContext";
import { getDueProblems } from "../utils/analytics";
import { isOverdue } from "../utils/date";
import { getDailyProgress, getWeeklyProgress } from "../utils/goals";

export default function Today() {
  const { problems, goals, setGoals } = useApp();
  const [editingGoals, setEditingGoals] = useState(false);

  const due = getDueProblems(problems);
  const overdue = due.filter((problem) => isOverdue(problem.nextRevisionDate));
  const dueToday = due.filter((problem) => !isOverdue(problem.nextRevisionDate));

  const daily = getDailyProgress(problems, goals);
  const weekly = getWeeklyProgress(problems, goals);
  const overallPercentage = Math.round((daily.solve.percentage + daily.revise.percentage) / 2);

  const practiceNeeded = daily.solve.remaining;
  const practicePool = problems.filter((problem) => problem.practiceLater && !problem.archived);
  const practiceSuggestions = practicePool.slice(0, practiceNeeded);

  function handleSaveGoals(nextGoals) {
    setGoals(nextGoals);
    setEditingGoals(false);
  }

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Today</span>
          <h1>Daily planner</h1>
          <p>Overdue problems are shown first, then problems due today.</p>
        </div>
        <div className={`countBadge ${overdue.length ? "urgent" : ""}`}>
          <CheckCheck size={18} /> {due.length} due
        </div>
      </div>

      <section className="card goalsCard">
        <div className="sectionHeader">
          <div>
            <span className="eyebrow">Daily progress</span>
            <h2>Today&apos;s goals</h2>
          </div>
          <button className="button secondary" type="button" onClick={() => setEditingGoals((value) => !value)}>
            <Settings2 size={16} /> {editingGoals ? "Close" : "Edit goals"}
          </button>
        </div>

        {editingGoals ? (
          <GoalSettingsForm goals={goals} onSave={handleSaveGoals} onCancel={() => setEditingGoals(false)} />
        ) : (
          <>
            <div className="goalGrid">
              <GoalProgressRow label="Solve" metric={daily.solve} tone="blue" icon={Target} />
              <GoalProgressRow label="Revise" metric={daily.revise} tone="green" icon={Repeat2} />
            </div>
            <p className="goalWeeklyRow">
              This week · Solve {weekly.solve.completed}/{weekly.solve.target} ({weekly.solve.percentage}%) · Revise{" "}
              {weekly.revise.completed}/{weekly.revise.target} ({weekly.revise.percentage}%)
            </p>
          </>
        )}
      </section>

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
        <EmptyState
          title="Caught up."
          description="Nothing needs revision right now."
          action={
            <Link className="button secondary" to="/problems">
              Browse problems
            </Link>
          }
        />
      )}

      {practiceSuggestions.length > 0 && (
        <section className="todaySection">
          <h2 className="sectionLabel">Practice for today&apos;s solve goal</h2>
          <div className="problemGrid">
            {practiceSuggestions.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} compact futureMode />
            ))}
          </div>
        </section>
      )}

      <section className="card goalsCard progressSummary">
        <div className="radialProgress" style={{ "--pct": overallPercentage }} role="img" aria-label={`${overallPercentage}% overall daily completion`}>
          <div className="radialProgressInner">
            <strong>{overallPercentage}%</strong>
          </div>
        </div>
        <div>
          <span className="eyebrow">Progress</span>
          <h2>Overall daily completion</h2>
          <p>{overallPercentage}% of today&apos;s solve and revise goals complete.</p>
        </div>
      </section>
    </div>
  );
}
