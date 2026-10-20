import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  action,
  children,
}) => {
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 truncate">{title}</h1>
          {description && (
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">{description}</p>
          )}
        </div>
        {action && <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">{action}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};
