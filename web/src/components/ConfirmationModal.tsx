"use client";

import React from 'react';
import AccessibleDialog from './AccessibleDialog';
import { AlertCircle, X, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = true,
  isLoading = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <AccessibleDialog title={title} onClose={onCancel} busy={isLoading} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
    }}>
      <div className="glass-card animate-fade-up" style={{ 
        width: '100%', maxWidth: '440px', background: '#FFFFFF', padding: '0', 
        overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
      }}>
        <div style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '50%', 
            background: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'var(--primary-dim)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isDanger ? '#EF4444' : 'var(--primary)'
          }}>
            <AlertCircle size={32} />
          </div>
          
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>{title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>{message}</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
            <button 
              onClick={onCancel}
              disabled={isLoading}
              style={{ 
                flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', 
                background: 'transparent', fontWeight: 600, cursor: 'pointer', fontSize: '14px'
              }}
            >
              {cancelText}
            </button>
            <button 
              onClick={onConfirm}
              disabled={isLoading}
              style={{ 
                flex: 1, padding: '12px', borderRadius: '12px', border: 'none', 
                background: isDanger ? '#EF4444' : 'var(--primary)', color: '#FFF',
                fontWeight: 600, cursor: 'pointer', fontSize: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : confirmText}
            </button>
          </div>
        </div>
      </div>
    </AccessibleDialog>
  );
}
