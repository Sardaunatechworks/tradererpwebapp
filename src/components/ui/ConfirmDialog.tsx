'use client';

import React, { useRef } from 'react';
import Modal from './Modal';
import { Button } from './Button';
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const icons = {
    danger: (
      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
        <AlertCircle className="w-5 h-5" />
      </div>
    ),
    warning: (
      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-5 h-5" />
      </div>
    ),
    primary: (
      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
        <HelpCircle className="w-5 h-5" />
      </div>
    ),
  };

  const buttonVariants = {
    danger: 'danger' as const,
    warning: 'primary' as const, // will use custom styling below
    primary: 'primary' as const,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      preventClose={isLoading}
      showCloseButton={!isLoading}
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3.5">
          {icons[variant]}
          <p className="text-sm text-slate-600 leading-relaxed pt-1">
            {description}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            ref={confirmButtonRef}
            variant={buttonVariants[variant]}
            size="sm"
            isLoading={isLoading}
            onClick={async () => {
              await onConfirm();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
