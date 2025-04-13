import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User2, MessageSquare, Send, Search, 
  ChevronDown, ChevronUp, Filter, CheckCircle2, X 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MessageLoading } from '../components/ui/message-loading';

interface UserQuery {
  id: string;
  user_id: string;
  user_name: string;
  subject: string;
  message: string;
  status: 'pending' | 'in_progress' | 'answered';
  created_at: string;
  answered_by?: string;
  answer?: string;
  answered_at?: string;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

export function FAQsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isPhysician, setIsPhysician] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // FAQ state
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFaqs, setExpandedFaqs] = useState<number[]>([]);
  
  // Queries state (for physician view)
  const [queries, setQueries] = useState<UserQuery[]>([]);
  const [filteredQueries, setFilteredQueries] = useState<UserQuery[]>([]);
  const [activeQuery, setActiveQuery] = useState<UserQuery | null>(null);
  const [answer, setAnswer] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'answered'>('all');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Categories for FAQs
  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'appointments', name: 'Appointments' },
    { id: 'records', name: 'Medical Records' },
    { id: 'privacy', name: 'Privacy & Security' },
    { id: 'account', name: 'Account Management' },
    { id: 'technical', name: 'Technical Support' },
    { id: 'general', name: 'General Information' }
  ];

  // Predefined FAQs
  const predefinedFaqs: FAQ[] = [
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
      question: "Is my personal information secure?",
      answer: "Yes, we take data security seriously. All your personal and medical information is encrypted and stored securely in compliance with healthcare regulations. We use industry-standard security measures to protect your data.",
      category: "privacy"
    },
    {
      id: 5,
      question: "How do I update my account information?",
      answer: "You can update your account information by navigating to your profile settings. Click on your profile picture in the top right corner, select 'Profile', and then edit your personal information as needed.",
      category: "account"
    }
  ];

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (user) {
      if (isPhysician) {
        fetchQueries();
      }
      setFaqs(predefinedFaqs);
    }
  }, [user, isPhysician]);

  useEffect(() => {
    filterFaqs();
  }, [faqs, selectedCategory, searchQuery]);

  useEffect(() => {
    filterQueries();
  }, [queries, filter, searchQuery]);

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
        setUser(physicianData);
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

        setUser(memberData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchQueries = async () => {
    try {
      // In a real app, you would fetch from your database
      // For now, we'll use mock data
      const mockQueries: UserQuery[] = [
        {
          id: '1',
          user_id: 'user1',
          user_name: 'John Smith',
          subject: 'Question about medication side effects',
          message: "I've been taking the blood pressure medication you prescribed for about two weeks now, and I've noticed I've been feeling dizzy occasionally, especially when standing up quickly. Is this a normal side effect or should I be concerned?",
          status: 'pending',
          created_at: '2023-05-15T10:30:00Z'
        },
        {
          id: '2',
          user_id: 'user2',
          user_name: 'Emily Johnson',
          subject: 'Follow-up appointment question',
          message: "During our last appointment, you mentioned I should schedule a follow-up in 3 months. Should I schedule this as a regular check-up or as a specialized appointment?",
          status: 'in_progress',
          created_at: '2023-05-14T15:45:00Z'
        },
        {
          id: '3',
          user_id: 'user3',
          user_name: 'Michael Williams',
          subject: 'Lab results clarification',
          message: "I received my lab results through the portal yesterday, but I'm not sure I understand what the elevated white blood cell count means. Could you please explain if this is something I should be concerned about?",
          status: 'pending',
          created_at: '2023-05-14T09:15:00Z'
        },
        {
          id: '4',
          user_id: 'user4',
          user_name: 'Sarah Davis',
          subject: 'Question about diet recommendations',
          message: "You recommended that I follow a low-sodium diet to help with my hypertension. I'm finding it difficult to plan meals - do you have any specific resources or meal plans you could recommend?",
          status: 'answered',
          created_at: '2023-05-13T11:20:00Z',
          answered_by: user?.id || 'doctor1',
          answer: "I understand that starting a low-sodium diet can be challenging. I recommend checking out the American Heart Association website, which has excellent resources for low-sodium meal planning. Additionally, I'll have our nutritionist reach out to you to schedule a consultation for more personalized guidance.",
          answered_at: '2023-05-13T14:30:00Z'
        },
        {
          id: '5',
          user_id: 'user5',
          user_name: 'Robert Brown',
          subject: 'Exercise recommendations',
          message: "After our discussion about my arthritis, I'm trying to find suitable exercises that won't exacerbate my joint pain. Could you recommend some low-impact exercises that would be safe for me to try?",
          status: 'pending',
          created_at: '2023-05-12T16:05:00Z'
        }
      ];

      setQueries(mockQueries);
    } catch (error) {
      console.error('Error fetching queries:', error);
    }
  };

  const filterFaqs = () => {
    let filtered = [...faqs];
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        faq => 
          faq.question.toLowerCase().includes(query) || 
          faq.answer.toLowerCase().includes(query)
      );
    }
    
    setFilteredFaqs(filtered);
  };

  const filterQueries = () => {
    if (!queries.length) return;
    
    let filtered = [...queries];
    
    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(query => query.status === filter);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        q => 
          q.subject.toLowerCase().includes(query) || 
          q.message.toLowerCase().includes(query) ||
          q.user_name.toLowerCase().includes(query)
      );
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    setFilteredQueries(filtered);
  };

  const toggleFaq = (id: number) => {
    setExpandedFaqs(prev => 
      prev.includes(id) 
        ? prev.filter(faqId => faqId !== id)
        : [...prev, id]
    );
  };

  const handleQuerySelect = (query: UserQuery) => {
    setActiveQuery(query);
    setAnswer(query.answer || '');
    
    // If the query is pending, mark it as in_progress
    if (query.status === 'pending') {
      const updatedQueries = queries.map(q => 
        q.id === query.id ? { ...q, status: 'in_progress' as const } : q
      );
      setQueries(updatedQueries);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!activeQuery || !answer.trim()) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      // In a real app, you would update the database
      const now = new Date().toISOString();
      const updatedQuery: UserQuery = {
        ...activeQuery,
        status: 'answered',
        answer,
        answered_by: user.id,
        answered_at: now
      };
      
      // Update queries state
      const updatedQueries = queries.map(q => 
        q.id === activeQuery.id ? updatedQuery : q
      );
      
      setQueries(updatedQueries);
      setActiveQuery(updatedQuery);
      setSuccess('Answer submitted successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit answer. Please try again.');
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'answered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <MessageLoading />;
  }

  // Physician view
  if (isPhysician) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">FAQs & Patient Questions</h1>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="flex h-[calc(100vh-12rem)]">
              {/* Left side - Queries list */}
              <div className="w-1/3 border-r overflow-hidden flex flex-col">
                <div className="p-4 border-b">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search patient questions..."
                      className="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-3">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-3 py-1 text-xs rounded-full ${
                        filter === 'all'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilter('pending')}
                      className={`px-3 py-1 text-xs rounded-full ${
                        filter === 'pending'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => setFilter('in_progress')}
                      className={`px-3 py-1 text-xs rounded-full ${
                        filter === 'in_progress'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => setFilter('answered')}
                      className={`px-3 py-1 text-xs rounded-full ${
                        filter === 'answered'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      Answered
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  {filteredQueries.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
                      <p className="mt-2">No questions found</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredQueries.map((query) => (
                        <button
                          key={query.id}
                          onClick={() => handleQuerySelect(query)}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                            activeQuery?.id === query.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-gray-900 truncate">{query.subject}</h3>
                              <p className="text-sm text-gray-500 mt-1 truncate">{query.user_name}</p>
                            </div>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(query.status)}`}
                            >
                              {query.status === 'answered' ? 'Answered' : query.status === 'in_progress' ? 'In Progress' : 'Pending'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatDate(query.created_at)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - Active query or instruction */}
              <div className="w-2/3 flex flex-col">
                {activeQuery ? (
                  <div className="h-full flex flex-col">
                    <div className="p-4 border-b">
                      <div className="flex justify-between items-center">
                        <h2 className="text-lg font-medium text-gray-900">{activeQuery.subject}</h2>
                        <button
                          onClick={() => setActiveQuery(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500 mt-1">
                          From: {activeQuery.user_name} • {formatDate(activeQuery.created_at)}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(activeQuery.status)}`}
                        >
                          {activeQuery.status === 'answered' ? 'Answered' : activeQuery.status === 'in_progress' ? 'In Progress' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 overflow-y-auto flex-1">
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <p className="text-gray-700 whitespace-pre-line">{activeQuery.message}</p>
                      </div>
                      
                      {activeQuery.status === 'answered' && activeQuery.answer && (
                        <div className="border-t pt-4 mt-4">
                          <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                            <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                            Your Response
                          </h3>
                          <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-gray-700 whitespace-pre-line">{activeQuery.answer}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Answered: {activeQuery.answered_at ? formatDate(activeQuery.answered_at) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {activeQuery.status !== 'answered' && (
                      <div className="p-4 border-t">
                        <label htmlFor="response" className="block text-sm font-medium text-gray-700 mb-1">
                          Your Response
                        </label>
                        <textarea
                          id="response"
                          rows={4}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                          placeholder="Type your response here..."
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                        ></textarea>
                        
                        <div className="mt-3 flex justify-end">
                          {error && (
                            <p className="text-sm text-red-600 mr-auto">{error}</p>
                          )}
                          {success && (
                            <p className="text-sm text-green-600 mr-auto">{success}</p>
                          )}
                          <button
                            type="button"
                            onClick={handleSubmitAnswer}
                            disabled={submitting || !answer.trim()}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {submitting ? 'Submitting...' : 'Submit Response'}
                            <Send className="ml-2 h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center p-8 text-center">
                    <div>
                      <MessageSquare className="h-16 w-16 text-blue-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Patient Question</h3>
                      <p className="text-gray-500 max-w-md">
                        Select a patient question from the list to view details and provide your professional medical advice.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Member/Patient view - FAQ Page
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h1>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for questions..."
              className="w-full py-3 pl-12 pr-4 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex space-x-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium ${
                  selectedCategory === category.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No FAQs match your search. Try a different query or category.</p>
            </div>
          ) : (
            filteredFaqs.map((faq) => (
              <div 
                key={faq.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  {expandedFaqs.includes(faq.id) ? (
                    <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                {expandedFaqs.includes(faq.id) && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-gray-700">{faq.answer}</p>
                    <div className="mt-3 flex">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {faq.category}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Still need help section */}
        <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Still have questions?</h2>
          <p className="text-gray-600 mb-4">
            If you couldn't find the answer to your question, our support team is here to help.
          </p>
          <button
            onClick={() => navigate('/support')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
} 