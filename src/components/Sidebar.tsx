import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  CreditCard,
  Inbox,
  UserCircle,
  LogOut,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  name: string;
  title?: string;
  profileImage?: string;
}

export function Sidebar({ name, title, profileImage }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/physician/dashboard' },
    { icon: Calendar, label: 'Appointments', path: '/physician/appointments' },
    { icon: Clock, label: 'My Schedule', path: '/physician/schedule' },
    { icon: CreditCard, label: 'Payments', path: '/physician/payments' },
    { icon: Inbox, label: 'Inbox', path: '/physician/inbox' },
    { icon: UserCircle, label: 'Profile', path: '/physician/profile' },
    { icon: HelpCircle, label: 'Support', path: '/physician/support' },
  ];

  return (
    <div className="w-64 bg-white shadow-lg h-screen flex flex-col">
      <div className="p-6 text-center">
        <div className="mb-4">
          {profileImage ? (
            <img
              src={profileImage}
              alt={name}
              className="w-32 h-32 rounded-full mx-auto object-cover"
            />
          ) : (
            <div className="w-32 h-32 rounded-full mx-auto bg-gray-200 flex items-center justify-center">
              <UserCircle className="w-16 h-16 text-gray-400" />
            </div>
          )}
        </div>
        <h2 className="text-xl font-semibold">{name}</h2>
        {title && <p className="text-gray-600">{title}</p>}
      </div>

      <nav className="flex-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-6 py-3 text-gray-700 hover:bg-pink-50 hover:text-pink-500 ${
              isActive(item.path)
                ? 'bg-pink-50 text-pink-500 border-l-4 border-pink-500'
                : ''
            }`}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center px-6 py-3 text-gray-700 hover:bg-pink-50 hover:text-pink-500"
      >
        <LogOut className="w-5 h-5 mr-3" />
        Logout
      </button>
    </div>
  );
}