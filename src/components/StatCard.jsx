export default function StatCard({ label, value, detail, icon: Icon, tone = "neutral", progress }) {
  return (
    <section className={`card statCard ${tone}`}>
      <div className="statTop">
        <span>{label}</span>
        {Icon && <Icon size={19} />}
      </div>
      <strong>{value}</strong>
      {typeof progress === "number" ? (
        <div className="progressTrack" aria-label={`${label} progress`}>
          <span style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      ) : null}
      <p>{detail}</p>
    </section>
  );
}
