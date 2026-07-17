import { Activity, CalendarClock, Flame, Gauge, Target, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState";
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

export default function Dashboard() {
  const { problems, recentlyViewed } = useApp();
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
  const recent = recentlyViewed.map((id) => problems.find((problem) => problem.id === id)).filter(Boolean);
  const upcoming = active
    .filter((problem) => problem.nextRevisionDate && !problem.completed)
    .sort((a, b) => a.nextRevisionDate.localeCompare(b.nextRevisionDate))
    .slice(0, 5);

  return (
    <div className="pageStack">
      <section className="heroBand">
        <div>
          <span className="eyebrow">Welcome back</span>
          <h1>Revise smarter, remember longer.</h1>
          <p>CodeRevise keeps your solved problems moving through a focused spaced-repetition queue.</p>
        </div>
        <div className="heroMetric">
          <Flame size={24} />
          <strong>{streak.current}</strong>
          <span>day streak</span>
        </div>
      </section>

      {loading ? (
        <SkeletonGrid />
      ) : (
        <div className="grid three">
          <StatCard label="Today's revisions" value={due.length} detail="Problems waiting in the queue" icon={CalendarClock} tone="red" />
          <StatCard label="Problems solved" value={active.length} detail={`${getRevisionCount(problems)} revisions logged`} icon={Trophy} tone="green" />
          <StatCard label="Completion" value={`${completion}%`} detail="Finished all five revision stages" icon={Gauge} tone="blue" progress={completion} />
          <StatCard label="Current streak" value={streak.current} detail={`Best streak: ${streak.best} days`} icon={Flame} tone="orange" />
          <StatCard label="Weakest topic" value={weakestTopic} detail="Based on due and hard problems" icon={Target} tone="purple" />
          <StatCard label="Revision health" value={due.length ? "Action needed" : "Clear"} detail="Keep today tidy for compounding memory" icon={Activity} />
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
            <EmptyState title="No upcoming work" description="Add problems to begin building your revision runway." />
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
          ) : (
            due.slice(0, 2).map((problem) => <ProblemCard key={problem.id} problem={problem} compact />)
          )}
        </section>
      </div>
    </div>
  );
}
