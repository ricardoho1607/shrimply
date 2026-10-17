"use client";
import { getUserErrorMessage } from '@/lib/userError';

import { useEffect, useRef, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ref, uploadBytes, deleteObject } from "firebase/storage";
import { app, storage, auth } from "@/lib/firebase";
import {
  consumeOrsonCallableStream,
  type OrsonTextStreamChunk,
} from "../../../../orson/callableStream";
import type { AgentController } from "../../../../orson/useAgentOperations";
import type { OrsonOperation } from "../../../../shared/orsonAgentContract";
import { agentActivityLabel } from "../../../../shared/orsonAgentPresentation";
import { Plus } from "lucide-react";
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
export default function AgentInputTools({
  companyId,
  language,
  uid,
  agent,
  disabled,
  onTranscript,
}: {
  companyId: string;
  language: string;
  uid: string;
  agent: AgentController;
  disabled: boolean;
  onTranscript: (text: string) => void;
}) {
  const [uploading, setUploading] = useState(false),
    [listening, setListening] = useState(false),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null),
    recognition = useRef<Recognition | null>(null),
    abort = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      recognition.current?.abort();
      abort.current?.abort();
    },
    [],
  );
  const upload = async (file: File) => {
    if (disabled || uploading) return;
    if (!navigator.onLine || auth.currentUser?.uid !== uid) {
      setError("Reconnect to upload a document.");
      return;
    }
    const mime = file.type || (/\.csv$/i.test(file.name) ? "text/csv" : "");
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "text/csv",
      ].includes(mime) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError("Use a JPEG, PNG, WebP, PDF or CSV up to 10 MB.");
      return;
    }
    setUploading(true);
    agent.setInputBusy(true);
    setError("");
    abort.current = new AbortController();
    const uploadId = crypto.randomUUID(),
      fileRef = ref(
        storage,
        `companies/${companyId}/orsonTemp/${uid}/${uploadId}`,
      );
    try {
      await uploadBytes(fileRef, file, { contentType: mime });
      const callable = httpsCallable<
        { companyId: string; uploadId: string },
        { text?: string; operation: OrsonOperation },
        OrsonTextStreamChunk
      >(getFunctions(app), "extractFarmDocument", { timeout: 150000 });
      const result =
        typeof callable.stream === "function"
          ? await consumeOrsonCallableStream({
              callable,
              request: { companyId, uploadId },
              timeoutMs: 155000,
              signal: abort.current.signal,
              onActivity: agent.onActivity,
            })
          : (await callable({ companyId, uploadId })).data;
      if (auth.currentUser?.uid === uid && !abort.current.signal.aborted)
        agent.receive(result.operation);
    } catch (e) {
      if (!abort.current.signal.aborted)
        setError(getUserErrorMessage(e, "Document upload failed."));
    } finally {
      await deleteObject(fileRef).catch(() => {});
      setUploading(false);
      agent.setInputBusy(false);
      agent.clearActivity();
      if (input.current) input.current.value = "";
    }
  };
  const voice = () => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Speech =
      (
        window as unknown as {
          SpeechRecognition?: new () => Recognition;
          webkitSpeechRecognition?: new () => Recognition;
        }
      ).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => Recognition })
        .webkitSpeechRecognition;
    if (!Speech) {
      setError(
        "Voice input is unavailable in this browser. You can type or attach a file.",
      );
      return;
    }
    setError("");
    const instance = new Speech();
    recognition.current = instance;
    instance.lang = navigator.language || "en-US";
    instance.interimResults = false;
    instance.continuous = false;
    instance.onresult = (e) =>
      onTranscript(
        Array.from(e.results)
          .map((result) => result[0]?.transcript || "")
          .join(" "),
      );
    instance.onend = () => setListening(false);
    instance.onerror = () => {
      setListening(false);
      setError(
        "Microphone or speech recognition unavailable. You can still type.",
      );
    };
    try {
      instance.start();
      setListening(true);
    } catch {
      setError("Voice input could not start.");
    }
  };
  // Keep dictation available for a future composer action without showing it today.
  const futureInputActions = { voice };
  void futureInputActions;
  return (
    <>
      <input
        ref={input}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf,text/csv,.csv"
        onChange={(e) => {
          if (e.target.files?.[0]) void upload(e.target.files[0]);
        }}
      />
      <button
        type="button"
        disabled={disabled || uploading || listening}
        onClick={() => input.current?.click()}
        className="orson-add-files"
        aria-label="Add files"
        title="Add files"
      >
        <Plus size={19} strokeWidth={2.25} aria-hidden="true" />
      </button>
      {uploading && !agent.activityFinished && (
        <span className="orson-input-status" role="status">
          {agent.activity
            ? agentActivityLabel(agent.activity.step, language)
            : "Uploading your document"}
          …{agent.elapsed >= 10 ? ` (${agent.elapsed}s)` : ""}
        </span>
      )}
      {listening && (
        <span className="orson-input-status" role="status">
          Listening. Review the transcript before sending.
        </span>
      )}
      {error && <span className="orson-input-status" role="alert">{error}</span>}
    </>
  );
}
