import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Cursor from '@/components/Cursor';
import { canonicalUrl } from '@/config/seo';
import styles from './privacy.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Shrimply collects, uses, shares, stores, and protects personal information across its website, web platform, and Android app.',
  alternates: { canonical: canonicalUrl('/privacy') },
};

const sections = [
  ['information', 'Information we collect'],
  ['use', 'How we use information'],
  ['ai', 'Orson AI and automated processing'],
  ['sharing', 'When information is shared'],
  ['storage', 'Storage and international processing'],
  ['retention', 'Retention and deletion'],
  ['security', 'Security'],
  ['rights', 'Your rights and choices'],
  ['contact', 'Contact us'],
] as const;

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <Cursor />
      <Navbar />

      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>YOUR DATA, EXPLAINED CLEARLY</p>
          <h1>Privacy Policy</h1>
          <p className={styles.lead}>
            This policy explains how Shrimply Technologies (“Shrimply”, “we”, “us”) handles personal information when you use our website, web platform, Android app, Orson AI, and related services.
          </p>
          <p className={styles.updated}>Last updated: 11 September 2026</p>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.contents} aria-label="Privacy policy contents">
          <strong>On this page</strong>
          <div className={styles.contentsLinks}>
            {sections.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}
          </div>
        </aside>

        <article className={styles.policy}>
          <section className={styles.summary} aria-labelledby="summary-title">
            <h2 id="summary-title">The short version</h2>
            <p>We collect the information needed to run Shrimply, secure accounts, keep farm records synced, process subscriptions, provide Orson AI, and support users.</p>
            <p>Company data is available only according to the company ownership and role permissions configured in Shrimply. We use trusted service providers to operate the platform and do not sell your private farm records.</p>
          </section>

          <section id="information">
            <h2>1. Information we collect</h2>
            <h3>Account and company information</h3>
            <p>This may include your name, email address, profile details, role, company membership, country or location, contact information, and join or approval activity.</p>

            <h3>Farm and business records</h3>
            <p>Information entered by you or your company may include pond and production-cycle records, stocking, feeding, inventory, water quality, sampling, mortality, treatments, laboratory reports, harvests, assets, suppliers, buyers, finance records, marketplace listings, and team activity. Some records may identify employees, contractors, customers, or business contacts.</p>

            <h3>Orson AI information</h3>
            <p>We process the questions, prompts, files, feedback, and authorised farm context used to provide Orson AI chats, report extraction, risk insights, and harvest projections.</p>

            <h3>Subscription and payment information</h3>
            <p>We may receive your selected plan, billing period, company name, order identifier, amount, payment status, payment method category, and transaction timestamps. Midtrans processes the checkout and payment credentials. Shrimply does not ask you to send us passwords, one-time codes, or full card details.</p>

            <h3>Technical and usage information</h3>
            <p>We and our providers may collect IP address, browser and device details, operating system, app version, installation identifiers, notification tokens, pages viewed, clicks, referring pages, timestamps, crash or performance information, security events, and similar logs.</p>

            <h3>How information is collected</h3>
            <p>We collect information directly from you, automatically when you use the service, from authorised company members, and from providers involved in authentication, hosting, payments, support, analytics, and app distribution.</p>
          </section>

          <section id="use">
            <h2>2. How we use information</h2>
            <ul>
              <li>Provide, maintain, personalise, and improve Shrimply.</li>
              <li>Authenticate users and enforce company ownership, role, and access controls.</li>
              <li>Sync farm records and generate dashboards, reports, alerts, and projections.</li>
              <li>Manage subscriptions, confirm payment status, and provide billing support.</li>
              <li>Operate Orson AI using the authorised context needed for each request.</li>
              <li>Send service, security, approval, and account communications.</li>
              <li>Detect abuse, investigate incidents, troubleshoot errors, and protect the platform.</li>
              <li>Measure website and product use, including page views and download interactions.</li>
              <li>Comply with law, resolve disputes, and enforce our agreements.</li>
            </ul>
          </section>

          <section id="ai">
            <h2>3. Orson AI and automated processing</h2>
            <p>When you use Orson AI, Shrimply may send your prompt and relevant authorised farm records to Google’s Gemini services to generate a response. Uploaded laboratory reports may also be processed to extract or summarise information.</p>
            <p>Orson is designed to help users connect patterns across pond history, growth, feeding, water quality, and other farm records. Its output supports human decisions and may be incomplete or incorrect. Shrimply does not use Orson output by itself to determine a person’s employment, credit, legal rights, or access to a company.</p>
            <p>Only submit information that you and your company are authorised to use. Avoid including unnecessary personal or sensitive information in prompts and files.</p>
          </section>

          <section id="sharing">
            <h2>4. When information is shared</h2>
            <p>We may disclose information only as reasonably needed in these circumstances:</p>
            <ul>
              <li><strong>Within your company:</strong> to owners, managers, technicians, and other authorised members according to role permissions.</li>
              <li><strong>At your direction:</strong> when you publish a marketplace listing or public company profile, invite a member, share a report, or otherwise choose to disclose information.</li>
              <li><strong>Service providers:</strong> Google Firebase for authentication, databases, storage, cloud functions, notifications, and app integrity; Google Gemini for Orson AI; Vercel for website hosting; Midtrans for subscription payments; Meta business tools for website analytics and advertising measurement; and Google Play for Android distribution.</li>
              <li><strong>Legal and safety reasons:</strong> where required by law or reasonably necessary to protect users, Shrimply, or the public.</li>
              <li><strong>Business changes:</strong> in connection with a merger, financing, acquisition, reorganisation, or sale, subject to appropriate safeguards.</li>
            </ul>
            <p>Each third-party provider handles information under its own terms and privacy notice. You can review the official notices for <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noreferrer">Firebase</a>, <a href="https://midtrans.com/privacy-notice" target="_blank" rel="noreferrer">Midtrans</a>, and <a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noreferrer">Vercel</a>.</p>
          </section>

          <section id="storage">
            <h2>5. Storage and international processing</h2>
            <p>Shrimply uses cloud providers that may process information in Australia, Indonesia, the United States, and other locations where they or their subprocessors operate. For example, Firebase Authentication is operated from the United States, while other Firebase services may use global Google infrastructure.</p>
            <p>We use local storage and session storage for features such as authentication persistence, language and currency preferences, and temporary Orson chat context. Meta Pixel may receive website interaction and device information after the site loads. Browser or device settings may let you limit storage and advertising tracking, although some service features may then work differently.</p>
          </section>

          <section id="retention">
            <h2>6. Retention and deletion</h2>
            <p>We retain information while an account or company is active and for as long as reasonably needed to provide the service, protect security, maintain backups, resolve disputes, and meet legal, tax, accounting, or payment obligations. Retention periods vary by record type and context.</p>
            <p>Company owners can start a company-deletion request from company settings. Where a company has multiple owners or co-owners, all required approvers must agree before permanent company deletion. To request access, correction, or deletion of personal information that cannot be managed in the product, email us using the contact details below.</p>
            <p>Deletion may not be immediate for encrypted backups, security logs, de-identified information, or records we must keep by law. We will isolate or remove such information when the applicable retention period ends.</p>
          </section>

          <section id="security">
            <h2>7. Security</h2>
            <p>We use technical and organisational safeguards designed to protect information, including authentication, company-scoped access controls, role permissions, Firebase security rules, App Check, encrypted network connections, and restricted administrative access. No system is completely secure, so please use a strong password, protect your device, and contact us if you suspect unauthorised access.</p>
          </section>

          <section id="rights">
            <h2>8. Your rights and choices</h2>
            <p>Depending on where you live, you may have rights to access, correct, delete, restrict, or object to certain processing; withdraw consent; receive a portable copy; or complain to a privacy regulator. These rights may be limited where another person’s rights, company ownership, security, or legal obligations apply.</p>
            <p>You can update some details in Shrimply. For other requests, email us with enough information to identify your account and request. We may verify your identity and authority before acting. We aim to respond within the period required by applicable law.</p>
            <p>Shrimply is built for business and farm operations and is not directed to children. If you believe a child has provided personal information without appropriate authorisation, please contact us.</p>
          </section>

          <section>
            <h2>9. Changes to this policy</h2>
            <p>We may update this policy as Shrimply, our providers, or applicable requirements change. We will post the revised policy here, update the date above, and provide additional notice where a change materially affects how we handle personal information.</p>
          </section>

          <section id="contact" className={styles.contact}>
            <p className={styles.eyebrow}>PRIVACY QUESTIONS</p>
            <h2>10. Contact us</h2>
            <p>For privacy requests, questions, or complaints, contact Shrimply Technologies at:</p>
            <a href="mailto:shrimply.tech@gmail.com">shrimply.tech@gmail.com</a>
            <p>If we cannot resolve your concern, you may contact the privacy or data-protection authority that applies where you live.</p>
          </section>

          <p className={styles.back}><Link href="/">← Back to Shrimply</Link></p>
        </article>
      </div>

      <Footer />
    </main>
  );
}
