import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import { useApp } from "../context/AppContext";
import { formatDate, humanDate, monthMatrix } from "../utils/date";

export default function Calendar() {
  const { problems } = useApp();
  const [activeDate, setActiveDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDate());

  const days = monthMatrix(activeDate);
  const today = formatDate();

  const byDate = useMemo(() => {
    const map = {};
    problems.forEach((problem) => {
      if (!problem.practiceLater && problem.nextRevisionDate) {
        map[problem.nextRevisionDate] = [...(map[problem.nextRevisionDate] || []), problem];
      }
      (problem.revisionHistory || [])
        .filter((entry) => !entry.scheduled)
        .forEach((entry) => {
          map[entry.date] = [...(map[entry.date] || []), { ...problem, completedOnDate: true }];
        });
    });
    return map;
  }, [problems]);

  const selectedProblems = byDate[selectedDate] || [];

  function moveMonth(delta) {
    setActiveDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Calendar</span>
          <h1>Monthly revision map</h1>
          <p>Red marks due revisions, green marks completed sessions, blue marks today.</p>
        </div>
      </div>

      <div className="calendarLayout">
        <section className="card calendarCard">
          <div className="calendarHeader">
            <button className="iconButton" type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <h2>{activeDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
            <button className="iconButton" type="button" onClick={() => moveMonth(1)} aria-label="Next month">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="weekGrid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="monthGrid">
            {days.map((day) => {
              const key = formatDate(day);
              const items = byDate[key] || [];
              const hasDue = items.some((item) => !item.completedOnDate);
              const completedCount = items.filter((item) => item.completedOnDate).length;
              const hasCompleted = completedCount > 0;
              const intensity = completedCount === 0 ? 0 : completedCount === 1 ? 1 : completedCount === 2 ? 2 : 3;
              const isToday = key === today;
              const isMuted = day.getMonth() !== activeDate.getMonth();
              return (
                <button
                  className={`calendarDay ${isMuted ? "mutedDay" : ""} ${isToday ? "todayDay" : ""} ${selectedDate === key ? "selectedDay" : ""}`}
                  key={key}
                  type="button"
                  data-intensity={intensity}
                  onClick={() => setSelectedDate(key)}
                >
                  <span className="dayNumber">{day.getDate()}</span>
                  <div className="dayDots">
                    {hasDue && <i className="dot redDot" />}
                    {hasCompleted && <i className="dot greenDot" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="calendarLegend">
            <span>
              <i className="dot redDot" /> Due
            </span>
            <span>
              <i className="dot greenDot" /> Completed
            </span>
            <span>
              <i className="legendRing" /> Today
            </span>
            <span>
              <i className="legendSwatch" /> More activity
            </span>
          </div>
        </section>

        <section className="card listCard">
          <span className="eyebrow">Selected date</span>
          <h2>{humanDate(selectedDate)}</h2>
          {selectedProblems.length ? (
            <div className="miniList">
              {selectedProblems.map((problem, index) => (
                <div key={`${problem.id}-${index}`}>
                  <strong>{problem.name}</strong>
                  <span className="dateEntryStatus">
                    <i className={`dot ${problem.completedOnDate ? "greenDot" : "redDot"}`} />
                    {problem.completedOnDate ? "Completed" : `Due · ${problem.topic}`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing here." description="No revisions scheduled or completed on this date." />
          )}
        </section>
      </div>
    </div>
  );
}
