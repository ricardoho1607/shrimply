import Link from 'next/link';
import Navbar from '@/components/Navbar';
import NavbarID from '@/components/NavbarID';
import NavbarTH from '@/components/NavbarTH';
import NavbarVI from '@/components/NavbarVI';
import Footer from '@/components/Footer';
import FooterID from '@/components/FooterID';
import FooterTH from '@/components/FooterTH';
import FooterVI from '@/components/FooterVI';
import { GOOGLE_PLAY_URL } from '@/config/site';
import UnderwaterHero from './UnderwaterHero';
import FeatureShowcase from './FeatureShowcase';
import { landingCopy } from './copy';
import { landingPath, type LandingLocale } from './publicRoutes';

const navigation = { en: Navbar, id: NavbarID, th: NavbarTH, vi: NavbarVI };
const footers = { en: Footer, id: FooterID, th: FooterTH, vi: FooterVI };

export default function OceanLandingPage({ locale = 'en' }: { locale?: LandingLocale }) {
  const c = landingCopy[locale];
  const Navigation = navigation[locale];
  const SiteFooter = footers[locale];
  return <main className="ocean-home">
    <Navigation />
    <a className="skip-link" href="#platform">{c.explore}</a>
    <UnderwaterHero copy={c} />
    <div className="foundation wrap"><span>{c.foundationLabel}</span>{c.foundation.map(item => <div key={item}>{item}</div>)}</div>
    <section id="platform" className="section wrap">
      <div className="section-heading"><div><div className="eyebrow">{c.platformEyebrow}</div><h2>{c.platformTitle}<br /><span>{c.platformAccent}</span></h2></div><p className="section-intro">{c.platformIntro}</p></div>
      <FeatureShowcase copy={c} locale={locale} />
      <div className="capabilities">{c.capabilities.map(item => <Link key={item.title} href={landingPath(locale, item.path)}><h4>{item.title}</h4><p>{item.body}</p><span>{item.cta}</span></Link>)}</div>
    </section>
    <section id="orson" className="orson-section"><div className="wrap orson-grid">
      <div className="orson-copy"><div className="eyebrow">{c.orsonEyebrow}</div><h2>{c.orsonTitle}<br /><span>{c.orsonAccent}</span></h2><p>{c.orsonIntro}</p>
        <Link className="button light" href={landingPath(locale, '/orson')}>{c.orsonCta}</Link><div className="orson-footnote">{c.orsonFootnote}</div></div>
      <div className="conversation"><div className="conversation-head"><div><strong>Orson</strong><small>{c.orsonPartner}</small></div><span className="example">{c.exampleShort}</span></div>
        <div className="conversation-body"><div className="question">{c.question}</div><div className="answer"><span className="reply-label">{c.connecting}</span><p>{c.answer}</p>
          <div className="insight-pair"><div><small>{c.feedLogged}</small><strong>32 → 38 <span>{c.dailyUnit}</span></strong></div><div><small>{c.oxygen}</small><strong>5.8 → 5.2 <span>mg/L</span></strong></div></div>
          <p>{c.advice}</p><div className="next-check"><span><strong>{c.nextStep}</strong> {c.nextAction}</span></div></div><div className="conversation-caption">{c.responseCaption}</div></div>
      </div>
    </div></section>
    <section id="how-it-works" className="section wrap workflow"><div className="section-heading"><div><div className="eyebrow">{c.workflowEyebrow}</div><h2>{c.workflowTitle}<br /><span>{c.workflowAccent}</span></h2></div><p className="section-intro">{c.workflowIntro}</p></div>
      <div className="steps">{c.steps.map((step, index) => <article key={step.title}><div className="step-top"><span>0{index + 1}</span></div><h3>{step.title}</h3><p>{step.body}</p><span className="step-tag">{step.tag}</span></article>)}</div>
      <div className="download-line"><span>{c.downloadIntro}</span><a className="text-link" href={GOOGLE_PLAY_URL}>{c.download}</a></div>
    </section>
    <section className="final-cta wrap"><div><div className="eyebrow">{c.finalEyebrow}</div><h2>{c.finalTitle}<br /><span>{c.finalAccent}</span></h2><p>{c.finalIntro}</p></div><div className="final-actions"><Link className="button" href="/auth/join" prefetch={false}>{c.start}</Link><span>{c.finalNote}</span></div></section>
    <SiteFooter />
  </main>;
}
