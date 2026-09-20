import { CheckCircle2 } from "lucide-react";

export default function GoalProgressRow({ label, metric, tone = "blue", icon: Icon }) {
  const isComplete = metric.target > 0 && metric.completed >= metric.target;

  return (
    <div className={`goalMetric ${isComplete ? "goalComplete" : ""}`}>
      <div className="goalMetricHeader">
        <span className="goalMetricLabel">
          {Icon && <Icon size={15} />}
          {label}
        </span>
        <strong>
          {metric.completed} / {metric.target}
        </strong>
      </div>
      <div className={`progressTrack goalTrack ${tone}`} aria-label={`${label} progress`}>
        <span style={{ width: `${metric.percentage}%` }} />
      </div>
      <p className="goalMetricFoot">
        {isComplete ? (
          <span className="goalCompleteTag">
            <CheckCircle2 size={13} /> {label} goal complete
          </span>
        ) : (
          `${metric.remaining} left today · ${metric.percentage}%`
        )}
      </p>
    </div>
  );
}
