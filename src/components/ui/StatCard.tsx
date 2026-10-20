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
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
            {title}
          </p>
          <p
            className="mt-1 text-sm xs:text-base sm:text-xl lg:text-2xl font-black tracking-tight text-slate-900 truncate"
            title={typeof value === 'string' ? value : undefined}
          >
            {value}
          </p>
        </div>
        {icon && (
          <div className={`p-1.5 sm:p-2.5 rounded-lg shrink-0 ${iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      {(trend || subtitle) && (
        <div className="mt-2.5 sm:mt-3 flex items-center gap-1.5 text-[10px] sm:text-xs min-w-0">
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 font-medium shrink-0 ${
                trend.isPositive ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              ) : (
                <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              )}
              {trend.value}
            </span>
          )}
          {subtitle && <span className="text-slate-400 truncate">{subtitle}</span>}
        </div>
      )}
    </Card>
  );
};
