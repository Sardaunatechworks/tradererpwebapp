'use client';

import React from 'react';

interface LogoProps {
  iconSize?: string;
  showText?: boolean;
  textColorMode?: 'dark' | 'light' | 'adaptive';
  subtitle?: string;
  badge?: React.ReactNode;
  gap?: string;
}

export function LogoIcon({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} shrink-0 select-none`}
    >
      {/* Speed lines */}
      <rect x="12" y="42" width="28" height="6" rx="3" fill="#3562FF" />
      <rect x="24" y="57" width="16" height="6" rx="3" fill="#3562FF" />
      <circle cx="13" cy="60" r="3" fill="#3562FF" />
      <rect x="16" y="72" width="24" height="6" rx="3" fill="#3562FF" />
      
      {/* Main rounded box */}
      <rect x="36" y="25" width="70" height="70" rx="20" fill="#3562FF" />
      
      {/* Slanted T */}
      <g transform="translate(13, 15) skewX(-14)">
        {/* Top bar of T */}
        <rect x="52" y="26" width="34" height="9" rx="1.5" fill="#FFFFFF" />
        {/* Stem of T */}
        <rect x="64.5" y="34" width="10" height="30" rx="1" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

export default function Logo({
  iconSize = 'w-9 h-9',
  showText = true,
  textColorMode = 'adaptive',
  subtitle,
  badge,
  gap = 'gap-3',
}: LogoProps) {
  const getTraderColor = () => {
    if (textColorMode === 'light') return 'text-slate-900';
    if (textColorMode === 'dark') return 'text-white';
    return 'text-slate-900 dark:text-white';
  };

  const getErpColor = () => {
    if (textColorMode === 'light') return 'text-blue-600';
    if (textColorMode === 'dark') return 'text-blue-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  return (
    <div className={`flex items-center ${gap}`}>
      <LogoIcon className={iconSize} />
      
      {showText && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight ${getTraderColor()}`}>
              Trader<span className={getErpColor()}>ERP</span>
            </span>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mt-1">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
