"use strict";
const { hash } = require("./evidence");
const { fail } = require("./service");
async function copyGuidance(storage, attachments, destination) {
  if (!attachments?.length) return [];
  if (!storage)
    fail("failed-precondition", "Guidance file storage is unavailable.");
  if (!Array.isArray(attachments) || attachments.length > 10)
    fail("invalid-argument", "Attach at most ten guidance files.");
  const bucket = storage.bucket(),
    result = [];
  for (const attachment of attachments) {
    const source = bucket.file(attachment.path),
      [metadata] = await source.getMetadata();
    if (Number(metadata.size) > 10 * 1024 * 1024)
      fail("invalid-argument", "Guidance exceeds 10 MB.");
    const path = `${destination}${destination.startsWith("companies/") ? "-" : "/"}${hash(attachment.path)}`;
    await source.copy(bucket.file(path));
    await bucket.file(path).setMetadata({
      metadata: {
        firebaseStorageDownloadTokens: null,
        taskId: "guidance",
        companyId: destination.startsWith("companies/")
          ? destination.split("/")[1]
          : "",
      },
    });
    result.push({
      path,
      name: String(attachment.name || "Guidance document").slice(0, 200),
      contentType: metadata.contentType,
    });
  }
  return result;
}
module.exports = { copyGuidance };
