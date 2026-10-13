"use client";

export function PondDetailStyles() {
  return <style jsx global>{`
        .pond-detail-page .hover-row:hover {
          background: var(--primary-dim) !important;
        }
        .pond-detail-page .action-button-modern {
          width: 100%;
          padding: 14px 10px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--bg-mid);
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .pond-detail-page .action-button-modern:hover {
          transform: translateY(-4px);
          border-color: var(--primary);
          box-shadow: var(--shadow-card);
          background: #FFF;
        }
        .pond-detail-page .action-button-modern .icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pond-detail-page .action-button-modern span {
          font-size: 0.68rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        @media (max-width: 420px) {
          .pond-detail-page .pond-detail-record-popover {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            bottom: auto;
            left: auto;
            width: min(238px, calc(100vw - 24px));
          }
        }
      `}</style>;
}
