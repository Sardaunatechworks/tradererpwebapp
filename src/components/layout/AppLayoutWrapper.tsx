'use client';

import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import QuickActionModal from './QuickActionModal';
import MobileDrawer from './MobileDrawer';

interface AppLayoutWrapperProps {
  businessName?: string;
  children: React.ReactNode;
}

export default function AppLayoutWrapper({
  businessName = '',
  children,
}: AppLayoutWrapperProps) {
  return (
    <div className="flex h-screen h-dvh bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Desktop Persistent Left Sidebar */}
      <div className="hidden lg:flex shrink-0 h-full">
        <Sidebar businessName={businessName} />
      </div>

      {/* Main App Content Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
        {/* Top Header */}
        <Header businessName={businessName} />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />

        {/* Global Quick Action Modal (+) */}
        <QuickActionModal />

        {/* Mobile "More" Drawer */}
        <MobileDrawer businessName={businessName} />
      </div>
    </div>
  );
}
