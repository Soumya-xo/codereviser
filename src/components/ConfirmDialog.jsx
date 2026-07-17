import { TriangleAlert } from "lucide-react";

export default function ConfirmDialog({ title, description, onConfirm, onCancel }) {
  return (
    <div className="dialogLayer" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialogIcon">
          <TriangleAlert size={22} />
        </div>
        <h2 id="dialog-title">{title}</h2>
        <p>{description}</p>
        <div className="dialogActions">
          <button className="button secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="button danger" type="button" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </section>
    </div>
  );
}
