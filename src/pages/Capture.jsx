import { CheckCircle2, ExternalLink, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { normalizeProblemUrl } from "../utils/problemIdentity";
import { getProblemMetadataFromUrl } from "../utils/problemMetadata";

const processedCaptureKeys = new Set();

export default function Capture() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { captureProblem, cloudReady, problems } = useApp();
  const [status, setStatus] = useState("ready");

  const url = searchParams.get("url") || "";
  const pageTitle = searchParams.get("title") || "";
  const normalizedUrl = normalizeProblemUrl(url);

  const capturedProblem = useMemo(() => {
    const metadata = getProblemMetadataFromUrl(url);
    if (!metadata) return null;

    const genericNames = ["Coding Problem", "CodeChef Problem", "Codeforces Problem", "HackerRank Challenge"];
    return {
      ...metadata,
      name: genericNames.includes(metadata.name) && pageTitle ? pageTitle : metadata.name,
      dateSolved: new Date().toISOString().slice(0, 10),
      notes: "",
      favorite: false
    };
  }, [pageTitle, url]);

  const alreadyExists = problems.some((problem) => normalizeProblemUrl(problem.url) === normalizedUrl);

  useEffect(() => {
    if (!capturedProblem || !cloudReady || status !== "ready") return;

    const captureKey = `${normalizedUrl}:${capturedProblem.name}`;
    if (processedCaptureKeys.has(captureKey)) {
      setStatus("saving");
      return;
    }

    processedCaptureKeys.add(captureKey);
    captureProblem(capturedProblem);
    setStatus("saving");
  }, [alreadyExists, captureProblem, capturedProblem, cloudReady, navigate, normalizedUrl, status]);

  useEffect(() => {
    if (status !== "saving" || !alreadyExists) return;

    setStatus("saved");
    navigate("/problems", { replace: true });
  }, [alreadyExists, navigate, normalizedUrl, status]);

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Browser capture</span>
          <h1>One-click problem capture</h1>
          <p>Problem details are detected from the URL and saved to your current CodeRevise account.</p>
        </div>
      </div>

      <section className="card captureCard">
        {capturedProblem ? (
          <>
            <div className="captureStatus">
              <CheckCircle2 size={22} />
              <div>
                <h2>{status === "saving" ? "Saving problem" : alreadyExists ? "Already in your planner" : "Problem captured"}</h2>
                <p>
                  {status === "saving"
                    ? "Adding it to your current account..."
                    : alreadyExists
                      ? "This URL already exists in your problem list."
                      : "Saved with detected details."}
                </p>
              </div>
            </div>

            <div className="captureDetails">
              <div>
                <span>Problem</span>
                <strong>{capturedProblem.name}</strong>
              </div>
              <div>
                <span>Platform</span>
                <strong>{capturedProblem.platform}</strong>
              </div>
              <div>
                <span>Difficulty</span>
                <strong>{capturedProblem.difficulty}</strong>
              </div>
              <div>
                <span>Topic</span>
                <strong>{capturedProblem.topic}</strong>
              </div>
            </div>

            <p className="muted">{capturedProblem.description}</p>

            <div className="problemActions">
              <Link className="button primary" to="/problems">
                <Plus size={16} /> View in Problems
              </Link>
              <a className="button secondary" href={url} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> Open original
              </a>
            </div>
          </>
        ) : (
          <div className="captureStatus errorText">
            <ExternalLink size={22} />
            <div>
              <h2>No URL received</h2>
              <p>Use the browser extension button from a problem page to capture it.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
