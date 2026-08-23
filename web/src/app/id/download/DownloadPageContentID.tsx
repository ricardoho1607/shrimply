"use client";

import Link from "next/link";
import Cursor from "@/components/Cursor";
import FooterID from "@/components/FooterID";
import { trackMetaDownloadClick } from "@/components/MetaPixel";
import NavbarID from "@/components/NavbarID";
import { GOOGLE_PLAY_URL } from "@/config/site";

export default function DownloadPageContentID() {
  return (
    <main className="download-page">
      <Cursor />
      <NavbarID />

      <section className="download-simple">
        <div className="container download-simple-wrap">
          <div className="download-simple-intro">
            <div className="eyebrow">Aplikasi web iPhone dan aplikasi Android</div>
            <h1>Gunakan Shrimply di ponsel Anda.</h1>
            <p>
              Pengguna iPhone dapat menambahkan aplikasi web Shrimply yang aman ke Home Screen. Pengguna Android dapat mengunduh aplikasi native Shrimply dari Google Play.
            </p>
          </div>

          <div className="download-options">
            <article className="download-option download-option-android">
              <p className="download-option-label">Aplikasi Android</p>
              <h2>Tersedia di Google Play</h2>
              <p>
                Unduh aplikasi native Shrimply langsung dari Google Play di perangkat Android Anda.
              </p>
              <a
                href={GOOGLE_PLAY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary download-action"
                onClick={trackMetaDownloadClick}
              >
                Unduh di Google Play
              </a>
            </article>

            <article className="download-option">
              <p className="download-option-label">Instalasi iPhone</p>
              <h2>Tersedia di iPhone sekarang</h2>
              <p>
                Buka Shrimply di Safari lalu tambahkan ke Home Screen. Tidak perlu mengunduh dari App Store.
              </p>
              <p className="download-ios-steps">
                Safari <span>→</span> Share <span>→</span> Add to Home Screen
              </p>
              <Link href="/auth" prefetch={false} className="btn-outline download-action">
                Buka Aplikasi Web Shrimply
              </Link>
            </article>
          </div>

          <p className="download-shared-note">
            Aplikasi web iPhone dan aplikasi Android menggunakan akun dan catatan tambak yang sama.
          </p>
        </div>
      </section>

      <FooterID />

      <style jsx global>{`
        .download-simple {
          min-height: 76svh;
          padding: calc(148px + var(--safe-area-top)) 0 88px;
          background: var(--off-white);
        }

        .download-simple-wrap {
          width: 100%;
          max-width: 980px;
          padding-right: 24px;
          padding-left: 24px;
        }

        .download-simple-intro {
          max-width: 720px;
          margin-bottom: 40px;
        }

        .download-simple-intro .eyebrow {
          margin-bottom: 16px;
        }

        .download-simple-intro h1 {
          margin-bottom: 18px;
        }

        .download-simple-intro > p {
          max-width: 680px;
          color: var(--ocean);
          font-size: 1.05rem;
          font-weight: 500;
        }

        .download-options {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }

        .download-option {
          display: flex;
          flex-direction: column;
          min-height: 290px;
          padding: 30px;
          border: 1px solid var(--slate);
          border-radius: 18px;
          background: var(--white);
        }

        .download-option-android {
          border-color: rgba(15, 76, 117, 0.32);
        }

        .download-option-label {
          margin-bottom: 10px;
          color: var(--blue);
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .download-option h2 {
          margin-bottom: 10px;
          color: var(--ink);
          font-size: 1.55rem;
        }

        .download-option > p:not(.download-option-label) {
          color: var(--ocean);
          font-weight: 500;
        }

        .download-ios-steps {
          margin-top: 16px;
          font-size: 0.86rem;
        }

        .download-ios-steps span {
          padding: 0 4px;
          color: var(--blue);
        }

        .download-action {
          width: 100%;
          margin-top: auto;
          padding-left: 18px;
          padding-right: 18px;
          text-align: center;
        }

        .download-shared-note {
          margin: 24px 0 0;
          color: var(--ocean);
          font-size: 0.92rem;
          font-weight: 600;
          text-align: center;
        }

        @media (max-width: 900px) {
          .download-simple {
            min-height: auto;
            padding: calc(106px + var(--safe-area-top)) 0 56px;
          }

          .download-simple-intro {
            margin-bottom: 28px;
          }

          .download-simple-intro .eyebrow {
            margin-bottom: 12px;
          }

          .download-simple-intro h1 {
            margin-bottom: 14px;
            font-size: clamp(2.35rem, 12vw, 3.2rem);
            line-height: 1.02;
          }

          .download-simple-intro > p {
            font-size: 0.96rem;
            line-height: 1.65;
          }

          .download-options {
            grid-template-columns: minmax(0, 1fr);
            gap: 14px;
          }

          .download-option {
            min-height: 0;
            padding: 22px 18px;
            border-radius: 14px;
          }

          .download-option h2 {
            font-size: 1.28rem;
          }

          .download-action {
            margin-top: 22px;
          }

          .download-shared-note {
            margin-top: 20px;
            text-align: left;
          }
        }

        @media (max-width: 480px) {
          .download-simple-wrap {
            padding-right: 18px;
            padding-left: 18px;
          }

          .download-simple-intro h1 {
            font-size: clamp(2.15rem, 11vw, 2.7rem);
          }

          .download-option {
            padding: 20px 16px;
          }
        }
      `}</style>
    </main>
  );
}
