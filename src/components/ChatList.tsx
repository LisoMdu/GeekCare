import React from 'react';
import { User2 } from 'lucide-react';
import { format, isValid } from 'date-fns';

interface ChatListProps {
  chats: any[];
  selectedChatId: string | null;
  onSelectChat: (chat: any) => void;
  userType: 'member' | 'physician';
}

export function ChatList({ chats, selectedChatId, onSelectChat, userType }: ChatListProps) {
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (!isValid(date)) return "";
      return format(date, 'MMM d, h:mm a');
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm h-full overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Conversations</h2>
      </div>
      
      <div className="overflow-y-auto h-[calc(100%-60px)]">
        {chats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No conversations yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {chats.map((chat) => {
              // Safely get the other user data
              const otherUser = userType === 'member' ? chat.physician : chat.member;
              const userName = otherUser?.full_name || 'Unknown User';
              const userImage = otherUser?.profile_image_url;
              const specialty = userType === 'member' && 
                chat.physician?.physician_specialties && 
                chat.physician?.physician_specialties[0]?.specialty;
              
              return (
                <button
                  key={chat.room_id}
                  onClick={() => onSelectChat(chat)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedChatId === chat.room_id ? 'bg-pink-50' : ''
                  }`}
                >
                  <div className="flex items-center">
                    {userImage ? (
                      <img
                        src={userImage}
                        alt={userName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <User2 className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="ml-3 flex-1 overflow-hidden">
                      <h3 className="font-medium text-gray-900 truncate">
                        {userType === 'member' ? 'Dr. ' : ''}{userName}
                      </h3>
                      
                      {specialty && (
                        <p className="text-sm text-gray-500 truncate">
                          {specialty}
                        </p>
                      )}
                      
                      {chat.last_message && (
                        <div className="mt-1">
                          <p className="text-sm text-gray-500 truncate max-w-[200px]">
                            {chat.last_message.content || 'No message content'}
                          </p>
                          {chat.last_message.created_at && (
                            <p className="text-xs text-gray-400">
                              {formatTime(chat.last_message.created_at)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 