import { BookmarkCheck, CheckCircle2, ExternalLink, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  canAddToFuturePractice,
  decideCaptureOutcome,
  problemFocusPath,
  resolveCaptureDetails
} from "../utils/captureDetails";
import { normalizeProblemUrl } from "../utils/problemIdentity";
import { getProblemMetadataFromUrl } from "../utils/problemMetadata";

const savedCaptureKeys = new Set();

export default function Capture() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addProblem, captureProblem, cloudReady, problems, togglePracticeLater } = useApp();
  const [outcome, setOutcome] = useState(null);
  const [futureAdded, setFutureAdded] = useState(false);

  const paramsKey = searchParams.toString();
  const url = searchParams.get("url") || "";
  const normalizedUrl = normalizeProblemUrl(url);

  const capturedProblem = useMemo(() => {
    const params = new URLSearchParams(paramsKey);
    return resolveCaptureDetails(
      {
        title: params.get("title") || "",
        platform: params.get("platform") || "",
        difficulty: params.get("difficulty") || "",
        topics: params.getAll("topic"),
        description: params.get("description") || "",
        fromExtension: params.get("source") === "extension"
      },
      getProblemMetadataFromUrl(url)
    );
  }, [paramsKey, url]);

  const alreadyExists = problems.some((problem) => normalizeProblemUrl(problem.url) === normalizedUrl);
  const savedProblem = problems.find((problem) => normalizeProblemUrl(problem.url) === normalizedUrl);

  useEffect(() => {
    if (outcome || !capturedProblem) return;
    const decision = decideCaptureOutcome({ ready: cloudReady, alreadyExists });
    if (!decision) return;

    if (decision === "duplicate") {
      setOutcome("duplicate");
      return;
    }

    const captureKey = `${normalizedUrl}:${capturedProblem.name}`;
    if (savedCaptureKeys.has(captureKey)) return;
    savedCaptureKeys.add(captureKey);
    captureProblem(capturedProblem);
    setOutcome("captured");
  }, [alreadyExists, captureProblem, capturedProblem, cloudReady, normalizedUrl, outcome]);

  function captureAnyway() {
    addProblem(capturedProblem);
    setOutcome("copy");
  }

  function addToFuturePractice() {
    if (!canAddToFuturePractice({ problem: savedProblem, pending: futureAdded })) return;
    togglePracticeLater(savedProblem.id);
    setFutureAdded(true);
  }

  const futureDone = futureAdded || Boolean(savedProblem?.practiceLater);
  const futureDisabled = futureDone || !savedProblem;
  const openPath = savedProblem ? problemFocusPath(savedProblem.id) : "/problems";

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Browser capture</span>
          <h1>One-click problem capture</h1>
          <p>Review the problem details, then save them to your CodeRevise account.</p>
        </div>
      </div>

      <section className="card captureCard">
        {capturedProblem ? (
          outcome === "captured" || outcome === "copy" ? (
            <div className="capturePanel">
              <div className="captureStatus">
                <CheckCircle2 size={22} />
                <div>
                  <h2>{outcome === "copy" ? "Saved as a new entry" : "Problem captured"}</h2>
                  <p className="captureName">{capturedProblem.name}</p>
                  <p className="muted">
                    {capturedProblem.difficulty} · {capturedProblem.platform}
                  </p>
                </div>
              </div>

              <p className="captureQuestion">What would you like to do?</p>

              <div className="problemActions">
                <Link className="button primary" to={openPath}>
                  <ExternalLink size={16} /> Open Problem
                </Link>
                {outcome === "captured" &&
                  (futureDone ? (
                    <span className="captureDone">
                      <BookmarkCheck size={16} /> {futureAdded ? "Added to Future Practice" : "In Future Practice"}
                    </span>
                  ) : (
                    <button className="button secondary" type="button" onClick={addToFuturePractice} disabled={futureDisabled}>
                      <BookmarkCheck size={16} /> Add to Future Practice
                    </button>
                  ))}
                <button className="button secondary" type="button" onClick={() => navigate("/")}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="captureStatus">
                <CheckCircle2 size={22} />
                <div>
                  <h2>{outcome === "duplicate" ? "Already captured" : "Problem detected"}</h2>
                  <p>{outcome === "duplicate" ? "This URL is already in your problem list." : "Checking your planner..."}</p>
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

              {outcome === "duplicate" && (
                <div className="problemActions">
                  <Link className="button primary" to={openPath}>
                    <ExternalLink size={16} /> Open Problem
                  </Link>
                  <button className="button secondary" type="button" onClick={captureAnyway}>
                    <Plus size={16} /> Capture Anyway
                  </button>
                </div>
              )}
            </>
          )
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
