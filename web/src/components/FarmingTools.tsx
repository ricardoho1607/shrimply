'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { apparentFcr, convertShrimpSize, harvestRevenue, standingBiomass } from '@/lib/farmingTools';
import styles from './FarmingTools.module.css';

type Tool = 'size' | 'biomass' | 'fcr' | 'revenue';
const TOOLS: Tool[] = ['size', 'biomass', 'fcr', 'revenue'];
function subscribeToTool(callback: () => void) {
  window.addEventListener('hashchange', callback);
  window.addEventListener('popstate', callback);
  return () => {
    window.removeEventListener('hashchange', callback);
    window.removeEventListener('popstate', callback);
  };
}
function selectedTool(): Tool {
  const hash = window.location.hash.slice(1);
  return TOOLS.includes(hash as Tool) ? hash as Tool : 'size';
}
const initialTool = (): Tool => 'size';
function selectTool(tool: Tool) {
  window.history.replaceState(window.history.state, '', `#${tool}`);
  window.dispatchEvent(new Event('hashchange'));
}
const DEFAULTS: Record<Tool, Record<string, string>> = {
  size: { value: '20' },
  biomass: { stocked: '100000', survival: '80', removed: '0', weight: '20' },
  fcr: { feed: '2400', current: '1500', harvested: '500', initial: '100' },
  revenue: { weight: '1500', price: '60000' },
};
const GUIDES: Record<Tool, string> = {
  size: 'vannamei-growth-chart', biomass: 'vannamei-stocking-density',
  fcr: 'fcr-shrimp-farming', revenue: 'shrimp-harvest-tracking',
};

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h16m-6-6 6 6-6 6'} /></svg>;
}

function ToolIcon({ tool }: { tool: Tool }) {
  return <svg width="25" height="25" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {tool === 'size' ? <><rect x="5" y="9" width="22" height="14" rx="2" /><path d="M10 9v6m6-6v9m6-9v6" /></> : null}
    {tool === 'biomass' ? <><path d="m16 3 12 7-12 7L4 10l12-7Zm-12 14 12 7 12-7M4 24l12 7 12-7" /></> : null}
    {tool === 'fcr' ? <><path d="M6 12a11 11 0 0 1 20-3m0-5v6h-6M26 20A11 11 0 0 1 6 23m0 5v-6h6M12 19l8-8" /><circle cx="12" cy="12" r="1.5" /><circle cx="20" cy="20" r="1.5" /></> : null}
    {tool === 'revenue' ? <><path d="M4 27h24M8 22v-7m8 7V9m8 13V4M5 10l9-5 6 1 7-4" /></> : null}
  </svg>;
}

function ShrimpDrawing() {
  return <svg viewBox="0 10 220 125" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {/* A continuous shell silhouette keeps the small illustration legible. */}
    <path d="M74 63C98 40 136 38 166 48c28 9 46 28 43 45-2 14-16 24-34 24l-19-8c20 1 32-7 31-17-1-13-23-23-44-23-19 0-33 9-48 10L74 72l-21-2 17-5-12-12 23 5" fill="currentColor" fillOpacity=".12" strokeWidth="1.8" />
    <path d="M119 43c-6 9-8 20-5 30m25-30c-5 8-6 17-4 26m24-23c-6 7-9 15-9 24m25-17c-7 5-11 12-13 21m25-12c-8 3-14 9-17 17m25-5c-8 1-15 5-20 11m21 1c-7-1-14 1-20 5m16 8c-6-3-13-4-19-3m10 12-13-8" strokeOpacity=".7" />
    {/* Rostrum, eye, and long antennae. */}
    <path d="m80 58 4-7 4 3 5-7 4 3m-23 16C54 37 32 24 13 29m62 40C52 50 30 48 10 54" />
    <path d="M85 67c6-6 12-8 18-8" strokeOpacity=".45" />
    <circle cx="86" cy="62" r="3" fill="#d9eff6" stroke="none" />
    {/* Fine walking legs and swimmerets sit below the shell. */}
    <path d="m88 77-9 14-20 8m37-20-6 17-17 10m32-29-2 20-13 12m26-36 4 16-7 12m20-29 5 12-4 9m17-19 5 10-2 8m13-11 6 8-1 7" strokeOpacity=".6" />
    {/* Three tapered tail fins. */}
    <path d="M176 116c-10 8-23 8-34 2l14-9c-13 0-24-5-30-14 14-2 25 2 32 12-4-11-2-21 4-29 8 10 10 21 6 31l8 7Z" fill="currentColor" fillOpacity=".15" />
    <path d="m132 98 24 11m-9 8 16-5m0-27 2 22" strokeOpacity=".4" />
  </svg>;
}

type Field = { key: string; label: string; unit: string; note?: string; step?: string; max?: number };

export default function FarmingTools({ locale = 'en' }: { locale?: 'en' | 'id' }) {
  const isId = locale === 'id';
  const base = isId ? '/id' : '';
  const active = useSyncExternalStore(subscribeToTool, selectedTool, initialTool);
  const [direction, setDirection] = useState<'weight' | 'count'>('weight');
  const [values, setValues] = useState(DEFAULTS);
  const numberLocale = isId ? 'id-ID' : 'en-US';
  const format = (value: number, digits = 2) => new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: digits,
    ...((value !== 0 && Math.abs(value) < .01) || Math.abs(value) >= 1e12 ? { notation: 'scientific' as const } : {}),
  }).format(value);

  const labels: Record<Tool, { title: string; subtitle: string; description: string; result: string; note: string }> = isId ? {
    size: { title: 'Size udang', subtitle: 'Gram ↔ ekor per kg', description: 'Ubah bobot rata-rata udang menjadi size per kilogram, atau sebaliknya.', result: direction === 'weight' ? 'ESTIMASI SIZE UDANG' : 'BOBOT RATA-RATA', note: 'Size menunjukkan jumlah udang per kilogram. Size lebih kecil berarti udang lebih besar. Gunakan rata-rata dari sampling yang mewakili kolam.' },
    biomass: { title: 'Biomassa kolam', subtitle: 'Estimasi stok hidup', description: 'Perkirakan bobot udang yang masih berada di kolam setelah panen parsial.', result: 'ESTIMASI BIOMASSA SAAT INI', note: 'Persentase kelangsungan hidup harus mencakup udang yang sudah dipanen. Jumlah panen parsial dikurangi secara terpisah. Akurasi bergantung pada estimasi populasi dan sampling.' },
    fcr: { title: 'Konversi pakan', subtitle: 'Hitung FCR', description: 'Bandingkan pakan yang diberikan dengan pertambahan biomassa pada periode yang sama.', result: 'FCR TERCATAT', note: 'FCR ini belum dikoreksi untuk mortalitas. Masukkan seluruh panen pada periode yang sama. Ini adalah perhitungan catatan, bukan penilaian kesehatan atau target ideal.' },
    revenue: { title: 'Pendapatan panen', subtitle: 'Simulasi nilai penjualan', description: 'Masukkan estimasi bobot panen dan harga jual Anda untuk menghitung pendapatan kotor.', result: 'ESTIMASI PENDAPATAN KOTOR', note: 'Ini pendapatan kotor, belum dikurangi biaya produksi, potongan pembeli, atau transportasi. Harga contoh dapat Anda ubah; bukan harga pasar terkini.' },
  } : {
    size: { title: 'Shrimp size', subtitle: 'Grams ↔ count per kg', description: 'Turn average shrimp weight into a count per kilogram, or the other way around.', result: direction === 'weight' ? 'ESTIMATED SHRIMP COUNT' : 'AVERAGE BODY WEIGHT', note: 'Count is the number of shrimp in one kilogram. A lower count means larger shrimp. Use an average from a representative sample of your pond.' },
    biomass: { title: 'Pond biomass', subtitle: 'Estimate your standing stock', description: 'Estimate the weight of shrimp still in your pond after any partial harvests.', result: 'ESTIMATED STANDING BIOMASS', note: 'Your survival percentage should include shrimp already harvested. Partial-harvest counts are subtracted separately. Accuracy depends on population estimates and recent sampling.' },
    fcr: { title: 'Feed conversion', subtitle: 'Work out your FCR', description: 'Compare feed given with biomass gained over the same recording period.', result: 'APPARENT FEED CONVERSION RATIO', note: 'This is apparent FCR, without a mortality adjustment. Include all harvests from the same period. This is a record-based calculation, not a health rating or an ideal target.' },
    revenue: { title: 'Harvest income', subtitle: 'Explore your harvest value', description: 'Use your expected harvest weight and your own selling price to estimate gross revenue.', result: 'ESTIMATED GROSS REVENUE', note: 'Gross revenue comes before production costs, buyer deductions, and transport. The editable example price is not a live market quote.' },
  };

  const fields: Record<Tool, Field[]> = {
    size: [{ key: 'value', label: direction === 'weight' ? (isId ? 'Bobot rata-rata udang' : 'Average shrimp weight') : (isId ? 'Jumlah udang per kilogram' : 'Shrimp count per kilogram'), unit: direction === 'weight' ? 'g' : (isId ? 'ekor/kg' : 'shrimp/kg'), note: isId ? 'Gunakan hasil sampling terbaru.' : 'Use your latest sampling average.' }],
    biomass: [
      { key: 'stocked', label: isId ? 'Jumlah tebar awal' : 'Shrimp originally stocked', unit: isId ? 'ekor' : 'shrimp', step: '1' },
      { key: 'survival', label: isId ? 'Estimasi kelangsungan hidup' : 'Estimated survival', unit: '%', max: 100 },
      { key: 'weight', label: isId ? 'Bobot rata-rata saat ini' : 'Current average weight', unit: 'g' },
      { key: 'removed', label: isId ? 'Jumlah sudah dipanen' : 'Shrimp already harvested', unit: isId ? 'ekor' : 'shrimp', step: '1' },
    ],
    fcr: [
      { key: 'feed', label: isId ? 'Total pakan diberikan' : 'Total feed given', unit: 'kg' },
      { key: 'current', label: isId ? 'Biomassa di kolam saat ini' : 'Current pond biomass', unit: 'kg' },
      { key: 'harvested', label: isId ? 'Total biomassa dipanen' : 'Cumulative harvested biomass', unit: 'kg' },
      { key: 'initial', label: isId ? 'Biomassa awal periode' : 'Biomass at start of period', unit: 'kg' },
    ],
    revenue: [
      { key: 'weight', label: isId ? 'Estimasi bobot panen' : 'Expected harvest weight', unit: 'kg' },
      { key: 'price', label: isId ? 'Harga jual Anda' : 'Your selling price', unit: 'Rp/kg', step: '1', note: isId ? 'Harga contoh. Ganti dengan penawaran pembeli Anda.' : 'Example price. Replace with your buyer’s quote.' },
    ],
  };
  const v = values[active];
  const result = active === 'size' ? convertShrimpSize(v.value)
    : active === 'biomass' ? standingBiomass(v.stocked, v.survival, v.removed, v.weight)
    : active === 'fcr' ? apparentFcr(v.feed, v.current, v.harvested, v.initial)
    : harvestRevenue(v.weight, v.price);
  const valid = result !== null;
  const unit = active === 'size' ? (direction === 'weight' ? (isId ? 'ekor per kilogram' : 'shrimp per kilogram') : (isId ? 'gram per ekor' : 'grams per shrimp'))
    : active === 'biomass' ? (isId ? 'kilogram di kolam' : 'kilograms in your pond')
    : active === 'fcr' ? (isId ? 'kg pakan / kg pertambahan biomassa' : 'kg feed / kg biomass gain')
    : (isId ? 'rupiah · sebelum biaya dan potongan' : 'rupiah · before costs and deductions');
  const formula = active === 'size' ? `${format(1000)} ÷ ${valid ? format(Number(v.value)) : '—'}`
    : active === 'biomass' ? (isId ? '(Tebar × SR − panen) × bobot ÷ 1.000' : '(Stocked × survival − harvested) × weight ÷ 1,000')
    : active === 'fcr' ? (isId ? 'Pakan ÷ (biomassa kini + panen − awal)' : 'Feed ÷ (current biomass + harvests − initial biomass)')
    : (valid ? `${format(Number(v.weight))} kg × Rp ${format(Number(v.price))}/kg` : (isId ? 'Bobot panen × harga jual per kg' : 'Harvest weight × selling price per kg'));
  const errors: Record<Tool, string> = isId ? {
    size: 'Masukkan angka lebih dari nol untuk menghitung size udang.',
    biomass: 'Periksa angka Anda: SR 0–100%, bobot lebih dari nol, jumlah tebar dan panen berupa bilangan bulat. Panen tidak boleh melebihi estimasi populasi hidup.',
    fcr: 'Isi semua kolom dengan angka nol atau positif. Biomassa saat ini ditambah panen harus lebih besar dari biomassa awal.',
    revenue: 'Isi bobot dan harga jual dengan angka nol atau positif.',
  } : {
    size: 'Enter a number greater than zero to calculate shrimp size.',
    biomass: 'Check your inputs: survival must be 0–100%, weight must be positive, and shrimp counts must be whole numbers. Harvested count cannot exceed estimated surviving shrimp.',
    fcr: 'Complete all fields with zero or positive values. Current biomass plus harvests must be greater than starting biomass.',
    revenue: 'Enter zero or positive values for both harvest weight and selling price.',
  };
  const reset = () => {
    setValues(previous => ({ ...previous, [active]: DEFAULTS[active] }));
    if (active === 'size') setDirection('weight');
  };
  const switchDirection = (next: 'weight' | 'count') => {
    if (next === direction) return;
    const converted = convertShrimpSize(values.size.value);
    setValues(previous => ({ ...previous, size: { value: converted === null ? '' : String(Number(converted.toPrecision(12))) } }));
    setDirection(next);
  };

  return <div className={styles.root}>
    <div className={styles.container}>
      <nav className={styles.breadcrumb} aria-label={isId ? 'Jejak navigasi' : 'Breadcrumb'}>
        <Link href={base || '/'}>{isId ? 'Beranda' : 'Home'}</Link><span>/</span><span>{isId ? 'Kalkulator tambak' : 'General farm calculator'}</span>
        <span className={styles.languages}><Link href="/tools" aria-current={!isId ? 'page' : undefined}>EN</Link><span>/</span><Link href="/id/tools" aria-current={isId ? 'page' : undefined}>ID</Link></span>
      </nav>

      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{isId ? 'KALKULATOR TAMBAK SHRIMPLY' : 'SHRIMPLY GENERAL FARM CALCULATOR'}</p>
          <h1>{isId ? 'Angka lebih jelas.' : 'A clearer picture.'}<br /><em>{isId ? 'Mulai dari satu hitungan.' : 'One calculation away.'}</em></h1>
          <p className={styles.intro}>{isId ? 'Satu kalkulator untuk size udang, biomassa, FCR, dan estimasi pendapatan panen. Pilih perhitungan yang Anda butuhkan.' : 'One calculator for shrimp size, pond biomass, feed conversion, and harvest income. Choose the calculation you need.'}</p>
        </div>
        <div className={styles.heroAside}><span className={styles.freeDot} />{isId ? 'Gratis. Tanpa akun.' : 'Free to use. No account needed.'}<span>{isId ? 'Dibuat untuk pekerjaan di tambak.' : 'Made for the work at the pond edge.'}</span></div>
      </header>

      <section className={styles.toolbox} aria-label={isId ? 'Kalkulator tambak' : 'General farm calculator'}>
        <div className={styles.sectionMeta}><span>{isId ? 'PILIH PERHITUNGAN' : 'CHOOSE A CALCULATION'}</span><span>01 — 04</span></div>
        <div className={styles.selectors} role="group" aria-label={isId ? 'Jenis perhitungan' : 'Calculation type'}>
          {TOOLS.map((tool, index) => <button id={tool} key={tool} type="button" aria-pressed={active === tool} aria-controls="farming-calculator" onClick={() => selectTool(tool)} className={`${styles.selector} ${active === tool ? styles.selected : ''}`}>
            <span className={styles.toolNumber}>0{index + 1}</span><ToolIcon tool={tool} /><span className={styles.selectorText}><strong>{labels[tool].title}</strong><span>{labels[tool].subtitle}</span></span>
          </button>)}
        </div>

        <div id="farming-calculator" className={styles.workbench}>
          <div className={styles.inputPanel}>
            <div className={styles.panelHeading}><div><p className={styles.eyebrow}>{isId ? 'ANGKA DARI KOLAM ANDA' : 'YOUR POND, YOUR NUMBERS'}</p><h2>{labels[active].title}</h2></div><button type="button" onClick={reset} className={styles.reset}><span aria-hidden="true">↺</span>{isId ? 'Atur ulang' : 'Reset'}</button></div>
            <p className={styles.description}>{labels[active].description}</p>
            {active === 'size' ? <div className={styles.direction} role="group" aria-label={isId ? 'Arah konversi' : 'Conversion direction'}>
              <button type="button" aria-pressed={direction === 'weight'} onClick={() => switchDirection('weight')}>{isId ? 'Gram → size' : 'Grams → count'}</button>
              <button type="button" aria-pressed={direction === 'count'} onClick={() => switchDirection('count')}>{isId ? 'Size → gram' : 'Count → grams'}</button>
            </div> : null}
            <div className={`${styles.fields} ${active === 'size' || active === 'revenue' ? styles.singleFields : ''}`}>
              {fields[active].map(field => <div key={`${active}-${field.key}`} className={styles.field}>
                <label htmlFor={`tool-${active}-${field.key}`}>{field.label}</label>
                <div className={styles.inputWrap}><input id={`tool-${active}-${field.key}`} type="number" inputMode="decimal" min="0" max={field.max} step={field.step ?? 'any'} value={v[field.key]} aria-describedby={`${field.note ? `note-${active}-${field.key} ` : ''}${valid ? '' : 'calculator-error'}`.trim() || undefined} onChange={event => { const value = event.target.value; setValues(previous => ({ ...previous, [active]: { ...previous[active], [field.key]: value } })); }} /><span>{field.unit}</span></div>
                {field.note ? <p id={`note-${active}-${field.key}`} className={styles.fieldNote}>{field.note}</p> : null}
              </div>)}
            </div>
            {active === 'size' ? <div className={styles.presets}><span>{isId ? 'Coba contoh' : 'Try a sample'}</span>{[10, 20, 25, 40].map(weight => <button type="button" key={weight} onClick={() => setValues(previous => ({ ...previous, size: { value: String(direction === 'weight' ? weight : 1000 / weight) } }))}>{direction === 'weight' ? `${weight} g` : `${format(1000 / weight)} /kg`}</button>)}</div> : null}
            <div className={styles.related}><span>{isId ? 'PAHAMI DI BALIK ANGKANYA' : 'UNDERSTAND THE NUMBERS'}</span><Link href={`${base}/resources/${GUIDES[active]}`}>{isId ? 'Baca panduan terkait' : 'Read the companion guide'}<Arrow /></Link></div>
          </div>

          <div className={styles.resultPanel}>
            <div className={styles.resultHeading}><span className={styles.resultDot} />{isId ? 'HASIL KALKULASI' : 'YOUR CALCULATION'}<span className={styles.resultIndex}>0{TOOLS.indexOf(active) + 1} / 04</span></div>
            <div aria-live="polite" aria-atomic="true" className={styles.result}>
              <p className={styles.resultLabel}>{labels[active].result}</p>
              <div className={`${styles.resultValue} ${active === 'revenue' ? styles.currencyValue : ''}`}>{valid ? <>{active === 'revenue' ? <span className={styles.currency}>Rp</span> : null}{format(result)}</> : '—'}</div>
              <p className={styles.resultUnit}>{valid ? unit : (isId ? 'Menunggu angka yang valid' : 'Waiting for valid inputs')}</p>
              {!valid ? <p id="calculator-error" className={styles.error}>{errors[active]}</p> : null}
            </div>
            {active === 'size' ? <div className={styles.shrimpArt}><ShrimpDrawing /><span>Litopenaeus vannamei</span></div> : <div className={styles.resultIllustration}><ToolIcon tool={active} /><span>{isId ? 'Estimasi berdasarkan data Anda' : 'An estimate from your inputs'}</span></div>}
            <div className={styles.formula}><span>{isId ? 'CARA MENGHITUNG' : 'HOW IT’S CALCULATED'}</span><p>{formula}{valid ? ` = ${format(result)}` : ''}</p></div>
          </div>
        </div>
        <p className={styles.assumption}><span aria-hidden="true">ⓘ</span>{labels[active].note}</p>
      </section>

      <section className={styles.learning}>
        <div className={styles.learningHeading}><div><p className={styles.eyebrow}>{isId ? 'DARI HITUNGAN KE TINDAKAN' : 'FROM NUMBERS TO KNOW-HOW'}</p><h2>{isId ? 'Terus belajar. Terus bertumbuh.' : 'Keep learning. Keep growing.'}</h2></div><Link href={`${base}/resources`}>{isId ? 'Jelajahi semua panduan' : 'Explore the resource library'}<Arrow /></Link></div>
        <div className={styles.guideGrid}>
          {[
            { number: '01', title: isId ? 'Rencanakan pakan harian.' : 'Make every feeding count.', text: isId ? 'Hitung ransum dasar, lalu sesuaikan dengan anco dan kondisi kolam.' : 'Estimate a baseline ration, then adjust using trays and pond conditions.', tag: isId ? 'PAKAN & EFISIENSI' : 'FEED & EFFICIENCY', slug: 'vannamei-feeding-rate', icon: 'fcr' as Tool },
            { number: '02', title: isId ? 'Mulai dengan padat tebar yang tepat.' : 'Start with the right stocking plan.', text: isId ? 'Hubungkan jumlah benur, luas kolam, dan kapasitas tambak.' : 'Connect your seed count, pond area, and farm capacity.', tag: isId ? 'TEBAR & PERENCANAAN' : 'STOCKING & PLANNING', slug: 'vannamei-stocking-density', icon: 'biomass' as Tool },
            { number: '03', title: isId ? 'Kenali biaya riil panen Anda.' : 'Know what your harvest really costs.', text: isId ? 'Hubungkan pendapatan panen dengan biaya produksi per kilogram.' : 'Put harvest revenue in context with your production cost per kilogram.', tag: isId ? 'PANEN & KEUANGAN' : 'HARVEST & FINANCE', slug: 'shrimp-farm-cogs', icon: 'revenue' as Tool },
          ].map(guide => <Link key={guide.slug} className={styles.guide} href={`${base}/resources/${guide.slug}`}><div className={styles.guideTop}><ToolIcon tool={guide.icon} /><Arrow diagonal /></div><p className={styles.eyebrow}>{guide.tag}</p><h3>{guide.title}</h3><p>{guide.text}</p><span className={styles.guideLink}>{isId ? 'Buka panduan' : 'Open guide'}<Arrow /></span></Link>)}
        </div>
      </section>
      <div className={styles.closing}><span>{isId ? 'Satu hitungan adalah awal.' : 'One calculation is a starting point.'}</span><p>{isId ? 'Catatan yang konsisten memberi gambaran lebih lengkap tentang tambak Anda.' : 'Consistent records give you the bigger picture of your farm.'}</p></div>
    </div>
  </div>;
}
