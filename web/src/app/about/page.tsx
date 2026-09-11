"use client";

import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  Zap, 
  BarChart2, 
  Database, 
  Brain, 
  ShieldCheck, 
  TrendingDown,
  Shuffle,
  ClipboardX
} from 'lucide-react';

import Cursor from '@/components/Cursor';

export default function AboutPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('v');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.r').forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <main>
      <Cursor />
      <Navbar />

      {/* Hero Section */}
      <section className="section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
        <div className="container">
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.3s', marginBottom: '20px' }}>About Shrimply</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.5s', marginBottom: '32px', maxWidth: '900px' }}>
            The aquaculture industry<br />had a data problem.<br /><em>We fixed it.</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.7s', maxWidth: '560px', fontSize: '1.1rem', lineHeight: 1.8 }}>
            Built by farmers who lived the chaos of fragmented data, lost cycles, and platforms that offered zero actual insight. Shrimply is the operating system the industry deserved and never had.
          </p>
        </div>
      </section>

      {/* Problem Section */}
      <section className="section dark-section">
        <div className="dark-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
            <div>
              <div className="eyebrow r" style={{ marginBottom: '16px' }}>The Problem</div>
              <h2 className="section-title r d1" style={{ marginBottom: '24px', color: 'var(--white)' }}>
                Shrimp farming is one of the most technical industries in the world.<br /><em>The software never reflected that.</em>
              </h2>
              <p className="r d2" style={{ marginBottom: '20px' }}>
                Farmers were running operations across fragmented spreadsheets, disconnected apps, and inconsistent reports. Data gaps between shifts. Inventory in one app, feed in another, water quality in a third.
              </p>
              <p className="r d3">
                And at the end of every cycle a long, painful reconciliation that never quite added up to a profitable harvest.
              </p>
            </div>
            <div className="r d2">
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(26,184,232,0.12)', borderRadius: '16px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { icon: <ClipboardX size={18} strokeWidth={1.5} />, text: "Farm records that lived in notebooks, and spreadsheets" },
                  { icon: <BarChart2 size={18} strokeWidth={1.5} />, text: "Platforms that stored data but offered zero intelligence" },
                  { icon: <Shuffle size={18} strokeWidth={1.5} />, text: "Five different apps to manage one operation" },
                  { icon: <TrendingDown size={18} strokeWidth={1.5} />, text: "Missed biomass targets every cycle with no early warning" }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <span style={{ color: 'var(--sky)', flexShrink: 0, marginTop: '3px' }}>{item.icon}</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Standard Section */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container">
          <div className="eyebrow r" style={{ marginBottom: '16px', textAlign: 'center' }}>The Standard We Set</div>
          <h2 className="section-title r d1" style={{ textAlign: 'center', marginBottom: '20px' }}>
            We built the platform <em>we always wanted.</em>
          </h2>
          <p className="r d2" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 80px' }}>
            Shrimply is the first truly unified aquaculture operating system, built to close data gaps, connect every part of your operation, and actually help you understand what is happening in your ponds.
          </p>
          
          <div className="features-grid">
            <div className="feature-card r d1">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Database size={28} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>One Source of Truth</h3>
              <p>Feed, inventory, water quality, and harvest data, all in one place. No more reconciliation. No more guesswork between shifts. Your operation, completely unified.</p>
            </div>
            <div className="feature-card r d2">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Brain size={28} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Biological Intelligence</h3>
              <p>Orson AI doesn&apos;t just store your data. It understands it, turning raw numbers into 72-hour forecasts, trend alerts, and biological insights that keep you ahead of problems before they cost you.</p>
            </div>
            <div className="feature-card r d3">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><ShieldCheck size={28} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Proactive Disease Defense</h3>
              <p>Disease doesn&apos;t wait for you to notice it. Our real-time outbreak map alerts you when nearby farms report disease activity, giving you the preparation time that saves entire cycles.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Principles Section */}
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ textAlign: 'center', marginBottom: '80px' }}>
          <div className="eyebrow r" style={{ marginBottom: '16px' }}>What We Stand For</div>
          <h2 className="section-title r d1">
            Four principles that drive <em>every decision we make.</em>
          </h2>
        </div>
        <section className="stats-band">
          <div className="stat-box r d1">
            <div className="stat-num">01</div>
            <span className="stat-lbl">Farmer-Built</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Founded by a farmer who lived the problem firsthand, not a software team guessing at it.</p>
          </div>
          <div className="stat-box r d2">
            <div className="stat-num">02</div>
            <span className="stat-lbl">All-in-One</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>One platform replaces the stack of apps and spreadsheets most operations run today.</p>
          </div>
          <div className="stat-box r d3">
            <div className="stat-num">03</div>
            <span className="stat-lbl">Shrimp-Specific</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Every feature is built around the specific biology, risk profile, and economics of shrimp aquaculture.</p>
          </div>
          <div className="stat-box r d4">
            <div className="stat-num">04</div>
            <span className="stat-lbl">Proactive Protection</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Moving the industry from reactive firefighting to proactive defense - especially against the devastating spread of disease.</p>
          </div>
        </section>
      </section>


      {/* CTA Section */}
      <section className="section dark-section" style={{ textAlign: 'center', background: 'linear-gradient(160deg, var(--navy) 0%, var(--deep) 100%)' }}>
        <div className="dark-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="eyebrow r d1" style={{ marginBottom: '20px' }}>The Bottom Line</div>
          <h2 className="section-title r d2" style={{ marginBottom: '24px', color: 'var(--white)', maxWidth: '700px', margin: '0 auto 24px' }}>
            Farming is a business.<br /><em>We built Orson AI to keep it that way.</em>
          </h2>
          <p className="r d3" style={{ maxWidth: '480px', margin: '0 auto 48px', color: 'rgba(255,255,255,0.65)' }}>
            Eliminate the noise. Prevent losses. Achieve your goals with the clarity and efficiency your farm deserves.
          </p>
          <div className="r d4 mobile-cta-row" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <a href="/auth/join" className="btn-primary">Start for Free</a>
            <a href="/how-it-works" className="btn-outline" style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)' }}>See How It Works</a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
