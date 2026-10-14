"use strict";
const { access, id, rows, fail } = require("./service");
async function sopVersions(db, uid, companyId, sopId, cursor) {
  await access(db, uid, companyId);
  const collection = db
    .collection("companies")
    .doc(companyId)
    .collection("sops")
    .doc(id(sopId))
    .collection("versions");
  let query = collection.orderBy("approvedAt", "desc");
  if (cursor) {
    const last = await collection.doc(id(cursor)).get();
    if (!last.exists) fail("not-found", "Version cursor no longer exists.");
    query = query.startAfter(last);
  }
  const page = await query.limit(50).get();
  return {
    items: rows(page),
    nextCursor: page.size === 50 ? page.docs.at(-1).id : "",
  };
}
module.exports = { sopVersions };
