import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface VoiceRecorderProps {
  onClose: () => void;
  onSend: (url: string) => void;
  roomId: string;
  userId: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onClose, onSend, roomId, userId }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Start recording
  const startRecording = async () => {
    try {
      chunksRef.current = [];
      setError(null);
      setAudioBlob(null);
      setAudioUrl(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // Combine chunks into a single blob
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Create URL for playback
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };
  
  // Upload audio and send message
  const uploadAndSend = async () => {
    if (!audioBlob) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      // Generate unique filename
      const filename = `voice-message-${uuidv4()}.webm`;
      const filePath = `${roomId}/${filename}`;
      
      console.log(`Attempting to upload voice message to bucket 'voice-messages', path: ${filePath}`);
      
      // Upload to Supabase storage
      const { data, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(filePath, audioBlob, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }
      
      console.log('Voice message uploaded successfully');
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(filePath);
      
      console.log('Generated public URL:', publicUrl);
      
      // Call the onSend callback with the URL
      onSend(publicUrl);
      onClose();
      
    } catch (err: any) {
      console.error('Error uploading voice message:', err);
      
      // Show more detailed error to help with debugging
      let errorMessage = 'Failed to upload voice message. Please try again.';
      if (err?.message) {
        errorMessage += ` (${err.message})`;
      }
      if (err?.statusCode) {
        errorMessage += ` Code: ${err.statusCode}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop recording if active
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Revoke any object URLs to prevent memory leaks
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [isRecording, audioUrl]);
  
  return (
    <div className="voice-recorder bg-white p-4 rounded-lg shadow-lg w-full max-w-xs">
      <div className="flex flex-col items-center gap-4">
        {/* Recording UI */}
        {!audioUrl && (
          <>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100">
              {isRecording ? (
                <Square 
                  className="w-8 h-8 text-red-500 cursor-pointer" 
                  onClick={stopRecording} 
                />
              ) : (
                <Mic 
                  className="w-8 h-8 text-blue-500 cursor-pointer" 
                  onClick={startRecording} 
                />
              )}
            </div>
            
            {isRecording ? (
              <div className="recording-indicator flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium">Recording: {formatTime(recordingTime)}</span>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Tap microphone to start recording</p>
            )}
          </>
        )}
        
        {/* Playback UI */}
        {audioUrl && (
          <div className="w-full">
            <audio src={audioUrl} controls className="w-full mb-4" />
            
            <div className="flex gap-2">
              <button 
                onClick={() => setAudioUrl(null)}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Discard
              </button>
              
              <button 
                onClick={uploadAndSend}
                disabled={isUploading}
                className="flex-1 py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-blue-300 flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        
        {/* Cancel button */}
        {!isUploading && (
          <button 
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 mt-2"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}; 