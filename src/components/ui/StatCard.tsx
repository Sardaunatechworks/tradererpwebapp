import React from 'react';
import { Card } from './Card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  subtitle?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trend,
  subtitle,
  icon,
  iconBg = 'bg-slate-100 text-slate-700',
  onClick,
}) => {
  return (
    <Card
      className={`relative overflow-hidden transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-xs' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="mt-1.5 text-lg sm:text-2xl font-black tracking-tight text-slate-900">{value}</p>
        </div>
        {icon && (
          <div className={`p-2 sm:p-2.5 rounded-lg shrink-0 ${iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      {(trend || subtitle) && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 font-medium ${
                trend.isPositive ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {trend.value}
            </span>
          )}
          {subtitle && <span className="text-slate-500">{subtitle}</span>}
        </div>
      )}
    </Card>
  );
};
