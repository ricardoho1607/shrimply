import type { SopClient, SopDocument } from "./client";
import type { SopAttachment, SopDefinition } from "./contracts";
import { validateSopContent } from "./content";

export type SopDraftProgress = "uploading" | "generating" | "saving";

export async function saveSopDraft({
  client,
  definition,
  editing,
}: {
  client: Pick<SopClient, "command">;
  definition: SopDefinition;
  editing: SopDocument | null;
}): Promise<SopDocument> {
  const saved = await client.command({
    action: "saveDraft",
    sopId: editing?.id,
    expectedRevision: editing?.revision,
    definition,
  });
  if (
    saved.ok !== true ||
    typeof saved.sopId !== "string" ||
    !saved.sopId ||
    (editing && saved.sopId !== editing.id)
  )
    throw new Error(
      "The draft was not saved. Review it and choose Save draft to retry.",
    );
  return {
    id: saved.sopId,
    title: definition.title,
    definition,
    revision: (editing?.revision || 0) + 1,
    status: "draft",
    ...(editing?.createdBy ? { createdBy: editing.createdBy } : {}),
    ...(editing?.source ? { source: editing.source } : {}),
  };
}

export async function generateAndSaveSopDraft({
  client,
  text,
  language,
  file,
  editing,
  attachments = [],
  onProgress,
  onDraft,
}: {
  client: Pick<SopClient, "upload" | "assist" | "command">;
  text: string;
  language: string;
  file?: unknown;
  editing: SopDocument | null;
  attachments?: SopAttachment[];
  onProgress: (progress: SopDraftProgress) => void;
  onDraft: (definition: SopDefinition) => void;
}): Promise<{ document: SopDocument; warnings: string[] }> {
  if (!file && !text.trim()) throw new Error("Describe or upload your SOP.");
  if (file && attachments.length >= 10)
    throw new Error("Attach at most ten guidance files.");
  let attachment: SopAttachment | undefined;
  if (file) {
    onProgress("uploading");
    // The source must remain available to readers and satisfy the existing
    // server's explicit company-guidance metadata check when saving the draft.
    attachment = await client.upload(file, "guidance");
  }
  onProgress("generating");
  const result = await client.assist({
    mode: "draft",
    text,
    language,
    attachment,
  });
  const generated = result.definition as SopDefinition;
  if (
    !generated ||
    typeof generated.title !== "string" ||
    !Array.isArray(generated.steps)
  )
    throw new Error("SOP generation returned no usable draft. Try again.");
  if (
    validateSopContent(generated.content).some(
      (item) => !item.startsWith("Resolve omitted source content:"),
    )
  )
    throw new Error(
      "The AI service returned workflow tasks without readable SOP content. The updated SOP backend is required; your existing draft has been kept.",
    );
  const retained = [...attachments, ...(attachment ? [attachment] : [])];
  const definition = { ...generated, attachments: retained };
  // Keep the reviewable result in the editor even if saving fails. Retrying Save
  // does not require uploading or paying for generation again.
  onDraft(definition);
  onProgress("saving");
  const document = await saveSopDraft({ client, definition, editing });
  return {
    document,
    warnings: Array.isArray(result.warnings)
      ? result.warnings.filter(
          (warning): warning is string => typeof warning === "string",
        )
      : [],
  };
}
