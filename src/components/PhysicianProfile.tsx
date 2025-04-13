import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PhysicianProfileForm } from './PhysicianProfileForm';

export function PhysicianProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [physician, setPhysician] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchPhysicianData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
    }
  };

  const fetchPhysicianData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const { data: physicianData, error: fetchError } = await supabase
        .from('physicians')
        .select(`
          *,
          physician_specialties (
            id,
            specialty
          ),
          physician_languages (
            id,
            language
          ),
          physician_education (
            id,
            institution,
            degree,
            field_of_study,
            start_date,
            end_date,
            file_url
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
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!physicianData) throw new Error('Physician profile not found');

      setPhysician(physicianData);
    } catch (err) {
      console.error('Error fetching physician data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PhysicianProfileForm physician={physician} onUpdate={fetchPhysicianData} />
      </div>
    </div>
  );
}