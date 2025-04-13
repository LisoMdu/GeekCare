import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface PageWithSidebarProps {
  children: ReactNode;
  name: string;
  title?: string;
  profileImage?: string;
  role: 'member' | 'physician';
}

export function PageWithSidebar({ 
  children, 
  name, 
  title,
  profileImage,
  role
}: PageWithSidebarProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        name={name}
        title={title}
        profileImage={profileImage}
        role={role}
      />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
} 