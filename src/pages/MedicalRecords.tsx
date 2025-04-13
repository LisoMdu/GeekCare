import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, User2, FileText, Download, Plus, Filter,
  Clock, Calendar, Stethoscope, Pill, ChevronDown, Upload
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MessageLoading } from '../components/ui/message-loading';

interface MedicalRecord {
  id: string;
  title: string;
  type: string;
  date: string;
  physician_name: string;
  file_url: string;
  description: string;
}

export function MedicalRecords() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [activeRecord, setActiveRecord] = useState<MedicalRecord | null>(null);
  const [filter, setFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  
  useEffect(() => {
    fetchMemberData();
    fetchMedicalRecords();
  }, []);

  const fetchMemberData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: memberData, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!memberData) {
        navigate('/login');
        return;
      }

      setMember(memberData);
    } catch (error) {
      console.error('Error fetching member data:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalRecords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('member_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
      
      // Set first record as active if available
      if (data && data.length > 0 && !activeRecord) {
        setActiveRecord(data[0]);
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `medical-records/${fileName}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('medical-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      
      // Get public URL for the file
      const { data: urlData } = supabase.storage
        .from('medical-files')
        .getPublicUrl(filePath);

      // Create record in database
      const { data, error } = await supabase
        .from('medical_records')
        .insert([
          {
            member_id: user.id,
            title: file.name.replace(`.${fileExt}`, ''),
            type: 'document',
            date: new Date().toISOString(),
            file_url: urlData.publicUrl,
            description: 'Uploaded by member'
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      // Add to records and make active
      setRecords([data, ...records]);
      setActiveRecord(data);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    navigate('/home');
  };

  const filteredRecords = () => {
    if (filter === 'all') return records;
    return records.filter(record => record.type === filter);
  };

  if (loading) {
    return <MessageLoading />;
  }

  return (
    <div className="flex-1 bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
          <div className="inline-flex items-center space-x-3">
            <span className="text-gray-700 font-medium">Filter by:</span>
            <div className="relative">
              <button 
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                {filter === 'all' ? 'All Records' : 
                 filter === 'lab' ? 'Lab Results' : 
                 filter === 'prescription' ? 'Prescriptions' : 'Documents'}
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>
              <div className="absolute z-10 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 hidden">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  {['all', 'lab', 'prescription', 'document'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilter(type)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      role="menuitem"
                    >
                      {type === 'all' ? 'All Records' : 
                       type === 'lab' ? 'Lab Results' : 
                       type === 'prescription' ? 'Prescriptions' : 'Documents'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <label className="relative cursor-pointer bg-pink-500 hover:bg-pink-600 text-white rounded-lg px-4 py-2 inline-flex items-center shadow-sm">
            <input 
              type="file" 
              className="hidden"
              onChange={handleFileUpload} 
              disabled={uploading}
            />
            {uploading ? (
              <span className="inline-flex items-center">
                <Upload className="h-4 w-4 mr-2 animate-bounce" />
                Uploading...
              </span>
            ) : (
              <span className="inline-flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Upload Record
              </span>
            )}
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left sidebar - Records list */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-medium text-gray-900">Your Records</h2>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(100vh-240px)]">
              {filteredRecords().length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No records found. Upload your first medical record.
                </div>
              ) : (
                <div className="divide-y">
                  {filteredRecords().map((record) => (
                    <button
                      key={record.id}
                      onClick={() => setActiveRecord(record)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        activeRecord?.id === record.id ? 'bg-pink-50' : ''
                      }`}
                    >
                      <div className="flex items-start">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-3
                          ${record.type === 'lab' ? 'bg-blue-100' : 
                            record.type === 'prescription' ? 'bg-green-100' : 'bg-orange-100'}`}>
                          {record.type === 'lab' ? (
                            <FileText className={`h-5 w-5 ${record.type === 'lab' ? 'text-blue-500' : 
                              record.type === 'prescription' ? 'text-green-500' : 'text-orange-500'}`} />
                          ) : record.type === 'prescription' ? (
                            <Pill className="h-5 w-5 text-green-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-orange-500" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 truncate">{record.title}</h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{format(new Date(record.date), 'MMM d, yyyy')}</span>
                          </div>
                          {record.physician_name && (
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <Stethoscope className="h-3 w-3 mr-1" />
                              <span>Dr. {record.physician_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right side - Record viewer */}
          <div className="md:col-span-2 bg-white shadow-sm rounded-lg overflow-hidden">
            {activeRecord ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-medium text-gray-900">{activeRecord.title}</h2>
                    <a
                      href={activeRecord.file_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{format(new Date(activeRecord.date), 'MMMM d, yyyy')}</span>
                    </div>
                    {activeRecord.type && (
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        <span className="capitalize">{activeRecord.type}</span>
                      </div>
                    )}
                    {activeRecord.physician_name && (
                      <div className="flex items-center">
                        <Stethoscope className="h-4 w-4 mr-1" />
                        <span>Dr. {activeRecord.physician_name}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-4 flex-grow overflow-y-auto">
                  {activeRecord.description && (
                    <div className="mb-4">
                      <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-700">{activeRecord.description}</p>
                    </div>
                  )}
                  
                  <div className="bg-gray-100 p-4 rounded-lg flex items-center justify-center min-h-[300px]">
                    {activeRecord.file_url.endsWith('.pdf') ? (
                      <iframe 
                        src={`${activeRecord.file_url}#toolbar=0`} 
                        className="w-full h-[500px]"
                        title={activeRecord.title}
                      />
                    ) : activeRecord.file_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                      <img 
                        src={activeRecord.file_url} 
                        alt={activeRecord.title} 
                        className="max-w-full max-h-[500px] object-contain" 
                      />
                    ) : (
                      <div className="text-center">
                        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Preview not available</p>
                        <a
                          href={activeRecord.file_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center mt-4 px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download file to view
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 text-center">
                <div>
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Record Selected</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Select a record from the list to view it here, or upload a new medical record.
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