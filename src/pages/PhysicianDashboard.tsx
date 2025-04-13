import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Users, Calendar, Clock, DollarSign, User2, 
  BarChart, MessageSquare, Activity, Heart,
  HelpCircle, Clipboard, Stethoscope, Menu, X,
  Search, CheckSquare, XSquare, ArrowLeft, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MessageLoading } from '../components/ui/message-loading';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  reason?: string;
  members: {
    id: string;
    full_name: string;
    email: string;
    profile_image_url?: string;
  };
}

interface Query {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
}

interface AppointmentRequest {
  id: string;
  member_id: string;
  start_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'declined';
  member_name: string;
  gender: string;
  age: number;
  reason: string;
}

export function PhysicianDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [physician, setPhysician] = useState<any>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [pendingQueries, setPendingQueries] = useState<Query[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appointmentRequests, setAppointmentRequests] = useState<AppointmentRequest[]>([]);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [genderStats, setGenderStats] = useState({ male: 45, female: 30, child: 25 });

  // Stats
  const [stats, setStats] = useState({
    totalAppointments: 24.4,
    totalPatients: 166.3,
    clinicConsulting: 53.5,
    videoConsulting: 28.0
  });

  useEffect(() => {
    fetchPhysicianData();
  }, []);

  useEffect(() => {
    if (physician) {
      fetchAppointments();
      fetchQueries();
      fetchStats();
      fetchAppointmentRequests();
    }
  }, [physician]);

  const fetchPhysicianData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: physicianData, error } = await supabase
        .from('physicians')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!physicianData) {
        navigate('/login');
        return;
      }

      setPhysician(physicianData);
    } catch (error) {
      console.error('Error fetching physician data:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Fetch today's appointments
      const { data: todayData, error: todayError } = await supabase
        .from('physician_appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          reason,
          members (
            id,
            full_name,
            email,
            profile_image_url
          )
        `)
        .eq('physician_id', physician.id)
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString())
        .order('start_time');

      if (todayError) throw todayError;
      setTodayAppointments(todayData || []);
      
      // Fetch upcoming appointments (next 7 days excluding today)
      const nextWeek = new Date(tomorrow);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('physician_appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          reason,
          members (
            id,
            full_name,
            email,
            profile_image_url
          )
        `)
        .eq('physician_id', physician.id)
        .gte('start_time', tomorrow.toISOString())
        .lt('start_time', nextWeek.toISOString())
        .order('start_time')
        .limit(5);

      if (upcomingError) throw upcomingError;
      setUpcomingAppointments(upcomingData || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchQueries = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_queries')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setPendingQueries(data || []);
    } catch (error) {
      console.error('Error fetching queries:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // In a real app, you would fetch real stats
      // For now, we're using the sample data from the mock-up
      setStats({
        totalAppointments: 24.4,
        totalPatients: 166.3,
        clinicConsulting: 53.5,
        videoConsulting: 28.0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAppointmentRequests = async () => {
    try {
      // Mock data for appointment requests based on the reference image
      const mockRequests: AppointmentRequest[] = [
        {
          id: '1',
          member_id: '101',
          start_time: '2023-04-12T09:30:00Z',
          status: 'scheduled',
          member_name: 'Bogdan Krivenchenko',
          gender: 'male',
          age: 45,
          reason: 'Annual check-up'
        },
        {
          id: '2',
          member_id: '102',
          start_time: '2023-04-25T10:30:00Z',
          status: 'scheduled',
          member_name: 'Jenny Wilson',
          gender: 'female',
          age: 25,
          reason: 'Follow-up appointment'
        },
        {
          id: '3',
          member_id: '103',
          start_time: '2023-04-15T14:30:00Z',
          status: 'scheduled',
          member_name: 'Dianne Russel',
          gender: 'male',
          age: 45,
          reason: 'Consultation'
        },
        {
          id: '4',
          member_id: '104',
          start_time: '2023-04-16T14:30:00Z',
          status: 'declined',
          member_name: 'Annette Black',
          gender: 'male',
          age: 45,
          reason: 'Initial consultation'
        },
        {
          id: '5',
          member_id: '105',
          start_time: '2023-04-17T14:30:00Z',
          status: 'scheduled',
          member_name: 'Angelina Jully',
          gender: 'male',
          age: 45,
          reason: 'Follow-up'
        },
        {
          id: '6',
          member_id: '106',
          start_time: '2023-04-18T14:30:00Z',
          status: 'scheduled',
          member_name: 'Esther Howard',
          gender: 'male',
          age: 45,
          reason: 'Consultation'
        },
        {
          id: '7',
          member_id: '107',
          start_time: '2023-04-19T14:30:00Z',
          status: 'scheduled',
          member_name: 'Robert Fox',
          gender: 'male',
          age: 45,
          reason: 'Check-up'
        }
      ];
      
      setAppointmentRequests(mockRequests);
    } catch (error) {
      console.error('Error fetching appointment requests:', error);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleApproveRequest = (id: string) => {
    console.log('Approve request:', id);
    // In a real app, you would update the status in the database
  };

  const handleDeclineRequest = (id: string) => {
    console.log('Decline request:', id);
    // In a real app, you would update the status in the database
  };

  const getDayOfWeek = (day: number) => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return days[day];
  };

  // Generate an array of dates for the current week
  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };
  
  if (loading) {
    return <MessageLoading />;
  }

  const weekDates = getWeekDates();

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 p-4 z-20">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-gray-500 hover:text-gray-900 focus:outline-none"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Sidebar navigation - mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-10 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <Heart className="h-8 w-8 text-pink-500 fill-pink-500" />
                <span className="ml-2 text-2xl font-bold">GeekCare</span>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                <button
                  onClick={() => handleNavigation('/physician/dashboard')}
                  className="group flex items-center px-2 py-2 text-base font-medium rounded-md bg-gray-100 text-gray-900"
                >
                  <BarChart className="mr-4 h-6 w-6 text-gray-500" />
                  Overview
                </button>
                <button
                  onClick={() => handleNavigation('/physician/appointments')}
                  className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <Calendar className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                  Appointment
                </button>
                <button
                  onClick={() => handleNavigation('/physician/patients')}
                  className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <Users className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                  My Patients
                </button>
                <button
                  onClick={() => handleNavigation('/physician/schedule')}
                  className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <Clock className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                  Schedule Timings
                </button>
                
                <button
                  onClick={() => handleNavigation('/physician/inbox')}
                  className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <MessageSquare className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                  Message
                </button>
                <button
                  onClick={() => handleNavigation('/physician/blog')}
                  className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <Clipboard className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                  Blog
                </button>
                <button
                  onClick={() => handleNavigation('/physician/settings')}
                  className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <Activity className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                  Settings
                </button>
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                {physician?.profile_image_url ? (
                  <img
                    className="h-10 w-10 rounded-full object-cover"
                    src={physician.profile_image_url}
                    alt={physician.full_name}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <User2 className="h-5 w-5 text-gray-500" />
                  </div>
                )}
                <div className="ml-3">
                  <p className="text-base font-medium text-gray-700">
                    Dr. {physician?.full_name}
                  </p>
                  <p className="text-sm font-medium text-gray-500">
                    {physician?.physician_specialties?.[0]?.specialty || 'Physician'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-14"></div>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="bg-white shadow-sm py-4 px-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="hidden lg:block">
                <h1 className="text-2xl font-semibold text-gray-900">Doct.</h1>
              </div>
              <div className="ml-8 relative w-64 hidden lg:block">
                <input
                  type="text"
                  placeholder="Search Appointment, Patient or etc"
                  className="w-full px-4 py-2 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="hidden lg:block text-gray-500 hover:text-gray-700">
                <HelpCircle className="h-6 w-6" />
              </button>
              <button className="hidden lg:block text-gray-500 hover:text-gray-700">
                <MessageSquare className="h-6 w-6" />
              </button>
              <div className="hidden lg:flex items-center">
                <div className="mr-2 text-right">
                  <p className="text-sm font-medium">{physician?.full_name}</p>
                  <p className="text-xs text-gray-500">{physician?.physician_specialties?.[0]?.specialty || 'Cardiologist'}</p>
                </div>
                {physician?.profile_image_url ? (
                  <img
                    className="h-8 w-8 rounded-full object-cover"
                    src={physician.profile_image_url}
                    alt={physician.full_name}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <User2 className="h-4 w-4 text-gray-500" />
                  </div>
                )}
                <button className="ml-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">Welcome, Dr. {physician?.full_name?.split(' ')[0] || 'Stephen'}</h1>
            <p className="text-gray-600">Have a nice day at great work</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-purple-500 rounded-lg p-6 flex items-center text-white">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg mr-4">
                <Calendar className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{stats.totalAppointments}k</h2>
                <p className="text-sm opacity-80">Appointments</p>
              </div>
            </div>
            <div className="bg-pink-500 rounded-lg p-6 flex items-center text-white">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg mr-4">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{stats.totalPatients}k</h2>
                <p className="text-sm opacity-80">Total Patient</p>
              </div>
            </div>
            <div className="bg-yellow-500 rounded-lg p-6 flex items-center text-white">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg mr-4">
                <Stethoscope className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{stats.clinicConsulting}k</h2>
                <p className="text-sm opacity-80">Clinic Consulting</p>
              </div>
            </div>
            <div className="bg-blue-500 rounded-lg p-6 flex items-center text-white">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg mr-4">
                <Video className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{stats.videoConsulting}k</h2>
                <p className="text-sm opacity-80">Video Consulting</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Appointment Requests Section */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Appointment Request</h2>
                <a href="#" className="text-blue-500 text-sm">View All</a>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="divide-y divide-gray-200">
                    {appointmentRequests.slice(0, 5).map((request) => (
                      <tr key={request.id}>
                        <td className="py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 mr-3">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User2 className="h-6 w-6 text-gray-400" />
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{request.member_name}</p>
                              <p className="text-xs text-gray-500">
                                {request.gender === 'male' ? 'Male' : 'Female'}, {request.age} {format(new Date(request.start_time), 'h:mm a')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          {request.status === 'scheduled' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Confirmed
                            </span>
                          ) : request.status === 'declined' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Declined
                            </span>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApproveRequest(request.id)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                              >
                                <CheckSquare className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDeclineRequest(request.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <XSquare className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stats/Calendar Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Gender</h2>
                <div className="relative">
                  <select className="appearance-none bg-transparent pr-8 py-1 pl-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>2020</option>
                    <option>2021</option>
                    <option>2022</option>
                    <option>2023</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Gender donut chart */}
              <div className="relative h-48 mb-4">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F59E0B" strokeWidth="20" strokeDasharray={`${genderStats.male} ${100-genderStats.male}`} transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3B82F6" strokeWidth="20" strokeDasharray={`${genderStats.female} ${100-genderStats.female}`} strokeDashoffset={`${-genderStats.male}`} transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10B981" strokeWidth="20" strokeDasharray={`${genderStats.child} ${100-genderStats.child}`} strokeDashoffset={`${-(genderStats.male + genderStats.female)}`} transform="rotate(-90 50 50)" />
                  </svg>
                </div>
              </div>
              
              {/* Gender legend */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></div>
                  <span className="text-sm text-gray-600">Male</span>
                  <span className="ml-auto text-sm font-medium">{genderStats.male}%</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-blue-500 mr-2"></div>
                  <span className="text-sm text-gray-600">Female</span>
                  <span className="ml-auto text-sm font-medium">{genderStats.female}%</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm text-gray-600">Child</span>
                  <span className="ml-auto text-sm font-medium">{genderStats.child}%</span>
                </div>
              </div>
              
              {/* Mini-calendar */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium text-gray-700">03 - 09 May, 2021</h3>
                  <div className="flex space-x-1">
                    <button 
                      onClick={handlePreviousWeek}
                      className="p-1 rounded hover:bg-gray-100 text-gray-500"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={handleNextWeek}
                      className="p-1 rounded hover:bg-gray-100 text-gray-500"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center">
                  {weekDates.map((date, index) => (
                    <div key={index}>
                      <div className="text-xs text-gray-500 mb-1">{getDayOfWeek(date.getDay())}</div>
                      <div className={`py-1 rounded-full text-sm ${
                        new Date().toDateString() === date.toDateString() 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-700'
                      }`}>
                        {date.getDate()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Next week button */}
              <div className="mt-6 bg-gray-900 text-white rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Next Week</h3>
                  <p className="text-xs text-gray-400">Upcoming Scdules-2</p>
                </div>
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded text-sm">Open</button>
              </div>
            </div>
          </div>
          
          {/* Today's Appointments */}
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Today Appointments</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {todayAppointments.length > 0 ? (
                todayAppointments.slice(0, 4).map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                      <div className="h-10 w-10 mr-3 bg-gray-200 rounded-full flex items-center justify-center">
                        <User2 className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-medium">{appointment.members?.full_name || 'John Smith'}</h3>
                        <p className="text-xs text-gray-500">Clinic Consulting</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(appointment.start_time), 'h:mm a')}
                      </p>
                      <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        appointment.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-800'
                          : appointment.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.status === 'scheduled' ? 'Upcoming' : appointment.status}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-4 text-center py-6 text-gray-500">
                  No appointments scheduled for today
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const Video = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="6" width="16" height="12" rx="2" ry="2" />
    <path d="M22 8.5l-4 2.5v-5l4 2.5z" />
  </svg>
); 