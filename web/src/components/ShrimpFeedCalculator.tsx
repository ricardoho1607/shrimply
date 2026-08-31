"use client";

import React, { useState, useMemo } from "react";
import { Check, Copy, RotateCcw, Info, Sparkles } from "lucide-react";
import { getFeedRateFromMbw } from "../../../shared/pondCalculations";

type AbwPreset = {
  label: string;
  abw: number;
  stage: string;
};

const ABW_PRESETS: AbwPreset[] = [
  { label: "Early juvenile", abw: 2.0, stage: "Grow-out starts at 1.65 g" },
  { label: "Juvenile", abw: 6.0, stage: "Early grow-out" },
  { label: "Sub-adult", abw: 12.0, stage: "Mid grow-out" },
  { label: "Market", abw: 18.0, stage: "Commercial harvest size" },
  { label: "Jumbo", abw: 25.0, stage: "Large premium grade" },
];

/**
 * Directly calls Shrimply's shared getFeedRateFromMbw calculation from shared/pondCalculations.ts
 */
const MIN_CALCULATOR_ABW = 1.65;

export const calculateFeedRate = (abw: number): number => {
  if (abw < MIN_CALCULATOR_ABW) return 0;
  const rate = getFeedRateFromMbw(abw);
  if (rate !== null) {
    return Number(rate.toFixed(2));
  }
  return 0;
};

export const calculateCurrentPopulation = (
  stockedPopulation: number,
  survivalRatePercent: number,
  harvestedShrimp: number,
): number => Math.max(
  0,
  (Math.max(0, stockedPopulation) * Math.min(100, Math.max(0, survivalRatePercent)) / 100)
    - Math.max(0, harvestedShrimp),
);

export const getTrayCheckWindow = (abw: number): string => {
  if (abw < 3.0) {
    return "about 2.5 hours";
  }
  if (abw < 7.0) {
    return "2.0–2.5 hours";
  }
  if (abw < 15.0) {
    return "1.5–2.0 hours";
  }
  return "1.0–1.5 hours";
};

export default function ShrimpFeedCalculator() {
  const [calcMode, setCalcMode] = useState<"biomass" | "population">("biomass");
  const [biomassKg, setBiomassKg] = useState<number>(2000);
  const [population, setPopulation] = useState<number>(150000);
  const [survivalRate, setSurvivalRate] = useState<number>(75);
  const [harvestedShrimp, setHarvestedShrimp] = useState<number>(0);
  const [abw, setAbw] = useState<number>(14);
  const [feedingsPerDay, setFeedingsPerDay] = useState<number>(4);
  const [trayPercentage, setTrayPercentage] = useState<number>(1.2);
  const [trayCount, setTrayCount] = useState<number>(4);
  const [copied, setCopied] = useState<boolean>(false);

  const currentPopulation = useMemo(() => (
    calculateCurrentPopulation(population, survivalRate, harvestedShrimp)
  ), [population, survivalRate, harvestedShrimp]);

  // Derived effective biomass
  const effectiveBiomassKg = useMemo(() => {
    if (calcMode === "biomass") {
      return Math.max(0, biomassKg);
    }
    return Math.max(0, (currentPopulation * abw) / 1000);
  }, [calcMode, biomassKg, currentPopulation, abw]);

  // Feed calculations
  const feedingRatePercent = useMemo(() => calculateFeedRate(abw), [abw]);
  const dailyFeedKg = useMemo(() => {
    return Number(((effectiveBiomassKg * feedingRatePercent) / 100).toFixed(1));
  }, [effectiveBiomassKg, feedingRatePercent]);

  const feedPerMealKg = useMemo(() => {
    return feedingsPerDay > 0 ? Number((dailyFeedKg / feedingsPerDay).toFixed(1)) : 0;
  }, [dailyFeedKg, feedingsPerDay]);

  const trayCheckWindow = useMemo(() => getTrayCheckWindow(abw), [abw]);

  // Feed tray calculations (total tray feed across all trays per meal)
  const totalTrayFeedPerMealGrams = useMemo(() => {
    return Math.round(((feedPerMealKg * 1000) * trayPercentage) / 100);
  }, [feedPerMealKg, trayPercentage]);

  const gramsPerTray = useMemo(() => {
    return trayCount > 0 ? Math.round(totalTrayFeedPerMealGrams / trayCount) : 0;
  }, [totalTrayFeedPerMealGrams, trayCount]);

  const shrimpCountPerKg = useMemo(() => (abw > 0 ? Math.round(1000 / abw) : 0), [abw]);

  const handleReset = () => {
    setCalcMode("biomass");
    setBiomassKg(2000);
    setPopulation(150000);
    setSurvivalRate(75);
    setHarvestedShrimp(0);
    setAbw(14);
    setFeedingsPerDay(4);
    setTrayPercentage(1.2);
    setTrayCount(4);
  };

  const handleCopySummary = async () => {
    const text = `Shrimply Vannamei Feed Ration Plan:
- Calculation Mode: ${calcMode === "biomass" ? "Known Standing Biomass" : "Population & Survival"}
- Standing Biomass: ${effectiveBiomassKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
- Average Body Weight (ABW): ${abw} g (~${shrimpCountPerKg} pcs/kg)
${calcMode === "population" ? `- Current Population: ${Math.round(currentPopulation).toLocaleString()} shrimp (after ${harvestedShrimp.toLocaleString()} harvested)\n` : ""}- Feeding Rate: ${feedingRatePercent}% of biomass/day
----------------------------------
- Total Daily Feed: ${dailyFeedKg.toLocaleString()} kg/day (~${(dailyFeedKg / 25).toFixed(1)} bags of 25kg)
- Feedings / Day: ${feedingsPerDay} meals
- Feed per Meal: ${feedPerMealKg.toLocaleString()} kg/feeding
- Feed Tray Starting Check Window: ${trayCheckWindow} (${trayPercentage}% = ${gramsPerTray}g per tray across ${trayCount} trays)
Baseline only: confirm with the feed label, check trays, recent sampling, harvest records, and water quality.
Calculated via Shrimply (shrimplytech.com/resources/vannamei-feeding-rate)`;

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
            Interactive Farm Tool
          </span>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--navy)", margin: 0, lineHeight: 1.2 }}>
            Vannamei Shrimp Feed Calculator
          </h2>
          <p style={{ margin: "6px 0 0 0", color: "var(--ocean)", fontSize: "0.95rem", fontWeight: 500, maxWidth: "680px" }}>
            Calculate a baseline daily ration, per-meal amount, and feed-tray allocation from standing biomass and average body weight.
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
            Reset
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
            {copied ? "Copied to Clipboard!" : "Copy Feed Ration"}
          </button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "8px" }}>
          1. Select Calculation Basis
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setCalcMode("biomass")}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: calcMode === "biomass" ? "2px solid var(--blue)" : "1px solid var(--slate)",
              background: calcMode === "biomass" ? "var(--ice)" : "var(--off-white)",
              color: calcMode === "biomass" ? "var(--navy)" : "var(--ocean)",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            A. Known Standing Biomass (kg)
          </button>
          <button
            type="button"
            onClick={() => setCalcMode("population")}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: calcMode === "population" ? "2px solid var(--blue)" : "1px solid var(--slate)",
              background: calcMode === "population" ? "var(--ice)" : "var(--off-white)",
              color: calcMode === "population" ? "var(--navy)" : "var(--ocean)",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            B. Population & Survival Rate (%)
          </button>
        </div>
      </div>

      {/* Growth Stage Presets */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "8px" }}>
          2. Quick Growth Stage Presets (ABW)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
          {ABW_PRESETS.map((preset) => {
            const isSelected = Math.abs(abw - preset.abw) < 0.2;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setAbw(preset.abw)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: isSelected ? "2px solid var(--blue)" : "1px solid var(--slate)",
                  background: isSelected ? "var(--ice)" : "var(--off-white)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem", color: isSelected ? "var(--navy)" : "var(--ocean)" }}>
                    {preset.label}
                  </span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--blue)" }}>
                    {preset.abw}g
                  </span>
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.3 }}>
                  {preset.stage}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inputs Grid */}
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
        {calcMode === "biomass" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label htmlFor="calc-biomass" style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)" }}>
                Standing Biomass (kg)
              </label>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--blue)" }}>
                {biomassKg.toLocaleString()} kg ({(biomassKg / 1000).toFixed(2)} MT)
              </span>
            </div>
            <input
              id="calc-biomass"
              type="number"
              min={50}
              max={50000}
              step={50}
              value={biomassKg || ""}
              onChange={(e) => setBiomassKg(Math.max(1, Number(e.target.value) || 0))}
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
              {[500, 1500, 3000, 5000].map((quickBiomass) => (
                <button
                  key={quickBiomass}
                  type="button"
                  onClick={() => setBiomassKg(quickBiomass)}
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: biomassKg === quickBiomass ? "1px solid var(--blue)" : "1px solid var(--slate)",
                    background: biomassKg === quickBiomass ? "var(--ice)" : "var(--white)",
                    color: biomassKg === quickBiomass ? "var(--blue)" : "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  {quickBiomass.toLocaleString()} kg
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label htmlFor="calc-population" style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)" }}>
                  Initial Stocked Population (PL)
                </label>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--blue)" }}>
                  {population.toLocaleString()} shrimp
                </span>
              </div>
              <input
                id="calc-population"
                type="number"
                min={1000}
                max={1000000}
                step={5000}
                value={population || ""}
                onChange={(e) => setPopulation(Math.max(1, Number(e.target.value) || 0))}
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
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label htmlFor="calc-survival" style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)" }}>
                  Estimated Survival Rate
                </label>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--blue)" }}>
                  {survivalRate}% ({Math.round(population * (survivalRate / 100)).toLocaleString()} before harvest)
                </span>
              </div>
              <input
                id="calc-survival"
                type="range"
                min={30}
                max={95}
                step={1}
                value={survivalRate}
                onChange={(e) => setSurvivalRate(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--blue)", cursor: "pointer", marginBottom: "8px" }}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label htmlFor="calc-harvested" style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)" }}>
                  Cumulative Partial Harvest (count)
                </label>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--blue)" }}>
                  {Math.round(currentPopulation).toLocaleString()} shrimp remaining
                </span>
              </div>
              <input
                id="calc-harvested"
                type="number"
                min={0}
                max={1000000}
                step={1000}
                value={harvestedShrimp || ""}
                onChange={(e) => setHarvestedShrimp(Math.max(0, Number(e.target.value) || 0))}
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
                }}
              />
            </div>
          </>
        )}

        {/* ABW Input */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label htmlFor="calc-abw" style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)" }}>
              Average Body Weight (ABW / MBW)
            </label>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--blue)" }}>
              {abw.toFixed(1)} g (~{shrimpCountPerKg} pcs/kg)
            </span>
          </div>
          <input
            id="calc-abw"
            type="range"
            min={MIN_CALCULATOR_ABW}
            max={35}
            step={0.05}
            value={abw}
            onChange={(e) => setAbw(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--blue)", cursor: "pointer", marginBottom: "8px" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--muted)" }}>
            <span>1.65 g</span>
            <span>15 g</span>
            <span>35 g</span>
          </div>
        </div>

        {/* Feeding Frequency */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label htmlFor="calc-feedings" style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)" }}>
              Feedings Per Day
            </label>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--blue)" }}>
              {feedingsPerDay} meals / day
            </span>
          </div>
          <input
            id="calc-feedings"
            type="range"
            min={2}
            max={6}
            step={1}
            value={feedingsPerDay}
            onChange={(e) => setFeedingsPerDay(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--blue)", cursor: "pointer", marginBottom: "8px" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--muted)" }}>
            <span>2 meals</span>
            <span>4 meals (Standard)</span>
            <span>6 meals (High)</span>
          </div>
        </div>

        {/* Tray Percentage & Count */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label htmlFor="calc-tray-pct" style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)" }}>
                Feed Tray Allocation (%)
              </label>
              <span title="Percentage of meal ration placed into monitoring check trays" style={{ color: "var(--muted)", cursor: "help" }}>
                <Info size={14} />
              </span>
            </div>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--blue)" }}>
              {trayPercentage.toFixed(1)}% across {trayCount} trays
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              id="calc-tray-pct"
              type="range"
              min={0.5}
              max={2.5}
              step={0.1}
              value={trayPercentage}
              onChange={(e) => setTrayPercentage(Number(e.target.value))}
              style={{ flex: 1, accentColor: "var(--blue)", cursor: "pointer" }}
            />
            <select
              value={trayCount}
              onChange={(e) => setTrayCount(Number(e.target.value))}
              aria-label="Number of feed check trays"
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid var(--slate)",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--navy)",
                background: "var(--white)",
              }}
            >
              {[2, 3, 4, 6, 8].map((n) => (
                <option key={n} value={n}>
                  {n} trays
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Results Grid */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "12px" }}>
          Calculated Daily Ration & Meal Breakdown
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px" }}>
          {/* Card 1: Feeding Rate */}
          <div
            style={{
              background: "var(--off-white)",
              border: "1px solid var(--slate)",
              borderRadius: "14px",
              padding: "18px",
            }}
          >
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
              1. Feeding Rate (% Biomass)
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--navy)", lineHeight: 1.1, marginBottom: "6px" }}>
              {feedingRatePercent.toFixed(2)}% <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--blue)" }}>/ day</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ocean)", fontWeight: 500 }}>
              Linear interpolation for {abw.toFixed(1)}g ABW
            </div>
          </div>

          {/* Card 2: Total Daily Feed */}
          <div
            style={{
              background: "rgba(30, 111, 168, 0.06)",
              border: "1px solid rgba(30, 111, 168, 0.25)",
              borderRadius: "14px",
              padding: "18px",
            }}
          >
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
              2. Total Daily Feed
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--navy)", lineHeight: 1.1, marginBottom: "6px" }}>
              {dailyFeedKg.toLocaleString()} <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--blue)" }}>kg / day</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ocean)", fontWeight: 600 }}>
              ~{(dailyFeedKg / 25).toFixed(1)} bags of 25kg
            </div>
          </div>

          {/* Card 3: Feed Per Meal */}
          <div
            style={{
              background: "var(--off-white)",
              border: "1px solid var(--slate)",
              borderRadius: "14px",
              padding: "18px",
            }}
          >
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
              3. Feed Per Meal
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--navy)", lineHeight: 1.1, marginBottom: "6px" }}>
              {feedPerMealKg.toLocaleString()} <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--blue)" }}>kg</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ocean)", fontWeight: 500 }}>
              Divided across {feedingsPerDay} daily meals
            </div>
          </div>

          {/* Card 4: Feed Tray Quota */}
          <div
            style={{
              background: "var(--off-white)",
              border: "1px solid var(--slate)",
              borderRadius: "14px",
              padding: "18px",
            }}
          >
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
              4. Feed Tray Quota
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--navy)", lineHeight: 1.1, marginBottom: "6px" }}>
              {gramsPerTray} <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--blue)" }}>g / tray</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ocean)", fontWeight: 500 }}>
              Starting check window: <strong style={{ color: "var(--navy)" }}>{trayCheckWindow}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Baseline safety note */}
      <div
        style={{
          background: "rgba(187, 225, 250, 0.22)",
          border: "1px solid rgba(50, 130, 184, 0.3)",
          borderRadius: "14px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "28px",
        }}
      >
        <div>
          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Baseline, not an automatic feeding instruction
          </span>
          <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--navy)", marginTop: "2px" }}>
            Confirm the ration with trays, recent sampling, harvests, water quality, and the feed label.
          </div>
        </div>
        <div style={{ fontSize: "0.82rem", color: "var(--ocean)", fontWeight: 500 }}>
          Biomass used: <strong>{effectiveBiomassKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</strong>
        </div>
      </div>

      {/* Embedded Shrimply App Sync Callout */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(15, 76, 117, 0.05) 0%, rgba(50, 130, 184, 0.1) 100%)",
          border: "1px solid rgba(50, 130, 184, 0.35)",
          borderRadius: "16px",
          padding: "20px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div
            style={{
              background: "var(--navy)",
              color: "#fff",
              padding: "8px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.02rem", fontWeight: 700, color: "var(--navy)", margin: "0 0 6px 0" }}>
              Automatically Tracked Inside Shrimply
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--ocean)", lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
              This Feeding Rate (FR) curve is shared with Shrimply&apos;s farm tools. Feed records can reduce inventory, while biological sampling records do not. When enough pond records exist, Shrimply also compares feed-based and recorded biomass estimates so the team can investigate a mismatch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
