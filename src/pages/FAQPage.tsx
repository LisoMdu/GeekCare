import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MessageLoading } from '../components/ui/message-loading';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

export function FAQPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<FAQItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<'member' | 'physician' | null>(null);

  useEffect(() => {
    fetchUserData();
    fetchFaqs();
  }, []);

  useEffect(() => {
    filterFaqs();
  }, [searchQuery, activeCategory, faqs]);

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
        return;
      }

      // If we get here, user doesn't have a valid profile
      navigate('/login');
    } catch (error) {
      console.error('Error fetching user data:', error);
      navigate('/login');
    }
  };

  const fetchFaqs = async () => {
    try {
      // In a real app, you would fetch from your database
      // For now, we'll use mock data
      const mockFaqs: FAQItem[] = [
        {
          id: 1,
          question: "How do I schedule an appointment?",
          answer: "You can schedule an appointment by navigating to the 'Appointments' section in your dashboard and clicking on 'Schedule New Appointment'. Follow the steps to select a physician, date, and time that works for you.",
          category: "Appointments"
        },
        {
          id: 2,
          question: "Can I reschedule or cancel my appointment?",
          answer: "Yes, you can reschedule or cancel your appointment by going to the 'Appointments' section, finding your upcoming appointment, and selecting 'Reschedule' or 'Cancel'. Please note that cancellations made less than 24 hours before your appointment may incur a fee.",
          category: "Appointments"
        },
        {
          id: 3,
          question: "How do I update my personal information?",
          answer: "You can update your personal information by going to the 'Profile' section in your dashboard. Click on 'Edit Profile' to update your contact information, address, or other personal details.",
          category: "Account"
        },
        {
          id: 4,
          question: "Is my medical information secure?",
          answer: "Yes, we take data security very seriously. All your medical information is encrypted and stored securely in compliance with HIPAA regulations. Only authorized healthcare providers involved in your care have access to your medical information.",
          category: "Privacy & Security"
        },
        {
          id: 5,
          question: "How do I request a prescription refill?",
          answer: "You can request a prescription refill by navigating to the 'Prescriptions' section in your dashboard and selecting the medication you need refilled. Click on 'Request Refill' and follow the prompts. Your request will be sent to your physician for approval.",
          category: "Medications"
        },
        {
          id: 6,
          question: "What should I do if I experience a technical issue?",
          answer: "If you experience any technical issues, please visit our Support page by clicking on 'Support' in the main navigation. You can submit a ticket describing your issue, and our technical team will assist you as soon as possible.",
          category: "Technical Issues"
        },
        {
          id: 7,
          question: "How do I view my test results?",
          answer: "You can view your test results by going to the 'Medical Records' section in your dashboard. Click on 'Test Results' to see a list of your recent tests. Click on any test to view the detailed results and any notes from your physician.",
          category: "Medical Records"
        },
        {
          id: 8,
          question: "Can I message my physician directly?",
          answer: "Yes, you can send a direct message to your physician by going to the 'Messages' section in your dashboard. Select your physician from your contacts list and compose your message. Please note that for urgent matters, you should call our office or seek emergency care.",
          category: "Communication"
        },
        {
          id: 9,
          question: "How do I pay my medical bills?",
          answer: "You can pay your medical bills by going to the 'Billing' section in your dashboard. You'll see a list of your outstanding bills. Select the bill you want to pay and click on 'Pay Now'. You can pay using a credit card, bank transfer, or other available payment methods.",
          category: "Billing"
        },
        {
          id: 10,
          question: "What insurance plans do you accept?",
          answer: "We accept most major insurance plans, including Medicare and Medicaid. For a complete list of accepted insurance plans, please visit the 'Insurance' section in your profile settings or contact our billing department for more information.",
          category: "Insurance"
        },
        {
          id: 11,
          question: "How do I request my medical records?",
          answer: "You can request your complete medical records by going to the 'Medical Records' section and clicking on 'Request Records'. Fill out the form specifying what records you need and where they should be sent. Please allow 7-10 business days for processing.",
          category: "Medical Records"
        },
        {
          id: 12,
          question: "What should I do if I need urgent medical attention?",
          answer: "If you need urgent medical attention, please call our 24/7 nurse hotline at (800) 555-1234. For emergencies, call 911 or go to your nearest emergency room immediately. Our telehealth services are not intended for emergency situations.",
          category: "Urgent Care"
        }
      ];

      setFaqs(mockFaqs);
      
      // Extract unique categories
      const uniqueCategories = Array.from(new Set(mockFaqs.map(faq => faq.category)));
      setCategories(uniqueCategories);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      setLoading(false);
    }
  };

  const filterFaqs = () => {
    let filtered = [...faqs];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        faq => 
          faq.question.toLowerCase().includes(query) || 
          faq.answer.toLowerCase().includes(query)
      );
    }
    
    // Filter by category
    if (activeCategory) {
      filtered = filtered.filter(faq => faq.category === activeCategory);
    }
    
    setFilteredFaqs(filtered);
  };

  const toggleFaq = (id: number) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  const handleCategoryClick = (category: string) => {
    setActiveCategory(activeCategory === category ? null : category);
    setSearchQuery('');
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
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center mb-6">
          <button 
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
          <p className="text-gray-600">Find answers to common questions about our services.</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for answers..."
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
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Browse by Category</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  activeCategory === category
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
            {activeCategory && (
              <button
                onClick={() => setActiveCategory(null)}
                className="px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* FAQ List */}
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
                  {openFaqId === faq.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                {openFaqId === faq.id && (
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
        <div className="mt-12 bg-blue-50 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">Still have questions?</h2>
          <p className="text-blue-700 mb-4">
            If you couldn't find the answer you were looking for, our support team is here to help.
          </p>
          <button
            onClick={() => navigate('/support')}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
} 