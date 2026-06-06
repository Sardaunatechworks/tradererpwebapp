'use client';

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useUIStore } from '@/stores/uiStore';
import { Menu, X } from 'lucide-react';

export default function AppLayoutWrapper({
  businessName,
  children,
}: {
  businessName: string;
  children: React.ReactNode;
}) {
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useUIStore();

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar - Desktop static, Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out lg:flex shrink-0 h-screen h-dvh`}
      >
        <Sidebar />
        
        {/* Mobile close button inside the drawer top-right if drawer is open */}
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-[-48px] p-2 rounded-lg bg-slate-950 text-slate-400 hover:text-white border border-slate-800 lg:hidden shadow-lg"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Overlay for mobile when sidebar drawer is open */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="bg-slate-950 border-b border-slate-900/40 px-4 lg:px-8 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-[9px] uppercase font-black tracking-wider text-slate-500 hidden sm:inline">
              Workspace Context
            </span>
          </div>

          {businessName && (
            <div className="flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 px-3.5 py-1.5 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-white tracking-tight uppercase">
                {businessName}
              </span>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
