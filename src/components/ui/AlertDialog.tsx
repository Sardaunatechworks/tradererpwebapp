'use client';

import React from 'react';
import Modal from './Modal';
import { Button } from './Button';
import { Info, AlertCircle, AlertTriangle } from 'lucide-react';

export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  actionText?: string;
  severity?: 'info' | 'warning' | 'error';
}

export function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  actionText = 'Acknowledge',
  severity = 'info',
}: AlertDialogProps) {
  const icons = {
    info: (
      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
        <Info className="w-5 h-5" />
      </div>
    ),
    warning: (
      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-5 h-5" />
      </div>
    ),
    error: (
      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
        <AlertCircle className="w-5 h-5" />
      </div>
    ),
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3.5">
          {icons[severity]}
          <p className="text-sm text-slate-600 leading-relaxed pt-1">
            {message}
          </p>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            {actionText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default AlertDialog;
