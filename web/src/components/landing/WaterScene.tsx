'use client';

import { useEffect, useRef, type RefObject } from 'react';

export default function WaterScene({ progressRef, label }: { progressRef?: RefObject<number>; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 1;
    let height = 1;
    let frame = 0;
    let visible = true;
    let elapsed = 0;
    let travel = progressRef?.current ?? 0;
    let lastTimestamp = 0;
    let lastPaint = 0;

    const draw = () => {
      const ctx = context;
      const water = ctx.createLinearGradient(0, 0, width * .35, height);
      water.addColorStop(0, '#d5edfc');
      water.addColorStop(.35, '#bbe1fa');
      water.addColorStop(.7, '#92c5e8');
      water.addColorStop(1, '#6aaddb');
      ctx.fillStyle = water;
      ctx.fillRect(0, 0, width, height);

      const light = ctx.createRadialGradient(width * .72, -height * .2, 0, width * .72, 0, height * 1.1);
      light.addColorStop(0, '#ffffffbc');
      light.addColorStop(.45, '#e7f6ff45');
      light.addColorStop(1, '#bbe1fa00');
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, width, height);

      const centerX = width * .64;
      const centerY = height * .30;
      for (let band = 0; band < 10; band++) {
        ctx.save();
        ctx.beginPath();
        const phase = ((band / 10 + travel * .8 + elapsed * .014) % 1 + 1) % 1;
        const yBase = height * (.22 + Math.pow(phase, 1.5) * 1.15);
        for (let step = 0; step <= 70; step++) {
          const x = step / 70 * width;
          const y = yBase + Math.sin(x / width * 8 + band * 1.6 + elapsed * .22 + travel * 8) * height * .035 + Math.sin(x / width * 15 - elapsed * .3) * height * .012;
          if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        const fade = Math.sin(phase * Math.PI);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.filter = `blur(${8 + phase * 8}px)`;
        ctx.strokeStyle = `rgba(50,130,184,${fade * .055})`;
        ctx.lineWidth = 16 + phase * 20;
        ctx.stroke();
        ctx.filter = `blur(${4 + phase * 5}px)`;
        ctx.strokeStyle = `rgba(245,252,255,${fade * .2})`;
        ctx.lineWidth = 5 + phase * 7;
        ctx.stroke();
        ctx.restore();
      }

      for (let particle = 0; particle < 22; particle++) {
        const seed = particle + 1;
        const depth = ((seed * .173 - travel * .8 - elapsed * .008) % 1 + 1) % 1;
        const x = centerX + Math.sin(seed * 23.13) * width * .5 / (.35 + depth);
        const y = centerY + Math.cos(seed * 17.87) * height * .5 / (.35 + depth);
        ctx.beginPath();
        ctx.arc(x, y, 1 + (1 - depth) * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,252,255,${Math.sin(depth * Math.PI) * .6})`;
        ctx.fill();
      }

    };

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      width = Math.max(1, box.width);
      height = Math.max(1, box.height);
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(1400000 / (width * height)));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      draw();
    };
    const animate = (timestamp: number) => {
      if (!visible || motion.matches || document.hidden) { frame = 0; lastTimestamp = 0; return; }
      if (timestamp - lastPaint >= 32) {
        elapsed += lastTimestamp ? Math.min((timestamp - lastTimestamp) / 1000, .1) : 0;
        lastTimestamp = timestamp;
        lastPaint = timestamp;
        const movement = ((progressRef?.current ?? 0) - travel) * .13;
        travel += movement;
        draw();
      }
      frame = requestAnimationFrame(animate);
    };
    const resume = () => { if (!frame && visible && !motion.matches && !document.hidden) frame = requestAnimationFrame(animate); };
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); });
    const size = new ResizeObserver(resize);
    size.observe(canvas);
    visibility.observe(canvas);
    document.addEventListener('visibilitychange', resume);
    motion.addEventListener('change', resume);
    resize();
    resume();
    return () => {
      cancelAnimationFrame(frame);
      size.disconnect();
      visibility.disconnect();
      document.removeEventListener('visibilitychange', resume);
      motion.removeEventListener('change', resume);
    };
  }, [progressRef]);
  return <div className="water-scene"><canvas ref={canvasRef} role="img" aria-label={label}/></div>;
}
