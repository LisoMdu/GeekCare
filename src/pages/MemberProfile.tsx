import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, User2, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function MemberProfile() {
  const navigate = useNavigate();
  const [member, setMember] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile_number: '',
    date_of_birth: '',
    gender: '',
    profile_image_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMemberData();
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
        .single();

      if (error) throw error;

      setMember(memberData);
      setFormData({
        full_name: memberData.full_name || '',
        email: memberData.email || '',
        mobile_number: memberData.mobile_number || '',
        date_of_birth: memberData.date_of_birth || '',
        gender: memberData.gender || '',
        profile_image_url: memberData.profile_image_url || '',
      });
    } catch (error) {
      console.error('Error fetching member data:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { error: updateError } = await supabase
        .from('members')
        .update({
          full_name: formData.full_name,
          mobile_number: formData.mobile_number,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
        })
        .eq('id', member.id);

      if (updateError) throw updateError;

      setIsEditing(false);
      fetchMemberData();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-pink-500 fill-pink-500" />
              <span className="ml-2 text-2xl font-bold">GeekCare</span>
            </div>
            <button
              onClick={() => navigate('/home')}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Profile Information</h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-pink-500 hover:text-pink-600"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <div className="mb-6 flex justify-center">
              {formData.profile_image_url ? (
                <img
                  src={formData.profile_image_url}
                  alt={formData.full_name}
                  className="h-32 w-32 rounded-full object-cover"
                />
              ) : (
                <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center">
                  <User2 className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>

            {isEditing && (
              <div className="mb-6 text-center">
                <button className="inline-flex items-center text-sm text-pink-500 hover:text-pink-600">
                  <Upload className="w-4 h-4 mr-1" />
                  Upload Photo
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-50"
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
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-50"
                />
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
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-50"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            )}

            {isEditing && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}