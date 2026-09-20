import { Inbox } from "lucide-react";

export default function EmptyState({ title, description, action }) {
  return (
    <div className="emptyState">
      <span className="emptyIcon">
        <Inbox size={18} />
      </span>
      <div className="emptyStateBody">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action && <div className="emptyStateAction">{action}</div>}
    </div>
  );
}
