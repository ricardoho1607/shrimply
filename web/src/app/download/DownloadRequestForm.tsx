"use client";

import { FormEvent, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { app } from "@/lib/firebase";

type RequestState = "idle" | "submitting" | "success" | "error";

type TesterRequestPayload = {
  name: string;
  email: string;
  company: string;
  role: string;
  country: string;
  androidDevice: string;
  reason: string;
};

const initialForm: TesterRequestPayload = {
  name: "",
  email: "",
  company: "",
  role: "",
  country: "",
  androidDevice: "",
  reason: "",
};

export default function DownloadRequestForm() {
  const [form, setForm] = useState<TesterRequestPayload>(initialForm);
  const [state, setState] = useState<RequestState>("idle");
  const [error, setError] = useState("");

  const updateField = (field: keyof TesterRequestPayload, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim()) {
      setState("error");
      setError("Please enter your name and email so we can add you to the Android closed test.");
      return;
    }

    setState("submitting");
    try {
      const functions = getFunctions(app);
      const requestAccess = httpsCallable<TesterRequestPayload, { success: boolean }>(
        functions,
        "requestAndroidTesterAccess",
      );
      await requestAccess({
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        role: form.role.trim(),
        country: form.country.trim(),
        androidDevice: form.androidDevice.trim(),
        reason: form.reason.trim(),
      });
      setState("success");
      setForm(initialForm);
    } catch (requestError) {
      console.error("Tester request failed:", requestError);
      setState("error");
      setError(requestError instanceof Error ? requestError.message : "The request could not be sent. Please try again.");
    }
  };

  return (
    <form onSubmit={submitRequest} style={{ display: "grid", gap: "16px" }}>
      <div className="download-form-grid">
        <Field
          label="Name"
          value={form.name}
          onChange={value => updateField("name", value)}
          placeholder="Your name"
          required
        />
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={value => updateField("email", value)}
          placeholder="name@company.com"
          required
        />
      </div>
      <div className="download-form-grid">
        <Field
          label="Farm or company"
          value={form.company}
          onChange={value => updateField("company", value)}
          placeholder="Farm/company name"
        />
        <Field
          label="Role"
          value={form.role}
          onChange={value => updateField("role", value)}
          placeholder="Owner, manager, technician..."
        />
      </div>
      <div className="download-form-grid">
        <Field
          label="Country"
          value={form.country}
          onChange={value => updateField("country", value)}
          placeholder="Indonesia, Thailand, Vietnam..."
        />
        <Field
          label="Android device"
          value={form.androidDevice}
          onChange={value => updateField("androidDevice", value)}
          placeholder="Samsung A54, Pixel 8..."
        />
      </div>
      <label style={{ display: "grid", gap: "8px" }}>
        <span style={{ color: "var(--ink)", fontWeight: 800, fontSize: "0.82rem" }}>What do you want to test?</span>
        <textarea
          value={form.reason}
          onChange={event => updateField("reason", event.target.value)}
          placeholder="Tell us about your farm workflow or what you want to test first."
          rows={5}
          style={{
            width: "100%",
            resize: "vertical",
            border: "1px solid var(--slate)",
            borderRadius: "12px",
            padding: "14px 16px",
            color: "var(--ink)",
            font: "inherit",
            fontWeight: 600,
            outline: "none",
            background: "var(--white)",
          }}
        />
      </label>
      <p style={{ color: "var(--ocean)", fontSize: "0.92rem", fontWeight: 600 }}>
        Shrimply is currently available only on Android through a closed testing track. We will use this request to review tester access and contact you by email.
      </p>
      {state === "error" && error ? (
        <div style={{ border: "1px solid #fecaca", background: "#fff7f7", color: "#991b1b", borderRadius: "12px", padding: "14px 16px", fontWeight: 700 }}>
          {error}
        </div>
      ) : null}
      {state === "success" ? (
        <div style={{ display: "flex", gap: "10px", alignItems: "center", border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", borderRadius: "12px", padding: "14px 16px", fontWeight: 800 }}>
          <CheckCircle2 size={20} />
          Request received. We will review it and follow up by email.
        </div>
      ) : null}
      <button
        className="btn-primary"
        type="submit"
        disabled={state === "submitting"}
        style={{ border: 0, minHeight: "54px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: state === "submitting" ? "wait" : "pointer" }}
      >
        {state === "submitting" ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        Request Android Tester Access
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label style={{ display: "grid", gap: "8px" }}>
      <span style={{ color: "var(--ink)", fontWeight: 800, fontSize: "0.82rem" }}>
        {label}{required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          width: "100%",
          height: "52px",
          border: "1px solid var(--slate)",
          borderRadius: "12px",
          padding: "0 16px",
          color: "var(--ink)",
          font: "inherit",
          fontWeight: 700,
          outline: "none",
          background: "var(--white)",
        }}
      />
    </label>
  );
}
