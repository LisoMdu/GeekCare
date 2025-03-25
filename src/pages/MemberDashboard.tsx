import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Heart, Calendar, Clock, DollarSign, User2, FileText, 
  Search, MapPin, Stethoscope, LayoutDashboard, MessageSquare,
  CreditCard, Inbox, UserCircle, LogOut, Pencil, X, Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  mobile_number: string;
  countryCode: string;
  residence: string;
  date_of_birth: string;
}

// Country codes data
const countryCodes = [
  { code: '+1', country: 'USA/Canada' },
  { code: '+44', country: 'UK' },
  { code: '+91', country: 'India' },
  { code: '+61', country: 'Australia' },
  { code: '+86', country: 'China' },
  { code: '+81', country: 'Japan' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+39', country: 'Italy' },
  { code: '+34', country: 'Spain' },
  { code: '+7', country: 'Russia' },
  { code: '+55', country: 'Brazil' },
  { code: '+52', country: 'Mexico' },
  { code: '+65', country: 'Singapore' },
  { code: '+971', country: 'UAE' },
];

// Countries data
const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria',
  'Bangladesh', 'Belgium', 'Brazil', 'Canada', 'China', 'Denmark', 'Egypt',
  'Finland', 'France', 'Germany', 'Greece', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Japan', 'Malaysia', 'Mexico', 'Netherlands',
  'New Zealand', 'Norway', 'Pakistan', 'Philippines', 'Poland', 'Portugal',
  'Russia', 'Saudi Arabia', 'Singapore', 'South Africa', 'South Korea', 'Spain',
  'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'UAE', 'UK', 'USA', 'Vietnam'
];

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/member/dashboard' },
  { icon: Calendar, label: 'Appointments', path: '/member/appointments' },
  { icon: MessageSquare, label: 'Ask your Queries', path: '/member/queries' },
  { icon: CreditCard, label: 'Payments', path: '/member/payments' },
  { icon: Inbox, label: 'Inbox', path: '/member/inbox' },
  { icon: UserCircle, label: 'Profile', path: '/member/profile' },
];

export function MemberDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<MemberFormData>({
    firstName: '',
    lastName: '',
    email: '',
    mobile_number: '',
    countryCode: '+91',
    residence: '',
    date_of_birth: '',
  });
  const [error, setError] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useState({
    specialty: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    fetchMemberData();
    fetchSpecialties();
  }, []);

  useEffect(() => {
    if (member) {
      const [firstName, ...lastNameParts] = member.full_name?.split(' ') || ['', ''];
      // Extract country code and number from mobile_number if it exists
      let countryCode = '+91';
      let number = member.mobile_number || '';
      
      if (member.mobile_number) {
        const match = member.mobile_number.match(/^(\+\d+)(.*)$/);
        if (match) {
          [, countryCode, number] = match;
        }
      }

      setFormData({
        firstName: firstName || '',
        lastName: lastNameParts.join(' ') || '',
        email: member.email || '',
        mobile_number: number.trim(),
        countryCode,
        residence: member.residence || '',
        date_of_birth: member.date_of_birth || '',
      });
    }
  }, [member]);

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
        .single();

      if (error) throw error;
      setMember(memberData);
    } catch (error) {
      console.error('Error fetching member data:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecialties = async () => {
    try {
      const { data, error } = await supabase
        .from('physician_specialties')
        .select('specialty')
        .order('specialty');

      if (error) throw error;

      const uniqueSpecialties = Array.from(new Set(data.map(s => s.specialty)));
      setSpecialties(uniqueSpecialties);
    } catch (error) {
      console.error('Error fetching specialties:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setError('');
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const fullMobileNumber = formData.mobile_number ? `${formData.countryCode}${formData.mobile_number}` : '';
      
      const { error: updateError } = await supabase
        .from('members')
        .update({
          full_name: fullName,
          mobile_number: fullMobileNumber,
          residence: formData.residence,
          date_of_birth: formData.date_of_birth || null,
        })
        .eq('id', member.id);

      if (updateError) throw updateError;

      await fetchMemberData();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-pink-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-pink-500 fill-pink-500" />
              <span className="ml-2 text-2xl font-bold">GeekCare</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Hi {member?.full_name}</span>
              <button 
                onClick={() => navigate('/member-profile')}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
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
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white min-h-[calc(100vh-4rem)] p-6">
          <div className="text-center mb-8">
            {member?.profile_image_url ? (
              <img
                src={member.profile_image_url}
                alt={member.full_name}
                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gray-200 flex items-center justify-center">
                <User2 className="w-12 h-12 text-gray-400" />
              </div>
            )}
            <h2 className="text-xl font-semibold">{member?.full_name}</h2>
            <div className="flex items-center justify-center text-sm text-gray-500 mt-2">
              <MapPin className="w-4 h-4 mr-1" />
              {member?.residence || 'Select Country'}
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-4 py-2 text-left rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-pink-100 text-pink-500'
                    : 'text-gray-700 hover:bg-pink-50'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-left text-gray-700 hover:bg-pink-50 rounded-lg"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h1 className="text-2xl font-semibold mb-6">
                Welcome {member?.full_name}! Tell us about yourself
              </h1>

              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <User2 className="w-6 h-6 text-gray-400 mr-2" />
                      <h2 className="text-lg font-medium">Personal Information</h2>
                    </div>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleSave}
                          className="p-2 text-green-500 hover:bg-green-50 rounded-lg"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            const [firstName, ...lastNameParts] = member.full_name?.split(' ') || ['', ''];
                            let countryCode = '+91';
                            let number = member.mobile_number || '';
                            
                            if (member.mobile_number) {
                              const match = member.mobile_number.match(/^(\+\d+)(.*)$/);
                              if (match) {
                                [, countryCode, number] = match;
                              }
                            }

                            setFormData({
                              firstName: firstName || '',
                              lastName: lastNameParts.join(' ') || '',
                              email: member.email || '',
                              mobile_number: number.trim(),
                              countryCode,
                              residence: member.residence || '',
                              date_of_birth: member.date_of_birth || '',
                            });
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                        placeholder="Enter last name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        placeholder="Enter email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Mobile No.
                      </label>
                      <div className="mt-1 flex">
                        <select 
                          name="countryCode"
                          value={formData.countryCode}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-l-lg disabled:bg-gray-50"
                        >
                          {countryCodes.map(({ code, country }) => (
                            <option key={code} value={code}>
                              {code} {country}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          name="mobile_number"
                          value={formData.mobile_number}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg disabled:bg-gray-50"
                          placeholder="Enter mobile number"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Country of Residence
                      </label>
                      <select
                        name="residence"
                        value={formData.residence}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                      >
                        <option value="">Select country</option>
                        {countries.map(country => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}