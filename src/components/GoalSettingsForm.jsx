import { useState } from "react";

function toPositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export default function GoalSettingsForm({ goals, onSave, onCancel }) {
  const [dailySolve, setDailySolve] = useState(goals.dailySolve);
  const [dailyRevise, setDailyRevise] = useState(goals.dailyRevise);
  const [weeklySolve, setWeeklySolve] = useState(goals.weeklySolve);
  const [weeklyRevise, setWeeklyRevise] = useState(goals.weeklyRevise);

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      dailySolve: toPositiveInt(dailySolve),
      dailyRevise: toPositiveInt(dailyRevise),
      weeklySolve: toPositiveInt(weeklySolve),
      weeklyRevise: toPositiveInt(weeklyRevise)
    });
  }

  return (
    <form className="goalForm formGrid" onSubmit={handleSubmit}>
      <label>
        Daily solve target
        <input type="number" min="0" value={dailySolve} onChange={(event) => setDailySolve(event.target.value)} />
      </label>
      <label>
        Daily revise target
        <input type="number" min="0" value={dailyRevise} onChange={(event) => setDailyRevise(event.target.value)} />
      </label>
      <label>
        Weekly solve target
        <input type="number" min="0" value={weeklySolve} onChange={(event) => setWeeklySolve(event.target.value)} />
      </label>
      <label>
        Weekly revise target
        <input type="number" min="0" value={weeklyRevise} onChange={(event) => setWeeklyRevise(event.target.value)} />
      </label>
      <div className="full drawerActions">
        <button className="button secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="button primary" type="submit">
          Save goals
        </button>
      </div>
    </form>
  );
}
