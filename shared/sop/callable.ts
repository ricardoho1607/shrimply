import { httpsCallable, type Functions } from "firebase/functions";
import { SOP_ASSIST_CLIENT_TIMEOUT_MS } from "./timing";

// Match the long document-conversion budget instead of the SDK's chat timeout.
export async function callSopFunction(
  functions: Functions,
  name: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  try {
    if (
      name === "sopCommand" &&
      payload.action === "saveDraft" &&
      (payload.definition as { content?: unknown } | undefined)?.content !==
        undefined
    ) {
      let supported = false;
      try {
        const probe = await httpsCallable(
          functions,
          name,
        )({
          companyId: payload.companyId,
          operationId: payload.operationId,
          action: "checkContentSupport",
        });
        supported =
          (probe.data as { documentContentVersion?: number })
            ?.documentContentVersion === 1;
      } catch (error) {
        if ((error as { code?: string })?.code !== "functions/invalid-argument")
          throw error;
      }
      if (!supported)
        throw new Error(
          "The SOP backend must be updated before saving document sections and tables. Your existing saved draft has not been changed.",
        );
    }
    const deletion = name === "sopCommand" && payload.action === "deleteSop";
    let result;
    try {
      result = await httpsCallable(
        functions,
        deletion ? "deleteSop" : name,
        name === "assistSop"
          ? { timeout: SOP_ASSIST_CLIENT_TIMEOUT_MS }
          : undefined,
      )(payload);
    } catch (error) {
      // Support a staged callable deployment. Both routes execute the same
      // authorized transaction; the unchanged operation ID makes retries safe.
      // Never retry an explicit authentication or permission rejection.
      if (
        !deletion ||
        ![
          "functions/internal",
          "functions/not-found",
          "functions/unavailable",
        ].includes((error as { code?: string })?.code || "")
      )
        throw error;
      result = await httpsCallable(functions, name)(payload);
    }
    return result.data as Record<string, unknown>;
  } catch (error) {
    if (
      name === "sopCommand" &&
      ["deleteSop", "restoreSop"].includes(String(payload.action)) &&
      (error as { code?: string })?.code === "functions/invalid-argument" &&
      /unknown sop command/i.test(
        (error as { message?: string })?.message || "",
      )
    ) {
      throw new Error(
        "The SOP service must be updated before you can delete or restore SOPs. Your SOP has not been changed.",
      );
    }
    if (
      name === "assistSop" &&
      (error as { code?: string })?.code === "functions/deadline-exceeded"
    ) {
      throw new Error(
        "SOP generation timed out. Try generating the draft again.",
      );
    }
    throw error;
  }
}
