import { BarChart3, CheckCircle2, Flame, Repeat2, Target, Trophy } from "lucide-react";
import ChartBar from "../components/ChartBar";
import EmptyState from "../components/EmptyState";
import StatCard from "../components/StatCard";
import { useApp } from "../context/AppContext";
import {
  calculateStreak,
  countBy,
  getActiveProblems,
  getCompletionRate,
  getMostPracticedTopic,
  getRatingDistribution,
  getRevisionCount,
  getStatusDistribution,
  getTopicPerformance,
  getWeakestTopic
} from "../utils/analytics";

export default function Analytics() {
  const { problems } = useApp();
  const active = getActiveProblems(problems);
  const completion = getCompletionRate(problems);
  const revisions = getRevisionCount(problems);
  const streak = calculateStreak(problems);
  const topicDistribution = countBy(active, "topic");
  const difficultyDistribution = countBy(active, "difficulty");
  const ratingDistribution = getRatingDistribution(problems);
  const statusDistribution = getStatusDistribution(problems);
  const topicPerformance = getTopicPerformance(problems);

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Insights</span>
          <h1>Analytics</h1>
          <p>Track your practice shape, revision volume, and topic balance.</p>
        </div>
      </div>

      <div className="grid three">
        <StatCard label="Total solved" value={active.length} detail="Active problems in the planner" icon={Trophy} tone="green" />
        <StatCard label="Total revisions" value={revisions} detail="Completed revision sessions" icon={Repeat2} tone="blue" />
        <StatCard label="Completion rate" value={`${completion}%`} detail="Problems through all stages" icon={CheckCircle2} tone="purple" progress={completion} />
      </div>

      <div className="statStrip">
        <div className="statStripItem">
          <Flame size={16} />
          <span>
            <strong>{streak.current}</strong> day streak <span className="muted">· best {streak.best}</span>
          </span>
        </div>
        <div className="statStripItem">
          <Target size={16} />
          <span>
            Weakest topic <strong>{getWeakestTopic(problems)}</strong>
          </span>
        </div>
        <div className="statStripItem">
          <BarChart3 size={16} />
          <span>
            Most practiced <strong>{getMostPracticedTopic(problems)}</strong>
          </span>
        </div>
      </div>

      <div className="sectionDivider">
        <span className="eyebrow">Distributions</span>
      </div>

      <div className="chartGrid">
        <ChartBar title="Topic distribution" data={topicDistribution} />
        <ChartBar title="Difficulty distribution" data={difficultyDistribution} />
        <ChartBar title="Recall quality" data={ratingDistribution} />
        <ChartBar title="Problem status" data={statusDistribution} />
      </div>

      <section className="card listCard">
        <div className="sectionHeader">
          <div>
            <span className="eyebrow">Patterns</span>
            <h2>Topic mastery</h2>
          </div>
        </div>
        {topicPerformance.length ? (
          <div className="miniList">
            {topicPerformance.map((row) => (
              <div key={row.topic}>
                <strong>{row.topic}</strong>
                <span>
                  {row.problemCount} problem{row.problemCount === 1 ? "" : "s"} · {row.revisionCount} revision
                  {row.revisionCount === 1 ? "" : "s"} ·{" "}
                  {row.averageQuality === null ? "No ratings yet" : `Avg recall ${row.averageQuality.toFixed(1)}/3`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Not enough data yet." description="Revise a few problems to see topic-level performance here." />
        )}
      </section>
    </div>
  );
}
