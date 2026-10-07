import { doc, getDoc } from "firebase/firestore";
import { Alert } from "react-native";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/config/firebase";
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
  if (!data.affected.length) return true;
  return new Promise<boolean>((resolve) =>
    Alert.alert(
      "SOP scope preview",
      `This pond will inherit:\n${data.affected.map((a) => a.title).join("\n")}`,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Confirm", onPress: () => resolve(true) },
      ],
      { cancelable: false },
    ),
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
      `SOP stage prerequisites are incomplete: ${data.unmet.join(", ")}. Ask a manager to review them in SOPs.`,
    );
}
