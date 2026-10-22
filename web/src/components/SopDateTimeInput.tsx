"use client";
import { useState } from 'react';
import { farmLocalInput, farmLocalToIso } from '../../../shared/sop/observationTimes';
import { sopText } from '../../../shared/sop/uiCopy';

/** Calendar input in farm time; only valid instants leave this component. */
export function SopDateTimeInput({ value, onChange, timeZone, label, language = 'en' }: {
  value: string; onChange: (value: string) => void; timeZone: string; label: string; language?: string;
}) {
  const [draft, setDraft] = useState<{source: string; local: string; error: string} | null>(null);
  const local = draft?.source === value ? draft.local : farmLocalInput(value, timeZone);
  const error = draft?.source === value ? draft.error : "";
  return <label className="sop-field" style={{display:'grid', gap:6}}>
    <span>{label} · {timeZone}</span>
    <input type="datetime-local" className="form-input" value={local} aria-invalid={!!error}
      onChange={event => {
        const next = event.target.value;
        try {
          const iso = farmLocalToIso(next, timeZone);
          setDraft({source: iso, local: next, error: ''}); onChange(iso);
        } catch {
          setDraft({source: '', local: next, error: sopText('Choose a valid farm date and time. Check for a clock change.', language)});
          onChange('');
        }
      }} />
    {error && <span role="alert">{error}</span>}
  </label>;
}
