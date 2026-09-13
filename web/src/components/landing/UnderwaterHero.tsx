'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import WaterScene from './WaterScene';
import Link from 'next/link';
import type { LandingCopy } from './copy';

const ponds = [
  { id: 'A1', day: 65, weight: '18.5', fcr: '1.32', survival: '92.4', biomass: '1,580', focus: 'Every record. A clearer picture.' },
  { id: 'A2', day: 42, weight: '8.8', fcr: '1.21', survival: '95.0', biomass: '836', focus: 'Different ponds. One connected farm.' },
  { id: 'A3', day: 83, weight: '25.4', fcr: '1.42', survival: '90.1', biomass: '2,289', focus: 'The whole cycle. In perspective.' },
];

export default function UnderwaterHero({ copy: c }: { copy: LandingCopy }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLElement | null)[]>([]);
  const progressRef = useRef(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const cards = cardsRef.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let previousSelection = -1;
    const update = () => {
      frame = 0;
      const distance = Math.max(1, section.offsetHeight - stage.offsetHeight);
      const progress = Math.max(0, Math.min(1, -section.getBoundingClientRect().top / distance));
      progressRef.current = progress;
      window.dispatchEvent(new Event('shrimply:water-progress'));
      const travel = progress * 2;
      const selected = Math.round(travel);
      setActive(previous => previous === selected ? previous : selected);
      stage.style.setProperty('--journey-progress', `${progress * 100}%`);
      cardsRef.current.forEach((card, i) => {
        if (!card) return;
        const isSelected = i === selected;
        card.style.opacity = isSelected ? '1' : '0';
        card.style.visibility = isSelected ? 'visible' : 'hidden';
        card.style.transform = 'none';
        card.style.zIndex = isSelected ? '10' : '0';
        if (selected !== previousSelection) {
          card.getAnimations().forEach(animation => animation.cancel());
          if (previousSelection !== -1 && !motion.matches) {
            const direction = Math.sign(selected - previousSelection);
            if (isSelected) {
              card.animate([
                { opacity: 0, transform: `translate3d(${direction * 100}px, ${direction * 28}px, -200px)` },
                { opacity: 1, transform: 'translate3d(0, 0, 0)' },
              ], { duration: 650, easing: 'cubic-bezier(.22, 1, .36, 1)' });
            } else if (i === previousSelection) {
              card.animate([
                { visibility: 'visible', opacity: 1, transform: 'translate3d(0, 0, 0)' },
                { visibility: 'visible', opacity: 0, transform: `translate3d(${-direction * 100}px, ${-direction * 28}px, 100px)` },
              ], { duration: 450, easing: 'ease-out' });
            }
          }
        }
      });
      previousSelection = selected;
    };
    const queueUpdate = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(queueUpdate);
    observer.observe(section);
    observer.observe(stage);
    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate);
    motion.addEventListener('change', queueUpdate);
    update();
    return () => {
      cancelAnimationFrame(frame);
      cards.forEach(card => card?.getAnimations().forEach(animation => animation.cancel()));
      observer.disconnect();
      window.removeEventListener('scroll', queueUpdate);
      window.removeEventListener('resize', queueUpdate);
      motion.removeEventListener('change', queueUpdate);
    };
  }, []);

  const visit = (index: number) => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const start = section.getBoundingClientRect().top + window.scrollY;
    const distance = section.offsetHeight - stage.offsetHeight;
    window.scrollTo({ top: start + distance * index / 2, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  return <section className="underwater-journey" ref={sectionRef} aria-label={c.journeyLabel}>
    <div className="journey-stage" ref={stageRef} data-water-interaction>
      <WaterScene progressRef={progressRef} label={c.waterLabel}/>
      <div className="journey-shade"/>
      <div className="journey-top wrap"><span className="journey-chapter">{c.pond} {ponds[active].id} <span>/ 03</span></span></div>
      <div className="journey-content wrap">
        <div className="journey-copy"><h1>{c.headline}<br/><span>{c.headlineAccent}</span></h1><p>{c.intro}</p><div className="hero-actions"><Link className="button" href="/auth/join" prefetch={false}>{c.start}</Link><a className="text-link" href="#platform">{c.explore}</a></div></div>
        <div className="pond-journey"><div className="pond-window-label">{c.farmFocus} <span>{c.example}</span></div><div className="pond-depth-stage">
          {ponds.map((pond, index) => <article key={pond.id} ref={element => { cardsRef.current[index] = element; }} className="journey-pond" aria-hidden={index !== active} style={{ opacity: index === 0 ? 1 : 0, visibility: index === 0 ? 'visible' : 'hidden' }}>
            <div className="journey-pond-head"><div><span>{c.activeCycle}</span><h2>{c.pond} {pond.id}</h2></div><span className="pond-day">{c.day} {pond.day}</span></div>
            <dl className="journey-metrics"><div><dt>{c.weight}</dt><dd>{pond.weight} <small>g</small></dd></div><div><dt>{c.fcr}</dt><dd>{pond.fcr} <small>FCR</small></dd></div><div><dt>{c.survival}</dt><dd>{pond.survival}<small>%</small></dd></div><div><dt>{c.biomass}</dt><dd>{pond.biomass} <small>kg</small></dd></div></dl>
            <div className="journey-pond-foot">{c.pondFocus[index]}</div>
          </article>)}
        </div><a className="journey-orson" href="#orson"><span>{c.heroOrson}</span></a></div>
      </div>
      <div className="journey-bottom wrap"><div className="scroll-invitation"><ArrowDown size={18}/><span>{active === 2 ? c.scrollEnd : c.scroll}</span></div><nav className="pond-navigation" aria-label={c.jumpLabel}>{ponds.map((pond, index) => <button type="button" key={pond.id} onClick={() => visit(index)} aria-current={index === active ? 'step' : undefined}><span>0{index + 1}</span> {c.pond} {pond.id}</button>)}</nav><span className="journey-counter">0{active + 1}<span> / 03</span></span></div>
      <div className="journey-progress" aria-hidden="true"><span/></div>
    </div>
  </section>;
}
