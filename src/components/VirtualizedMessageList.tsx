import React, { useRef, useState, useEffect } from 'react';
import { VariableSizeList as List } from 'react-window';
import { AlertTriangle, RefreshCw, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';

// Types
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

interface VirtualizedMessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onRetry: (content: string) => void;
  onAudioPlay: (audioElement: HTMLAudioElement) => void;
}

// Simple version of AutoSizer that doesn't require external dependency
const SimpleAutoSizer: React.FC<{children: (size: {height: number, width: number}) => React.ReactNode}> = ({ children }) => {
  const [size, setSize] = useState({ height: 500, width: 300 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      if (containerRef.current) {
        const { offsetHeight, offsetWidth } = containerRef.current;
        setSize({ height: offsetHeight, width: offsetWidth });
      }
    };
    
    // Initial size
    updateSize();
    
    // Add resize listener
    window.addEventListener('resize', updateSize);
    
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  return (
    <div ref={containerRef} className="h-full w-full">
      {children(size)}
    </div>
  );
};

export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({ 
  messages, 
  currentUserId, 
  onRetry, 
  onAudioPlay 
}) => {
  const listRef = useRef<List>(null);
  const rowHeights = useRef<{[key: string]: number}>({});
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  
  // Format timestamp
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'h:mm a');
    } catch (error) {
      return '';
    }
  };
  
  // Set default height for message rows
  const getRowHeight = (index: number) => {
    return rowHeights.current[index] || 80;
  };
  
  // Update row height when content changes
  const setRowHeight = (index: number, size: number) => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
    rowHeights.current = { ...rowHeights.current, [index]: size };
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
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1);
    }
  }, [messages.length]);
  
  // Render a message row
  const MessageRow = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const message = messages[index];
    const messageRef = useRef<HTMLDivElement>(null);
    
    // Measure and update row height after render
    useEffect(() => {
      if (messageRef.current) {
        const height = messageRef.current.getBoundingClientRect().height;
        if (height > 0 && height !== rowHeights.current[index]) {
          setRowHeight(index, height + 16); // Add padding
        }
      }
    }, [message, index]);
    
    return (
      <div style={style} className="py-2">
        <div 
          ref={messageRef}
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
      </div>
    );
  };
  
  return (
    <div className="h-full w-full">
      <SimpleAutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={height}
            itemCount={messages.length}
            itemSize={getRowHeight}
            width={width}
            overscanCount={5}
            initialScrollOffset={messages.length * 80} // Approximate initial scroll to bottom
          >
            {MessageRow}
          </List>
        )}
      </SimpleAutoSizer>
    </div>
  );
}; 