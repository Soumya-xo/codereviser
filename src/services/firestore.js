import {
  addDoc,
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch
} from "./firebase";

function userDocRef(uid) {
  return doc(db, "users", uid);
}

function problemsCollectionRef(uid) {
  return collection(db, "users", uid, "problems");
}

function problemDocRef(uid, problemId) {
  return doc(db, "users", uid, "problems", problemId);
}

function revisionsCollectionRef(uid, problemId) {
  return collection(db, "users", uid, "problems", problemId, "revisions");
}

export function subscribeToUserSettings(uid, onData, onError) {
  return onSnapshot(userDocRef(uid), onData, onError);
}

export function subscribeToProblems(uid, onData, onError) {
  return onSnapshot(
    problemsCollectionRef(uid),
    (snapshot) => onData(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))),
    onError
  );
}

export function saveUserSettings(uid, settings) {
  return setDoc(userDocRef(uid), { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
}

export function createProblemDoc(uid, problem) {
  return setDoc(problemDocRef(uid, problem.id), problem);
}

export function updateProblemDoc(uid, problemId, updates) {
  return updateDoc(problemDocRef(uid, problemId), updates);
}

export async function deleteProblemDoc(uid, problemId) {
  const revisionsSnapshot = await getDocs(revisionsCollectionRef(uid, problemId));
  const batch = writeBatch(db);
  revisionsSnapshot.docs.forEach((revisionDoc) => batch.delete(revisionDoc.ref));
  batch.delete(problemDocRef(uid, problemId));
  await batch.commit();
}

export function addRevisionRecord(uid, problemId, record) {
  return addDoc(revisionsCollectionRef(uid, problemId), record);
}

export async function commitRevision(uid, problemId, problemFields, record) {
  const batch = writeBatch(db);
  batch.update(problemDocRef(uid, problemId), problemFields);
  batch.set(doc(revisionsCollectionRef(uid, problemId)), record);
  await batch.commit();
}

export async function migrateLegacyUserDocIfNeeded(uid) {
  const legacySnapshot = await getDoc(userDocRef(uid));
  if (!legacySnapshot.exists()) return;

  const data = legacySnapshot.data();
  if (data.migratedToSubcollections || !Array.isArray(data.problems) || !data.problems.length) {
    if (!data.migratedToSubcollections) {
      await setDoc(userDocRef(uid), { migratedToSubcollections: true }, { merge: true });
    }
    return;
  }

  const batch = writeBatch(db);
  data.problems.forEach((problem) => {
    const { id, ...fields } = problem;
    if (!id) return;
    const realRevisions = (fields.revisionHistory || []).filter((entry) => !entry.scheduled);
    batch.set(problemDocRef(uid, id), {
      id,
      ...fields,
      revisionCount: fields.revisionCount ?? realRevisions.length
    });

    realRevisions.forEach((entry) => {
      const revisionRef = doc(revisionsCollectionRef(uid, id));
      batch.set(revisionRef, {
        reviewedAt: entry.date,
        rating: "legacy",
        previousIntervalDays: null,
        nextIntervalDays: null,
        revisionNumber: entry.stage ?? null,
        approach: "",
        mistake: "",
        keyInsight: ""
      });
    });
  });

  batch.set(userDocRef(uid), { migratedToSubcollections: true }, { merge: true });
  await batch.commit();
}
