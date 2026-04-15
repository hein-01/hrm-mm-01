import React from 'react';
import Sidebar from '../components/Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab }) => {
  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0F172A] font-inter">
      <Sidebar activeTab={activeTab} />
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden ml-[280px]">
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#F8FAFC] dark:bg-[#0F172A]">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
