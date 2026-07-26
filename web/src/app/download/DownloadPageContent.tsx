"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  MonitorSmartphone,
  Share,
  Smartphone,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";
import DownloadRequestForm from "./DownloadRequestForm";

export default function DownloadPageContent() {
  const { t } = useLanguage();
  const copy = t.download;

  return (
    <main className="download-page">
      <Cursor />
      <Navbar />

      <section className="section download-hero">
        <div className="container">
          <div className="mobile-stack-grid download-hero-grid">
            <div>
              <div className="eyebrow" style={{ marginBottom: "20px" }}>{copy.eyebrow}</div>
              <h1 style={{ maxWidth: "900px", marginBottom: "28px" }}>{copy.heroTitle}</h1>
              <p className="download-hero-copy">{copy.heroBody}</p>

              <div className="download-status-list">
                <StatusLine icon={Smartphone} title={copy.iosAvailableTitle} body={copy.iosAvailableBody} />
                <StatusLine icon={UsersRound} title={copy.androidTestingTitle} body={copy.androidTestingBody} />
                <StatusLine icon={MonitorSmartphone} title={copy.sharedWorkspaceTitle} body={copy.sharedWorkspaceBody} />
              </div>

              <div className="mobile-cta-row download-hero-actions">
                <Link href="/auth" className="btn-primary">{copy.openWebApp}</Link>
                <Link href="/vannamei-shrimp-farming-app" className="btn-outline">{copy.viewFeatures}</Link>
              </div>
            </div>

            <aside className="download-install-card" aria-label={copy.installTitle}>
              <div className="download-card-kicker">
                <CheckCircle2 size={20} />
                {copy.installKicker}
              </div>
              <h2 className="feature-title download-card-title">{copy.installTitle}</h2>
              <p className="download-card-copy">{copy.installBody}</p>

              <ol className="download-install-steps">
                <InstallStep number="1" icon={Smartphone} title={copy.stepSafariTitle} body={copy.stepSafariBody} />
                <InstallStep number="2" icon={Share} title={copy.stepShareTitle} body={copy.stepShareBody} />
                <InstallStep number="3" icon={CheckCircle2} title={copy.stepHomeTitle} body={copy.stepHomeBody} />
              </ol>

              <Link href="/auth" className="btn-primary download-install-action">
                {copy.openDashboard}
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="section download-android-section">
        <div className="container download-request-layout">
          <div>
            <div className="eyebrow" style={{ marginBottom: "18px" }}>{copy.androidSectionKicker}</div>
            <h2 className="section-title" style={{ marginBottom: "20px" }}>{copy.androidSectionTitle}</h2>
            <p className="download-section-copy">{copy.androidSectionBody}</p>

            <div className="download-expectations">
              <Expectation title={copy.androidDeviceTitle} body={copy.androidDeviceBody} />
              <Expectation title={copy.earlyFeedbackTitle} body={copy.earlyFeedbackBody} />
              <Expectation title={copy.manualApprovalTitle} body={copy.manualApprovalBody} />
            </div>
          </div>

          <div className="download-request-card">
            <div className="download-card-kicker">
              <AlertCircle size={20} />
              {copy.testerRequestKicker}
            </div>
            <h2 className="feature-title download-card-title">{copy.testerRequestTitle}</h2>
            <p className="download-card-copy">{copy.testerRequestBody}</p>
            <DownloadRequestForm />
          </div>
        </div>
      </section>

      <Footer />

      <style jsx global>{`
        .download-hero {
          min-height: 82svh;
          display: flex;
          align-items: center;
          background: var(--off-white);
        }

        .download-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(360px, 0.75fr);
          gap: 56px;
          align-items: center;
        }

        .download-hero-copy,
        .download-section-copy,
        .download-card-copy {
          color: var(--ocean);
          font-weight: 500;
        }

        .download-hero-copy {
          max-width: 720px;
          margin-bottom: 32px;
          font-size: 1.08rem;
        }

        .download-status-list {
          display: grid;
          gap: 14px;
          max-width: 680px;
        }

        .download-hero-actions {
          display: flex;
          gap: 16px;
          margin-top: 36px;
          flex-wrap: wrap;
        }

        .download-install-card,
        .download-request-card {
          background: var(--white);
          border: 1px solid var(--slate);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 20px 60px rgba(13, 33, 55, 0.08);
        }

        .download-card-kicker {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
          color: var(--blue);
          font-weight: 800;
        }

        .download-card-title {
          margin-bottom: 10px;
          font-size: 1.7rem;
        }

        .download-card-copy {
          margin-bottom: 24px;
        }

        .download-install-steps,
        .download-expectations {
          display: grid;
          gap: 14px;
        }

        .download-install-steps {
          margin: 0 0 24px;
          padding: 0;
          list-style: none;
        }

        .download-status-line {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr);
          gap: 14px;
          align-items: start;
          padding: 16px;
          background: var(--white);
          border: 1px solid var(--slate);
          border-radius: 14px;
        }

        .download-status-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--blue);
          color: var(--white);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 22px rgba(15, 76, 117, 0.18);
        }

        .download-install-step {
          min-height: 70px;
          display: grid;
          grid-template-columns: 30px 24px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          padding: 14px;
          border: 1px solid var(--slate);
          border-radius: 14px;
          background: var(--off-white);
          color: var(--blue);
        }

        .download-step-number {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: var(--blue);
          color: var(--white);
          font-weight: 800;
        }

        .download-install-step strong,
        .download-install-step small {
          display: block;
        }

        .download-install-step strong {
          color: var(--ink);
          font-size: 0.94rem;
        }

        .download-install-step small {
          margin-top: 3px;
          color: var(--ocean);
          font-size: 0.82rem;
          line-height: 1.45;
        }

        .download-install-action {
          width: 100%;
          text-align: center;
        }

        .download-android-section {
          background: var(--white);
          padding-top: 96px;
          padding-bottom: 96px;
        }

        .download-request-layout {
          display: grid;
          grid-template-columns: minmax(0, 0.72fr) minmax(420px, 1fr);
          gap: 64px;
          align-items: start;
        }

        .download-section-copy {
          max-width: 560px;
          margin-bottom: 28px;
          font-size: 1rem;
        }

        .download-expectation {
          padding: 18px;
          border: 1px solid var(--slate);
          border-radius: 14px;
          background: var(--off-white);
        }

        .download-expectation h3 {
          margin-bottom: 6px;
          color: var(--ink);
          font-family: var(--sans);
          font-size: 1rem;
        }

        .download-expectation p {
          color: var(--ocean);
          font-weight: 500;
        }

        @media (max-width: 992px) {
          .download-hero {
            padding-top: calc(120px + var(--safe-area-top));
          }

          .download-hero-grid,
          .download-request-layout {
            grid-template-columns: minmax(0, 1fr);
            gap: 40px;
          }

          .download-request-card {
            max-width: 720px;
          }
        }

        @media (max-width: 480px) {
          .download-hero {
            align-items: flex-start;
            padding-top: calc(112px + var(--safe-area-top));
          }

          .download-install-card,
          .download-request-card {
            padding: 22px 18px;
            border-radius: 18px;
          }

          .download-card-title {
            font-size: 1.45rem;
          }
        }
      `}</style>
    </main>
  );
}

function StatusLine({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="download-status-line">
      <div className="download-status-icon"><Icon size={22} /></div>
      <div>
        <h2 className="feature-title" style={{ fontSize: "1.06rem", marginBottom: "6px" }}>{title}</h2>
        <p style={{ color: "var(--ocean)", fontWeight: 500 }}>{body}</p>
      </div>
    </div>
  );
}

function InstallStep({
  number,
  icon: Icon,
  title,
  body,
}: {
  number: string;
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <li className="download-install-step">
      <span className="download-step-number">{number}</span>
      <Icon size={20} />
      <span>
        <strong>{title}</strong>
        <small>{body}</small>
      </span>
    </li>
  );
}

function Expectation({ title, body }: { title: string; body: string }) {
  return (
    <article className="download-expectation">
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}
