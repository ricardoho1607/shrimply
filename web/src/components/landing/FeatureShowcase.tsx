'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { LandingCopy } from './copy';
import { landingPath, type LandingLocale } from './publicRoutes';

export default function FeatureShowcase({ copy: c, locale }: { copy: LandingCopy; locale: LandingLocale }) {
  const [active, setActive] = useState(0);
  const showcaseRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const panelsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const showcase = showcaseRef.current;
    const stage = stageRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = window.matchMedia('(max-width: 800px)');
    if (!showcase || !stage) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      if (mobile.matches) {
        const height = Math.max(...panelsRef.current.map(panel => panel?.scrollHeight ?? 0));
        stage.style.setProperty('--mobile-card-height', `${height}px`);
      }
      const distance = Math.max(1, showcase.offsetHeight - stage.offsetHeight);
      const progress = Math.min(1, Math.max(0, -showcase.getBoundingClientRect().top / distance));
      const travel = progress * Math.max(0, c.features.length - 1);
      const selected = Math.round(travel);

      setActive(current => current === selected ? current : selected);
      stage.style.setProperty('--feature-progress', `${progress * 100}%`);

      panelsRef.current.forEach((panel, index) => {
        if (!panel) return;
        const delta = index - selected;
        const isActive = index === selected;

        panel.style.opacity = isActive ? '1' : '0';
        panel.style.visibility = isActive ? 'visible' : 'hidden';
        panel.style.transform = reducedMotion.matches
          ? 'none'
          : `translate3d(0, ${delta * 32}px, 0) scale(${1 - Math.min(Math.abs(delta), 1) * 0.015})`;
        panel.style.zIndex = isActive ? '1' : '0';
      });
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const resizeObserver = new ResizeObserver(scheduleUpdate);

    resizeObserver.observe(showcase);
    resizeObserver.observe(stage);
    panelsRef.current.forEach(panel => { if (panel) resizeObserver.observe(panel); });
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    reducedMotion.addEventListener('change', scheduleUpdate);
    update();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      reducedMotion.removeEventListener('change', scheduleUpdate);
    };
  }, [c.features]);

  return <div className="showcase" ref={showcaseRef}>
    <div className="feature-scroll-stage" ref={stageRef}>
      <div className="feature-panels">
        {c.features.map((f, index) => <div key={f.id} id={`feature-panel-${f.id}`}
      ref={element => { panelsRef.current[index] = element; }} aria-hidden={active !== index}
      className="feature-content" style={{ opacity: index === 0 ? 1 : 0, visibility: index === 0 ? 'visible' : 'hidden' }}>
      <div className="feature-copy">
        <span className="feature-number">{f.number} / {f.label}</span>
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
      </div>
      <div className="feature-scroll-progress" aria-hidden="true"><span /></div>
    </div>
  </div>;
}
