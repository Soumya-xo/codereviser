import { BarChart3, CheckCircle2, Flame, Repeat2, Target, Trophy } from "lucide-react";
import ChartBar from "../components/ChartBar";
import StatCard from "../components/StatCard";
import { useApp } from "../context/AppContext";
import {
  calculateStreak,
  countBy,
  getActiveProblems,
  getCompletionRate,
  getMostPracticedTopic,
  getRevisionCount,
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
        <StatCard label="Current streak" value={streak.current} detail={`Best streak: ${streak.best} days`} icon={Flame} tone="orange" />
        <StatCard label="Weakest topic" value={getWeakestTopic(problems)} detail="Topic needing the most attention" icon={Target} tone="red" />
        <StatCard label="Most practiced" value={getMostPracticedTopic(problems)} detail="Highest revision history volume" icon={BarChart3} />
      </div>

      <div className="splitGrid">
        <ChartBar title="Topic distribution" data={topicDistribution} />
        <ChartBar title="Difficulty distribution" data={difficultyDistribution} />
      </div>
    </div>
  );
}
