import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Users, Calendar, Clock, DollarSign, User2, 
  BarChart, MessageSquare, Heart,
  HelpCircle, Search, CheckSquare, XSquare, 
  ArrowLeft, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MessageLoading } from '../components/ui/message-loading';
import { Sidebar } from '../components/Sidebar';

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
  } | any;
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

export function DoctorDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [physician, setPhysician] = useState<any>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
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
      // Type cast to ensure compatibility
      setTodayAppointments((todayData || []) as Appointment[]);
    } catch (error) {
      console.error('Error fetching appointments:', error);
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

  // Custom icon components
  const Stethoscope = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.9 19A5 5 0 0 0 9 17h6a5 5 0 0 0 4.1 2"/>
      <path d="M9 17V9"/>
      <path d="M15 17V9"/>
      <path d="M5 9a3 3 0 0 1 4-3 3 3 0 0 1 6 0 3 3 0 0 1 4 3v2.5"/>
      <path d="M19 7a1 1 0 0 1 2 0v7a1 1 0 0 1-2 0z"/>
    </svg>
  );

  const Video = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="16" height="12" rx="2" ry="2" />
      <path d="M22 8.5l-4 2.5v-5l4 2.5z" />
    </svg>
  );

  return (
    <div className="flex-1 bg-gray-50">
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

          {/* Gender Stats Section */}
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
            {[
              { name: 'Jhon Smith', type: 'Clinic Consulting', time: '10:25', status: 'ongoing' },
              { name: 'Frank Murray', type: 'Video Consulting', time: '11:30', status: 'upcoming' },
              { name: 'Ella Lucia', type: 'Emergency', time: '12:20', status: 'upcoming' },
              { name: 'Alyssa Dehn', type: 'Clinic Consulting', time: '13:15', status: 'upcoming' }
            ].map((appointment, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="h-10 w-10 mr-3 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    <img 
                      src={`https://randomuser.me/api/portraits/${index % 2 === 0 ? 'men' : 'women'}/${20 + index}.jpg`} 
                      alt={appointment.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium">{appointment.name}</h3>
                    <p className="text-xs text-gray-500">{appointment.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {appointment.time}
                  </p>
                  <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    appointment.status === 'ongoing'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
} 