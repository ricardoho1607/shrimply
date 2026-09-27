import React, { useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { randomUUID } from "expo-crypto";
import { requireOptionalNativeModule } from "expo-modules-core";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ref, uploadBytes, deleteObject } from "firebase/storage";
import app, { auth, storage } from "../../config/firebase";
import {
  consumeOrsonCallableStream,
  type OrsonTextStreamChunk,
} from "../../orson/callableStream";
import type { AgentController } from "../../orson/useAgentOperations";
import type { OrsonOperation } from "../../shared/orsonAgentContract";
import { agentActivityLabel } from "../../shared/orsonAgentPresentation";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
type SpeechModule = {
  isRecognitionAvailable(): boolean;
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  start(options: {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
  }): void;
  stop(): void;
  abort(): void;
  addListener(
    name: string,
    callback: (e: {
      results?: { transcript: string }[];
      message?: string;
    }) => void,
  ): { remove(): void };
};
export default function OrsonAgentInput({
  companyId,
  uid,
  agent,
  disabled,
  language,
  onTranscript,
}: {
  companyId: string;
  uid: string;
  agent: AgentController;
  disabled: boolean;
  language: string;
  onTranscript: (text: string) => void;
}) {
  const [uploading, setUploading] = useState(false),
    [listening, setListening] = useState(false),
    [error, setError] = useState("");
  const speech = useRef<SpeechModule | null>(null),
    listeners = useRef<{ remove(): void }[]>([]),
    abort = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      listeners.current.forEach((l) => l.remove());
      speech.current?.abort();
      abort.current?.abort();
    },
    [],
  );
  const upload = async (uri: string, mime: string) => {
    if (disabled || uploading) return;
    const connection = await NetInfo.fetch();
    if (connection.isConnected === false || auth.currentUser?.uid !== uid) {
      setError("Reconnect to upload a document.");
      return;
    }
    setUploading(true);
    agent.setInputBusy(true);
    setError("");
    abort.current = new AbortController();
    const uploadId = randomUUID(),
      fileRef = ref(
        storage,
        `companies/${companyId}/orsonTemp/${uid}/${uploadId}`,
      );
    try {
      const blob = await (await fetch(uri)).blob();
      if (blob.size > 10 * 1024 * 1024)
        throw new Error("Use a file up to 10 MB.");
      await uploadBytes(fileRef, blob, { contentType: mime });
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
        setError(e instanceof Error ? e.message : "Document upload failed.");
    } finally {
      await deleteObject(fileRef).catch(() => {});
      setUploading(false);
      agent.setInputBusy(false);
      agent.clearActivity();
    }
  };
  const attach = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "application/pdf",
          "text/csv",
        ],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        const file = result.assets[0];
        await upload(
          file.uri,
          file.mimeType ||
            (/\.csv$/i.test(file.name) ? "text/csv" : "application/pdf"),
        );
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to open document picker.",
      );
    }
  };
  const camera = async () => {
    if (!(await ImagePicker.requestCameraPermissionsAsync()).granted) {
      setError("Camera access was denied. You can attach a file or type.");
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled)
        await upload(
          result.assets[0].uri,
          result.assets[0].mimeType || "image/jpeg",
        );
    } catch {
      setError("Camera unavailable. You can attach a file or type.");
    }
  };
  const voice = async () => {
    if (listening) {
      speech.current?.stop();
      return;
    }
    try {
      // Optional lookup prevents an OTA from crashing a binary built without speech support.
      const module = requireOptionalNativeModule<SpeechModule>(
        "ExpoSpeechRecognition",
      );
      speech.current = module;
      if (!module?.isRecognitionAvailable())
        throw new Error(
          "Voice input is unavailable in this app build. Use keyboard dictation, text, or attachments.",
        );
      if (!(await module.requestPermissionsAsync()).granted)
        throw new Error(
          "Microphone permission was denied. You can still type.",
        );
      listeners.current.forEach((l) => l.remove());
      listeners.current = [
        module.addListener("result", (e) => {
          if (e.results?.[0]?.transcript) onTranscript(e.results[0].transcript);
        }),
        module.addListener("end", () => setListening(false)),
        module.addListener("error", (e) => {
          setListening(false);
          setError(e.message || "Speech input failed.");
        }),
      ];
      module.start({
        lang:
          (
            {
              en: "en-US",
              id: "id-ID",
              zh: "zh-CN",
              th: "th-TH",
              vi: "vi-VN",
            } as Record<string, string>
          )[language] || "en-US",
        interimResults: false,
        continuous: false,
      });
      setListening(true);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Voice input unavailable.");
    }
  };
  // Keep camera and dictation available for future composer actions without showing them today.
  const futureInputActions = { camera, voice };
  void futureInputActions;
  return (
    <>
      <InputButton
        title="Add files"
        icon="add"
        onPress={() => void attach()}
        disabled={disabled || uploading || listening}
      />
      {uploading && !agent.activityFinished && (
        <Text style={styles.inputStatus} accessibilityLiveRegion="polite">
          {agent.activity
            ? agentActivityLabel(agent.activity.step, language)
            : "Uploading your document"}
          …{agent.elapsed >= 10 ? ` (${agent.elapsed}s)` : ""}
        </Text>
      )}
      {listening && (
        <Text style={styles.inputStatus}>Listening. Review the transcript before sending.</Text>
      )}
      {!!error && <Text style={styles.inputError}>{error}</Text>}
    </>
  );
}

function InputButton({
  title,
  icon,
  onPress,
  disabled,
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={[
        { padding: 10, opacity: disabled ? 0.5 : 1 },
        icon && {
          width: 30,
          height: 38,
          padding: 0,
          borderRadius: 8,
          backgroundColor: "transparent",
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={21} color="#0f4c75" />
      ) : (
        <Text style={{ color: "#0f4c75", fontSize: 14 }}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  inputStatus: {
    position: "absolute",
    left: 48,
    right: 58,
    bottom: -18,
    color: "#7b8b99",
    fontSize: 12,
  },
  inputError: {
    position: "absolute",
    left: 48,
    right: 0,
    bottom: -18,
    color: "#b3261e",
    fontSize: 12,
  },
});
