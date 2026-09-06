'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import type { LandingCopy } from './copy';
import { landingPath, type LandingLocale } from './publicRoutes';

export default function FeatureShowcase({ copy: c, locale }: { copy: LandingCopy; locale: LandingLocale }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = c.features.length - 1;
    const next = event.key === 'ArrowRight' ? (index + 1) % c.features.length
      : event.key === 'ArrowLeft' ? (index + last) % c.features.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? last : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return <div className="showcase">
    <div role="tablist" className="feature-tabs" aria-label={c.platformEyebrow}>
      {c.features.map((feature, index) => <button key={feature.id} type="button" role="tab"
        ref={element => { tabs.current[index] = element; }}
        id={`feature-tab-${feature.id}`} aria-controls={`feature-panel-${feature.id}`}
        aria-selected={active === index} tabIndex={active === index ? 0 : -1}
        className="feature-tab" onClick={() => setActive(index)} onKeyDown={event => navigate(event, index)}>
        {feature.label}
      </button>)}
    </div>
    {c.features.map((f, index) => <div key={f.id} role="tabpanel" id={`feature-panel-${f.id}`}
      aria-labelledby={`feature-tab-${f.id}`} hidden={index !== active} tabIndex={0} className="feature-content">
      <div className="feature-copy">
        <span className="feature-number">{f.number} / {c.connectedFarm}</span>
        <h3>{f.title}</h3><p>{f.description}</p><ul>{f.points.map(point => <li key={point}>{point}</li>)}</ul>
        <Link className="text-link" href={landingPath(locale, `/features/${f.path}`)}>{c.featureExplore} {f.label}</Link>
      </div>
      <div className="product-stage"><div className="product-panel">
        <div className="panel-heading"><strong>{f.panel}</strong><span className="example">{c.exampleShort}</span></div>
        <div className="panel-metrics"><div><small>{f.metricLabel}</small><strong>{f.metric}<span> {f.unit}</span></strong></div>
          <div><small>{f.secondaryLabel}</small><b>{f.secondary}</b><span className="metric-context">{c.recordsConnected}</span></div></div>
        <div className="chart-heading">{f.chartLabel}<span>{f.id === 'growth' || f.id === 'finance' ? c.thisCycle : c.lastDays}</span></div>
        <div className="bar-chart" role="img" aria-label={`${f.chartLabel}: ${f.values.map((value, i) => `${f.dates[i]} ${value} ${f.unit}`).join(', ')}`}>
          {f.values.map((value, i) => <div className="bar-column" key={i}><span>{value}{f.id === 'finance' ? '%' : ''}</span>
            <div className="chart-bar" style={{ height: `${Math.max(20, Number(value) / Math.max(...f.values.map(Number)) * 115)}px`, opacity: .42 + i * .145 }} />
            <small>{f.dates[i]}</small></div>)}
        </div><div className="panel-footer">{c.panelFooter}</div>
      </div><span className="demo-caption">{c.sampleCaption}</span></div>
    </div>)}
  </div>;
}
