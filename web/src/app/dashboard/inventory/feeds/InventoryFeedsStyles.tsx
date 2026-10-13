"use client";


export function InventoryFeedsStyles() {
  return <style jsx global>{`
        @keyframes modalSlide {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .inventory-feeds-page .inventory-primary-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .inventory-feeds-page .inventory-section-tabs {
          flex: 1;
          min-width: 0;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
        }
        .inventory-feeds-page .inventory-section-tab {
          min-width: 0;
          min-height: 40px;
          padding: 0 10px;
          border: 1px solid transparent;
          border-radius: 10px;
          background: transparent;
          color: var(--text-muted);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
        }
        .inventory-feeds-page .inventory-section-tab:hover,
        .inventory-feeds-page .inventory-section-tab.active {
          border-color: var(--border);
          background: #fff;
          color: var(--primary);
        }
        .inventory-feeds-page .inventory-input-menu {
          flex: 0 0 auto;
          z-index: 40;
        }
        .inventory-feeds-page .inventory-input-trigger {
          min-height: 40px;
          padding: 0 8px;
          color: var(--primary);
        }
        .inventory-feeds-page .inventory-input-popover,
        .inventory-feeds-page .inventory-filter-popover {
          z-index: 90;
        }
        .inventory-feeds-page .inventory-summary-bar {
          gap: 4px;
          padding: 8px;
          border: 1px solid var(--border);
          border-radius: 16px !important;
          background: #fff;
          overflow: hidden;
        }
        .inventory-feeds-page .inventory-summary-item {
          min-width: 0;
          min-height: 64px;
          padding: 7px 4px;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .inventory-feeds-page .inventory-summary-item span {
          max-width: 100%;
          color: var(--text-muted);
          font-size: 9px;
          font-weight: 600;
          line-height: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .inventory-feeds-page .inventory-summary-item strong {
          max-width: 100%;
          margin-top: 3px;
          color: var(--text-primary);
          font-size: clamp(13px, 2.5vw, 18px);
          font-weight: 600;
          line-height: 22px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .inventory-feeds-page .inventory-section-heading {
          margin: 0;
          color: var(--text-primary);
          font-size: 17px;
          font-weight: 600;
          line-height: 22px;
        }
        .inventory-feeds-page .inventory-alert-count {
          padding: 5px 10px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: #fff;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .inventory-feeds-page .inventory-filter-menu {
          z-index: 35;
        }
        .inventory-feeds-page .inventory-filter-trigger {
          width: 38px;
          height: 38px;
          padding: 0;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: #fff;
          color: var(--text-muted);
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
        }
        .inventory-feeds-page .inventory-filter-trigger:hover,
        .inventory-feeds-page .inventory-filter-trigger[aria-expanded="true"] {
          border-color: var(--secondary);
          background: var(--bg-mid);
          color: var(--primary);
        }
        .inventory-feeds-page .inventory-filter-popover button.is-active {
          background: var(--primary-dim);
          color: var(--primary);
        }
        .inventory-feeds-page .inventory-modal-overlay {
          padding: 18px !important;
        }
        .inventory-feeds-page .inventory-modal {
          max-height: calc(100dvh - 36px) !important;
          border-radius: 16px !important;
        }
        .inventory-feeds-page .inventory-modal-header {
          min-height: 56px;
          padding: 10px 14px !important;
          background: #fff !important;
        }
        .inventory-feeds-page .inventory-modal-header button:hover {
          border-color: var(--border) !important;
          background: var(--primary-dim) !important;
          color: var(--primary) !important;
        }
        .inventory-feeds-page .inventory-modal-body {
          padding: 12px !important;
          overscroll-behavior: contain;
        }
        .inventory-feeds-page .inventory-form {
          gap: 12px !important;
        }
        .inventory-feeds-page .inventory-modal-body :global(.responsive-form-grid) {
          gap: 10px !important;
        }
        .inventory-feeds-page .inventory-add-details,
        .inventory-feeds-page .inventory-stock-details {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        .inventory-feeds-page .inventory-full-row {
          grid-column: 1 / -1 !important;
        }
        .inventory-feeds-page .inventory-add-details > div:not(.inventory-full-row),
        .inventory-feeds-page .inventory-stock-details > div:not(.inventory-full-row) {
          grid-column: auto !important;
        }
        .inventory-feeds-page .inventory-modal-body :global(label) {
          margin-bottom: 4px !important;
          font-size: 11px !important;
          letter-spacing: 0 !important;
          text-transform: none !important;
        }
        .inventory-feeds-page .inventory-modal-body :global(input),
        .inventory-feeds-page .inventory-modal-body :global(select),
        .inventory-feeds-page .inventory-modal-body :global(textarea) {
          min-height: 40px !important;
          padding: 8px 10px !important;
          border-radius: 10px !important;
          font-size: 14px !important;
        }
        .inventory-feeds-page .inventory-modal-footer {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          padding: 8px 10px !important;
          border-top: 1px solid var(--border);
          background: #fff;
        }
        .inventory-feeds-page .inventory-modal-footer button {
          width: 100%;
          min-height: 38px;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          justify-content: center;
          letter-spacing: 0;
          text-transform: none;
        }
        .inventory-feeds-page .glass-card {
          backdrop-filter: var(--glass-blur);
          border-radius: 16px;
        }
        .inventory-feeds-page input:focus, .inventory-feeds-page select:focus, .inventory-feeds-page textarea:focus {
          border-color: var(--primary) !important;
          background: white !important;
          box-shadow: 0 0 0 4px var(--primary-dim) !important;
        }
        @media (max-width: 420px) {
          .inventory-feeds-page .inventory-primary-toolbar {
            gap: 6px;
          }
          .inventory-feeds-page .inventory-section-tabs {
            gap: 3px;
          }
          .inventory-feeds-page .inventory-section-tab {
            min-height: 38px;
            padding: 0 4px;
            gap: 4px;
            font-size: 10px;
          }
          .inventory-feeds-page .inventory-section-tab :global(svg) {
            width: 15px;
            height: 15px;
          }
          .inventory-feeds-page .inventory-input-trigger {
            min-width: 58px;
            padding: 0 5px;
            font-size: 10px;
          }
        }
      `}</style>;
}
