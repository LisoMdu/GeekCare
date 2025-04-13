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
      console.log('Fetching member data...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User data:', user ? 'User found' : 'No user found');
      
      if (!user) {
        console.log('No authenticated user found, redirecting to login');
        navigate('/login');
        return;
      }

      const { data: memberData, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results

      console.log('Member data fetch result:', memberData ? 'Data found' : 'No data found', error ? `Error: ${error.message}` : 'No error');
      
      if (error) throw error;
      
      if (!memberData) {
        // If no member data found, redirect to login
        console.log('No member profile found, redirecting to login');
        navigate('/login');
        return;
      }

      setMember(memberData);
      console.log('Member data set successfully');
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
    <div className="flex-1">
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
            onClick={() => handleNavigation('/faqs')}
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
  );
}