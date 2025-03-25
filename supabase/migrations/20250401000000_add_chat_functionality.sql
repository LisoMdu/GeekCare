-- -----------------------------------------------------------------------------
-- Chat System Migration - Run this script in the Supabase SQL Editor to set up
-- the chat functionality. Make sure to run the script in a transaction.
-- -----------------------------------------------------------------------------

BEGIN;

-- Create chat_rooms table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id SERIAL PRIMARY KEY,
  room_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  physician_id UUID NOT NULL REFERENCES public.physicians(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  title TEXT,
  UNIQUE(member_id, physician_id)
);

-- Create chat_messages table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id SERIAL PRIMARY KEY,
  chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(room_id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- can be either member_id or physician_id
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL
);

-- Add indexes for performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_chat_rooms_member_id ON public.chat_rooms(member_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_physician_id ON public.chat_rooms(physician_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_room_id ON public.chat_messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Add RLS policies (drop existing ones first to avoid conflicts)
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can insert their own chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can view messages in their chat rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their chat rooms" ON public.chat_messages;

-- Policy for chat_rooms: users can only access rooms they belong to
CREATE POLICY "Users can view their own chat rooms"
  ON public.chat_rooms
  FOR SELECT
  USING (
    auth.uid() = member_id OR 
    auth.uid() = physician_id
  );

CREATE POLICY "Users can insert their own chat rooms"
  ON public.chat_rooms
  FOR INSERT
  WITH CHECK (
    auth.uid() = member_id OR 
    auth.uid() = physician_id
  );

-- Policy for chat_messages: users can only access messages in rooms they belong to
CREATE POLICY "Users can view messages in their chat rooms"
  ON public.chat_messages
  FOR SELECT
  USING (
    chat_room_id IN (
      SELECT room_id FROM public.chat_rooms
      WHERE member_id = auth.uid() OR physician_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their chat rooms"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    chat_room_id IN (
      SELECT room_id FROM public.chat_rooms
      WHERE member_id = auth.uid() OR physician_id = auth.uid()
    ) AND
    auth.uid() = user_id
  );

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.update_chat_room_timestamp() CASCADE;

-- Function to update chat_rooms.updated_at when a new message is added
CREATE OR REPLACE FUNCTION public.update_chat_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_rooms
  SET updated_at = NOW()
  WHERE room_id = NEW.chat_room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS update_chat_room_timestamp ON public.chat_messages;

-- Trigger to update chat_rooms.updated_at
CREATE TRIGGER update_chat_room_timestamp
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_room_timestamp();

COMMIT; 