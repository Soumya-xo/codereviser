import { ArrowRight, CalendarClock, Flame, Gauge, PlayCircle, Repeat2, Target, TrendingUp, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import GoalProgressRow from "../components/GoalProgressRow";
import ProblemCard from "../components/ProblemCard";
import SkeletonGrid from "../components/Skeleton";
import StatCard from "../components/StatCard";
import { useApp } from "../context/AppContext";
import {
  calculateStreak,
  getActiveProblems,
  getCompletionRate,
  getDueProblems,
  getRevisionCount,
  getWeakestTopic
} from "../utils/analytics";
import { humanDate } from "../utils/date";
import { getDailyProgress } from "../utils/goals";

export default function Dashboard() {
  const { problems, recentlyViewed, goals } = useApp();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, []);

  const active = getActiveProblems(problems);
  const due = getDueProblems(problems);
  const completion = getCompletionRate(problems);
  const streak = calculateStreak(problems);
  const weakestTopic = getWeakestTopic(problems);
  const daily = getDailyProgress(problems, goals);
  const todayGoalPercentage = Math.round((daily.solve.percentage + daily.revise.percentage) / 2);
  const recent = recentlyViewed.map((id) => problems.find((problem) => problem.id === id)).filter(Boolean);
  const upcoming = active
    .filter((problem) => !problem.practiceLater && problem.nextRevisionDate && !problem.completed)
    .sort((a, b) => a.nextRevisionDate.localeCompare(b.nextRevisionDate))
    .slice(0, 5);

  return (
    <div className="pageStack">
      <section className="heroBand">
        <div>
          <span className="eyebrow">Welcome back</span>
          <h1>Revise smarter, remember longer.</h1>
          <p>CodeRevise keeps your solved problems moving through a focused spaced-repetition queue.</p>
          <div className="heroStats">
            <span className="heroStat">
              <CalendarClock size={15} /> {due.length} due today
            </span>
            <span className="heroStat">
              <TrendingUp size={15} /> {todayGoalPercentage}% of today&apos;s goals
            </span>
          </div>
        </div>
        <div className="heroMetric">
          <Flame size={24} />
          <strong>{streak.current}</strong>
          <span>day streak</span>
        </div>
      </section>

      <section className="card focusBand">
        <div className="focusMain">
          <span className="eyebrow">Today&apos;s focus</span>
          <h2>{due.length ? `${due.length} revision${due.length === 1 ? "" : "s"} due` : "You're all caught up"}</h2>
          <p>{due.length ? "Clear the queue while it's still fresh in mind." : "No revisions waiting - great time to solve something new."}</p>
          <Link className="button primary sessionCta" to="/today">
            <PlayCircle size={16} /> Start Today&apos;s Session <ArrowRight size={15} />
          </Link>
        </div>
        <div className="focusGoals">
          <GoalProgressRow label="Solve" metric={daily.solve} tone="blue" icon={Target} />
          <GoalProgressRow label="Revise" metric={daily.revise} tone="green" icon={Repeat2} />
        </div>
      </section>

      {loading ? (
        <SkeletonGrid />
      ) : (
        <div className="grid three">
          <StatCard label="Problems solved" value={active.length} detail={`${getRevisionCount(problems)} revisions logged`} icon={Trophy} tone="green" />
          <StatCard label="Completion" value={`${completion}%`} detail="Finished all five revision stages" icon={Gauge} tone="blue" progress={completion} />
          <StatCard label="Weakest topic" value={weakestTopic} detail="Based on due and hard problems" icon={Target} tone="purple" />
        </div>
      )}

      <div className="splitGrid">
        <section className="card listCard">
          <div className="sectionHeader">
            <div>
              <span className="eyebrow">Schedule</span>
              <h2>Upcoming revisions</h2>
            </div>
          </div>
          {upcoming.length ? (
            <div className="timeline">
              {upcoming.map((problem) => (
                <div className="timelineItem" key={problem.id}>
                  <span />
                  <div>
                    <strong>{problem.name}</strong>
                    <p>
                      {problem.topic} · {humanDate(problem.nextRevisionDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nothing scheduled."
              description="Add a solved problem to start your revision queue."
              action={
                <Link className="button secondary" to="/problems">
                  Add a problem
                </Link>
              }
            />
          )}
        </section>

        <section className="card listCard">
          <div className="sectionHeader">
            <div>
              <span className="eyebrow">Activity</span>
              <h2>Recent activity</h2>
            </div>
          </div>
          {recent.length ? (
            <div className="miniList">
              {recent.map((problem) => (
                <div key={problem.id}>
                  <strong>{problem.name}</strong>
                  <span>{problem.topic}</span>
                </div>
              ))}
            </div>
          ) : due.length ? (
            due.slice(0, 2).map((problem) => <ProblemCard key={problem.id} problem={problem} compact />)
          ) : (
            <EmptyState title="Nothing viewed yet." description="Problems you open will show up here." />
          )}
        </section>
      </div>
    </div>
  );
}
