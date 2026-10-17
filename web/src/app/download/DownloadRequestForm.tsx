"use client";
import { getUserErrorMessage } from '@/lib/userError';


import { FormEvent, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { app } from "@/lib/firebase";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const copy = t.download.form;
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
      setError(copy.validationError);
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
      setError(getUserErrorMessage(requestError, copy.submitError));
    }
  };

  return (
    <form onSubmit={submitRequest} style={{ display: "grid", gap: "16px" }}>
      <div className="download-form-grid">
        <Field
          label={copy.name}
          value={form.name}
          onChange={value => updateField("name", value)}
          placeholder={copy.namePlaceholder}
          required
        />
        <Field
          label={copy.email}
          type="email"
          value={form.email}
          onChange={value => updateField("email", value)}
          placeholder={copy.emailPlaceholder}
          required
        />
      </div>
      <div className="download-form-grid">
        <Field
          label={copy.company}
          value={form.company}
          onChange={value => updateField("company", value)}
          placeholder={copy.companyPlaceholder}
        />
        <Field
          label={copy.role}
          value={form.role}
          onChange={value => updateField("role", value)}
          placeholder={copy.rolePlaceholder}
        />
      </div>
      <div className="download-form-grid">
        <Field
          label={copy.country}
          value={form.country}
          onChange={value => updateField("country", value)}
          placeholder={copy.countryPlaceholder}
        />
        <Field
          label={copy.androidDevice}
          value={form.androidDevice}
          onChange={value => updateField("androidDevice", value)}
          placeholder={copy.devicePlaceholder}
        />
      </div>
      <label style={{ display: "grid", gap: "8px" }}>
        <span style={{ color: "var(--ink)", fontWeight: 800, fontSize: "0.82rem" }}>{copy.reason}</span>
        <textarea
          value={form.reason}
          onChange={event => updateField("reason", event.target.value)}
          placeholder={copy.reasonPlaceholder}
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
        {copy.helper}
      </p>
      {state === "error" && error ? (
        <div style={{ border: "1px solid #fecaca", background: "#fff7f7", color: "#991b1b", borderRadius: "12px", padding: "14px 16px", fontWeight: 700 }}>
          {error}
        </div>
      ) : null}
      {state === "success" ? (
        <div style={{ display: "flex", gap: "10px", alignItems: "center", border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", borderRadius: "12px", padding: "14px 16px", fontWeight: 800 }}>
          <CheckCircle2 size={20} />
          {copy.success}
        </div>
      ) : null}
      <button
        className="btn-primary"
        type="submit"
        disabled={state === "submitting"}
        style={{ border: 0, minHeight: "54px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: state === "submitting" ? "wait" : "pointer" }}
      >
        {state === "submitting" ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        {state === "submitting" ? copy.submitting : copy.submit}
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
