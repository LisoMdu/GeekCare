import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Bell, User2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ChatList } from '../components/ChatList';
import { ChatMessages } from '../components/ChatMessages';
import { MessageLoading } from '../components/ui/message-loading';
import { SkeletonChatList, SkeletonChatMessages } from '../components/ui/skeletons';

export function Inbox() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [userType, setUserType] = useState<'member' | 'physician'>('member');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    checkUserTypeAndFetchData();
  }, []);

  const checkUserTypeAndFetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user is a member
      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (memberData) {
        setMember(memberData);
        setUserType('member');
        await fetchMemberChats(user.id);
      } else {
        // Check if user is a physician
        const { data: physicianData } = await supabase
          .from('physicians')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (physicianData) {
          setMember(physicianData);
          setUserType('physician');
          await fetchPhysicianChats(user.id);
        } else {
          // Not a member or physician, redirect to login
          navigate('/login');
        }
      }
    } catch (error) {
      console.error('Error checking user type:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberChats = async (memberId: string) => {
    try {
      // Fetch chat rooms for member
      const { data: chatRooms, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          physician:physician_id (
            id,
            full_name,
            profile_image_url
          ),
          last_message:chat_messages (
            id,
            content,
            created_at
          )
        `)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process chat rooms to get only the last message
      const processedChats = chatRooms.map(chat => ({
        ...chat,
        last_message: chat.last_message && chat.last_message.length > 0 
          ? chat.last_message[0] 
          : null
      }));

      setChats(processedChats);
      
      // Select the first chat by default if available
      if (processedChats.length > 0 && !selectedChat) {
        setSelectedChat(processedChats[0]);
      }
    } catch (error) {
      console.error('Error fetching member chats:', error);
    }
  };

  const fetchPhysicianChats = async (physicianId: string) => {
    try {
      // Fetch chat rooms for physician
      const { data: chatRooms, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          member:member_id (
            id,
            full_name,
            profile_image_url
          ),
          last_message:chat_messages (
            id,
            content,
            created_at
          )
        `)
        .eq('physician_id', physicianId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process chat rooms to get only the last message
      const processedChats = chatRooms.map(chat => ({
        ...chat,
        last_message: chat.last_message && chat.last_message.length > 0 
          ? chat.last_message[0] 
          : null
      }));

      setChats(processedChats);
      
      // Select the first chat by default if available
      if (processedChats.length > 0 && !selectedChat) {
        setSelectedChat(processedChats[0]);
      }
    } catch (error) {
      console.error('Error fetching physician chats:', error);
    }
  };

  const handleSelectChat = (chat: any) => {
    setSelectedChat(chat);
  };

  const handleBackToHome = () => {
    if (userType === 'member') {
      navigate('/home');
    } else {
      navigate('/physician/dashboard');
    }
  };

  const handleNewChat = () => {
    setIsNewChatModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsNewChatModalOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearchLoading(true);
      
      if (userType === 'member') {
        // Search for physicians
        const { data, error } = await supabase
          .from('physicians')
          .select(`
            id, 
            full_name, 
            profile_image_url,
            physician_specialties (specialty)
          `)
          .ilike('full_name', `%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } else {
        // Search for members
        const { data, error } = await supabase
          .from('members')
          .select('id, full_name, profile_image_url')
          .ilike('full_name', `%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCreateChat = async (userId: string) => {
    try {
      console.log("Creating chat with user ID:", userId);
      if (!userId) {
        console.error("No user ID provided");
        return;
      }

      const newChat = {
        member_id: userType === 'member' ? member.id : userId,
        physician_id: userType === 'physician' ? member.id : userId,
      };
      
      console.log("Attempting to create chat with:", newChat);

      // Check if chat already exists
      const { data: existingChat, error: checkError } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          member:member_id (*),
          physician:physician_id (*)
        `)
        .eq('member_id', newChat.member_id)
        .eq('physician_id', newChat.physician_id)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking for existing chat:", checkError);
        throw checkError;
      }

      let finalChat;
      if (existingChat) {
        // Chat already exists, just select it
        console.log("Chat already exists, selecting:", existingChat);
        finalChat = existingChat;
      } else {
        // Create new chat
        console.log("Creating new chat room");
        const { data: createdChat, error: createError } = await supabase
          .from('chat_rooms')
          .insert(newChat)
          .select()
          .single();

        if (createError) {
          console.error("Error creating chat:", createError);
          throw createError;
        }

        console.log("New chat created:", createdChat);
        
        // We need to fetch the chat with related data
        const { data: fullChat, error: fetchError } = await supabase
          .from('chat_rooms')
          .select(`
            *,
            member:member_id (*),
            physician:physician_id (*)
          `)
          .eq('room_id', createdChat.room_id)
          .single();
          
        if (fetchError) {
          console.error("Error fetching complete chat data:", fetchError);
          throw fetchError;
        }
        
        finalChat = fullChat;
      }

      console.log("Setting selected chat to:", finalChat);
      setSelectedChat(finalChat);

      // Close modal
      handleCloseModal();
      
      // Refetch chat list to ensure it's up to date
      if (userType === 'member') {
        await fetchMemberChats(member.id);
      } else {
        await fetchPhysicianChats(member.id);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      alert(`Error creating chat: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Heart className="h-8 w-8 text-pink-500 fill-pink-500" />
                <span className="ml-2 text-2xl font-bold">GeekCare</span>
              </div>
              <div className="flex items-center space-x-6">
                <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </header>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Inbox</h1>
          
          <div className="flex h-[calc(100vh-200px)]">
            <div className="w-1/3 mr-4">
              <SkeletonChatList />
            </div>
            <div className="flex-1">
              <SkeletonChatMessages />
            </div>
          </div>
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
            <div className="flex items-center space-x-6">
              <button className="text-gray-600 hover:text-gray-900">
                <Bell className="h-6 w-6" />
              </button>
              <button 
                onClick={() => navigate(userType === 'member' ? '/profile' : '/physician/profile')}
                className="flex items-center space-x-2"
              >
                {member?.profile_image_url ? (
                  <img
                    src={member.profile_image_url}
                    alt={member.full_name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User2 className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <span className="text-gray-700">Hi, {member?.full_name?.split(' ')[0]}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleNewChat}
              className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Chat
            </button>
            <button
              onClick={handleBackToHome}
              className="text-pink-500 hover:text-pink-600"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 h-[calc(100vh-230px)]">
          {/* Chat List */}
          <div className="col-span-1">
            <ChatList 
              chats={chats} 
              selectedChatId={selectedChat?.room_id || null}
              onSelectChat={handleSelectChat}
              userType={userType}
            />
          </div>

          {/* Chat Messages */}
          <div className="col-span-2">
            {selectedChat ? (
              <ChatMessages 
                selectedChat={selectedChat} 
                isMember={userType === 'member'} 
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-white rounded-lg shadow-sm">
                <p className="text-gray-500">Select a conversation to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Chat Modal */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              Start a New Conversation
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search for {userType === 'member' ? 'a Doctor' : 'a Patient'}
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search by name...`}
                  className="flex-1 rounded-l-lg border border-gray-300 p-2 focus:outline-none focus:border-pink-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || searchLoading}
                  className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-r-lg disabled:opacity-50"
                >
                  Search
                </button>
              </div>
            </div>

            {searchLoading ? (
              <div className="text-center py-4">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-pink-500 border-t-transparent"></div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleCreateChat(user.id)}
                    className="w-full text-left p-3 hover:bg-pink-50 flex items-center border-b border-gray-100 cursor-pointer transition-colors duration-150 active:bg-pink-100"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleCreateChat(user.id);
                      }
                    }}
                  >
                    {user.profile_image_url ? (
                      <img
                        src={user.profile_image_url}
                        alt={user.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User2 className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="ml-3 flex-1">
                      <h3 className="font-medium text-gray-900">
                        {userType === 'member' ? 'Dr. ' : ''}{user.full_name}
                      </h3>
                      {userType === 'member' && user.physician_specialties && user.physician_specialties[0] && (
                        <p className="text-sm text-gray-500">
                          {user.physician_specialties[0].specialty}
                        </p>
                      )}
                    </div>
                    <div className="text-pink-500">
                      <span className="text-sm">Select</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery && !searchLoading ? (
              <p className="text-gray-500 text-center py-2">No results found</p>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="text-gray-600 hover:text-gray-900 mr-4"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 