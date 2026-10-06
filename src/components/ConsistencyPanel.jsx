import { Flame } from "lucide-react";

function dayLabel(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: "short" });
}

const levelTitle = ["No activity", "1 action", "2–3 actions", "4–5 actions", "6+ actions"];

export default function ConsistencyPanel({ consistency }) {
  const { currentStreak, longestStreak, problemsRevised, problemsCaptured, recallAccuracy, weekly, weeklyTotal, heatmap } = consistency;

  return (
    <section className="card listCard consistencyCard">
      <div className="sectionHeader">
        <div>
          <span className="eyebrow">Consistency</span>
          <h2>Revision activity</h2>
        </div>
        <Flame size={18} className="muted" aria-hidden="true" />
      </div>

      <dl className="consistencyStats">
        <div>
          <dt>Current streak</dt>
          <dd className="monoValue">{currentStreak}d</dd>
        </div>
        <div>
          <dt>Longest streak</dt>
          <dd className="monoValue">{longestStreak}d</dd>
        </div>
        <div>
          <dt>Problems revised</dt>
          <dd className="monoValue">{problemsRevised}</dd>
        </div>
        <div>
          <dt>Problems captured</dt>
          <dd className="monoValue">{problemsCaptured}</dd>
        </div>
        <div>
          <dt>Recall quality</dt>
          <dd className="monoValue">{recallAccuracy === null ? "—" : `${recallAccuracy}%`}</dd>
          <small className="muted">Good or Perfect</small>
        </div>
      </dl>

      <div className="weekStrip" aria-label={`Last 7 days: ${weeklyTotal} actions`}>
        {weekly.map((day) => (
          <div key={day.date} className="weekDay">
            <span className="monoValue">{day.count}</span>
            <small className="muted">{dayLabel(day.date)}</small>
          </div>
        ))}
      </div>

      <div className="heatmapScroll">
        <div className="heatmap" role="img" aria-label="Revision activity over the last 12 weeks">
          {Array.from({ length: heatmap.leadingBlanks }, (_, index) => (
            <span key={`blank-${index}`} className="heatCell blank" />
          ))}
          {heatmap.days.map((day) => (
            <span
              key={day.date}
              className={`heatCell level-${day.level}`}
              title={`${day.date}: ${levelTitle[day.level]}`}
            />
          ))}
        </div>
      </div>
      <p className="muted heatLegend">Counts real revisions and practice sessions only. Opening or capturing a problem does not count.</p>
    </section>
  );
}
