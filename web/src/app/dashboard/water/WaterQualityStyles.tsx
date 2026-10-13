"use client";


export function WaterQualityStyles() {
  return <style jsx global>{`
        .water-quality-page .water-lab-value-input {
          display: flex;
          align-items: center;
          gap: 4px;
          min-height: 40px;
          padding: 0 8px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: var(--bg-card, #fff);
        }
        .water-quality-page .water-lab-value-input:focus-within {
          border-color: var(--primary);
        }
        .water-quality-page .water-lab-value-input input {
          width: 100%;
          min-width: 0;
          padding: 8px 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text-primary);
          font: inherit;
          font-weight: 600;
          appearance: textfield;
        }
        .water-quality-page .water-lab-value-input input::-webkit-inner-spin-button,
        .water-quality-page .water-lab-value-input input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .water-quality-page .water-lab-value-input span {
          flex-shrink: 0;
          color: var(--text-muted);
          font-size: 11px;
          pointer-events: none;
        }

        .water-quality-page .icon-btn-modern {
          background: #FFF;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px;
          color: var(--primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(15, 76, 117, 0.05);
        }
        .water-quality-page .icon-btn-modern:hover {
          background: var(--primary-dim);
          transform: translateY(-2px);
          border-color: var(--primary);
        }
        .water-quality-page .wq-metric {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .water-quality-page .wq-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--text-faint);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .water-quality-page .wq-value {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .water-quality-page .drawer-content {
          width: 100%;
          max-width: 560px;
          background: #FFFFFF;
          height: 100vh;
          box-shadow: -20px 0 60px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 640px) {
          .water-quality-page .water-history-drawer {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
        .water-quality-page .animate-slide-left {
          animation: slideLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .water-quality-page .wq-metric-small {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .water-quality-page .wq-label-small {
          font-size: 0.6rem;
          font-weight: 600;
          color: var(--text-faint);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .water-quality-page .wq-val-small {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .water-quality-page .form-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .water-quality-page .form-input {
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg-mid);
          outline: none;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        .water-quality-page .form-input:focus {
          border-color: var(--primary);
          background: #FFF;
          box-shadow: 0 0 0 4px var(--primary-dim);
        }
        .water-quality-page .water-optional-heading {
          grid-column: span 2;
          border-top: 1px solid var(--border);
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          color: var(--text-primary);
        }
        .water-quality-page .water-optional-heading span {
          color: var(--text-faint);
          font-size: 0.8rem;
          font-weight: 600;
        }
        .water-quality-page .water-condition-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .water-quality-page .water-condition-options {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }
        .water-quality-page .water-condition-option {
          border: 1px solid var(--border);
          background: var(--bg-mid);
          color: var(--text-muted);
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }
        .water-quality-page .water-condition-option.selected {
          background: var(--primary);
          border-color: var(--primary);
          color: #FFF;
        }
        @media (max-width: 640px) {
          .water-quality-page .water-optional-heading {
            grid-column: span 1;
          }
        }
      `}</style>;
}
