import React, { ReactNode, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Bell, User2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageWithSidebar } from './PageWithSidebar';
import { MessageLoading } from './ui/message-loading';

interface BaseLayoutProps {
  children: ReactNode;
}

export function BaseLayout({ children }: BaseLayoutProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isPhysician, setIsPhysician] = useState(false);
  
  useEffect(() => {
    fetchUserData();
  }, []);
  
  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }
      
      // Check if user is a physician
      const { data: physicianData } = await supabase
        .from('physicians')
        .select('*, physician_specialties(specialty)')
        .eq('id', user.id)
        .maybeSingle();
      
      if (physicianData) {
        setIsPhysician(true);
        setUser(physicianData);
      } else {
        // Check if user is a member
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
          
        if (memberError) throw memberError;
        if (!memberData) {
          navigate('/login');
          return;
        }
        
        setUser(memberData);
      }
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <MessageLoading />;
  }
  
  return (
    <PageWithSidebar
      name={user?.full_name || (isPhysician ? 'Doctor' : 'User')}
      title={isPhysician ? user?.physician_specialties?.[0]?.specialty : undefined}
      profileImage={user?.profile_image_url}
      role={isPhysician ? 'physician' : 'member'}
    >
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Link to={isPhysician ? "/physician/dashboard" : "/home"}>
                  <Heart className="h-8 w-8 text-pink-500 fill-pink-500" />
                  <span className="ml-2 text-2xl font-bold">GeekCare</span>
                </Link>
              </div>
              <div className="flex items-center space-x-6">
                <button className="text-gray-600 hover:text-gray-900">
                  <Bell className="h-6 w-6" />
                </button>
                <Link 
                  to={isPhysician ? "/physician/profile" : "/profile"}
                  className="flex items-center space-x-2"
                >
                  {user?.profile_image_url ? (
                    <img
                      src={user.profile_image_url}
                      alt={user.full_name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User2 className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <span className="text-gray-700">Hi, {user?.full_name?.split(' ')[0]}</span>
                </Link>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </PageWithSidebar>
  );
} 