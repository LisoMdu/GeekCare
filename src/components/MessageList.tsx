import React, { useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, RefreshCw, Play, Pause } from 'lucide-react';

interface Message {
  id: string;
  user_id: string;
  content?: string;
  voice_message_url?: string;
  created_at: string;
  temp?: boolean;
  failed?: boolean;
  offline?: boolean;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onRetry: (content: string) => void;
  onAudioPlay: (audioElement: HTMLAudioElement) => void;
}

export const MessageList = ({ messages, currentUserId, onRetry, onAudioPlay }: MessageListProps) => {
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [playingAudio, setPlayingAudio] = React.useState<string | null>(null);

  // Format timestamp
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'h:mm a');
    } catch (error) {
      return '';
    }
  };

  // Handle audio playback
  const toggleAudioPlayback = (audioUrl: string) => {
    const audioElement = audioRefs.current.get(audioUrl);
    if (!audioElement) return;

    if (playingAudio === audioUrl) {
      // Currently playing, pause it
      audioElement.pause();
      setPlayingAudio(null);
    } else {
      // Not playing, start it
      onAudioPlay(audioElement);
      
      // Set up event listeners for this specific audio element
      const handleEnded = () => setPlayingAudio(null);
      audioElement.addEventListener('ended', handleEnded, { once: true });
      
      // Play and update state
      audioElement.play().catch(err => {
        console.error('Error playing audio:', err);
        setPlayingAudio(null);
      });
      
      setPlayingAudio(audioUrl);
    }
  };

  // Set up audio element refs
  useEffect(() => {
    messages.forEach(message => {
      if (message.voice_message_url && !audioRefs.current.has(message.voice_message_url)) {
        const audio = new Audio(message.voice_message_url);
        audioRefs.current.set(message.voice_message_url, audio);
      }
    });

    // Cleanup
    return () => {
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, [messages]);

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div 
          key={message.id} 
          className={`flex ${message.user_id === currentUserId ? 'justify-end' : 'justify-start'}`}
        >
          <div 
            className={`max-w-[70%] rounded-lg p-3 ${
              message.user_id === currentUserId 
                ? message.failed ? 'bg-red-100 text-gray-800 border border-red-300' 
                : message.temp ? 'bg-blue-400 text-white' 
                : 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {/* Voice Message */}
            {message.voice_message_url ? (
              <div className="voice-message flex items-center space-x-2">
                <button
                  onClick={() => toggleAudioPlayback(message.voice_message_url!)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.user_id === currentUserId 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                  title={playingAudio === message.voice_message_url ? "Pause" : "Play"}
                >
                  {playingAudio === message.voice_message_url ? (
                    <Pause size={16} />
                  ) : (
                    <Play size={16} />
                  )}
                </button>
                
                <div className="flex-1">
                  <div className="audio-progress h-1.5 rounded-full overflow-hidden"
                    style={{
                      backgroundColor: message.user_id === currentUserId ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div 
                      className={`h-full ${
                        message.user_id === currentUserId ? 'bg-white' : 'bg-gray-500'
                      } ${playingAudio === message.voice_message_url ? 'animate-progress' : ''}`} 
                      style={{ 
                        width: playingAudio === message.voice_message_url ? '100%' : '0%',
                        transition: 'width 1s linear'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm break-words">{message.content}</p>
            )}
            
            {/* Message status */}
            <div className="flex items-center justify-end mt-1 text-xs">
              {message.created_at && (
                <span className={
                  message.user_id === currentUserId 
                    ? message.failed ? 'text-red-500' 
                    : message.temp ? 'text-blue-100' 
                    : 'text-blue-100' 
                    : 'text-gray-500'
                }>
                  {formatTime(message.created_at)}
                </span>
              )}
              
              {message.temp && !message.failed && (
                <span className="ml-1 italic">
                  {message.offline ? 'offline' : 'sending...'}
                </span>
              )}
              
              {message.failed && (
                <div className="flex items-center ml-1">
                  <AlertTriangle className="w-3 h-3 text-red-500 mr-1" />
                  <span className="text-red-500">Failed</span>
                  <button 
                    onClick={() => message.content && onRetry(message.content)}
                    className="ml-2 p-1 rounded-full hover:bg-red-200 transition-colors"
                    title="Retry sending"
                  >
                    <RefreshCw className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}; 