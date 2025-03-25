import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

type QueuedMessage = {
  id: string;
  content?: string;
  voice_message_url?: string;
  timestamp: number;
};

// Add queue storage/retrieval functions
const saveMessageQueue = (roomId: string, queue: QueuedMessage[]) => {
  try {
    localStorage.setItem(`messageQueue_${roomId}`, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to save message queue to localStorage:', error);
  }
};

const loadMessageQueue = (roomId: string): QueuedMessage[] => {
  try {
    const saved = localStorage.getItem(`messageQueue_${roomId}`);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Failed to load message queue from localStorage:', error);
    return [];
  }
};

export const useSocket = (roomId: string) => {
  // Check if roomId is valid
  if (!roomId) {
    console.warn('useSocket: No roomId provided, chat functionality will be limited');
  }

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [userLoggedData, setUserLoggedData] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [initError, setInitError] = useState<string | null>(null);
  
  const channelRef = useRef<any>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef<boolean>(true);
  const messageQueue = useRef<QueuedMessage[]>([]);
  
  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      console.log('App is online, processing queued messages');
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      console.log('App is offline, messages will be queued');
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load saved message queue from localStorage when hook initializes
  useEffect(() => {
    if (roomId) {
      try {
        messageQueue.current = loadMessageQueue(roomId);
        console.log(`Loaded ${messageQueue.current.length} queued messages for room ${roomId}`);
      } catch (error) {
        console.error('Error loading message queue:', error);
      }
    }
  }, [roomId]);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          throw error;
        }
        
        if (user) {
          console.log("User authenticated:", user.id);
          setUserLoggedData({ id: user.id });
        } else {
          console.warn("No authenticated user found");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setInitError("Could not authenticate user");
      }
    };
    
    fetchUserData();
  }, []);

  // Initialize subscription and fetch messages
  useEffect(() => {
    if (!roomId) {
      console.log("Missing roomId, skipping subscription setup");
      return;
    }

    if (!userLoggedData) {
      console.log("User data not available yet, waiting...");
      return;
    }

    console.log("Setting up message subscription for room:", roomId);

    // Fetch existing messages
    const fetchMessages = async () => {
      try {
        console.log("Fetching messages for room:", roomId);
        const { data: messages, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('chat_room_id', roomId)
          .order('created_at', { ascending: true })
          .limit(100);  // Limit to last 100 messages for performance

        if (error) {
          console.error('Error fetching messages:', error);
          setInitError("Failed to load messages");
          return;
        }

        console.log(`Fetched ${messages?.length || 0} messages`);
        setChatMessages(messages || []);
      } catch (error) {
        console.error("Error in fetchMessages:", error);
        setInitError("Failed to load messages");
      }
    };

    fetchMessages().catch(err => {
      console.error("Unhandled error in fetchMessages:", err);
    });

    // Set up realtime subscription for new messages
    if (!isSubscribed) {
      try {
        // Create a channel for this chat room
        const channel = supabase.channel(`room_${roomId}`, {
          config: {
            broadcast: { self: true }
          }
        });

        // Listen for INSERT events on the chat_messages table
        channel
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `chat_room_id=eq.${roomId}`
          }, (payload) => {
            console.log("New message received from subscription:", payload);
            
            // Check if message is already in the chat (avoid duplicates)
            setChatMessages(prev => {
              const messageExists = prev.some(msg => msg.id === payload.new.id);
              if (messageExists) {
                console.log("Message already exists in state, not adding");
                return prev;
              }
              console.log("Adding new message to chat state");
              return [...prev, payload.new];
            });
          })
          .subscribe((status) => {
            console.log(`Subscription status for room ${roomId}:`, status);
            if (status === 'SUBSCRIBED') {
              setIsSubscribed(true);
            } else if (status === 'CHANNEL_ERROR') {
              console.error("Channel subscription error");
              setInitError("Failed to subscribe to messages");
            }
          });

        // Store channel reference for cleanup
        channelRef.current = channel;

        return () => {
          console.log("Cleaning up subscription");
          if (channelRef.current) {
            channelRef.current.unsubscribe();
            setIsSubscribed(false);
          }
        };
      } catch (error) {
        console.error("Error setting up subscription:", error);
        setInitError("Failed to set up message subscription");
      }
    }
  }, [roomId, userLoggedData, isSubscribed]);

  // Scroll to bottom of messages
  useEffect(() => {
    if (!divRef.current) return;
    
    try {
      console.log("Messages updated, scrolling to bottom");
      const scrollProps: any = {};
      if (!firstRender.current) scrollProps.behavior = 'smooth';
      divRef.current?.scrollIntoView(scrollProps);
      firstRender.current = false;
    } catch (error) {
      console.error("Error scrolling to bottom:", error);
    }
  }, [chatMessages.length]);

  // Process message queue when online
  useEffect(() => {
    // Only process queue when online
    if (!isOnline || isSending || messageQueue.current.length === 0 || !userLoggedData || !roomId) {
      return;
    }
    
    const processQueue = async () => {
      let mounted = true;
      setIsSending(true);
      
      try {
        console.log(`Processing message queue (${messageQueue.current.length} messages)`);
        
        while (messageQueue.current.length > 0 && isOnline && mounted) {
          const nextMessage = messageQueue.current[0];
          console.log("Processing queued message:", nextMessage);
          
          // Prepare message data
          const messageData: any = {
            user_id: userLoggedData.id,
            chat_room_id: roomId,
            created_at: new Date(nextMessage.timestamp).toISOString()
          };
          
          // Add either text content or voice message URL
          if (nextMessage.content) {
            messageData.content = nextMessage.content;
          } else if (nextMessage.voice_message_url) {
            messageData.voice_message_url = nextMessage.voice_message_url;
          }
          
          // Send to server
          const { data, error } = await supabase
            .from('chat_messages')
            .insert(messageData)
            .select()
            .single();
            
          if (error) {
            console.error('Error sending queued message:', error);
            throw error;
          }
          
          // Update UI with real message
          setChatMessages(prev => 
            prev.map(msg => msg.id === nextMessage.id ? { ...data, temp: false } : msg)
          );
          
          // Remove from queue
          messageQueue.current.shift();
          saveMessageQueue(roomId, messageQueue.current);
        }
      } catch (error) {
        console.error('Error processing message queue:', error);
        
        // Mark the message as failed
        if (messageQueue.current.length > 0) {
          const failingMessage = messageQueue.current[0];
          setChatMessages(prev => 
            prev.map(msg => 
              msg.id === failingMessage.id 
                ? { ...msg, temp: false, failed: true } 
                : msg
            )
          );
          
          // Remove failed message
          messageQueue.current.shift();
          saveMessageQueue(roomId, messageQueue.current);
        }
        
        // Add delay before next try
        await new Promise(resolve => setTimeout(resolve, 2000));
      } finally {
        if (mounted) {
          setIsSending(false);
        }
      }
    };
    
    processQueue().catch(err => {
      console.error("Unhandled error in processQueue:", err);
      setIsSending(false);
    });
    
    // Set up periodic queue checking
    const intervalId = setInterval(() => {
      if (messageQueue.current.length > 0 && !isSending && isOnline) {
        processQueue().catch(err => {
          console.error("Unhandled error in interval processQueue:", err);
        });
      }
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [isOnline, isSending, userLoggedData, roomId]);
  
  // Send text message function
  const handleSendMessage = async () => {
    if (!inputValue.trim()) {
      console.log("Empty message, not sending");
      return;
    }
    
    if (!userLoggedData) {
      console.log("User data not available, cannot send message");
      return;
    }
    
    if (!roomId) {
      console.log("No room ID, cannot send message");
      return;
    }

    const messageContent = inputValue.trim();
    console.log("Preparing to send text message:", messageContent);
    
    // Create temporary message ID
    const tempId = `temp-${uuidv4()}`;
    
    // Create message object for queue
    const queuedMessage: QueuedMessage = {
      id: tempId,
      content: messageContent,
      timestamp: Date.now()
    };
    
    // Add message to queue
    messageQueue.current.push(queuedMessage);
    saveMessageQueue(roomId, messageQueue.current);
    
    // Add temporary message to UI
    setChatMessages(prev => [...prev, { 
      id: tempId, 
      user_id: userLoggedData.id,
      chat_room_id: roomId,
      content: messageContent, 
      created_at: new Date().toISOString(),
      temp: true,
      offline: !isOnline
    }]);
    
    // Clear input field immediately
    setInputValue('');
    
    // If online, trigger queue processing
    if (isOnline && !isSending) {
      // Trigger queue processing on next tick
      setTimeout(() => {
        if (messageQueue.current.length > 0 && !isSending) {
          // Will be handled by the useEffect
        }
      }, 0);
    } else {
      console.log("Device is offline, message queued for later sending");
    }
  };
  
  // Send voice message function
  const sendVoiceMessage = async (voiceUrl: string) => {
    if (!voiceUrl) {
      console.log("No voice URL provided");
      return;
    }
    
    if (!userLoggedData) {
      console.log("User data not available, cannot send voice message");
      return;
    }
    
    if (!roomId) {
      console.log("No room ID, cannot send voice message");
      return;
    }
    
    console.log("Preparing to send voice message:", voiceUrl);
    
    // Make sure URL is from the correct bucket
    // This is a safeguard in case the bucket name is inconsistent elsewhere
    const correctedUrl = voiceUrl.replace('voice_messages', 'voice-messages');
    
    // Create temporary message ID
    const tempId = `temp-${uuidv4()}`;
    
    // Create message object for queue
    const queuedMessage: QueuedMessage = {
      id: tempId,
      voice_message_url: correctedUrl,
      timestamp: Date.now()
    };
    
    // Add message to queue
    messageQueue.current.push(queuedMessage);
    saveMessageQueue(roomId, messageQueue.current);
    
    // Add temporary message to UI
    setChatMessages(prev => [...prev, { 
      id: tempId, 
      user_id: userLoggedData.id,
      chat_room_id: roomId,
      voice_message_url: correctedUrl, 
      created_at: new Date().toISOString(),
      temp: true,
      offline: !isOnline
    }]);
    
    // If online, trigger queue processing
    if (isOnline && !isSending) {
      // Trigger queue processing on next tick
      setTimeout(() => {
        if (messageQueue.current.length > 0 && !isSending) {
          // Will be handled by the useEffect
        }
      }, 0);
    } else {
      console.log("Device is offline, voice message queued for later sending");
    }
  };

  // Retry failed message
  const retryMessage = (content: string) => {
    if (!content) {
      console.log("No content to retry");
      return;
    }
    
    if (!userLoggedData) {
      console.log("User data not available, cannot retry message");
      return;
    }
    
    if (!roomId) {
      console.log("No room ID, cannot retry message");
      return;
    }

    console.log("Retrying message:", content);
    
    // Create temporary message ID
    const tempId = `temp-${uuidv4()}`;
    
    // Create message object for queue
    const queuedMessage: QueuedMessage = {
      id: tempId,
      content: content,
      timestamp: Date.now()
    };
    
    // Add to queue
    messageQueue.current.push(queuedMessage);
    saveMessageQueue(roomId, messageQueue.current);
    
    // Add temporary message to UI
    setChatMessages(prev => [...prev, { 
      id: tempId, 
      user_id: userLoggedData.id,
      chat_room_id: roomId,
      content: content, 
      created_at: new Date().toISOString(),
      temp: true 
    }]);
  };
  
  // Check online status
  const checkConnection = async () => {
    try {
      // Try a lightweight call to Supabase to check connection
      await supabase.from('chat_rooms').select('count', { count: 'exact', head: true }).limit(1);
      if (!isOnline) setIsOnline(true);
      return true;
    } catch (error) {
      if (isOnline) setIsOnline(false);
      return false;
    }
  };

  return {
    chatMessages,
    handleSendMessage,
    sendVoiceMessage,
    retryMessage,
    divRef,
    myId: userLoggedData?.id,
    inputValue,
    setInputValue,
    isOnline,
    error: initError
  };
}; 