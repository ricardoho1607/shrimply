import { doc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
export async function previewSopPondChange(
  companyId: string,
  pond: { id: string; pondName: string; blockId?: string },
) {
  const company = await getDoc(doc(db, "companies", companyId));
  if (company.exists() && company.data().adaptiveSopsEnabled !== true)
    return true;
  const { data } = (await httpsCallable(
    getFunctions(db.app),
    "previewSopPondChange",
  )({ companyId, pond })) as {
    data: { affected: { title: string }[]; conflicts: string[] };
  };
  if (data.conflicts.length) throw new Error(data.conflicts.join("\n"));
  return (
    !data.affected.length ||
    window.confirm(
      `This pond will inherit these SOPs:\n${data.affected.map((a) => a.title).join("\n")}\nConfirm this scope before saving.`,
    )
  );
}
export async function assertSopStageGate(
  companyId: string,
  targetId: string,
  stage: string,
) {
  const company = await getDoc(doc(db, "companies", companyId));
  if (company.exists() && company.data().adaptiveSopsEnabled !== true) return;
  const { data } = (await httpsCallable(
    getFunctions(db.app),
    "checkSopStageGate",
  )({ companyId, targetId, stage })) as {
    data: { allowed: boolean; unmet: string[] };
  };
  if (!data.allowed)
    throw new Error(
      `SOP stage prerequisites are incomplete: ${data.unmet.join(", ")}. An owner or manager can review them in SOPs.`,
    );
}
