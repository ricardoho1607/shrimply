"use client";

import { useEffect } from "react";

export default function RevealOnScroll() {
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("v");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -30px 0px" });

    document.querySelectorAll(".r, .stat-box").forEach(element => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return null;
}
