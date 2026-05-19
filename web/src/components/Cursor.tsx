"use client";

import React, { useEffect } from 'react';

export default function Cursor() {
  useEffect(() => {
    const cursor = document.getElementById('cursor');
    const ring = document.getElementById('cursor-ring');
    let mx = 0, my = 0, rx = 0, ry = 0;
    
    const onMouseMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    document.addEventListener('mousemove', onMouseMove);
    
    // Hide default cursor
    const style = document.createElement('style');
    style.innerHTML = `* { cursor: none !important; }`;
    document.head.appendChild(style);
    
    const updateHov = () => {
      const interactiveElements = document.querySelectorAll('a, button, .feature-card, .btn-primary, .btn-outline, .nav-link, .stat-box, .value-card, .ai-chat');
      const onEnter = () => document.body.classList.add('hov');
      const onLeave = () => document.body.classList.remove('hov');
      interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mouseleave', onLeave);
      });
      return () => {
        interactiveElements.forEach(el => {
          el.removeEventListener('mouseenter', onEnter);
          el.removeEventListener('mouseleave', onLeave);
        });
      };
    };

    const cleanupHov = updateHov();

    let rafId: number;
    function tick() {
      if (cursor && ring) {
        cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
        rx += (mx - rx) * 0.12;
        ry += (my - ry) * 0.12;
        ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      }
      rafId = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.head.removeChild(style);
      cancelAnimationFrame(rafId);
      cleanupHov();
    };
  }, []);

  return (
    <>
      <div id="cursor"></div>
      <div id="cursor-ring"></div>
    </>
  );
}
