import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User2, Send, Loader2, 
  FileText, Paperclip, MessageSquare, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MessageLoading } from '../components/ui/message-loading';

interface SupportTicket {
  id: string;
  ticket_id: string;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'closed' | 'resolved';
  created_at: string;
  updated_at: string;
  attachments?: string[];
}

export function Support() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [member, setMember] = useState<any>(null);
  const [isPhysician, setIsPhysician] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [newTicket, setNewTicket] = useState({
    category: 'technical',
    subject: '',
    message: ''
  });

  // Support categories
  const categories = [
    { id: 'account', name: 'Account Issues' },
    { id: 'appointments', name: 'Appointment Problems' },
    { id: 'payment', name: 'Payment Concerns' },
    { id: 'technical', name: 'Technical Support' },
    { id: 'other', name: 'Other Inquiries' }
  ];
  
  // Status colors
  const statusColors = {
    open: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    closed: 'bg-gray-100 text-gray-800',
    resolved: 'bg-green-100 text-green-800'
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (member) {
      fetchTickets();
    }
  }, [member]);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user is a physician
      const { data: physicianData, error: physicianError } = await supabase
        .from('physicians')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (physicianData) {
        setIsPhysician(true);
        setMember(physicianData);
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

        setMember(memberData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      alert('Please provide both a subject and message for your support ticket.');
      return;
    }
    
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Upload attachments if any
      let fileUrls: string[] = [];
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;
          
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('support-attachments')
            .upload(filePath, file);
            
          if (uploadError) throw uploadError;
          
          const { data: urlData } = supabase.storage
            .from('support-attachments')
            .getPublicUrl(filePath);
          
          fileUrls.push(urlData.publicUrl);
        }
      }
      
      // Create support ticket
      const { data, error } = await supabase
        .from('support_tickets')
        .insert([
          {
          user_id: user.id,
            user_type: isPhysician ? 'physician' : 'member',
            email: member.email,
            full_name: member.full_name,
            category: newTicket.category,
            subject: newTicket.subject.trim(),
            message: newTicket.message.trim(),
          attachments: fileUrls.length > 0 ? fileUrls : null,
            status: 'open'
          }
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      // Update state
      setTickets([data, ...tickets]);
      setActiveTicket(data);
      setNewTicket({
        category: 'technical',
        subject: '',
        message: ''
      });
      setFiles([]);
      
      // Show success message
      alert('Your support ticket has been submitted successfully. Our team will respond as soon as possible.');
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      alert('Failed to submit your support ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (isPhysician) {
      navigate('/physician/dashboard');
    } else {
      navigate('/home');
    }
  };

  if (loading) {
    return <MessageLoading />;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={handleBack}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Support</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
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
                <span className="text-gray-700 font-medium">
                  {isPhysician ? `Dr. ${member?.full_name}` : member?.full_name}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left sidebar - Ticket list */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Your Tickets</h2>
              <button
                onClick={() => setActiveTicket(null)}
                className="px-3 py-1 bg-pink-500 text-white rounded-lg hover:bg-pink-600 text-sm"
              >
                New Ticket
              </button>
        </div>

            <div className="overflow-y-auto max-h-[calc(100vh-240px)]">
              {tickets.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No support tickets yet. Submit your first ticket for assistance.
              </div>
              ) : (
                <div className="divide-y">
                  {tickets.map((ticket) => (
                <button
                      key={ticket.id}
                      onClick={() => setActiveTicket(ticket)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        activeTicket?.id === ticket.id ? 'bg-pink-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900 truncate">{ticket.subject}</h3>
                          <p className="text-sm text-gray-500 mt-1 truncate">{ticket.message}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${statusColors[ticket.status]}`}
                        >
                          {ticket.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-400">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">
                          {ticket.category}
                        </span>
                      </div>
                </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right side - Active ticket or new ticket form */}
          <div className="md:col-span-2 bg-white shadow-sm rounded-lg overflow-hidden">
            {activeTicket ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium text-gray-900">{activeTicket.subject}</h2>
                    <button
                      onClick={() => setActiveTicket(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                      {new Date(activeTicket.created_at).toLocaleString()}
                    </p>
                    <div className="flex gap-2 items-center">
                      <span className="text-sm text-gray-500 capitalize">
                        {activeTicket.category}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${statusColors[activeTicket.status]}`}
                      >
                        {activeTicket.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 flex-grow overflow-y-auto">
                  <div className="flex items-start space-x-3 mb-6">
                    <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center">
                      <User2 className="h-5 w-5 text-pink-500" />
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3 max-w-[85%]">
                      <p className="text-gray-800">{activeTicket.message}</p>
                      
                      {activeTicket.attachments && activeTicket.attachments.length > 0 && (
                        <div className="mt-3 border-t pt-3">
                          <p className="text-sm text-gray-500 mb-2">Attachments:</p>
                          <div className="flex flex-wrap gap-2">
                            {activeTicket.attachments.map((url, index) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Attachment {index + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {activeTicket.status === 'open' && (
                    <div className="flex items-center justify-center p-4 mt-4 text-gray-500 bg-gray-50 rounded-lg">
                      <MessageSquare className="h-5 w-5 mr-2" />
                      <span>Our support team will respond to your ticket soon.</span>
                    </div>
                  )}

                  {(activeTicket.status === 'in_progress' || activeTicket.status === 'resolved') && (
                    <div className="flex items-start space-x-3 flex-row-reverse mt-6">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User2 className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="bg-blue-100 rounded-lg p-3 max-w-[85%]">
                        <p className="text-gray-800">
                          {activeTicket.status === 'in_progress' 
                            ? "Our support team is currently reviewing your ticket and will provide assistance shortly."
                            : "Your issue has been resolved. If you have any further questions, please create a new support ticket."}
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ) : (
              <div className="p-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Submit a Support Ticket</h2>
                <form onSubmit={handleSubmitTicket}>
                  <div className="space-y-4">
              <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                        value={newTicket.category}
                        onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                >
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                </select>
              </div>

              <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                        id="subject"
                  type="text"
                        required
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  id="message"
                        required
                        value={newTicket.message}
                        onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                  rows={6}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                        placeholder="Describe your issue in detail..."
                      />
              </div>

              <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Attachments (Optional)
                </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-pink-500 hover:text-pink-600"
                      >
                        <span>Upload files</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                                multiple
                          className="sr-only"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF, PDF up to 5MB
                    </p>
                        </div>
                  </div>
                </div>
                
                    {files.length > 0 && (
                      <div className="border rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Selected files:</p>
                        <ul className="divide-y">
                          {files.map((file, index) => (
                            <li key={index} className="py-2 flex justify-between items-center">
                        <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-gray-500" />
                                <span className="text-sm text-gray-700">{file.name}</span>
                                <span className="ml-2 text-xs text-gray-500">
                                  ({(file.size / 1024).toFixed(0)} KB)
                                </span>
                        </div>
                        <button
                          type="button"
                                onClick={() => removeFile(index)}
                                className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

                    <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
                >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Submit Ticket
                          </>
                        )}
                </button>
                    </div>
                  </div>
                </form>
              </div>
          )}
          </div>
        </div>
      </main>
    </div>
  );
} 