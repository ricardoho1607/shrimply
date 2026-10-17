"use client";

import { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [ringPosition, setRingPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a, button, [role="button"]')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  // Ring lag effect
  useEffect(() => {
    let requestRef: number;
    const animate = () => {
      setRingPosition(prev => ({
        x: prev.x + (position.x - prev.x) * 0.15,
        y: prev.y + (position.y - prev.y) * 0.15
      }));
      requestRef = requestAnimationFrame(animate);
    };
    requestRef = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef);
  }, [position]);

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: isHovering ? '16px' : '9px',
          height: isHovering ? '16px' : '9px',
          backgroundColor: 'var(--sky)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9999,
          transform: `translate(${position.x - (isHovering ? 8 : 4.5)}px, ${position.y - (isHovering ? 8 : 4.5)}px)`,
          transition: 'width 0.25s, height 0.25s',
          display: 'block'
        }}
      />
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: isHovering ? '52px' : '32px',
          height: isHovering ? '52px' : '32px',
          border: '1.5px solid var(--sky)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9998,
          transform: `translate(${ringPosition.x - (isHovering ? 26 : 16)}px, ${ringPosition.y - (isHovering ? 26 : 16)}px)`,
          opacity: isHovering ? 0.2 : 0.4,
          transition: 'width 0.3s, height 0.3s, opacity 0.3s',
          display: 'block'
        }}
      />
    </>
  );
}
