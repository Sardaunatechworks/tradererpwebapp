'use client';

import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import QuickActionModal from './QuickActionModal';
import MobileDrawer from './MobileDrawer';
import FeedbackModal from '@/components/feedback/FeedbackModal';
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner';
import DemoEnvironmentBanner from '@/components/demo/DemoEnvironmentBanner';
import { ToastContainer } from '@/components/ui/Toast';

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
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-8 py-4 sm:py-6 pb-28 sm:pb-32 lg:pb-8 max-w-7xl w-full mx-auto">
          {/* Grant Evaluation Demo Banner (Only visible if NEXT_PUBLIC_DEMO_MODE=true) */}
          <DemoEnvironmentBanner />

          {/* Active Platform & Maintenance Announcements */}
          <AnnouncementBanner />
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />

        {/* Global Quick Action Modal (+) */}
        <QuickActionModal />

        {/* Global Feedback Modal */}
        <FeedbackModal />

        {/* Mobile "More" Drawer */}
        <MobileDrawer businessName={businessName} />

        {/* Global Toast Container */}
        <ToastContainer />
      </div>
    </div>
  );
}
