import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Languages, Star, Calendar, 
  Clock, DollarSign, Heart, MessageSquare, ThumbsUp, User2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MessageLoading } from '../components/ui/message-loading';
import { format } from 'date-fns';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  member_name: string;
  member_image?: string;
}

export function DoctorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchDoctorData();
      fetchReviews();
    }
  }, [id]);

  useEffect(() => {
    if (doctor) {
      generateTimeSlots();
    }
  }, [selectedDate, doctor]);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('physicians')
        .select(`
          *,
          physician_specialties (
            specialty
          ),
          physician_languages (
            language
          ),
          physician_education (
            id,
            institution,
            degree,
            field_of_study,
            start_date,
            end_date
          ),
          physician_employment (
            id,
            employer_name,
            position,
            start_date,
            end_date,
            is_current
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setDoctor(data);
    } catch (error) {
      console.error('Error fetching doctor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      // In a real app, fetch real reviews from your database
      // For now, we'll use mock data
      const mockReviews: Review[] = [
        {
          id: '1',
          rating: 5,
          comment: "Dr. Smith is an excellent doctor. He took the time to explain everything thoroughly and made me feel at ease.",
          created_at: '2023-04-15T14:30:00Z',
          member_name: 'John Davis',
          member_image: 'https://i.pravatar.cc/150?img=1'
        },
        {
          id: '2',
          rating: 4,
          comment: "Very knowledgeable and professional. The only reason I'm not giving 5 stars is because I had to wait a bit longer than expected.",
          created_at: '2023-04-10T09:15:00Z',
          member_name: 'Sarah Johnson',
          member_image: 'https://i.pravatar.cc/150?img=5'
        },
        {
          id: '3',
          rating: 5,
          comment: "I've been seeing Dr. Smith for years and have always received excellent care. Highly recommended!",
          created_at: '2023-03-22T16:45:00Z',
          member_name: 'Michael Brown',
          member_image: 'https://i.pravatar.cc/150?img=8'
        }
      ];
      
      setReviews(mockReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const generateTimeSlots = () => {
    // In a real app, you would fetch the doctor's availability from the database
    // and exclude already booked slots
    const slots = [
      '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', 
      '11:00 AM', '11:30 AM', '01:00 PM', '01:30 PM',
      '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
      '04:00 PM', '04:30 PM'
    ];
    
    // Randomly remove some slots to simulate booked appointments
    const availableSlots = slots.filter(() => Math.random() > 0.3);
    setAvailableSlots(availableSlots);
  };

  const handleBookAppointment = () => {
    if (!selectedSlot) return;
    
    // In a real app, you would create an appointment in your database
    navigate(`/book/${id}?date=${selectedDate}&time=${selectedSlot}`);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  if (loading) {
    return <MessageLoading />;
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Doctor not found</h1>
          <p className="text-gray-600 mb-4">The doctor you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
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
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Doctor Info Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start">
              {doctor.profile_image_url ? (
                <img
                  src={doctor.profile_image_url}
                  alt={doctor.full_name}
                  className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-md">
                  <User2 className="h-12 w-12 text-gray-400" />
                </div>
              )}
              <div className="ml-6 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dr. {doctor.full_name}</h1>
                    <p className="text-lg text-gray-600">{doctor.physician_specialties?.[0]?.specialty}</p>
                  </div>
                  <div className="flex items-center">
                    <div className="flex mr-2">
                      {renderStars(4.8)}
                    </div>
                    <span className="text-gray-700 font-medium">4.8</span>
                    <span className="text-gray-500 ml-1">({reviews.length} reviews)</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  {doctor.residence && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      {doctor.residence}
                    </div>
                  )}
                  {doctor.physician_languages && doctor.physician_languages.length > 0 && (
                    <div className="flex items-center">
                      <Languages className="h-4 w-4 mr-1 text-gray-400" />
                      {doctor.physician_languages.map((l: any) => l.language).join(', ')}
                    </div>
                  )}
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                    Consultation Fee: ${doctor.consultation_fee}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row">
            {/* Left Column - Doctor Details */}
            <div className="md:w-2/3 p-6">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
                <p className="text-gray-700">
                  {doctor.bio || 'No bio available for this doctor.'}
                </p>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Education</h2>
                {doctor.physician_education && doctor.physician_education.length > 0 ? (
                  <div className="space-y-4">
                    {doctor.physician_education.map((edu: any) => (
                      <div key={edu.id} className="flex">
                        <div className="flex-shrink-0 w-2 bg-blue-100 rounded-full mr-4"></div>
                        <div>
                          <h3 className="font-medium text-gray-900">{edu.institution}</h3>
                          <p className="text-gray-600">{edu.degree} in {edu.field_of_study}</p>
                          <p className="text-sm text-gray-500">
                            {edu.start_date} - {edu.end_date || 'Present'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No education information available.</p>
                )}
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Experience</h2>
                {doctor.physician_employment && doctor.physician_employment.length > 0 ? (
                  <div className="space-y-4">
                    {doctor.physician_employment.map((exp: any) => (
                      <div key={exp.id} className="flex">
                        <div className="flex-shrink-0 w-2 bg-green-100 rounded-full mr-4"></div>
                        <div>
                          <h3 className="font-medium text-gray-900">{exp.position}</h3>
                          <p className="text-gray-600">{exp.employer_name}</p>
                          <p className="text-sm text-gray-500">
                            {exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No experience information available.</p>
                )}
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Patient Reviews</h2>
                  <div className="flex items-center">
                    <div className="flex mr-2">
                      {renderStars(4.8)}
                    </div>
                    <span className="text-gray-700 font-medium">4.8</span>
                    <span className="text-gray-500 ml-1">({reviews.length} reviews)</span>
                  </div>
                </div>

                {reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                        <div className="flex items-start">
                          {review.member_image ? (
                            <img
                              src={review.member_image}
                              alt={review.member_name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User2 className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="flex items-center">
                              <h3 className="font-medium text-gray-900 mr-2">{review.member_name}</h3>
                              <span className="text-sm text-gray-500">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex mt-1 mb-2">
                              {renderStars(review.rating)}
                            </div>
                            <p className="text-gray-700">{review.comment}</p>
                            <button className="mt-2 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              Helpful
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No reviews yet.</p>
                )}
              </div>
            </div>

            {/* Right Column - Book Appointment */}
            <div className="md:w-1/3 bg-gray-50 p-6 border-t md:border-t-0 md:border-l border-gray-200">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Book Appointment</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Time Slots
                  </label>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-3 text-sm rounded-md focus:outline-none ${
                            selectedSlot === slot
                              ? 'bg-pink-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No available slots for this date.</p>
                  )}
                </div>
                
                <button
                  disabled={!selectedSlot}
                  onClick={handleBookAppointment}
                  className={`w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    !selectedSlot
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500'
                  }`}
                >
                  <Calendar className="mr-2 h-5 w-5" />
                  Book Appointment
                </button>
                
                <button
                  onClick={() => navigate(`/queries?doctor=${id}`)}
                  className="mt-4 w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Ask a Question
                </button>
              </div>

              <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-medium text-gray-900 mb-2">Working Hours</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Monday - Friday</span>
                    <span className="text-gray-700">9:00 AM - 5:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Saturday</span>
                    <span className="text-gray-700">9:00 AM - 1:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sunday</span>
                    <span className="text-gray-700">Closed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 