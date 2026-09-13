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
    let travel = progressRef?.current ?? 0;

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
      for (let band = 0; band < 7; band++) {
        ctx.beginPath();
        const phase = ((band / 7 + travel * .8) % 1 + 1) % 1;
        const yBase = height * (.22 + Math.pow(phase, 1.5) * 1.15);
        for (let step = 0; step <= 42; step++) {
          const x = step / 42 * width;
          const y = yBase + Math.sin(x / width * 8 + band * 1.6 + travel * 8) * height * .035 + Math.sin(x / width * 15 - travel * 3) * height * .012;
          if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        const fade = Math.sin(phase * Math.PI);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = `rgba(50,130,184,${fade * .045})`;
        ctx.lineWidth = 18 + phase * 18;
        ctx.stroke();
        ctx.strokeStyle = `rgba(245,252,255,${fade * .18})`;
        ctx.lineWidth = 4 + phase * 6;
        ctx.stroke();
      }

      for (let particle = 0; particle < 14; particle++) {
        const seed = particle + 1;
        const depth = ((seed * .173 - travel * .8) % 1 + 1) % 1;
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
      const ratio = Math.min(window.devicePixelRatio || 1, 1.25, Math.sqrt(600000 / (width * height)));
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      travel = progressRef?.current ?? 0;
      draw();
    };

    const paintProgress = () => {
      frame = 0;
      if (!visible || document.hidden) return;
      const target = progressRef?.current ?? 0;
      if (motion.matches) {
        travel = target;
        draw();
        return;
      }
      travel += (target - travel) * .24;
      draw();
      if (Math.abs(target - travel) > .002) frame = requestAnimationFrame(paintProgress);
    };

    const schedulePaint = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(paintProgress);
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        return;
      }
      schedulePaint();
    };
    const handleMotionChange = () => {
      travel = progressRef?.current ?? 0;
      draw();
    };
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedulePaint();
    });
    const size = new ResizeObserver(resize);
    size.observe(canvas);
    visibility.observe(canvas);
    window.addEventListener('shrimply:water-progress', schedulePaint);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    motion.addEventListener('change', handleMotionChange);
    resize();
    return () => {
      cancelAnimationFrame(frame);
      size.disconnect();
      visibility.disconnect();
      window.removeEventListener('shrimply:water-progress', schedulePaint);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      motion.removeEventListener('change', handleMotionChange);
    };
  }, [progressRef]);
  return <div className="water-scene"><canvas ref={canvasRef} role="img" aria-label={label}/></div>;
}
