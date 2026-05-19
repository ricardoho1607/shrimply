# Shrimply — UI/UX Design System
> Aquaculture Intelligence Platform · Design Specification Document

---

## Table of Contents

1. [Brand Identity](#1-brand-identity)
2. [Design Tokens](#2-design-tokens)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Components](#5-components)
6. [Animations & Motion](#6-animations--motion)
7. [Page Sections](#7-page-sections)
8. [App Dashboard UI](#8-app-dashboard-ui)
9. [Responsive Behavior](#9-responsive-behavior)
10. [Implementation Notes](#10-implementation-notes)

---

## 1. Brand Identity

### Logo
- **File:** `Shrimply1.png` — a stylized shrimp icon with circuit-node details, paired with bold serif "Shrimply" wordmark
- **Usage in nav:** `height: 36px`, `width: auto`, displayed at full color on light backgrounds
- **Usage in footer:** Same asset with `filter: brightness(0) invert(1) opacity(0.8)` for white-on-dark rendering
- **Never** stretch, recolor, or add drop shadows to the logo

### Brand Personality
Elegant, data-driven, trustworthy, premium. The visual language should feel like a high-end SaaS product crossed with an editorial magazine — technically rigorous but visually beautiful. Every screen should be something even a non-farmer finds stunning.

### Color Philosophy
Extracted directly from the logo: deep navy → ocean blue → bright cyan. Light backgrounds (off-white, ice) keep it clean and airy. The cyan accent (`#1ab8e8`) is the single most important color in the system — it is the brand.

---

## 2. Design Tokens

### Color Palette

#### Blues (Primary Brand)
| Token | Hex | Usage |
|-------|-----|-------|
| `--navy` | `#0d2137` | Darkest brand blue; headings, footer bg, dark sections |
| `--ocean` | `#1a3a5c` | Mid-dark blue; body text on dark, card backgrounds |
| `--blue` | `#1e6fa8` | Primary interactive blue; links, secondary buttons |
| `--mid` | `#2985c8` | Hover states, active indicators |
| `--sky` | `#1ab8e8` | **Primary accent** — CTAs, highlights, chart lines, cursor |
| `--sky-light` | `rgba(26,184,232,0.12)` | Card hover tints, subtle backgrounds |
| `--sky-mid` | `rgba(26,184,232,0.28)` | Button shadows, focus rings |
| `--cyan-glow` | `rgba(26,184,232,0.06)` | Radial gradient glows behind dark sections |

#### Neutrals
| Token | Hex | Usage |
|-------|-----|-------|
| `--white` | `#ffffff` | Pure white backgrounds |
| `--off-white` | `#f4f8fc` | Slightly blue-tinted light background (alternate sections) |
| `--ice` | `#e8f2f9` | Hover tints on neutral cards |
| `--slate` | `#dce8f2` | Borders, dividers, inactive bar tracks |
| `--fog` | `#b0c8dc` | Placeholder text, subtle labels, footer tagline |
| `--muted` | `#6b8aa0` | Body copy, secondary text |
| `--deep` | `#0a1c2b` | Footer background |
| `--ink` | `#071420` | Absolute darkest text (rarely used directly) |

#### Semantic / Status
| Token | Value | Usage |
|-------|-------|-------|
| Good/Online | `#1ae88c` | Positive alerts, healthy pond indicators |
| Warning | `#e8b81a` | Watch alerts, trending issues |
| Critical | `#e84c1a` | Danger states, critical alerts |

### Gradients

```css
/* Primary CTA button gradient */
background: linear-gradient(135deg, #1e6fa8 0%, #1ab8e8 100%);

/* Dark hero / dashboard section */
background: linear-gradient(160deg, #0d2137 0%, #1a3a5c 60%, #1a3f6a 100%);

/* Dark section with directional gradient */
background: linear-gradient(135deg, #0d2137 0%, #1a3a5c 100%);

/* Radial glow (used in dark sections) */
background: radial-gradient(ellipse 70% 70% at 70% 40%, rgba(26,184,232,0.12) 0%, transparent 65%);

/* Chart area fill */
background: linear-gradient(to bottom, rgba(26,184,232,0.20) 0%, rgba(26,184,232,0) 100%);

/* Bar fill */
background: linear-gradient(90deg, #1e6fa8, #1ab8e8);
```

### Box Shadows

```css
/* Primary CTA button */
box-shadow: 0 8px 32px rgba(26,184,232,0.28);

/* Primary CTA button hover */
box-shadow: 0 14px 42px rgba(26,184,232,0.40);

/* App window / mockup */
box-shadow: 0 40px 120px rgba(0,0,0,0.50), 0 0 0 1px rgba(26,184,232,0.08);

/* Card hover lift */
box-shadow: 0 20px 60px rgba(30,111,168,0.08);

/* Testimonial card hover */
box-shadow: 0 24px 60px rgba(30,111,168,0.10);

/* Alert float card */
box-shadow: 0 12px 40px rgba(0,0,0,0.40);
```

---

## 3. Typography

### Font Stack

```css
--serif: 'Cormorant Garamond', Georgia, serif;
--sans:  'DM Sans', sans-serif;
--mono:  'DM Mono', monospace;
```

**Google Fonts import:**
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
```

### Type Scale

| Role | Font | Size | Weight | Letter-spacing | Line-height |
|------|------|------|--------|----------------|-------------|
| Hero H1 | Cormorant Garamond | `clamp(3.6rem, 6vw, 7rem)` | 300 | — | 0.94 |
| Section Title | Cormorant Garamond | `clamp(2.2rem, 3.8vw, 3.8rem)` | 300 | — | 1.1 |
| Manifesto Quote | Cormorant Garamond | `clamp(1.9rem, 3.2vw, 3rem)` | 300 | — | 1.28 |
| Feature Title | Cormorant Garamond | `1.5rem` | 400 | — | 1.25 |
| Big Stat Number | Cormorant Garamond | `clamp(3.2rem, 5.5vw, 5.5rem)` | 300 | — | 1 |
| Pricing Price | Cormorant Garamond | `2.2rem` | 600 | — | 1 |
| Testimonial Quote | Cormorant Garamond | `1.06rem` | 300 | — | 1.72 |
| Nav Logo (text fallback) | Cormorant Garamond | `1.65rem` | 600 | `0.04em` | — |
| Body / Sub | DM Sans | `0.94rem` | 400 | — | 1.85 |
| Secondary Body | DM Sans | `0.88–0.90rem` | 400 | — | 1.80–1.88 |
| Nav Links | DM Sans | `0.72rem` | 500 | `0.16em` | — |
| Eyebrows / Labels | DM Sans | `0.62–0.65rem` | 400 | `0.28–0.30em` | — |
| Button Text | DM Sans | `0.72rem` | 600 | `0.14–0.18em` | — |
| KPI Values (app) | DM Mono | `1.05–1.1rem` | 500 | — | 1 |
| Code / URLs | DM Mono | `0.68–0.70rem` | 400 | — | — |

### Type Rules
- All eyebrows, labels, nav links, and button text are `text-transform: uppercase`
- `em` in Cormorant Garamond headings = `font-style: italic; color: var(--sky)` — this is the brand emphasis pattern
- `strong` inside H1 = `font-weight: 600; color: var(--blue); font-style: normal`
- Testimonial quotes always use `font-style: italic`
- Section count decorators (e.g. "03", "★") use `font-family: var(--serif); font-size: 5rem; font-weight: 300; color: var(--slate)`

---

## 4. Spacing & Layout

### Grid

The site uses a **12-column implicit grid** built with CSS Grid. Key layout patterns:

| Section | Grid | Gap |
|---------|------|-----|
| Hero | `1fr 1fr` (50/50 split) | — |
| Features | `repeat(3, 1fr)` | `2px` |
| Stats band | `repeat(4, 1fr)` | `0` (border dividers) |
| Analytics | `1fr 1fr` | `2px` |
| Dashboard layout | `1fr 1.6fr` | `64px` |
| Highlight | `1fr 1fr` | `80px` |
| Timeline | `1fr 3px 1fr` | `0 52px` |
| Testimonials | `repeat(3, 1fr)` | `20px` |
| Pricing/CTA | `1fr 1fr` | `80px` |
| Footer | `2fr 1fr 1fr 1fr` | `60px` |
| App dashboard inner | `52px 1fr` (sidebar + content) | — |
| App KPI row | `repeat(4, 1fr)` | `8px` |
| Pricing cards | `column (flex)` | `14px` |

### Page Padding
- **Section horizontal padding:** `52px` (left and right)
- **Section vertical padding:** `140px` (top and bottom) for major sections
- **Highlight / CTA vertical padding:** `110–160px`
- **Footer padding:** `80px 52px 44px`

### Gaps between card grids
Feature, analytics, and stats grids use `gap: 2px` to create a tight editorial block feel — cards butt up against each other with only a hairline gap, not traditional gutters.

---

## 5. Components

### 5.1 Navigation

**Structure:** Logo left → Links center → [Sign In + CTA button] right  
**Position:** `fixed; top: 0; left: 0; right: 0; z-index: 1000`

**Default state:**
```css
padding: 22px 52px;
background: transparent;
```

**Scrolled state** (triggered at `scrollY > 60`):
```css
padding: 14px 52px;
background: rgba(255,255,255,0.92);
backdrop-filter: blur(20px);
box-shadow: 0 1px 0 var(--slate);
transition: all 0.45s ease;
```

**Nav links underline animation:**
```css
/* Pseudo-element on each link */
::after {
  content: '';
  position: absolute;
  bottom: -3px; left: 0;
  width: 0; height: 1.5px;
  background: var(--sky);
  transition: width 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}
a:hover::after { width: 100%; }
```

**Sign In link:** `color: var(--blue); font-weight: 500; font-size: 0.72rem`  
**CTA button:** Gradient pill (see Button Primary below)

---

### 5.2 Buttons

#### Primary (Gradient Pill)
```css
background: linear-gradient(135deg, var(--blue) 0%, var(--sky) 100%);
color: var(--white);
padding: 15px 38px;
border-radius: 100px;
font-size: 0.72rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase;
box-shadow: 0 8px 32px rgba(26,184,232,0.28);
transition: transform 0.25s, box-shadow 0.25s;
/* Hover: */
transform: translateY(-2px);
box-shadow: 0 14px 42px rgba(26,184,232,0.40);
```

#### Outline
```css
border: 1.5px solid var(--slate);
color: var(--blue);
padding: 14px 28px;
border-radius: 100px;
background: transparent;
font-size: 0.72rem; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase;
/* Hover: */
border-color: var(--sky); color: var(--sky);
```

#### Ghost (Arrow link)
```css
display: flex; align-items: center; gap: 10px;
color: var(--muted); font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase;
/* ::before pseudo line */
content: ''; width: 28px; height: 1px; background: currentColor;
transition: width 0.35s;
/* Hover: color → var(--sky); ::before width → 44px */
```

#### Feature Card Link (arrow text)
```css
display: inline-flex; align-items: center; gap: 8px;
font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--blue);
/* span inside = 16×1.5px line */
/* Hover: gap → 16px; color → var(--sky) */
```

---

### 5.3 Cards

#### Feature Card
```css
background: var(--off-white);
padding: 52px 40px;
position: relative; overflow: hidden;
transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
/* Hover: transform: translateY(-5px) */
/* Hover ::before overlay: linear-gradient(140deg, var(--sky-light), transparent); opacity: 0 → 1 */
```

**Accent variant** (center card in 3-col grid):
```css
background: linear-gradient(160deg, var(--navy), var(--ocean));
/* All text: color: var(--white) */
/* Feature link: color: var(--sky) */
```

**Feature number decoration:**
```css
position: absolute; top: 24px; right: 28px;
font-family: var(--serif); font-size: 5rem; font-weight: 600;
color: rgba(26,58,92,0.08);  /* very subtle watermark */
```

#### Analytics Card
```css
background: var(--off-white);
border: 1px solid var(--slate);
padding: 48px;
transition: box-shadow 0.4s, transform 0.4s;
/* Hover: box-shadow: 0 20px 60px rgba(30,111,168,0.08); transform: translateY(-3px) */
```

**Wide variant** (spans full grid width):
```css
grid-column: 1 / -1;
display: grid; grid-template-columns: 1fr 1fr; gap: 52px; align-items: center;
padding: 52px 48px;
```

#### Testimonial Card
```css
background: var(--off-white);
border: 1px solid var(--slate);
padding: 44px 36px; border-radius: 6px;
transition: transform 0.4s, box-shadow 0.4s;
/* Hover: transform: translateY(-6px); box-shadow: 0 24px 60px rgba(30,111,168,0.10) */
```

**Blue featured variant** (center card, offset upward):
```css
background: linear-gradient(160deg, var(--navy), var(--ocean));
border-color: transparent;
margin-top: -18px;  /* lifts center card above siblings */
/* All text: color: var(--white) */
/* Stars: color: var(--sky) */
```

#### Stat Box
```css
padding: 60px 40px;
border-right: 1px solid var(--slate);
transition: background 0.4s;
/* Hover: background: var(--ice) */
/* Bottom bar pseudo-element: */
::before {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--sky), var(--blue));
  transform: scaleX(0); transform-origin: left;
  transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
}
/* On hover or .v class: transform: scaleX(1) */
```

#### Pricing Card
```css
background: var(--white);
border: 1.5px solid var(--slate);
border-radius: 12px; padding: 28px 32px;
transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
/* Hover: border-color: var(--sky); box-shadow: 0 12px 40px rgba(26,184,232,0.10); transform: translateY(-2px) */
```

**Featured (Pro) variant:**
```css
background: linear-gradient(160deg, var(--navy), var(--ocean));
border-color: var(--sky);
```

---

### 5.4 Data Bars

```css
/* Track */
.bar-track {
  flex: 1; height: 3px;
  background: var(--slate);
  border-radius: 2px; overflow: hidden;
}
/* Fill — starts at scaleX(0), animates in via IntersectionObserver */
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--blue), var(--sky));
  border-radius: 2px;
  transform: scaleX(0); transform-origin: left;
  transition: transform 1.2s cubic-bezier(0.25, 1, 0.5, 1);
}
```

Each bar row layout: `display: flex; align-items: center; gap: 12px`  
Label: `width: 100px; font-size: 0.68rem; color: var(--muted)`  
Percentage: `width: 30px; text-align: right; font-size: 0.68rem; color: var(--fog)`

**JS trigger (IntersectionObserver):**
```js
fill.style.transform = `scaleX(${fill.dataset.w})`;
// Each bar staggered: transitionDelay = (i * 0.1) + 's'
```

---

### 5.5 Custom Cursor

```css
#cursor {
  position: fixed; width: 9px; height: 9px;
  background: var(--sky); border-radius: 50%;
  pointer-events: none; z-index: 9999;
  transform: translate(-50%, -50%);
  transition: width 0.25s, height 0.25s;
}
#cursor-ring {
  position: fixed; width: 32px; height: 32px;
  border: 1.5px solid var(--sky); border-radius: 50%;
  pointer-events: none; z-index: 9998;
  transform: translate(-50%, -50%);
  opacity: 0.4;
  transition: width 0.3s, height 0.3s, opacity 0.3s;
}
/* Hover state (body.hov): */
#cursor { width: 16px; height: 16px; }
#cursor-ring { width: 52px; height: 52px; opacity: 0.2; }
```

**JS — spring-physics lag on ring:**
```js
let mx=0, my=0, rx=0, ry=0;
document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
(function tick() {
  cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
  rx += (mx - rx) * 0.12;   // lerp factor = lag amount
  ry += (my - ry) * 0.12;
  ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
  requestAnimationFrame(tick);
})();
```

`body { cursor: none; }` on all interactive elements.

---

### 5.6 Grain Overlay

Applied as `body::before` — a fixed full-viewport SVG noise texture at low opacity to add tactile depth:

```css
body::before {
  content: ''; position: fixed; inset: 0;
  pointer-events: none; z-index: 8999; opacity: 0.18;
  background-image: url("data:image/svg+xml,<SVG feTurbulence fractalNoise baseFrequency='.88' numOctaves='4'/>");
}
```

---

### 5.7 Marquee Strip

```css
.marquee {
  background: linear-gradient(90deg, var(--navy) 0%, var(--ocean) 50%, var(--navy) 100%);
  overflow: hidden; padding: 14px 0; white-space: nowrap;
  border-top: 1px solid rgba(26,184,232,0.10);
  border-bottom: 1px solid rgba(26,184,232,0.10);
}
.marquee-inner {
  display: inline-flex;
  animation: mq 26s linear infinite;
}
@keyframes mq { from { transform: translateX(0); } to { transform: translateX(-50%); } }
```

Items: `font-size: 0.62rem; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(255,255,255,0.45); padding: 0 36px`  
Separators (◆): `color: var(--sky); opacity: 0.5`  

**Content must be duplicated** in HTML (items × 2) so the loop is seamless.

---

### 5.8 Timeline

Three-column grid: `1fr | 3px spine | 1fr`

**Spine:**
```css
.tl-spine {
  background: var(--slate);
  position: relative;
}
.tl-spine::after {
  content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 0;
  background: linear-gradient(to bottom, var(--sky), var(--blue));
  transition: height 1.6s cubic-bezier(0.25, 1, 0.5, 1);
}
.tl-spine.go::after { height: 100%; }
```

**Node dots** on spine (absolutely positioned):
```css
.tl-node {
  position: absolute; top: var(--top); left: 50%;
  transform: translateX(-50%);
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--sky);
  box-shadow: 0 0 0 4px rgba(26,184,232,0.20);
}
```

**Left items:** `text-align: right; transform: translateX(-20px)` → on `.go`: `transform: translateX(0)`  
**Right items:** `transform: translateX(20px)` → on `.go`: `transform: translateX(0)`  
All items start at `opacity: 0`, transition to `opacity: 1` with staggered JS delays.

---

## 6. Animations & Motion

### Keyframes

```css
/* Entry animation for hero text */
@keyframes fup {
  from { opacity: 0; transform: translateY(var(--dy, 14px)); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Simple fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Hero app window slide up */
@keyframes appSlide {
  from { opacity: 0; transform: translate(-46%, -44%); }
  to   { opacity: 1; transform: translate(-46%, -50%); }
}

/* Water wave oscillation */
@keyframes wv {
  0%, 100% { transform: translateX(-24%); }
  50%       { transform: translateX(0%); }
}

/* Bubble rise */
@keyframes brise {
  0%   { transform: translateY(0) scale(1);   opacity: 0.6; }
  100% { transform: translateY(-350px) scale(1.5); opacity: 0; }
}

/* Floating hero shrimp (if used) */
@keyframes sfloat {
  0%, 100% { transform: translate(-50%, -56%) rotate(-2.5deg); }
  50%       { transform: translate(-50%, -62%) rotate(2.5deg); }
}

/* Scroll indicator pulse */
@keyframes scpulse {
  0%, 100% { opacity: 0.35; }
  50%       { opacity: 1; }
}

/* Marquee */
@keyframes mq {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
```

### Hero Stagger (load sequence)
| Element | Delay | Duration | Animation |
|---------|-------|----------|-----------|
| Eyebrow | 0.30s | 0.90s | `fup` |
| H1 | 0.52s | 1.00s | `fup` |
| Subtitle | 0.76s | 1.00s | `fup` |
| Action buttons | 0.98s | 1.00s | `fup` |
| App window | 0.70s | 1.10s | `appSlide` |
| Floating alert | 1.40s | 1.00s | `fadeIn` |
| Hero stats bar | 1.60s | 1.00s | `fadeIn` |
| Scroll cue | 2.00s | 1.00s | `fadeIn` |

### Scroll Reveal System

```css
.r {
  opacity: 0;
  transform: translateY(26px);
  transition: opacity 0.8s cubic-bezier(0.25, 1, 0.5, 1),
              transform 0.8s cubic-bezier(0.25, 1, 0.5, 1);
}
.r.v { opacity: 1; transform: translateY(0); }

/* Delay utilities */
.r.d1 { transition-delay: 0.10s; }
.r.d2 { transition-delay: 0.22s; }
.r.d3 { transition-delay: 0.34s; }
.r.d4 { transition-delay: 0.48s; }
```

**IntersectionObserver config:**
```js
new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('v'); obs.unobserve(e.target); }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
```

### Easing Reference
| Use | Curve |
|-----|-------|
| Standard reveal / slide | `cubic-bezier(0.25, 1, 0.5, 1)` — snappy deceleration |
| Button hover | `ease` or `0.25s` standard |
| Nav transition | `0.45s ease` |
| Bar fill growth | `cubic-bezier(0.25, 1, 0.5, 1)` — elastic feel |
| Timeline spine draw | `cubic-bezier(0.25, 1, 0.5, 1)` at 1.6s |
| App mockup reveal | `cubic-bezier(0.25, 1, 0.5, 1)` at 0.9s |
| Cursor ring lag | `lerp factor 0.12` per frame (rAF loop) |

---

## 7. Page Sections

### Section Structure Overview

```
[NAV] fixed overlay
  ↓
[HERO] full-viewport split: left text / right app mockup
  ↓
[MARQUEE] dark scrolling ticker strip
  ↓
[MANIFESTO] off-white, 2-col: sticky label / editorial text
  ↓
[LOGO BAND] trusted brands row
  ↓
[FEATURES] white bg, 3×2 card grid
  ↓
[STATS BAND] 4-column stat boxes with animated border
  ↓
[DASHBOARD] dark navy, 2-col: bullet points / full app mockup
  ↓
[ANALYTICS] white, data cards with charts and animated bars
  ↓
[HIGHLIGHT] dark blue, sustainability stats
  ↓
[TIMELINE] off-white, animated draw-spine process steps
  ↓
[TESTIMONIALS] white, 3-col cards (center is featured/offset)
  ↓
[PRICING/CTA] off-white, text left / pricing cards right
  ↓
[FOOTER] deep navy
```

---

### 7.1 Hero Section

**Layout:** `display: grid; grid-template-columns: 1fr 1fr; min-height: 100vh`

**Left panel** (`var(--off-white)` background):
- Scroll cue (bottom-left, fixed position within panel): vertical "Scroll" text + animated gradient line
- Eyebrow tag: `0.64rem, letter-spacing 0.30em, color: var(--sky)`
- H1: serif, `clamp(3.6rem, 6vw, 7rem)`, weight 300, line-height 0.94
  - `<em>` words = italic + `var(--sky)`
  - `<strong>` words = weight 600 + `var(--blue)`
- Subtitle: `0.94rem`, `var(--muted)`, max-width 400px
- Buttons row: Primary gradient pill + Outline pill

**Right panel** (dark navy gradient):
- SVG dot-grid background (`opacity: 0.06`) for tech texture
- Radial cyan glow behind the app window
- **App window mockup** (see section 8)
- **Floating alert card** (bottom-right of panel): frosted glass style
- **Stats bar** (pinned to bottom of panel): 3 KPI pills

---

### 7.2 Manifesto

**Layout:** `grid-template-columns: 200px 1fr; gap: 80px; padding: 140px 52px`

Left column: sticky label `"Our Mission"` in `var(--sky)`, `0.62rem, 0.28em tracking`

Right column:
- Large Cormorant quote (`clamp(1.9rem, 3.2vw, 3rem)`) with `<em>` in sky blue
- 2-column body text grid below

---

### 7.3 Features (3×2 grid)

Six cards in a `repeat(3, 1fr)` grid with `gap: 2px`.

Card anatomy:
1. Watermark number (`position: absolute, top-right, 5rem serif, rgba opacity`)
2. Icon glyph (`1.6rem, color: var(--sky)`)
3. Title (Cormorant, 1.5rem, weight 400)
4. Body text (DM Sans, 0.88rem)
5. Arrow text link

Card positions:
- [0] Standard off-white
- [1] **Dark accent** (navy gradient) — center of attention
- [2] Standard off-white
- [3] Standard off-white
- [4] Standard off-white
- [5] **CTA card** — ice background, centered "Ready to begin?" + button

---

### 7.4 Stats Band

4-column grid, no gap (use `border-right` as divider).

Each stat box:
- Large Cormorant number (`clamp(2.8rem, 5vw, 4.5rem)`), `var(--sky)` accent for prefix/suffix
- Uppercase label (`0.68rem, 0.18em tracking`)
- Descriptor body text (`0.82rem, var(--fog)`)
- Animated bottom bar (scaleX 0 → 1 on hover and on viewport entry)

---

### 7.5 Dashboard Section

Dark section (`var(--navy)` → `var(--deep)` gradient), with radial glow top-right.

**Left column** — 4 feature points, each:
```
[Icon box 44×44, rounded-12, sky accent] + [Title + Body]
Starts hidden (opacity:0, translateX(-20px)) → staggered reveal
```

**Right column** — Full app dashboard mockup (see section 8.2)

---

### 7.6 Highlight / Sustainability

Split grid: text left, 2×2 stat tiles right.

Background: `linear-gradient(135deg, var(--navy), var(--ocean))`

Stat tiles:
```css
background: rgba(255,255,255,0.05);
padding: 30px 26px; border-radius: 4px;
/* Hover: background: rgba(255,255,255,0.08) */
```

Value: Cormorant `2.5rem` white + `<small>` at `1.4rem, opacity 0.4`

---

### 7.7 Pricing / CTA

**Left:** Editorial copy (label, large serif title with `<em>`, subtitle, trust bullets)

Trust bullet pattern:
```html
[7px sky circle dot] + [0.76rem fog text]
```

**Right:** Three stacked pricing cards (Starter / Professional / Enterprise)
- Professional card uses dark gradient + sky border — visually dominates
- Feature list uses `✓` pseudo-element in `var(--sky)` before each item

---

## 8. App Dashboard UI

The dashboard UI appears in two places:
1. **Hero right panel** — simplified 3-tab version
2. **Dashboard section** — full expanded version

### 8.1 App Window Shell

```css
border-radius: 16–20px;
border: 1px solid rgba(26,184,232,0.15–0.18);
background: rgba(255,255,255,0.04);
backdrop-filter: blur(4px);
overflow: hidden;
```

**Title bar:**
- 3 macOS-style traffic lights: `#ff5f57` / `#ffbd2e` / `#28c840`
- URL text: DM Mono, `0.68–0.70rem`, `rgba(255,255,255,0.35–0.40)`
- Right: status chips (e.g. "Live", "12 Ponds")

### 8.2 Dashboard Layout (inside mockup)

Two-column inner grid: `52px sidebar | 1fr main content`

**Sidebar:**
```css
background: rgba(7,20,32,0.80);
border-right: 1px solid rgba(26,184,232,0.07);
```
Icon buttons: `26×26px, border-radius: 7px`  
Active icon: `background: rgba(26,184,232,0.16); color: var(--sky)`  
Inactive: `color: rgba(255,255,255,0.25)`

**Main content padding:** `16px`, `flex-direction: column; gap: 10px`

### 8.3 KPI Cards Row

4-column grid, `gap: 8px`

Each KPI card:
```css
background: rgba(255,255,255,0.04);
border: 1px solid rgba(26,184,232,0.09);
border-radius: 8px; padding: 10px 12px;
```
- Value: DM Mono, `1.05rem`, weight 500, white
- Label: `0.50rem, 0.10em tracking, uppercase, rgba(255,255,255,0.30)`
- Delta: `0.55rem` — green (`.up`), sky (`.nt`), red (`.dn`)

### 8.4 Chart Area

```css
background: rgba(255,255,255,0.04);
border: 1px solid rgba(26,184,232,0.09);
border-radius: 8px; padding: 12px;
```

**SVG Chart specs:**
- Area fill: gradient `rgba(26,184,232,0.20)` → `rgba(26,184,232,0)` (vertical)
- Primary line: `stroke: var(--sky); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round`
- Secondary (forecast) line: `stroke: rgba(255,189,46,0.50); stroke-width: 1; stroke-dasharray: 3,3`
- Grid lines: `stroke: rgba(255,255,255,0.04); stroke-width: 1`
- Live dot at end of line: `r="3.5–4"; fill: var(--sky)`

Tab chips: `font-size: 0.50rem; padding: 2px 8px; border-radius: 20px`  
Active tab: `background: rgba(26,184,232,0.15); color: var(--sky)`

### 8.5 Alert List

```css
background: rgba(255,255,255,0.04);
border: 1px solid rgba(26,184,232,0.09);
border-radius: 8px; padding: 12px;
```

Each row: `display: flex; align-items: center; gap: 8px`  
Dot: `6×6px, border-radius: 50%` — green / yellow / red  
Text: `0.57rem, rgba(255,255,255,0.50)`  
Time: `0.50rem, rgba(255,255,255,0.20), font-family: var(--mono); margin-left: auto`  
Rows separated by `border-bottom: 1px solid rgba(255,255,255,0.04)`

### 8.6 Pond Progress Cards

3-column grid (`repeat(3, 1fr), gap: 8px`)

Each card:
```css
background: rgba(255,255,255,0.04);
border: 1px solid rgba(26,184,232,0.09);
border-radius: 8px; padding: 10px 12px;
position: relative; overflow: hidden;
/* Bottom progress bar via ::after */
::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--sky), var(--blue));
  transform: scaleX(var(--prog));  /* CSS custom property per card */
  transform-origin: left;
}
```

---

## 9. Responsive Behavior

> The current build is desktop-first. Mobile breakpoints should be added as follows:

### Breakpoint: `≤ 1024px` (tablet)
- Hero: stack to single column, right panel hidden or reduced
- Features: `repeat(2, 1fr)` → 2×3
- Stats band: `repeat(2, 1fr)` → 2×2
- Footer: `repeat(2, 1fr)`
- Nav links: hide, replace with hamburger

### Breakpoint: `≤ 768px` (mobile)
- Hero: single column, app mockup replaced by stat pills only
- Features: single column
- Timeline: single column (spine removed, items stack)
- Testimonials: single column
- Pricing: single column
- Manifesto: single column
- Section padding: `24px` horizontal, `80px` vertical

---

## 10. Implementation Notes

### Tech Stack
- **Framework:** Vanilla HTML/CSS/JS (no dependencies)
- **Fonts:** Google Fonts (Cormorant Garamond + DM Sans + DM Mono)
- **Icons:** Unicode glyphs (`◉`, `◈`, `◇`, `⊞`, `▲`, `⌂`, `⚙`) — no icon library needed
- **Charts:** Inline SVG — hand-authored paths, no chart library

### JS Features Required
1. **Custom cursor** — `mousemove` + `rAF lerp` loop
2. **Nav scroll class** — `scroll` event + `classList.toggle`
3. **Scroll reveal** — `IntersectionObserver` on all `.r` elements
4. **Bar chart animation** — `IntersectionObserver` on card containers
5. **Timeline spine** — `IntersectionObserver` + staggered `setTimeout` on items
6. **Dashboard mockup** — `IntersectionObserver` for entry animation
7. **DB points stagger** — section-level observer → `setTimeout` per point

### File Structure
```
/
├── index.html        ← entire site (single file)
├── Shrimply1.png     ← logo (must be co-located with HTML)
└── design.md         ← this document
```

### Performance Notes
- All animations are CSS transforms/opacity only — GPU composited, no layout thrash
- SVG charts are static (no re-render); update paths server-side or via JS string replacement for real data
- Grain overlay is a fixed SVG data URI — no external request
- Custom cursor uses `rAF` not `mousemove` for paint — smooth at 60fps
- `backdrop-filter` on nav uses `will-change: backdrop-filter` for best perf

### Dark Section Pattern
Used in: Hero right, Marquee, Dashboard section, Highlight, Footer

```css
/* Always pair dark background with: */
border: 1px solid rgba(26,184,232,0.10–0.18);     /* borders */
color: rgba(255,255,255,0.45–0.55);                /* body text */
color: rgba(255,255,255,0.25–0.30);                /* tertiary text */
color: var(--sky);                                  /* accent text */
background: rgba(255,255,255,0.03–0.05);            /* card bg */
/* Radial glow if needed: */
background: radial-gradient(circle, rgba(26,184,232,0.06), transparent 70%);
```

### Brand Voice in UI Copy
- Section labels: 2–4 words, e.g. `"Core Platform"`, `"By the Numbers"`, `"Farmer Stories"`
- Eyebrows on hero: full sentence with dash — `"Aquaculture Intelligence Platform — Est. 2024"`
- H1 always has one `<em>` (italic sky) word and optionally one `<strong>` (bold blue) word
- Stats use separators: `14,200` not `14200`; `+320%` not `320%`; `2.1×` not `2.1x`
- CTA copy: active, aspirational — `"Begin Your Journey"`, `"Start Free Trial"`, `"See the App"`

---

*Design System v1.0 · Shrimply Technologies Inc. · 2024*
