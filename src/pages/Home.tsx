import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Heart, Calendar, Clock, DollarSign, User2, FileText, 
  Search, MapPin, Stethoscope, MessageSquare, CreditCard,
  Inbox, UserCircle, LogOut, LayoutDashboard, Bell, HelpCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MessageLoading } from '../components/ui/message-loading';

type TabType = 'today' | 'upcoming' | 'past';

export function Home() {
  const navigate = useNavigate();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [searchParams, setSearchParams] = useState({
    specialty: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);

  useEffect(() => {
    fetchMemberData();
    fetchUpcomingAppointments();
  }, []);

  const fetchMemberData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: memberData, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results

      if (error) throw error;
      
      if (!memberData) {
        // If no member data found, redirect to login
        navigate('/login');
        return;
      }

      setMember(memberData);
    } catch (error) {
      console.error('Error fetching member data:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: appointments, error } = await supabase
        .from('physician_appointments')
        .select(`
          id,
          start_time,
          status,
          physicians (
            id,
            full_name,
            profile_image_url,
            physician_specialties (specialty)
          )
        `)
        .eq('member_id', user.id)
        .eq('status', 'scheduled')
        .gte('start_time', new Date().toISOString())
        .order('start_time')
        .limit(3);

      if (error) throw error;
      setUpcomingAppointments(appointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const handleSearch = () => {
    setNavigating(true);
    const queryParams = new URLSearchParams({
      specialty: searchParams.specialty,
      date: searchParams.date,
    });
    setTimeout(() => {
      navigate(`/search-results?${queryParams.toString()}`);
    }, 300);
  };

  const handleNavigation = (path: string) => {
    setNavigating(true);
    setTimeout(() => {
      navigate(path);
    }, 300);
  };

  const handleLogout = async () => {
    try {
      setNavigating(true);
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate('/login');
      }, 300);
    } catch (error) {
      console.error('Error signing out:', error);
      setNavigating(false);
    }
  };

  if (loading) {
    return <MessageLoading />;
  }

  if (navigating) {
    return <MessageLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg h-screen flex flex-col">
        <div className="p-6 text-center">
          <div className="mb-4">
            {member?.profile_image_url ? (
              <img
                src={member.profile_image_url}
                alt={member.full_name}
                className="w-32 h-32 rounded-full mx-auto object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-full mx-auto bg-gray-200 flex items-center justify-center">
                <UserCircle className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
          <h2 className="text-xl font-semibold">{member?.full_name || 'User'}</h2>
          <p className="text-gray-600">Location not set</p>
        </div>

        <nav className="flex-1">
          <button
            onClick={() => handleNavigation('/home')}
            className="flex items-center px-6 py-3 w-full text-gray-700 hover:bg-pink-50 hover:text-pink-500 bg-pink-50 text-pink-500 border-l-4 border-pink-500"
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </button>
          
          <button
            onClick={() => handleNavigation('/appointments')}
            className="flex items-center px-6 py-3 w-full text-gray-700 hover:bg-pink-50 hover:text-pink-500"
          >
            <Calendar className="w-5 h-5 mr-3" />
            Appointments
          </button>
          
          <button
            onClick={() => handleNavigation('/queries')}
            className="flex items-center px-6 py-3 w-full text-gray-700 hover:bg-pink-50 hover:text-pink-500"
          >
            <MessageSquare className="w-5 h-5 mr-3" />
            Ask your Queries
          </button>
          
          <button
            onClick={() => handleNavigation('/payments')}
            className="flex items-center px-6 py-3 w-full text-gray-700 hover:bg-pink-50 hover:text-pink-500"
          >
            <CreditCard className="w-5 h-5 mr-3" />
            Payments
          </button>
          
          <button
            onClick={() => handleNavigation('/inbox')}
            className="flex items-center px-6 py-3 w-full text-gray-700 hover:bg-pink-50 hover:text-pink-500"
          >
            <Inbox className="w-5 h-5 mr-3" />
            Inbox
          </button>
          
          <button
            onClick={() => handleNavigation('/profile')}
            className="flex items-center px-6 py-3 w-full text-gray-700 hover:bg-pink-50 hover:text-pink-500"
          >
            <UserCircle className="w-5 h-5 mr-3" />
            Profile
          </button>
          
          <button
            onClick={() => handleNavigation('/support')}
            className="flex items-center px-6 py-3 w-full text-gray-700 hover:bg-pink-50 hover:text-pink-500"
          >
            <HelpCircle className="w-5 h-5 mr-3" />
            Support
          </button>
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center px-6 py-3 text-gray-700 hover:bg-pink-50 hover:text-pink-500"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Heart className="h-8 w-8 text-pink-500 fill-pink-500" />
                <span className="ml-2 text-2xl font-bold">GeekCare</span>
              </div>
              <div className="flex items-center space-x-6">
                <button className="text-gray-600 hover:text-gray-900">
                  <Bell className="h-6 w-6" />
                </button>
                <button 
                  onClick={() => handleNavigation('/profile')}
                  className="flex items-center space-x-2"
                >
                  {member?.profile_image_url ? (
                    <img
                      src={member.profile_image_url}
                      alt={member.full_name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User2 className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <span className="text-gray-700">Hi, {member?.full_name?.split(' ')[0]}</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <button
              onClick={() => handleNavigation('/search-results')}
              className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                <Stethoscope className="w-6 h-6 text-pink-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Find Doctor</h3>
              <p className="text-sm text-gray-500 mt-1">Search by specialty or name</p>
            </button>

            <button
              onClick={() => handleNavigation('/appointments')}
              className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">My Appointments</h3>
              <p className="text-sm text-gray-500 mt-1">View and manage bookings</p>
            </button>

            <button
              onClick={() => handleNavigation('/queries')}
              className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Ask Query</h3>
              <p className="text-sm text-gray-500 mt-1">Get expert medical advice</p>
            </button>

            <button
              onClick={() => handleNavigation('/medical-records')}
              className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Medical Records</h3>
              <p className="text-sm text-gray-500 mt-1">Access your health data</p>
            </button>
          </div>

          {/* Search Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-6">Find a Doctor</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialty
                </label>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={searchParams.specialty}
                    onChange={(e) => setSearchParams({ ...searchParams, specialty: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="">All Specialties</option>
                    {MEDICAL_SPECIALTIES.map((specialty) => (
                      <option key={specialty} value={specialty}>
                        {specialty}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={searchParams.date}
                    onChange={(e) => setSearchParams({ ...searchParams, date: e.target.value })}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Search Doctors
                </button>
              </div>
            </div>
          </div>

          {/* Upcoming Appointments */}
          {upcomingAppointments.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Upcoming Appointments</h2>
                <button
                  onClick={() => handleNavigation('/appointments')}
                  className="text-pink-500 hover:text-pink-600 text-sm font-medium"
                >
                  View All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      {appointment.physicians.profile_image_url ? (
                        <img
                          src={appointment.physicians.profile_image_url}
                          alt={appointment.physicians.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <User2 className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          Dr. {appointment.physicians.full_name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {appointment.physicians.physician_specialties?.[0]?.specialty}
                        </p>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          {format(new Date(appointment.start_time), 'MMM d, yyyy')}
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {format(new Date(appointment.start_time), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// List of medical specialties
const MEDICAL_SPECIALTIES = [
  'Allergy and Immunology',
  'Anesthesiology',
  'Cardiology',
  'Dermatology',
  'Emergency Medicine',
  'Endocrinology',
  'Family Medicine',
  'Gastroenterology',
  'General Surgery',
  'Geriatric Medicine',
  'Gynecology',
  'Hematology',
  'Infectious Disease',
  'Internal Medicine',
  'Medical Genetics',
  'Nephrology',
  'Neurology',
  'Neurosurgery',
  'Obstetrics and Gynecology',
  'Oncology',
  'Ophthalmology',
  'Orthopedic Surgery',
  'Otolaryngology',
  'Pathology',
  'Pediatrics',
  'Physical Medicine',
  'Plastic Surgery',
  'Psychiatry',
  'Pulmonology',
  'Radiation Oncology',
  'Radiology',
  'Rheumatology',
  'Sports Medicine',
  'Thoracic Surgery',
  'Urology',
  'Vascular Surgery'
];