'use client';

import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  KeyRound,
  LifeBuoy,
  Megaphone,
  BarChart3,
  Activity,
  History,
  Mail,
  FileText,
  Settings,
  Terminal,
  CreditCard
} from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export default function PlatformSidebar({ activeTab, setActiveTab }: Props) {
  const sections: SidebarSection[] = [
    {
      title: 'Management',
      items: [
        { id: 'businesses', label: 'Businesses', icon: Building2 },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'permissions', label: 'Roles & Permissions', icon: KeyRound },
      ],
    },
    {
      title: 'Operations',
      items: [
        { id: 'support', label: 'Support Center', icon: LifeBuoy },
        { id: 'announcements', label: 'Announcements', icon: Megaphone },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
        { id: 'monitoring', label: 'System Monitoring', icon: Activity },
        { id: 'audit', label: 'Audit Logs', icon: History },
      ],
    },
    {
      title: 'Platform',
      items: [
        { id: 'email', label: 'Email Management', icon: Mail },
        { id: 'content', label: 'Content Management', icon: FileText },
        { id: 'settings', label: 'Platform Settings', icon: Settings },
        { id: 'developer', label: 'Developer Tools', icon: Terminal },
      ],
    },
    {
      title: 'Future',
      items: [
        { id: 'billing', label: 'Subscription & Billing', icon: CreditCard },
      ],
    },
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0 bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-6 select-none h-fit">
      
      {/* Mobile Tab Selector */}
      <div className="block lg:hidden w-full">
        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Active Admin Module</label>
        <div className="relative">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 pr-10 text-xs font-bold outline-none focus:border-blue-500 transition-all cursor-pointer appearance-none"
          >
            <option value="dashboard">Dashboard Overview</option>
            {sections.map((sec) => (
              <optgroup key={sec.title} label={sec.title} className="bg-slate-900 text-slate-300 font-semibold">
                {sec.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* Desktop Sub-Navigation Buttons (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col gap-6">
        {/* Dashboard Overview Link */}
        <div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard Overview
          </button>
        </div>

        {/* Categories */}
        {sections.map((sec) => (
          <div key={sec.title} className="space-y-1.5">
            <span className="px-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
              {sec.title}
            </span>
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-850 border border-slate-700 text-blue-400'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/30 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-500' : 'text-slate-500'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
    </aside>
  );
}
