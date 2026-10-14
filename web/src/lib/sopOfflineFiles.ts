import { ref, uploadBytes, getMetadata } from "firebase/storage";
import { storage } from "@/lib/firebase";
import type { SopAttachment } from "../../../shared/sop/contracts";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("shrimply-sop-files", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function cacheSopFile(
  uid: string,
  companyId: string,
  file: File,
): Promise<SopAttachment> {
  const id = crypto.randomUUID(),
    db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put({ uid, companyId, file }, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return {
    path: `sop-local:${id}`,
    name: file.name,
    contentType: file.type || "text/plain",
  };
}
export async function resolveSopFiles(
  uid: string,
  companyId: string,
  taskId: string,
  attachments: SopAttachment[],
): Promise<SopAttachment[]> {
  const result: SopAttachment[] = [];
  for (const attachment of attachments) {
    if (!attachment.path.startsWith("sop-local:")) {
      result.push(attachment);
      continue;
    }
    const id = attachment.path.slice(10),
      db = await database();
    const cached = await new Promise<
      { uid: string; companyId: string; file: File } | undefined
    >((resolve, reject) => {
      const r = db
        .transaction("files", "readonly")
        .objectStore("files")
        .get(id);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    if (!cached || cached.uid !== uid || cached.companyId !== companyId)
      throw new Error(
        "Attachment is unavailable in this signed-in farm workspace.",
      );
    const path = `companies/${companyId}/sopAttachments/${uid}/${id}`;
    let existing = false;
    try {
      const metadata = await getMetadata(ref(storage, path));
      if (metadata.size !== cached.file.size)
        throw new Error("Evidence attachment changed after upload.");
      existing = true;
    } catch (e) {
      if ((e as { code?: string }).code !== "storage/object-not-found") throw e;
    }
    if (!existing)
      await uploadBytes(ref(storage, path), cached.file, {
        contentType: attachment.contentType,
        customMetadata: { companyId, taskId },
      });
    result.push({ ...attachment, path });
  }
  return result;
}
export async function removeSopFiles(attachments: SopAttachment[]) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    for (const a of attachments)
      if (a.path.startsWith("sop-local:"))
        tx.objectStore("files").delete(a.path.slice(10));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
