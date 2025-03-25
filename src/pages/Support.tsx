import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Bell, User2, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ContextualBackButton } from '../components/ContextualBackButton';
import { useNavigationHistory } from '../hooks/useNavigationHistory';

type SupportCategory = 'account' | 'appointments' | 'payment' | 'technical' | 'other';

export function Support() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<'member' | 'physician'>('member');
  const [formData, setFormData] = useState({
    category: 'technical' as SupportCategory,
    subject: '',
    message: '',
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Add navigation history support
  const { setPageTitle } = useNavigationHistory();

  useEffect(() => {
    fetchUserData();
    // Set page title
    setPageTitle('Support');
  }, [setPageTitle]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user is a member
      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (memberData) {
        setUser(memberData);
        setUserType('member');
      } else {
        // Check if user is a physician
        const { data: physicianData } = await supabase
          .from('physicians')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (physicianData) {
          setUser(physicianData);
          setUserType('physician');
        } else {
          // Not a member or physician, redirect to login
          navigate('/login');
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // Limit to 3 files total
      if (attachments.length + newFiles.length > 3) {
        setError('You can only upload up to 3 files');
        return;
      }
      // Limit each file to 5MB
      const oversizedFiles = newFiles.filter(file => file.size > 5 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        setError('Each file must be smaller than 5MB');
        return;
      }
      setAttachments(prev => [...prev, ...newFiles]);
      // Reset the input
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate the form
    if (!formData.subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    
    if (!formData.message.trim()) {
      setError('Please enter your message');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Upload attachments if any
      const fileUrls: string[] = [];
      if (attachments.length > 0) {
        for (const file of attachments) {
          const filename = `${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('support-attachments')
            .upload(filename, file);
            
          if (uploadError) throw uploadError;
          
          fileUrls.push(filename);
        }
      }
      
      // Create the support ticket
      const { error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          user_type: userType,
          email: user.email,
          full_name: user.full_name,
          category: formData.category,
          subject: formData.subject,
          message: formData.message,
          status: 'open',
          attachments: fileUrls.length > 0 ? fileUrls : null,
        });
        
      if (ticketError) throw ticketError;
      
      // Show success message
      setSuccess(true);
      
      // Reset form after 5 seconds
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          category: 'technical',
          subject: '',
          message: '',
        });
        setAttachments([]);
      }, 5000);
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      setError('Failed to submit support ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToDashboard = () => {
    if (userType === 'member') {
      navigate('/home');
    } else {
      navigate('/physician/dashboard');
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
            <div className="flex items-center space-x-6">
              <button className="text-gray-600 hover:text-gray-900">
                <Bell className="h-6 w-6" />
              </button>
              <button 
                onClick={() => navigate(userType === 'member' ? '/profile' : '/physician/profile')}
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
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <ContextualBackButton
            fallbackPath={userType === 'member' ? '/home' : '/physician/dashboard'}
            className="text-pink-500 hover:text-pink-600"
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-3 text-lg font-medium text-gray-900">Support ticket submitted successfully!</h3>
              <p className="mt-2 text-sm text-gray-500">
                Thank you for reaching out. Our team will get back to you shortly via email.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setSuccess(false)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                >
                  Submit another ticket
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                >
                  <option value="account">Account Issues</option>
                  <option value="appointments">Appointments</option>
                  <option value="payment">Payment</option>
                  <option value="technical">Technical Support</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  id="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  value={formData.message}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                  placeholder="Please describe your issue in detail"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Attachments (optional)
                </label>
                <p className="mt-1 text-sm text-gray-500">
                  Upload screenshots or relevant files (max 3 files, 5MB each)
                </p>
                
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-pink-500 hover:text-pink-400"
                      >
                        <span>Upload files</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          multiple
                          onChange={handleFileChange}
                          accept="image/*, application/pdf"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF, PDF up to 5MB
                    </p>
                  </div>
                </div>
                
                {attachments.length > 0 && (
                  <ul className="mt-3 divide-y divide-gray-100 border border-gray-200 rounded-md">
                    {attachments.map((file, index) => (
                      <li key={index} className="flex justify-between items-center py-2 px-4 text-sm">
                        <div className="flex items-center">
                          <span className="truncate">{file.name}</span>
                          <span className="ml-2 text-xs text-gray-500">{(file.size / 1024).toFixed(0)}KB</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {error && (
                <div className="text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
} 