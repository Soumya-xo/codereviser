import { Save, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getProblemMetadataFromUrl } from "../utils/problemMetadata";

const blankProblem = {
  name: "",
  platform: "LeetCode",
  difficulty: "Easy",
  topic: "",
  url: "",
  description: "",
  notes: "",
  dateSolved: new Date().toISOString().slice(0, 10),
  favorite: false
};

const platforms = ["LeetCode", "Codeforces", "CodeChef", "GeeksForGeeks", "HackerRank", "Other"];
const difficulties = ["Easy", "Medium", "Hard"];

export default function ProblemForm({ initialProblem, onSubmit, onClose }) {
  const [form, setForm] = useState(blankProblem);
  const [autoFillMessage, setAutoFillMessage] = useState("");

  useEffect(() => {
    if (!initialProblem) {
      setForm(blankProblem);
      return;
    }
    setForm({
      name: initialProblem.name,
      platform: initialProblem.platform,
      difficulty: initialProblem.difficulty,
      topic: initialProblem.topic,
      url: initialProblem.url,
      description: initialProblem.description || initialProblem.revisionNotes?.approach || "",
      notes: initialProblem.notes || initialProblem.revisionNotes?.comments || "",
      dateSolved: initialProblem.dateSolved,
      favorite: initialProblem.favorite
    });
  }, [initialProblem]);

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    if (name === "url") setAutoFillMessage("");
  }

  function autoFillFromUrl() {
    const metadata = getProblemMetadataFromUrl(form.url);
    if (!metadata) {
      setAutoFillMessage("Paste a problem URL first.");
      return;
    }

    setForm((current) => ({
      ...current,
      ...metadata,
      name: metadata.name || current.name,
      topic: metadata.topic || current.topic,
      difficulty: metadata.difficulty || current.difficulty,
      description: metadata.description || current.description
    }));

    setAutoFillMessage(
      metadata.name ? "Details filled from the URL." : "Platform detected. Add the remaining details manually."
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.topic.trim()) return;
    onSubmit(form);
    onClose();
  }

  return (
    <div className="drawerLayer" role="presentation">
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="problem-form-title">
        <div className="drawerHeader">
          <div>
            <span className="eyebrow">Problem</span>
            <h2 id="problem-form-title">{initialProblem ? "Edit problem" : "Add problem"}</h2>
          </div>
          <button className="iconButton" type="button" onClick={onClose} aria-label="Close form">
            <X size={18} />
          </button>
        </div>

        <form className="formGrid" onSubmit={handleSubmit}>
          <label>
            Problem Name
            <input name="name" value={form.name} onChange={updateField} required placeholder="Binary Tree Maximum Path Sum" />
          </label>
          <label>
            Topic
            <input name="topic" value={form.topic} onChange={updateField} required placeholder="Trees" />
          </label>
          <label>
            Platform
            <select name="platform" value={form.platform} onChange={updateField}>
              {platforms.map((platform) => (
                <option key={platform}>{platform}</option>
              ))}
            </select>
          </label>
          <label>
            Difficulty
            <select name="difficulty" value={form.difficulty} onChange={updateField}>
              {difficulties.map((difficulty) => (
                <option key={difficulty}>{difficulty}</option>
              ))}
            </select>
          </label>
          <label>
            URL
            <input name="url" value={form.url} onChange={updateField} placeholder="https://..." />
          </label>
          <div className="autoFillRow">
            <button className="button secondary" type="button" onClick={autoFillFromUrl}>
              <Sparkles size={16} /> Auto-fill from URL
            </button>
            {autoFillMessage && <span>{autoFillMessage}</span>}
          </div>
          <label>
            Date Solved
            <input name="dateSolved" type="date" value={form.dateSolved} onChange={updateField} />
          </label>
          <label className="full">
            Description
            <textarea
              name="description"
              rows="3"
              value={form.description}
              onChange={updateField}
              placeholder="Short auto-filled problem summary..."
            />
          </label>
          <div className="notesEditor full">
            <div>
              <span className="eyebrow">Your Notes</span>
              <h3>Write anything useful for revision</h3>
            </div>
            <label>
              Notes
              <textarea
                name="notes"
                rows="6"
                value={form.notes}
                onChange={updateField}
                placeholder="Your approach, mistakes, reminders, edge cases, comments, or anything you want..."
              />
            </label>
          </div>
          <label className="checkRow">
            <input name="favorite" type="checkbox" checked={form.favorite} onChange={updateField} />
            Favorite problem
          </label>
          <div className="drawerActions">
            <button className="button secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button primary" type="submit">
              <Save size={16} /> Save problem
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
