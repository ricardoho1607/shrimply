"use client";

import React, { useState, useMemo } from "react";
import { Check, Copy, RotateCcw, Info } from "lucide-react";

type CulturePreset = {
  name: string;
  density: number;
  description: string;
};

const PRESETS: CulturePreset[] = [
  { name: "Extensive", density: 10, description: "Unlined earth pond, tidal / minimal aeration (5–15 PL/m²)" },
  { name: "Semi-Intensive", density: 40, description: "Earth pond with paddlewheels (20–50 PL/m²)" },
  { name: "Intensive", density: 100, description: "HDPE lined pond, central drain, 1 HP/450 kg (60–150 PL/m²)" },
  { name: "Super-Intensive", density: 200, description: "Circular tank/RAS, continuous pure O2 + toilet drain (150–300+ PL/m²)" },
];

const AREA_PRESETS = [1000, 2500, 5000, 10000];

export default function StockingDensityCalculator({ locale = "en" }: { locale?: "en" | "id" | "th" | "vi" } = {}) {
  const isId = locale === "id";
  const isTh = locale === "th";
  const isVi = locale === "vi";
  const [pondArea, setPondArea] = useState<number>(2500);
  const [density, setDensity] = useState<number>(100);
  const [survival, setSurvival] = useState<number>(75);
  const [harvestAbw, setHarvestAbw] = useState<number>(20);
  const [fcr, setFcr] = useState<number>(1.3);
  const [copied, setCopied] = useState<boolean>(false);

  // Calculations
  const totalPl = useMemo(() => Math.round(pondArea * density), [pondArea, density]);
  const plWithBuffer = useMemo(() => Math.round(totalPl * 1.05), [totalPl]);
  const survivingPopulation = useMemo(() => Math.round(totalPl * (survival / 100)), [totalPl, survival]);
  const harvestBiomassKg = useMemo(() => (survivingPopulation * harvestAbw) / 1000, [survivingPopulation, harvestAbw]);
  const harvestBiomassTons = useMemo(() => harvestBiomassKg / 1000, [harvestBiomassKg]);
  const biomassDensityKgM2 = useMemo(() => (pondArea > 0 ? harvestBiomassKg / pondArea : 0), [harvestBiomassKg, pondArea]);
  const biomassDensityTonsHa = useMemo(() => biomassDensityKgM2 * 10, [biomassDensityKgM2]);
  
  // Aeration rule of thumb: 1 HP per 400 - 500 kg biomass peak (midpoint ~450 kg)
  const recommendedHpRange = useMemo(() => {
    const minHp = Math.ceil(harvestBiomassKg / 500);
    const maxHp = Math.ceil(harvestBiomassKg / 400);
    return { minHp, maxHp };
  }, [harvestBiomassKg]);

  const projectedFeedKg = useMemo(() => Math.round(harvestBiomassKg * fcr), [harvestBiomassKg, fcr]);
  const feedBags25kg = useMemo(() => Math.round(projectedFeedKg / 25), [projectedFeedKg]);
  const shrimpCountPerKg = useMemo(() => (harvestAbw > 0 ? Math.round(1000 / harvestAbw) : 0), [harvestAbw]);

  // System Feasibility Evaluation
  const systemCheck = useMemo(() => {
    if (biomassDensityKgM2 < 0.6) {
      return {
        level: "Extensive / Light Load",
        badgeColor: "#0F4C75",
        bgColor: "rgba(187, 225, 250, 0.2)",
        borderColor: "rgba(50, 130, 184, 0.28)",
        summary: "Safe for standard unlined earth ponds with tidal or minimal mechanical aeration (1–2 HP).",
        aerationTip: "Ensure basic water circulation during hot afternoons and cloudy mornings.",
      };
    }
    if (biomassDensityKgM2 <= 1.2) {
      return {
        level: "Semi-Intensive Load",
        badgeColor: "#0F4C75",
        bgColor: "rgba(187, 225, 250, 0.2)",
        borderColor: "rgba(50, 130, 184, 0.28)",
        summary: "Suitable for firm-bottom earth ponds or hybrid lined ponds with dedicated paddlewheels.",
        aerationTip: "Maintain at least 1 HP of aeration per 450 kg biomass during the final 30 days before harvest.",
      };
    }
    if (biomassDensityKgM2 <= 2.5) {
      return {
        level: "Intensive Load",
        badgeColor: "#0F4C75",
        bgColor: "rgba(187, 225, 250, 0.2)",
        borderColor: "rgba(50, 130, 184, 0.28)",
        summary: "High biomass density. Requires HDPE pond lining, central sludge pit, and continuous overnight aeration.",
        aerationTip: "Pre-dawn dissolved oxygen must stay above 4.0 mg/L. Have a standby diesel generator ready for power cuts.",
      };
    }
    return {
      level: "Super-Intensive Load",
      badgeColor: "#0F4C75",
      bgColor: "rgba(187, 225, 250, 0.2)",
      borderColor: "rgba(50, 130, 184, 0.28)",
      summary: "Extreme biomass density. Requires circular HDPE tanks or raceways, central toilet flushed 3–4x daily, pure O2 or venturi aeration, and automated feeding.",
      aerationTip: "Risk of oxygen crash within 15–20 minutes of aerator failure. Automatic power transfer and backup systems are mandatory.",
    };
  }, [biomassDensityKgM2]);

  const handleReset = () => {
    setPondArea(2500);
    setDensity(100);
    setSurvival(75);
    setHarvestAbw(20);
    setFcr(1.3);
  };

  const handleCopySummary = async () => {
    const text = `Shrimply Vannamei Stocking Plan:
- Pond Area: ${pondArea.toLocaleString()} m²
- Stocking Density: ${density} PL/m²
- Expected Survival: ${survival}%
- Target Harvest ABW: ${harvestAbw} g (Count ${shrimpCountPerKg}/kg)
- Expected FCR: ${fcr}
----------------------------------
- Total PL Order: ${totalPl.toLocaleString()} PL (+5% buffer: ${plWithBuffer.toLocaleString()} PL)
- Projected Harvest Population: ${survivingPopulation.toLocaleString()} shrimp
- Projected Harvest Biomass: ${harvestBiomassKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg (${harvestBiomassTons.toFixed(2)} MT)
- Biomass Density: ${biomassDensityKgM2.toFixed(2)} kg/m² (${biomassDensityTonsHa.toFixed(1)} MT/ha)
- Required Aeration: ${recommendedHpRange.minHp}–${recommendedHpRange.maxHp} HP (based on ~450 kg/HP peak)
- Estimated Feed Demand: ${projectedFeedKg.toLocaleString()} kg (~${feedBags25kg} bags of 25kg)
- Feasibility: ${systemCheck.level}
Calculated via Shrimply (shrimplytech.com/resources/vannamei-stocking-density)`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px solid var(--slate)",
        borderRadius: "20px",
        padding: "32px",
        boxShadow: "0 16px 40px rgba(13, 33, 55, 0.06)",
        fontFamily: "var(--sans)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <span className="eyebrow" style={{ color: "var(--blue)", marginBottom: "8px", display: "inline-block" }}>
            {isId ? "Alat Bantu Tambak Interaktif" : isTh ? "เครื่องมือจำลองการเลี้ยงกุ้ง" : isVi ? "Công cụ trang trại tương tác" : "Interactive Farm Tool"}
          </span>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--navy)", margin: 0, lineHeight: 1.2 }}>
            {isId ? "Kalkulator Padat Tebar & Biomassa Vannamei" : isTh ? "เครื่องคำนวณความหนาแน่นและชีวมวลกุ้งแวนนาไม" : isVi ? "Công cụ tính mật độ thả giống & sinh khối tôm thẻ" : "Vannamei Stocking & Biomass Calculator"}
          </h2>
          <p style={{ margin: "6px 0 0 0", color: "var(--ocean)", fontSize: "0.95rem", fontWeight: 500, maxWidth: "680px" }}>
            {isId
              ? "Simulasikan luas kolam, target padat tebar, tingkat kelangsungan hidup (SR), dan target bobot panen untuk menghitung kebutuhan benur, daya dukung kolam, dan kebutuhan kincir air."
              : isTh
              ? "ทดลองปรับขนาดบ่อ, ความหนาแน่นลูกกุ้งที่ต้องการ, อัตรารอด (SR) และขนาดกุ้งเป้าหมาย เพื่อคำนวณจำนวนลูกกุ้งที่ต้องปล่อย, แรงม้ากังหันตีน้ำ และความปลอดภัยของบ่อ"
              : isVi
              ? "Mô phỏng diện tích ao, mật độ thả giống mục tiêu, tỷ lệ sống (SR) và kích cỡ tôm thu hoạch để tính nhu cầu con giống PL, sức tải sinh học của ao và công suất quạt nước."
              : "Test your pond area, target density, survival rate, and harvest size to see exact seed requirements, peak aeration demand, and carrying capacity safety."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--off-white)",
              border: "1px solid var(--slate)",
              color: "var(--ocean)",
              padding: "8px 14px",
              borderRadius: "10px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <RotateCcw size={14} />
            {isId ? "Reset" : isTh ? "รีเซ็ต" : isVi ? "Đặt lại" : "Reset"}
          </button>
          <button
            type="button"
            onClick={handleCopySummary}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: copied ? "#10b981" : "var(--navy)",
              border: "none",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: "10px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied
              ? (isId ? "Tersalin ke Clipboard!" : isTh ? "คัดลอกลงคลิปบอร์ดแล้ว!" : isVi ? "Đã sao chép vào bộ nhớ tạm!" : "Copied to Clipboard!")
              : (isId ? "Salin Ringkasan" : isTh ? "คัดลอกสรุปผล" : isVi ? "Sao chép tóm tắt" : "Copy Summary")}
          </button>
        </div>
      </div>

      {/* Preset Buttons */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "8px" }}>
          {isId ? "Preset Cepat Sistem Budidaya" : isTh ? "ระบบการเลี้ยงกุ้งสำเร็จรูป" : isVi ? "Cấu hình nhanh hệ thống nuôi" : "Quick Culture System Presets"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px" }}>
          {PRESETS.map((preset) => {
            const isSelected = density === preset.density;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => setDensity(preset.density)}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: isSelected ? "2px solid var(--blue)" : "1px solid var(--slate)",
                  background: isSelected ? "var(--ice)" : "var(--off-white)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: isSelected ? "var(--navy)" : "var(--ocean)" }}>
                    {preset.name}
                  </span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--blue)", background: "rgba(30, 111, 168, 0.1)", padding: "2px 6px", borderRadius: "6px" }}>
                    {preset.density} PL/m²
                  </span>
                </div>
                <div style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.3 }}>
                  {preset.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Controls Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
          background: "var(--off-white)",
          padding: "24px",
          borderRadius: "16px",
          border: "1px solid var(--slate)",
          marginBottom: "28px",
        }}
      >
        {/* Pond Area */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label htmlFor="calc-pond-area" style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)" }}>
              Pond Area (m²)
            </label>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--blue)" }}>
              {pondArea.toLocaleString()} m² ({(pondArea / 10000).toFixed(2)} ha)
            </span>
          </div>
          <input
            id="calc-pond-area"
            type="number"
            min={100}
            max={50000}
            step={100}
            value={pondArea || ""}
            onChange={(e) => setPondArea(Math.max(10, Number(e.target.value) || 0))}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid var(--slate)",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "var(--navy)",
              background: "var(--white)",
              outline: "none",
              marginBottom: "8px",
            }}
          />
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {AREA_PRESETS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => setPondArea(area)}
                style={{
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  border: pondArea === area ? "1px solid var(--blue)" : "1px solid var(--slate)",
                  background: pondArea === area ? "var(--ice)" : "var(--white)",
                  color: pondArea === area ? "var(--blue)" : "var(--muted)",
                  cursor: "pointer",
                }}
              >
                {area >= 10000 ? `${area / 10000} ha` : `${area.toLocaleString()} m²`}
              </button>
            ))}
          </div>
        </div>

        {/* Stocking Density */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label htmlFor="calc-density" style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)" }}>
              Target Stocking Density
            </label>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--blue)" }}>
              {density} PL / m²
            </span>
          </div>
          <input
            id="calc-density"
            type="range"
            min={5}
            max={300}
            step={5}
            value={density}
            onChange={(e) => setDensity(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--blue)", cursor: "pointer", marginBottom: "8px" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--muted)" }}>
            <span>5 PL/m² (Extensive)</span>
            <span>150 (Intensive)</span>
            <span>300+ (Super)</span>
          </div>
        </div>

        {/* Expected Survival */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label htmlFor="calc-survival" style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)" }}>
              Expected Survival Rate
            </label>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--blue)" }}>
              {survival}%
            </span>
          </div>
          <input
            id="calc-survival"
            type="range"
            min={30}
            max={95}
            step={1}
            value={survival}
            onChange={(e) => setSurvival(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--blue)", cursor: "pointer", marginBottom: "8px" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--muted)" }}>
            <span>30% (Challenged)</span>
            <span>75% (Industry avg)</span>
            <span>95% (Peak SPF)</span>
          </div>
        </div>

        {/* Target Harvest ABW */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label htmlFor="calc-abw" style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)" }}>
              Target Harvest Size (ABW)
            </label>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--blue)" }}>
              {harvestAbw} g (~{shrimpCountPerKg} pcs/kg)
            </span>
          </div>
          <input
            id="calc-abw"
            type="range"
            min={12}
            max={35}
            step={0.5}
            value={harvestAbw}
            onChange={(e) => setHarvestAbw(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--blue)", cursor: "pointer", marginBottom: "8px" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--muted)" }}>
            <span>12 g (83 count)</span>
            <span>20 g (50 count)</span>
            <span>35 g (28 count)</span>
          </div>
        </div>

        {/* Expected FCR */}
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label htmlFor="calc-fcr" style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)" }}>
                Expected Feed Conversion Ratio (FCR)
              </label>
              <span title="Ratio of feed weight given to biomass gained" style={{ color: "var(--muted)", cursor: "help" }}>
                <Info size={14} />
              </span>
            </div>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--blue)" }}>
              {fcr.toFixed(2)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <input
              id="calc-fcr"
              type="range"
              min={1.0}
              max={2.0}
              step={0.05}
              value={fcr}
              onChange={(e) => setFcr(Number(e.target.value))}
              style={{ flex: 1, accentColor: "var(--blue)", cursor: "pointer" }}
            />
            <span style={{ fontSize: "0.82rem", color: "var(--ocean)", fontWeight: 500, minWidth: "120px" }}>
              Standard: 1.25 – 1.40
            </span>
          </div>
        </div>
      </div>

      {/* Primary Results Display */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "12px" }}>
          Pond Production Projections
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px" }}>
          {/* Card 1: Seed Requirement */}
          <div
            style={{
              background: "var(--off-white)",
              border: "1px solid var(--slate)",
              borderRadius: "14px",
              padding: "18px",
            }}
          >
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
              1. Total PL Seed Order
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--navy)", lineHeight: 1.1, marginBottom: "6px" }}>
              {totalPl.toLocaleString()} <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--blue)" }}>PL</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ocean)", fontWeight: 500 }}>
              Order <strong style={{ color: "var(--navy)" }}>{plWithBuffer.toLocaleString()} PL</strong> (+5% acclimation buffer)
            </div>
          </div>

          {/* Card 2: Surviving Population */}
          <div
            style={{
              background: "var(--off-white)",
              border: "1px solid var(--slate)",
              borderRadius: "14px",
              padding: "18px",
            }}
          >
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
              2. Projected Shrimp at Harvest
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--navy)", lineHeight: 1.1, marginBottom: "6px" }}>
              {survivingPopulation.toLocaleString()} <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--blue)" }}>heads</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ocean)", fontWeight: 500 }}>
              Based on {survival}% survival from stocking
            </div>
          </div>

          {/* Card 3: Projected Harvest Biomass */}
          <div
            style={{
              background: "rgba(30, 111, 168, 0.06)",
              border: "1px solid rgba(30, 111, 168, 0.25)",
              borderRadius: "14px",
              padding: "18px",
            }}
          >
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
              3. Projected Harvest Biomass
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--navy)", lineHeight: 1.1, marginBottom: "6px" }}>
              {harvestBiomassKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--blue)" }}>kg</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ocean)", fontWeight: 600 }}>
              {harvestBiomassTons.toFixed(2)} Metric Tons ({biomassDensityKgM2.toFixed(2)} kg/m²)
            </div>
          </div>

          {/* Card 4: Required Aeration */}
          <div
            style={{
              background: "var(--off-white)",
              border: "1px solid var(--slate)",
              borderRadius: "14px",
              padding: "18px",
            }}
          >
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
              4. Peak Aeration Needed
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--navy)", lineHeight: 1.1, marginBottom: "6px" }}>
              {recommendedHpRange.minHp} – {recommendedHpRange.maxHp} <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--blue)" }}>HP</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ocean)", fontWeight: 500 }}>
              Based on 1 HP per 400–500 kg peak biomass
            </div>
          </div>

          {/* Card 5: Feed Requirement */}
          <div
            style={{
              background: "var(--off-white)",
              border: "1px solid var(--slate)",
              borderRadius: "14px",
              padding: "18px",
            }}
          >
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
              5. Total Cycle Feed Demand
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--navy)", lineHeight: 1.1, marginBottom: "6px" }}>
              {projectedFeedKg.toLocaleString()} <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--blue)" }}>kg</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ocean)", fontWeight: 500 }}>
              ~{feedBags25kg.toLocaleString()} bags (25 kg) at {fcr.toFixed(2)} FCR
            </div>
          </div>
        </div>
      </div>

      {/* System Feasibility & Safety Check Banner */}
      <div
        style={{
          background: systemCheck.bgColor,
          border: `1px solid ${systemCheck.borderColor}`,
          borderRadius: "14px",
          padding: "20px 24px",
          display: "flex",
          alignItems: "flex-start",
          gap: "16px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: systemCheck.badgeColor }}>
              Carrying Capacity Check
            </span>
            <span
              style={{
                fontSize: "0.76rem",
                fontWeight: 700,
                background: "var(--white)",
                color: systemCheck.badgeColor,
                padding: "2px 8px",
                borderRadius: "999px",
                border: `1px solid ${systemCheck.borderColor}`,
              }}
            >
              {systemCheck.level} ({biomassDensityKgM2.toFixed(2)} kg/m²)
            </span>
          </div>
          <p style={{ margin: "0 0 6px 0", fontSize: "0.92rem", fontWeight: 600, color: "var(--navy)", lineHeight: 1.4 }}>
            {systemCheck.summary}
          </p>
          <div style={{ fontSize: "0.84rem", color: "var(--ocean)", fontWeight: 500 }}>
            <strong>Aeration & Water Guard:</strong> {systemCheck.aerationTip}
          </div>
        </div>
      </div>
    </div>
  );
}
