import React, { useState } from 'react';
import { Pencil, Plus, X, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PhysicianProfileFormProps {
  physician: any;
  onUpdate: () => void;
}

export function PhysicianProfileForm({ physician, onUpdate }: PhysicianProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: physician?.full_name || '',
    email: physician?.email || '',
    mobile_number: physician?.mobile_number || '',
    residence: physician?.residence || '',
    date_of_birth: physician?.date_of_birth || null,
    gender: physician?.gender || '',
    specialties: physician?.physician_specialties?.map((s: any) => s.specialty) || [],
    languages: physician?.physician_languages?.map((l: any) => l.language) || [],
    consultation_fee: physician?.consultation_fee || '',
    consultation_duration: physician?.consultation_duration || 30,
  });

  // New state for specialty and language inputs
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSpecialtyAdd = () => {
    if (newSpecialty && !formData.specialties.includes(newSpecialty)) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty],
      }));
      setNewSpecialty(''); // Clear input after adding
    }
  };

  const handleLanguageAdd = () => {
    if (newLanguage && !formData.languages.includes(newLanguage)) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, newLanguage],
      }));
      setNewLanguage(''); // Clear input after adding
    }
  };

  const handleSpecialtyRemove = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty),
    }));
  };

  const handleLanguageRemove = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== language),
    }));
  };

  const handleSave = async () => {
    try {
      setError(null);
      
      // Prepare update data, excluding empty date fields
      const updateData: any = {
        full_name: formData.full_name,
        mobile_number: formData.mobile_number,
        residence: formData.residence,
        gender: formData.gender,
        consultation_fee: formData.consultation_fee,
        consultation_duration: formData.consultation_duration,
      };

      // Only include date_of_birth if it has a value
      if (formData.date_of_birth) {
        updateData.date_of_birth = formData.date_of_birth;
      }

      // Update basic information
      const { error: updateError } = await supabase
        .from('physicians')
        .update(updateData)
        .eq('id', physician.id);

      if (updateError) throw updateError;

      // Update specialties
      await supabase
        .from('physician_specialties')
        .delete()
        .eq('physician_id', physician.id);

      if (formData.specialties.length > 0) {
        await supabase.from('physician_specialties').insert(
          formData.specialties.map(specialty => ({
            physician_id: physician.id,
            specialty,
          }))
        );
      }

      // Update languages
      await supabase
        .from('physician_languages')
        .delete()
        .eq('physician_id', physician.id);

      if (formData.languages.length > 0) {
        await supabase.from('physician_languages').insert(
          formData.languages.map(language => ({
            physician_id: physician.id,
            language,
          }))
        );
      }

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to update profile');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Personal Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Personal Information</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-pink-500 hover:text-pink-600"
          >
            <Pencil className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <div className="mt-1 flex">
              <input
                type="email"
                value={formData.email}
                disabled
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50"
              />
              <button className="ml-2 px-3 py-2 bg-pink-500 text-white rounded-lg">
                Verify
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
            <input
              type="tel"
              name="mobile_number"
              value={formData.mobile_number}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Residence</label>
            <input
              type="text"
              name="residence"
              value={formData.residence}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
              disabled={!isEditing}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-50"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Professional Background */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-6">Professional Background</h2>

        {/* Specialties */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Specialties</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.specialties.map((specialty, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-pink-50 text-pink-500"
              >
                {specialty}
                {isEditing && (
                  <button
                    onClick={() => handleSpecialtyRemove(specialty)}
                    className="ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </span>
            ))}
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                placeholder="Enter specialty"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
              />
              <button
                onClick={handleSpecialtyAdd}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-pink-500 hover:bg-pink-600"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </button>
            </div>
          )}
        </div>

        {/* Languages */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Languages</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.languages.map((language, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-pink-50 text-pink-500"
              >
                {language}
                {isEditing && (
                  <button
                    onClick={() => handleLanguageRemove(language)}
                    className="ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </span>
            ))}
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                placeholder="Enter language"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
              />
              <button
                onClick={handleLanguageAdd}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-pink-500 hover:bg-pink-600"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </button>
            </div>
          )}
        </div>

        {/* Consultation Fee */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Consultation Fee (USD)</label>
            <input
              type="number"
              name="consultation_fee"
              value={formData.consultation_fee}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
            <input
              type="number"
              name="consultation_duration"
              value={formData.consultation_duration}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Education and Details */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-6">Education and Details</h2>
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="mb-4">
              <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            </div>
            <p className="text-gray-600 mb-2">Upload your medical school files</p>
            <button className="text-pink-500 font-medium hover:text-pink-600">
              Browse Files
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {isEditing && (
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}