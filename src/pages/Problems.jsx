import { Filter, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import ProblemCard from "../components/ProblemCard";
import ProblemForm from "../components/ProblemForm";
import { useApp } from "../context/AppContext";
import { getProblemStatus, STATUS_LABELS } from "../utils/analytics";
import { isPastOrToday } from "../utils/date";

const all = "All";

export default function Problems() {
  const { problems, addProblem, updateProblem, deleteProblem, addSearchTerm, searchHistory } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    topic: all,
    difficulty: all,
    platform: all,
    status: all,
    favorites: false,
    due: false,
    completed: false,
    archiveStatus: "active"
  });

  const topics = [all, ...new Set(problems.map((problem) => problem.topic).filter(Boolean))];
  const platforms = [all, ...new Set(problems.map((problem) => problem.platform).filter(Boolean))];

  const visibleProblems = useMemo(() => {
    return problems
      .filter((problem) => {
        if (filters.archiveStatus === "archived") return problem.archived;
        if (filters.archiveStatus === "all") return true;
        return !problem.archived;
      })
      .filter((problem) => problem.name.toLowerCase().includes(query.toLowerCase()))
      .filter((problem) => filters.topic === all || problem.topic === filters.topic)
      .filter((problem) => filters.difficulty === all || problem.difficulty === filters.difficulty)
      .filter((problem) => filters.platform === all || problem.platform === filters.platform)
      .filter((problem) => filters.status === all || getProblemStatus(problem) === filters.status)
      .filter((problem) => !filters.favorites || problem.favorite)
      .filter((problem) => !filters.due || isPastOrToday(problem.nextRevisionDate))
      .filter((problem) => !filters.completed || problem.completed);
  }, [problems, query, filters]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function submitProblem(form) {
    if (editing) updateProblem(editing.id, form);
    else addProblem(form);
  }

  function handleSearchBlur() {
    addSearchTerm(query);
  }

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Library</span>
          <h1>Problems</h1>
          <p>Capture solved problems, tune the queue, and keep favorites close.</p>
        </div>
        <button className="button primary" type="button" onClick={openAdd}>
          <Plus size={17} /> Add problem
        </button>
      </div>

      <section className="card controlsCard">
        <div className="searchInput">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} onBlur={handleSearchBlur} placeholder="Search by problem name" />
        </div>
        <div className="filterGrid">
          <label>
            <Filter size={15} /> Topic
            <select value={filters.topic} onChange={(event) => setFilters({ ...filters, topic: event.target.value })}>
              {topics.map((topic) => (
                <option key={topic}>{topic}</option>
              ))}
            </select>
          </label>
          <label>
            Difficulty
            <select value={filters.difficulty} onChange={(event) => setFilters({ ...filters, difficulty: event.target.value })}>
              {[all, "Easy", "Medium", "Hard"].map((difficulty) => (
                <option key={difficulty}>{difficulty}</option>
              ))}
            </select>
          </label>
          <label>
            Platform
            <select value={filters.platform} onChange={(event) => setFilters({ ...filters, platform: event.target.value })}>
              {platforms.map((platform) => (
                <option key={platform}>{platform}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value={all}>{all}</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Archive
            <select value={filters.archiveStatus} onChange={(event) => setFilters({ ...filters, archiveStatus: event.target.value })}>
              <option value="active">Active only</option>
              <option value="archived">Archived only</option>
              <option value="all">All problems</option>
            </select>
          </label>
        </div>
        <div className="toggleRow">
          <label><input type="checkbox" checked={filters.favorites} onChange={(event) => setFilters({ ...filters, favorites: event.target.checked })} /> Favorites</label>
          <label><input type="checkbox" checked={filters.due} onChange={(event) => setFilters({ ...filters, due: event.target.checked })} /> Revision Due</label>
          <label><input type="checkbox" checked={filters.completed} onChange={(event) => setFilters({ ...filters, completed: event.target.checked })} /> Completed</label>
        </div>
        {searchHistory.length ? <p className="muted">Recent searches: {searchHistory.join(", ")}</p> : null}
      </section>

      {visibleProblems.length ? (
        <div className="problemGrid">
          {visibleProblems.map((problem) => (
            <ProblemCard
              key={problem.id}
              problem={problem}
              onEdit={(item) => {
                setEditing(item);
                setFormOpen(true);
              }}
              onDelete={setPendingDelete}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No problems found" description="Try a lighter filter set or add a new solved problem." action={<button className="button primary" onClick={openAdd}>Add problem</button>} />
      )}

      {formOpen && <ProblemForm initialProblem={editing} onSubmit={submitProblem} onClose={() => setFormOpen(false)} />}
      {pendingDelete && (
        <ConfirmDialog
          title="Delete problem?"
          description={`This removes "${pendingDelete.name}" from your planner.`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteProblem(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}
