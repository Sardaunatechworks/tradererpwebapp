'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  placeholder?: string;
  className?: string;
  variant?: 'light' | 'dark';
}

export default function PasswordInput({
  name,
  placeholder = '••••••••',
  className = '',
  variant = 'light',
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const isDark = variant === 'dark';

  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        className={`block w-full rounded-lg px-3.5 py-2.5 pr-11 text-sm outline-none transition-all font-medium ${
          isDark
            ? 'border border-slate-800 bg-slate-900 text-white placeholder-slate-600 focus:border-blue-500'
            : 'border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 shadow-2xs'
        } ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
