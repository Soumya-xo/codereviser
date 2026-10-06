import { Link } from "react-router-dom";
import EmptyState from "./EmptyState";

const tierClass = { 1: "tierOverdue", 2: "tierLowRecall", 3: "tierWeak", 4: "tierDue", 5: "tierFuture", 6: "tierQuick" };

export default function TodaysFocus({ items }) {
  return (
    <section className="card listCard todaysFocus">
      <div className="sectionHeader">
        <div>
          <span className="eyebrow">Recommended order</span>
          <h2>Today&apos;s focus</h2>
        </div>
      </div>
      {items.length ? (
        <ol className="focusList">
          {items.map((item, index) => (
            <li key={item.problem.id} className={`focusItem ${tierClass[item.tier]}`}>
              <span className="focusRank monoValue">{index + 1}</span>
              <div className="focusBody">
                <Link className="focusName" to={`/problems/${item.problem.id}`}>
                  {item.problem.name}
                </Link>
                <span className="focusWhy">
                  {item.reason}
                  {item.detail ? <span className="muted"> · {item.detail}</span> : null}
                </span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="Nothing prioritised today." description="Your recommended order fills in as revisions come due." />
      )}
    </section>
  );
}
