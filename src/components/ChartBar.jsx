export default function ChartBar({ title, data }) {
  const entries = Object.entries(data);
  const max = Math.max(...entries.map((entry) => entry[1]), 1);

  return (
    <section className="card chartCard">
      <h3>{title}</h3>
      <div className="chartRows">
        {entries.length ? (
          entries.map(([label, value]) => (
            <div className="chartRow" key={label}>
              <div className="chartMeta">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
              <div className="chartTrack">
                <span style={{ width: `${(value / max) * 100}%` }} />
              </div>
            </div>
          ))
        ) : (
          <p className="muted">No data yet.</p>
        )}
      </div>
    </section>
  );
}
