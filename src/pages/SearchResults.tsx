import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Heart, Star, MapPin, Languages, User2, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SearchFilters {
  specialty: string;
  date: string;
  minPrice: number;
  maxPrice: number;
  gender?: string;
  language?: string;
}

export function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [physicians, setPhysicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    specialty: searchParams.get('specialty') || '',
    date: searchParams.get('date') || '',
    minPrice: 0,
    maxPrice: 1000,
  });

  useEffect(() => {
    fetchPhysicians();
  }, []);

  const fetchPhysicians = async () => {
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
          )
        `);

      if (error) throw error;
      setPhysicians(data || []);
    } catch (error) {
      console.error('Error fetching physicians:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = (physicianId: string) => {
    navigate(`/book/${physicianId}`);
  };

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
              Back to Home
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {loading ? 'Loading...' : `${physicians.length} Physicians Found`}
          </h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <select
                  value={filters.gender || ''}
                  onChange={(e) => setFilters({ ...filters, gender: e.target.value || undefined })}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                >
                  <option value="">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Language</label>
                <select
                  value={filters.language || ''}
                  onChange={(e) => setFilters({ ...filters, language: e.target.value || undefined })}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                >
                  <option value="">Any</option>
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="Mandarin">Mandarin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Price Range</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: Number(e.target.value) })}
                    placeholder="Min"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
                    placeholder="Max"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {physicians.map((physician) => (
            <div key={physician.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start">
                  {physician.profile_image_url ? (
                    <img
                      src={physician.profile_image_url}
                      alt={physician.full_name}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                      <User2 className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                  <div className="ml-6 flex-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">Dr. {physician.full_name}</h2>
                      <div className="flex items-center">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        <span className="ml-1 text-gray-600">4.8</span>
                      </div>
                    </div>
                    <p className="text-gray-600 mt-1">
                      {physician.physician_specialties?.[0]?.specialty}
                    </p>
                    <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {physician.residence || 'Location not specified'}
                      </div>
                      <div className="flex items-center">
                        <Languages className="w-4 h-4 mr-1" />
                        {physician.physician_languages?.map((l: any) => l.language).join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Consultation Fee</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      ${physician.consultation_fee}
                    </p>
                  </div>
                  <button
                    onClick={() => handleBookAppointment(physician.id)}
                    className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                  >
                    Book Appointment
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loading && physicians.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No physicians found.</p>
          </div>
        )}
      </main>
    </div>
  );
}