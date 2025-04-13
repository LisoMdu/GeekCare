import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User2, UserCircle, 
  X, MessageSquare, ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MessageLoading } from '../components/ui/message-loading';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

interface Query {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'answered';
  created_at: string;
  response?: string;
}

export function QueryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [isPhysician, setIsPhysician] = useState(false);
  const [queries, setQueries] = useState<Query[]>([]);
  const [activeQuery, setActiveQuery] = useState<Query | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqs, setExpandedFaqs] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Predefined FAQs
  const faqs: FAQ[] = [
    {
      id: 1,
      question: "How do I schedule an appointment with a doctor?",
      answer: "To schedule an appointment, navigate to the 'Find Doctor' section, search for your preferred physician, view their profile, and select an available time slot. You'll receive a confirmation message once your appointment is booked.",
      category: "appointments"
    },
    {
      id: 2,
      question: "Can I reschedule or cancel my appointment?",
      answer: "Yes, you can reschedule or cancel your appointment by going to 'My Appointments' section. Select the appointment you wish to modify, then click on 'Reschedule' or 'Cancel'. Please note that cancellations made less than 24 hours before the appointment may incur a fee.",
      category: "appointments"
    },
    {
      id: 3,
      question: "How can I view my medical records?",
      answer: "Your medical records can be accessed through the 'Medical Records' section in your dashboard. You can view, download, and even upload new records like prescriptions or lab results.",
      category: "records"
    },
    {
      id: 4,
      question: "Is my personal and medical information secure?",
      answer: "Yes, GeekCare employs state-of-the-art encryption and security measures to protect your personal and medical information. We comply with all healthcare privacy regulations including HIPAA to ensure your data remains confidential.",
      category: "privacy"
    },
    {
      id: 5,
      question: "How do I update my personal information?",
      answer: "You can update your personal information by navigating to the 'Profile' section. Click on 'Edit Profile' to modify details such as your name, contact information, address, or emergency contacts.",
      category: "account"
    },
    {
      id: 6,
      question: "What should I do if I experience technical issues?",
      answer: "If you experience any technical issues, please visit our 'Support' page and submit a support ticket describing the problem. Our technical team will assist you as soon as possible. For urgent matters, you can also email support@geekcare.com.",
      category: "technical"
    },
    {
      id: 7,
      question: "Are virtual consultations covered by insurance?",
      answer: "Many insurance providers now cover virtual consultations. We recommend checking with your specific insurance provider to understand your coverage details before scheduling an appointment.",
      category: "general"
    },
    {
      id: 8,
      question: "How do I prepare for a virtual consultation?",
      answer: "For a virtual consultation, ensure you have a stable internet connection, a quiet private space, good lighting, and any relevant medical documents or information handy. Test your camera and microphone beforehand, and be ready 5 minutes before your scheduled appointment time.",
      category: "appointments"
    }
  ];
  
  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'appointments', name: 'Appointments' },
    { id: 'records', name: 'Medical Records' },
    { id: 'privacy', name: 'Privacy & Security' },
    { id: 'account', name: 'Account Management' },
    { id: 'technical', name: 'Technical Support' },
    { id: 'general', name: 'General Information' }
  ];
  
  useEffect(() => {
    fetchUserData();
    if (isPhysician) {
      fetchQueries();
    }
  }, [isPhysician]);

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

  const fetchQueries = async () => {
    if (!isPhysician) return;
    
    try {
      const { data, error } = await supabase
        .from('medical_queries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQueries(data || []);
    } catch (error) {
      console.error('Error fetching queries:', error);
    }
  };

  const handleAnswerQuery = async (queryId: string, response: string) => {
    if (!isPhysician) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('medical_queries')
        .update({
          response,
          status: 'answered',
          physician_id: user.id
        })
        .eq('id', queryId)
        .select()
        .single();

      if (error) throw error;
      
      // Update queries list
      setQueries(queries.map(q => q.id === queryId ? data : q));
      setActiveQuery(data);
    } catch (error) {
      console.error('Error answering query:', error);
      alert('Failed to submit response. Please try again.');
    }
  };

  const handleBack = () => {
    if (isPhysician) {
      navigate('/physician/dashboard');
    } else {
      navigate('/home');
    }
  };

  const toggleFaq = (id: number) => {
    setExpandedFaqs(prev => 
      prev.includes(id) 
        ? prev.filter(faqId => faqId !== id)
        : [...prev, id]
    );
  };

  const filteredFaqs = faqs
    .filter(faq => 
      (selectedCategory === 'all' || faq.category === selectedCategory) &&
      (searchQuery === '' || 
       faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
       faq.answer.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  if (loading) {
    return <MessageLoading />;
  }

  // Physician view
  if (isPhysician) {
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
                <h1 className="text-2xl font-bold text-gray-900">Respond to Patient Queries</h1>
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
                  <span className="text-gray-700 font-medium">Dr. {member?.full_name}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left sidebar - Query list */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-lg font-medium text-gray-900">Patient Queries</h2>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(100vh-240px)]">
                {queries.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No patient queries at this time.
                  </div>
                ) : (
                  <div className="divide-y">
                    {queries.map((query) => (
                      <button
                        key={query.id}
                        onClick={() => setActiveQuery(query)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          activeQuery?.id === query.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900 truncate">{query.title}</h3>
                            <p className="text-sm text-gray-500 mt-1 truncate">{query.content}</p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              query.status === 'answered'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {query.status === 'answered' ? 'Answered' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(query.created_at).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Active query or instruction */}
            <div className="md:col-span-2 bg-white shadow-sm rounded-lg overflow-hidden">
              {activeQuery ? (
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-medium text-gray-900">{activeQuery.title}</h2>
                      <button
                        onClick={() => setActiveQuery(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(activeQuery.created_at).toLocaleDateString()}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          activeQuery.status === 'answered'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {activeQuery.status === 'answered' ? 'Answered' : 'Pending Response'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4 flex-grow overflow-y-auto">
                    <div className="flex items-start space-x-3 mb-6">
                      <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center">
                        <UserCircle className="h-6 w-6 text-pink-500" />
                      </div>
                      <div className="bg-gray-100 rounded-lg p-3 max-w-[85%]">
                        <p className="text-gray-800">{activeQuery.content}</p>
                      </div>
                    </div>
                    
                    {activeQuery.response ? (
                      <div className="flex items-start space-x-3 flex-row-reverse">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User2 className="h-6 w-6 text-blue-500" />
                        </div>
                        <div className="bg-blue-100 rounded-lg p-3 max-w-[85%]">
                          <p className="text-gray-800">{activeQuery.response}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6">
                        <label htmlFor="response" className="block text-sm font-medium text-gray-700 mb-2">
                          Your Response
                        </label>
                        <textarea
                          id="response"
                          rows={6}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Provide your professional medical advice here..."
                        ></textarea>
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => {
                              const textarea = document.getElementById('response') as HTMLTextAreaElement;
                              if (textarea && textarea.value.trim()) {
                                handleAnswerQuery(activeQuery.id, textarea.value.trim());
                              } else {
                                alert('Please provide a response before submitting.');
                              }
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Submit Response
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center p-8 text-center">
                  <div>
                    <MessageSquare className="h-16 w-16 text-blue-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Query</h3>
                    <p className="text-gray-500 max-w-md">
                      Select a patient query from the list to view details and provide your professional medical advice.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Member/Patient view - FAQ Page
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
              <h1 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h1>
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
                <span className="text-gray-700 font-medium">{member?.full_name}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div className="relative flex-grow max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Search FAQs..."
                />
              </div>
              
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matching FAQs found</h3>
                <p className="text-gray-500">Try adjusting your search terms or category filter.</p>
                <button 
                  className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFaqs.map((faq) => (
                  <div 
                    key={faq.id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full flex justify-between items-center p-4 text-left bg-gray-50 hover:bg-gray-100"
                    >
                      <h3 className="font-medium text-gray-900">{faq.question}</h3>
                      {expandedFaqs.includes(faq.id) ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </button>
                    
                    {expandedFaqs.includes(faq.id) && (
                      <div className="p-4 bg-white">
                        <p className="text-gray-700">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-8 border-t pt-6">
              <p className="text-gray-700 mb-4">
                Can't find an answer to your question? Visit our Support page for assistance.
              </p>
              <button
                onClick={() => navigate('/support')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                Go to Support Page
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 