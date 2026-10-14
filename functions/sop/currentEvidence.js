"use strict";
const { projectEvidence } = require("./evidence");
async function currentEvidence(tx, companyRef, evidence) {
  const snapshots = new Map();
  for (const item of evidence) {
    if (!snapshots.has(item.sourcePath))
      snapshots.set(
        item.sourcePath,
        await tx.get(
          item.sourcePath.startsWith("assets/")
            ? companyRef.firestore.doc(item.sourcePath)
            : companyRef
                .collection(item.sourcePath.split("/")[0])
                .doc(item.sourcePath.split("/")[1]),
        ),
      );
    const source = snapshots.get(item.sourcePath);
    if (
      !source.exists ||
      (item.sourcePath.startsWith("assets/") &&
        source.data().companyId !== companyRef.id)
    )
      return false;
    const [kind, sourceId] = item.sourcePath.split("/");
    const current = projectEvidence(
      kind,
      sourceId,
      source.data(),
      item.receivedAt,
    ).find((e) => e.id === item.id);
    if (
      !current ||
      [
        "value",
        "unit",
        "basis",
        "observedAt",
        "date",
        "precision",
        "estimated",
        "pondId",
      ].some(
        (field) =>
          JSON.stringify(current[field]) !== JSON.stringify(item[field]),
      )
    )
      return false;
  }
  return true;
}
module.exports = { currentEvidence };
