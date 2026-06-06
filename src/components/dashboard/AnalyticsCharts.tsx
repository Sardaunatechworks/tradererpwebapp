'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface ChartsProps {
  dailyMetrics: any[];
  branchPerfData: any[];
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsCharts({ dailyMetrics, branchPerfData }: ChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Revenue Trend Chart */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white leading-none">Revenue Trend</h3>
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Daily cached performance</span>
        </div>
        <div className="h-64 w-full">
          {dailyMetrics.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No daily revenue data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                  labelClassName="text-slate-400 font-semibold"
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Branch Performance Comparison */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white leading-none">Branch Performance</h3>
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Revenue by location</span>
        </div>
        <div className="h-64 w-full">
          {branchPerfData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No branch performance data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchPerfData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                  labelClassName="text-slate-400 font-semibold"
                />
                <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} name="Revenue">
                  {branchPerfData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
}
