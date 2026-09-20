import { BookmarkCheck } from "lucide-react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import ProblemCard from "../components/ProblemCard";
import { useApp } from "../context/AppContext";

export default function FuturePractice() {
  const { problems } = useApp();
  const futureProblems = problems.filter((problem) => problem.practiceLater && !problem.archived);

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">No date needed</span>
          <h1>Future Practice</h1>
          <p>Store selected problems here for whenever you want to revise them manually.</p>
        </div>
        <div className="countBadge">
          <BookmarkCheck size={18} /> {futureProblems.length} saved
        </div>
      </div>

      {futureProblems.length ? (
        <div className="problemList">
          {futureProblems.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} layout="row" futureMode />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nothing saved yet."
          description="Bookmark a problem to practice it later without a revision date."
          action={
            <Link className="button secondary" to="/problems">
              Browse problems
            </Link>
          }
        />
      )}
    </div>
  );
}
