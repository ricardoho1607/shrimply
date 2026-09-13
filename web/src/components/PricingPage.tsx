"use client";

import "@/app/globals.css";
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { publicPlanCatalog } from '../../../functions/shared/companyPlans';
import { GOOGLE_PLAY_URL } from '@/config/site';
import styles from './PricingPage.module.css';

type Period = 'monthly' | 'cycle' | 'annual';
const plans = publicPlanCatalog();
const money = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

export default function PricingPage({ locale = 'en' }: { locale?: 'en' | 'id' }) {
  const id = locale === 'id';
  const [period, setPeriod] = useState<Period>('monthly');
  const periods: { value: Period; label: string; duration: string }[] = [
    { value: 'monthly', label: id ? 'Bulanan' : 'Monthly', duration: id ? '1 bulan' : '1 month' },
    { value: 'cycle', label: id ? '4 bulan' : '4 months', duration: id ? '4 bulan' : '4 months' },
    { value: 'annual', label: id ? 'Tahunan' : 'Annual', duration: id ? '12 bulan' : '12 months' },
  ];
  const duration = periods.find(option => option.value === period)!.duration;
  const tools = id ? [
    ['Operasional tambak', 'Pencatatan pakan, kualitas air, sampling, mortalitas, dan panen per kolam dan siklus.'],
    ['Persediaan & keuangan', 'Kelola stok pakan dan aset, catat transaksi, serta lihat laporan biaya dan hasil budidaya.'],
    ['Orson AI', 'Orson menghubungkan pola pertumbuhan, pakan, kualitas air, dan riwayat kolam untuk membantu Anda melihat perubahan dan potensi risiko lebih awal.'],
    ['Kerja tim', 'Akses web dan aplikasi Android, dengan peran owner, manager, dan technician sesuai izin perusahaan.'],
  ] : [
    ['Farm operations', 'Record feeding, water quality, sampling, mortality and harvest by physical pond and production cycle.'],
    ['Inventory & finance', 'Manage feed and asset inventory, record transactions, and review farm cost and production reports.'],
    ['Orson AI', 'Orson connects growth, feeding, water quality and pond history to help you spot patterns and potential risks earlier.'],
    ['Team workspace', 'Web and Android access, with owner, manager and technician roles controlled by company permissions.'],
  ];
  return <main className={styles.page} lang={locale}>
    <nav className={styles.nav} aria-label={id ? 'Navigasi utama' : 'Main navigation'}>
      <Link className={styles.brand} href={id ? '/id' : '/'} aria-label="Shrimply home">
        <Image src="/shrimplylogo_v2.webp" width={500} height={160} alt="Shrimply" priority />
      </Link>
      <div><Link href={id ? '/pricing' : '/id/pricing'}>{id ? 'English' : 'Bahasa Indonesia'}</Link><Link href="/auth">{id ? 'Masuk' : 'Sign in'}</Link></div>
    </nav>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>{id ? 'LANGGANAN SOFTWARE MANAJEMEN TAMBAK' : 'SHRIMP FARM MANAGEMENT SUBSCRIPTIONS'}</p>
      <h1>{id ? 'Satu perusahaan. Satu paket.' : 'One company. One plan.'}</h1>
      <p>{id ? 'Shrimply adalah layanan software digital untuk mengelola budidaya udang. Mulai gratis, lalu tambah kapasitas kolam dan penggunaan Orson sesuai kebutuhan.' : 'Shrimply is a digital software service for managing shrimp farms. Start free, then add pond capacity and Orson usage as your operation grows.'}</p>
      <div className={styles.facts}>{id ? 'Harga dalam Rupiah (IDR) · Per perusahaan, bukan per pengguna · Tanpa batas anggota tim' : 'Prices in Indonesian Rupiah (IDR) · Per company, not per user · Unlimited team members'}</div>
    </header>
    <section className={styles.section} aria-label={id ? 'Harga paket' : 'Plan prices'}>
      <div className={styles.periods}>{periods.map(option => <button key={option.value} type="button" aria-pressed={period === option.value} onClick={() => setPeriod(option.value)}>{option.label}</button>)}</div>
      <p className={styles.center}>{id ? 'Paket berbayar dibayar penuh di awal untuk durasi terpilih. Tidak ada debit otomatis.' : 'Paid plans are prepaid in full for the selected period. No automatic debit.'}</p>
      <div className={styles.cards}>{plans.map(plan => <article key={plan.id} className={`${styles.card} ${plan.id === 'plus' ? styles.featured : ''}`}>
        <h2>{plan.name}</h2>
        <p className={styles.price}>{money(plan.prices[period])}</p>
        <p className={styles.subprice}>{plan.id === 'free' ? (id ? 'Gratis, tanpa pembayaran' : 'Free, no payment required') : (id ? `per perusahaan / ${duration}` : `per company / ${duration}`)}</p>
        <div className={styles.capacity}>{id ? 'Hingga' : 'Up to'} {plan.pondLimit} {id ? 'kolam fisik' : 'physical ponds'}</div>
        <ul>
          <li>{id ? 'Anggota tim tanpa batas' : 'Unlimited team members'}</li>
          <li>{id ? 'Seluruh alat manajemen tambak saat ini' : 'All current farm-management tools'}</li>
          <li>{plan.orson.dailyChat} {id ? 'chat Orson per hari' : 'Orson chats per day'}</li>
          <li>{plan.orson.weeklyProjection ?? plan.orson.dailyProjection} {id ? `proyeksi panen per ${plan.orson.weeklyProjection ? 'minggu' : 'hari'}` : `harvest projection${plan.orson.weeklyProjection === 1 ? '' : 's'} per ${plan.orson.weeklyProjection ? 'week' : 'day'}`}</li>
          <li>{plan.orson.monthlyTotal} {id ? 'total permintaan Orson per bulan' : 'total Orson requests per month'}</li>
          {plan.id === 'pro' && <li>{id ? 'Dukungan prioritas' : 'Priority support'}</li>}
        </ul>
        <Link className={styles.button} href="/auth/join" prefetch={false}>{id ? 'Coba Shrimply' : 'Try Shrimply'}</Link>
      </article>)}</div>
      <p className={styles.note}>{id ? 'Batas kolam dan Orson dipakai bersama oleh seluruh perusahaan. Siklus baru pada kolam fisik yang sama tidak menambah hitungan kolam. Chat dan proyeksi berbagi batas bulanan; batas harian/mingguan juga berlaku. Kuota tidak diakumulasi ke periode berikutnya.' : 'Pond and Orson allowances are shared company-wide. A new cycle in an existing physical pond does not count as another pond. Chats and projections share the monthly allowance; daily/weekly limits also apply. Unused quota does not roll over.'}</p>
      <aside className={styles.enterprise}><strong>Enterprise</strong><p>{id ? 'Lebih dari 100 kolam? Hubungi kami untuk kapasitas, dukungan, dan penawaran khusus. Tidak ada harga Enterprise otomatis.' : 'More than 100 ponds? Contact us for custom capacity, support and a quote. Enterprise is not an automatic online purchase.'}</p><a href="mailto:shrimply.tech@gmail.com">shrimply.tech@gmail.com</a></aside>
    </section>
    <section className={styles.section} id="product"><p className={styles.eyebrow}>{id ? 'DUKUNGAN LEBIH CERDAS UNTUK SETIAP KOLAM' : 'SMARTER SUPPORT FOR EVERY POND'}</p><h2>{id ? 'Apa yang Anda dapatkan' : 'What your subscription includes'}</h2><div className={styles.tools}>{tools.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div><p className={styles.note}>{id ? 'Fitur tetap mengikuti hak akses peran pengguna. Paket membedakan kapasitas kolam, kuota Orson, dan tingkat dukungan. Tidak termasuk sensor, perangkat keras, pakan, benur, udang, atau jasa konsultasi lapangan.' : 'Features remain subject to each user’s permissions. Plans differ by pond capacity, Orson quota and support level. Sensors, hardware, feed, shrimp seed, shrimp and on-site consultancy are not included.'}</p><a href={GOOGLE_PLAY_URL}>{id ? 'Lihat aplikasi Android di Google Play' : 'View the Android app on Google Play'} →</a></section>
    <section className={styles.section} id="payment"><p className={styles.eyebrow}>{id ? 'ALUR TRANSAKSI' : 'PAYMENT FLOW'}</p><h2>{id ? 'Dari pilihan paket ke aktivasi' : 'From plan selection to activation'}</h2><ol className={styles.steps}>
      {(id ? [
        ['Daftar atau masuk', 'Perusahaan baru mulai di Free. Bergabung ke perusahaan yang sudah ada mengikuti persetujuan perusahaan.'],
        ['Pilih paket sebagai owner', 'Buka Settings → Billing & Plans. Pilih Plus atau Pro serta periode 1, 4, atau 12 bulan.'],
        ['Tinjau pesanan', 'Periksa perusahaan, paket, durasi, batas penggunaan, dan total IDR sebelum melanjutkan.'],
        ['Checkout di Midtrans', 'Pilih metode pembayaran yang tersedia dan ikuti instruksi Midtrans. Pembayaran tertunda belum mengaktifkan paket.'],
        ['Aktivasi digital', 'Shrimply mengaktifkan paket setelah konfirmasi pembayaran terverifikasi dari Midtrans. Periksa status di Billing & Plans. Tidak ada pengiriman barang.'],
      ] : [
        ['Sign up or sign in', 'New companies start on Free. Joining an existing company follows its approval process.'],
        ['Choose a plan as the owner', 'Open Settings → Billing & Plans. Choose Plus or Pro and a 1-, 4- or 12-month period.'],
        ['Review the order', 'Check your company, plan, duration, allowances and total IDR before continuing.'],
        ['Check out on Midtrans', 'Select an available payment method and follow Midtrans instructions. Pending payments do not activate a plan.'],
        ['Digital activation', 'Shrimply activates access after verified payment confirmation from Midtrans. Check Billing & Plans for status. No physical delivery is involved.'],
      ]).map(([title, body]) => <li key={title}><h3>{title}</h3><p>{body}</p></li>)}
    </ol><div className={styles.scope}><h3>{id ? 'Dibuat untuk tumbuh bersama tambak Anda' : 'Built to grow with your farm'}</h3><p>{id ? 'Mulai dari Free, lalu beralih ke Plus atau Pro saat kapasitas kolam bertambah. Tim dan catatan tambak Anda tetap tersimpan dalam satu ruang kerja perusahaan.' : 'Start on Free, then move to Plus or Pro as your pond capacity grows. Your team and farm records stay together in one company workspace.'}</p></div></section>
    <section className={styles.section} id="subscription-terms"><h2>{id ? 'Ketentuan langganan & bantuan' : 'Subscription details & support'}</h2><div className={styles.terms}>
      <div><h3>{id ? 'Periode & perpanjangan' : 'Periods & renewals'}</h3><p>{id ? 'Paket prabayar tidak diperpanjang dengan debit otomatis. Perpanjang manual dari Billing & Plans. Perpanjangan paket yang sama menambah durasi dari akhir periode aktif; perubahan ke paket berbayar lain memulai periode baru saat pembayaran terverifikasi, tanpa prorata otomatis.' : 'Prepaid plans do not auto-debit. Renew manually from Billing & Plans. Renewing the same plan extends the active period; switching to another paid plan starts a new period after verified payment, with no automatic proration.'}</p></div>
      <div><h3>{id ? 'Kembali ke Free' : 'Returning to Free'}</h3><p>{id ? 'Pemilik dapat menjadwalkan Free pada akhir periode berbayar. Tanpa perpanjangan, akses berbayar berakhir setelah masa tenggang 7 hari. Data perusahaan tidak dihapus karena perubahan paket; pembuatan kolam baru dibatasi jika kapasitas paket terlampaui.' : 'The owner can schedule Free at the paid period’s end. Without renewal, paid access expires after a 7-day grace period. Plan changes do not delete company records; new pond creation is blocked when the plan capacity is exceeded.'}</p></div>
      <div id="support"><h3>{id ? 'Pembayaran bermasalah / permintaan refund' : 'Payment issues / refund requests'}</h3><p>{id ? 'Hubungi Shrimply melalui email di bawah dengan ID pesanan, nama perusahaan, tanggal pembayaran, dan penjelasan masalah. Kami akan memeriksa transaksi dan menindaklanjuti permintaan. Jangan kirim kata sandi, OTP, atau detail kartu. Perubahan paket tidak otomatis membuat refund.' : 'Email Shrimply below with the order ID, company name, payment date and issue. We will review the transaction and follow up on your request. Do not send passwords, OTPs or card details. Changing plans does not automatically issue a refund.'}</p><a href="mailto:shrimply.tech@gmail.com">shrimply.tech@gmail.com</a></div>
    </div></section>
    <footer className={styles.footer}><Link href={id ? '/id' : '/'}>Shrimply</Link><span>© 2026 Shrimply · {id ? 'Langganan software manajemen tambak' : 'Farm-management software subscriptions'}</span><div className={styles.footerLinks}><a href="#support">{id ? 'Bantuan pembayaran' : 'Payment support'}</a><Link href="/privacy">{id ? 'Kebijakan Privasi' : 'Privacy Policy'}</Link></div></footer>
  </main>;
}
