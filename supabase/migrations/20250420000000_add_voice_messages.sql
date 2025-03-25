-- -----------------------------------------------------------------------------
-- Voice Messages Migration - Run this script in the Supabase SQL Editor to set up
-- the voice messaging functionality.
-- -----------------------------------------------------------------------------

BEGIN;

-- Create storage bucket for voice messages if it doesn't exist
DO $$
BEGIN
    -- Check if bucket already exists
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'voice-messages') THEN
        -- Create the bucket
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('voice-messages', 'voice-messages', true);
        
        RAISE NOTICE 'Created voice-messages bucket';
    ELSE
        RAISE NOTICE 'voice-messages bucket already exists';
    END IF;
END $$;

-- Remove the CORS update statement that was causing the error
-- Different versions of Supabase handle CORS configuration differently
-- You may need to configure CORS through the Supabase dashboard instead

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Voice messages are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own voice messages" ON storage.objects;

-- RLS policies for voice messages storage
CREATE POLICY "Voice messages are publicly accessible" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'voice-messages');

CREATE POLICY "Authenticated users can upload voice messages" 
  ON storage.objects 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'voice-messages');
  
CREATE POLICY "Users can update their own voice messages" 
  ON storage.objects 
  FOR UPDATE 
  TO authenticated 
  USING (bucket_id = 'voice-messages' AND owner = auth.uid());

CREATE POLICY "Users can delete their own voice messages" 
  ON storage.objects 
  FOR DELETE 
  TO authenticated 
  USING (bucket_id = 'voice-messages' AND owner = auth.uid());

-- Add voice_message field to chat_messages table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_messages' 
        AND column_name = 'voice_message_url'
    ) THEN
        ALTER TABLE public.chat_messages 
        ADD COLUMN voice_message_url TEXT DEFAULT NULL;
        
        RAISE NOTICE 'Added voice_message_url column to chat_messages table';
    ELSE
        RAISE NOTICE 'voice_message_url column already exists';
    END IF;
END $$;

-- Create index for optimizing voice message queries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'chat_messages'
        AND indexname = 'idx_chat_messages_voice_message'
    ) THEN
        CREATE INDEX idx_chat_messages_voice_message 
        ON public.chat_messages (voice_message_url) 
        WHERE voice_message_url IS NOT NULL;
        
        RAISE NOTICE 'Created index on voice_message_url';
    ELSE
        RAISE NOTICE 'Index already exists';
    END IF;
END $$;

-- Add comment to explain the column's purpose
COMMENT ON COLUMN public.chat_messages.voice_message_url IS 'URL to stored voice message in the voice-messages bucket';

COMMIT; 