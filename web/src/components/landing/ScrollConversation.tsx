'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export default function ScrollConversation({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setInteractive(true);
      observer.disconnect();
    }, { rootMargin: '600px 0px' });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!interactive) return;
    const root = rootRef.current;
    const stage = root?.querySelector<HTMLElement>('.conversation');
    const body = root?.querySelector<HTMLElement>('.conversation-body');
    if (!root || !stage || !body) return;
    const messages = [...body.querySelectorAll<HTMLElement>('.question, .answer > *, .conversation-caption')];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let lastVisible = -1;
    const update = () => {
      frame = 0;
      const distance = Math.max(1, root.offsetHeight - stage.offsetHeight - 24);
      const progress = Math.min(1, Math.max(0, (24 - root.getBoundingClientRect().top) / distance));
      const visible = Math.min(messages.length - 1, Math.floor(progress * messages.length));
      if (visible === lastVisible) return;
      lastVisible = visible;
      messages.forEach((message, index) => {
        const shown = index <= visible;
        message.style.display = shown ? '' : 'none';
        if (shown && index === visible && !motion.matches) {
          message.animate([
            { opacity: 0, transform: 'translateY(14px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ], { duration: 420, easing: 'ease-out' });
        }
      });
      const answer = body.querySelector<HTMLElement>('.answer');
      if (answer) answer.style.display = visible > 0 ? '' : 'none';
      body.scrollTop = Math.max(0, body.scrollHeight - body.clientHeight);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    observer.observe(body);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [interactive]);

  return <div className="conversation-journey" ref={rootRef}>{children}</div>;
}
