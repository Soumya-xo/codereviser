import { FileText, MessageSquareText, X } from "lucide-react";

export default function NotesDialog({ problem, onClose }) {
  const oldNotes = problem.revisionNotes || {};
  const sections = [
    { label: "Description", value: problem.description || oldNotes.approach, icon: FileText },
    { label: "Your Notes", value: problem.notes || oldNotes.comments, icon: MessageSquareText }
  ];

  return (
    <div className="dialogLayer" role="presentation">
      <section className="dialog notesDialog" role="dialog" aria-modal="true" aria-labelledby="notes-title">
        <div className="drawerHeader">
          <div>
            <span className="eyebrow">Revision Notes</span>
            <h2 id="notes-title">{problem.name}</h2>
          </div>
          <button className="iconButton" type="button" onClick={onClose} aria-label="Close notes">
            <X size={18} />
          </button>
        </div>

        <div className="notesSections">
          {sections.map((section) => (
            <article key={section.label} className="noteSection">
              <div>
                <section.icon size={17} />
                <strong>{section.label}</strong>
              </div>
              <p>{section.value || "Not added yet."}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
