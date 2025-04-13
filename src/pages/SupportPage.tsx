import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User2, Mail, Phone, MessageSquare, Send, ArrowLeft, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MessageLoading } from '../components/ui/message-loading';

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'closed' | 'in-progress';
  created_at: string;
}

export function SupportPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<'member' | 'physician' | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  
  // Form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Support topics
  const supportTopics = [
    { id: 'account', label: 'Account Issues' },
    { id: 'billing', label: 'Billing & Payments' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'technical', label: 'Technical Problems' },
    { id: 'feature', label: 'Feature Requests' },
    { id: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (user && userType) {
      fetchTickets();
    }
  }, [user, userType]);

  const fetchUserData = async () => {
    try {
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
        setLoading(false);
        return;
      }

      // Check if user is a physician
      const { data: physicianData } = await supabase
        .from('physicians')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (physicianData) {
        setUser(physicianData);
        setUserType('physician');
        setLoading(false);
        return;
      }

      // If we get here, user doesn't have a valid profile
      navigate('/login');
    } catch (error) {
      console.error('Error fetching user data:', error);
      navigate('/login');
    }
  };

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!subject || !message) {
      setError('Please fill out all required fields.');
      setSubmitting(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          user_type: userType,
          subject,
          message,
          status: 'open'
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess('Your support ticket has been submitted. We will get back to you soon.');
      setSubject('');
      setMessage('');
      
      // Add new ticket to the list
      if (data) {
        setTickets([data, ...tickets]);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred. Please try again.');
      console.error('Error submitting support ticket:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (userType === 'member') {
      navigate('/member');
    } else if (userType === 'physician') {
      navigate('/physician/dashboard');
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return <MessageLoading />;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center mb-6">
          <button 
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Support Information */}
          <div className="md:w-1/3">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mx-auto mb-4">
                <HelpCircle className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-center mb-6">Support Center</h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Mail className="h-6 w-6 text-blue-500 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium">Email Us</p>
                    <p className="text-gray-600">support@geekcare.com</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Phone className="h-6 w-6 text-blue-500 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium">Call Us</p>
                    <p className="text-gray-600">+1 (800) 555-7890</p>
                    <p className="text-xs text-gray-500">Mon-Fri, 9AM-5PM EST</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MessageSquare className="h-6 w-6 text-blue-500 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium">Live Chat</p>
                    <p className="text-gray-600">Available on our website</p>
                    <p className="text-xs text-gray-500">24/7 Support</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Get Quick Answers</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Check our FAQ section for answers to common questions:
                </p>
                <button
                  onClick={() => navigate('/faq')}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Visit FAQ Page
                </button>
              </div>
            </div>
          </div>
          
          {/* Support Form */}
          <div className="md:w-2/3">
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h2 className="text-xl font-bold mb-4">Submit a Support Ticket</h2>
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4">
                  {success}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2" htmlFor="topic">
                    Topic
                  </label>
                  <select
                    id="topic"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  >
                    <option value="">Select a topic</option>
                    {supportTopics.map((topic) => (
                      <option key={topic.id} value={topic.label}>
                        {topic.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2" htmlFor="message">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your issue in detail..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  ></textarea>
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Send className="h-4 w-4 mr-2" />
                      Submit Ticket
                    </div>
                  )}
                </button>
              </form>
            </div>
            
            {/* Previous Tickets */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">Your Support Tickets</h2>
              {tickets.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  You haven't submitted any support tickets yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">{ticket.subject}</h3>
                        <span 
                          className={`text-xs px-2 py-1 rounded-full ${
                            ticket.status === 'open' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : ticket.status === 'closed'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{ticket.message}</p>
                      <p className="text-xs text-gray-500">
                        Submitted on {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 