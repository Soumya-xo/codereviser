import { Inbox } from "lucide-react";

export default function EmptyState({ title, description, action }) {
  return (
    <div className="emptyState">
      <Inbox size={34} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
