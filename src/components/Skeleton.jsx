export default function SkeletonGrid() {
  return (
    <div className="grid three">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="card skeletonCard" key={index}>
          <span />
          <strong />
          <p />
          <p />
        </div>
      ))}
    </div>
  );
}
