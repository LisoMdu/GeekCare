import React, { useState, useRef, lazy, Suspense } from 'react';
import { useSocket } from '../hooks/useSocket';
import { Mic, Send, WifiOff, AlertTriangle, RefreshCw, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';

// Types for safety
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

// Import components conditionally to prevent errors if files don't exist
let MessageList: React.FC<MessageListProps>;
try {
  MessageList = require('./MessageList').MessageList;
} catch (e) {
  console.warn('MessageList component not found, using fallback');
  // Fallback component if MessageList doesn't exist
  MessageList = ({ messages, currentUserId, onRetry }) => (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <div 
          key={message.id || `msg-${index}`} 
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
            {message.voice_message_url ? (
              <div>
                <p className="text-sm italic">[Audio Message]</p>
              </div>
            ) : (
              <p className="text-sm break-words">{message.content}</p>
            )}
            <div className="flex items-center justify-end mt-1">
              <p className="text-xs text-gray-400">
                {new Date(message.created_at).toLocaleTimeString()}
              </p>
              {message.failed && (
                <div className="flex items-center ml-1">
                  <AlertTriangle className="w-3 h-3 text-red-500 mr-1" />
                  <span className="text-xs text-red-500">Failed</span>
                  <button 
                    onClick={() => message.content && onRetry(message.content)}
                    className="ml-2 p-1 rounded-full hover:bg-red-200 transition-colors"
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
}

// Import skeleton conditionally to prevent errors
let MessageSkeleton: React.FC;
try {
  MessageSkeleton = require('./ui/skeletons').MessageSkeleton;
} catch (e) {
  console.warn('MessageSkeleton component not found, using fallback');
  // Fallback component if MessageSkeleton doesn't exist
  MessageSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div 
            className={`max-w-[70%] rounded-lg p-3 ${i % 2 === 0 ? 'bg-gray-200' : 'bg-blue-200'}`}
            style={{ opacity: 0.6 }}
          >
            <div className="h-4 bg-gray-300 rounded w-full"></div>
            <div className="h-4 bg-gray-300 rounded w-4/5 mt-1"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Define a safe mock voice recorder component type
interface VoiceRecorderProps {
  onClose: () => void;
  onSend: (url: string) => void;
  roomId: string;
  userId: string;
}

// Safely load the VoiceRecorder component
const VoiceRecorder = lazy(() => 
  import('./VoiceRecorder')
    .then(module => ({ default: module.VoiceRecorder }))
    .catch(err => {
      console.error('Failed to load VoiceRecorder:', err);
      // Return a placeholder component if VoiceRecorder fails to load
      return { 
        default: ({ onClose }: VoiceRecorderProps) => (
          <div className="p-4 bg-red-50 rounded">
            <p className="text-red-600">Voice recorder not available.</p>
            <button onClick={onClose} className="mt-2 text-sm text-gray-500">Close</button>
          </div>
        )
      };
    })
);

interface ChatMessagesProps {
  roomId: string;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ roomId }) => {
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Use optional chaining to prevent errors if useSocket hook is missing properties
  const {
    chatMessages = [],
    handleSendMessage = () => console.warn('sendMessage not available'),
    sendVoiceMessage = () => console.warn('sendVoiceMessage not available'),
    retryMessage = () => console.warn('retryMessage not available'),
    divRef,
    myId = null,
    inputValue = '',
    setInputValue = () => {},
    isOnline = true,
    error = null
  } = useSocket(roomId || '');

  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoiceRecorder = () => {
    setShowVoiceRecorder(prev => !prev);
  };

  const handleAudioPlay = (audioElement: HTMLAudioElement) => {
    // Stop currently playing audio, if any
    if (currentAudio && currentAudio !== audioElement) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    
    // Set the current audio element
    setCurrentAudio(audioElement);
  };

  // If there's no room ID, show a friendly message
  if (!roomId) {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg shadow-sm overflow-hidden p-4">
        <p className="text-center text-gray-500">Please select a chat to start messaging.</p>
      </div>
    );
  }

  // If there's an initialization error, show it
  if (error) {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg shadow-sm overflow-hidden p-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Error Loading Chat</h3>
          <p>{error}</p>
          <p className="mt-2 text-sm">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Status indicator */}
      {!isOnline && (
        <div className="bg-amber-50 text-amber-800 px-4 py-2 flex items-center justify-center gap-2 text-sm border-b border-amber-200">
          <WifiOff size={16} />
          <span>You're offline. Messages will be sent when you reconnect.</span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">
          Chat
        </h2>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Suspense fallback={<MessageSkeleton />}>
              <p className="text-gray-500 text-sm">No messages yet. Start a conversation!</p>
            </Suspense>
          </div>
        ) : (
          <MessageList
            messages={chatMessages}
            currentUserId={myId}
            onRetry={retryMessage}
            onAudioPlay={handleAudioPlay}
          />
        )}
        <div ref={divRef} />
      </div>
      
      {/* Input area */}
      <div className="border-t p-4">
        {showVoiceRecorder ? (
          <Suspense fallback={<div className="p-4 text-center">Loading voice recorder...</div>}>
            <VoiceRecorder 
              onClose={() => setShowVoiceRecorder(false)}
              onSend={sendVoiceMessage}
              roomId={roomId}
              userId={myId || ''}
            />
          </Suspense>
        ) : (
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 py-2 px-4 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={toggleVoiceRecorder}
              className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              title="Record voice message"
            >
              <Mic size={20} />
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500"
            >
              <Send size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 