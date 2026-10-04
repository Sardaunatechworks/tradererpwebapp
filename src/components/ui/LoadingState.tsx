import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
}) => {
  const sizes = {
    sm: 'p-6',
    md: 'p-12',
    lg: 'p-20',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${sizes[size]} text-center`}>
      <Loader2 className="w-8 h-8 animate-spin text-slate-800 mb-3" />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
};
