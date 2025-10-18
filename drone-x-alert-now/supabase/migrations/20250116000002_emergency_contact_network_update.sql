-- Enhanced Emergency Contact Network System - Update Existing Schema
-- This migration updates existing tables and adds new ones for the WhatsApp-like emergency contact system

-- 1. Update existing emergency_contacts table with new columns
DO $$ 
BEGIN
    -- Add contact_user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'emergency_contacts' 
                   AND column_name = 'contact_user_id') THEN
        ALTER TABLE emergency_contacts ADD COLUMN contact_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add other missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'emergency_contacts' 
                   AND column_name = 'photo_url') THEN
        ALTER TABLE emergency_contacts ADD COLUMN photo_url text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'emergency_contacts' 
                   AND column_name = 'gender') THEN
        ALTER TABLE emergency_contacts ADD COLUMN gender text CHECK (gender IN ('male', 'female', 'other'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'emergency_contacts' 
                   AND column_name = 'is_mutual') THEN
        ALTER TABLE emergency_contacts ADD COLUMN is_mutual boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'emergency_contacts' 
                   AND column_name = 'trust_level') THEN
        ALTER TABLE emergency_contacts ADD COLUMN trust_level integer DEFAULT 1 CHECK (trust_level BETWEEN 1 AND 3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'emergency_contacts' 
                   AND column_name = 'last_seen') THEN
        ALTER TABLE emergency_contacts ADD COLUMN last_seen timestamp with time zone;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'emergency_contacts' 
                   AND column_name = 'is_online') THEN
        ALTER TABLE emergency_contacts ADD COLUMN is_online boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'emergency_contacts' 
                   AND column_name = 'emergency_code_hash') THEN
        ALTER TABLE emergency_contacts ADD COLUMN emergency_code_hash text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'emergency_contacts' 
                   AND column_name = 'response_time_avg') THEN
        ALTER TABLE emergency_contacts ADD COLUMN response_time_avg integer;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'emergency_contacts' 
                   AND column_name = 'availability_pattern') THEN
        ALTER TABLE emergency_contacts ADD COLUMN availability_pattern jsonb;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'emergency_contacts' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE emergency_contacts ADD COLUMN updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
END $$;

-- 2. Create User Profiles table for additional user information
CREATE TABLE IF NOT EXISTS user_emergency_profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    display_name text,
    avatar_url text,
    gender text CHECK (gender IN ('male', 'female', 'other')),
    phone_verified boolean DEFAULT false,
    id_verified boolean DEFAULT false,
    emergency_code_hash text,
    medical_info jsonb, -- emergency medical information
    emergency_contacts_visible boolean DEFAULT true,
    last_seen_visible boolean DEFAULT true,
    online_status_visible boolean DEFAULT true,
    location_sharing_enabled boolean DEFAULT false,
    current_location jsonb,
    safe_location jsonb, -- user's designated safe location
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Emergency Groups table for group chats
CREATE TABLE IF NOT EXISTS emergency_groups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    group_type text DEFAULT 'manual' CHECK (group_type IN ('manual', 'auto_emergency', 'location_based', 'broadcast')),
    admin_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    photo_url text,
    is_active boolean DEFAULT true,
    location_based_radius integer, -- radius in meters for location-based groups
    center_location jsonb, -- center point for location-based groups
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Emergency Group Members table
CREATE TABLE IF NOT EXISTS emergency_group_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id uuid REFERENCES emergency_groups(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text DEFAULT 'member' CHECK (role IN ('admin', 'member', 'moderator')),
    joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_read_at timestamp with time zone,
    notifications_enabled boolean DEFAULT true,
    UNIQUE(group_id, user_id)
);

-- 5. Create Emergency Chat Messages table for WhatsApp-like messaging
CREATE TABLE IF NOT EXISTS emergency_chat_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id uuid REFERENCES emergency_groups(id) ON DELETE CASCADE,
    content text NOT NULL,
    message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image', 'location', 'emergency', 'system')),
    audio_url text,
    image_url text,
    location_data jsonb,
    replied_to_id uuid REFERENCES emergency_chat_messages(id),
    status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    is_emergency boolean DEFAULT false,
    emergency_type text,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Emergency Broadcasts table for one-to-many emergency alerts
CREATE TABLE IF NOT EXISTS emergency_broadcasts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    broadcast_type text DEFAULT 'emergency' CHECK (broadcast_type IN ('emergency', 'status_update', 'safe_check')),
    urgency_level text DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    location_data jsonb,
    attachment_url text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create Broadcast Recipients table to track delivery status
CREATE TABLE IF NOT EXISTS emergency_broadcast_recipients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    broadcast_id uuid REFERENCES emergency_broadcasts(id) ON DELETE CASCADE NOT NULL,
    recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'responded')),
    response text,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    responded_at timestamp with time zone,
    UNIQUE(broadcast_id, recipient_id)
);

-- 8. Create Contact Verification Requests table
CREATE TABLE IF NOT EXISTS contact_verification_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    contact_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    verification_code text NOT NULL,
    request_type text DEFAULT 'mutual_contact' CHECK (request_type IN ('mutual_contact', 'emergency_code', 'identity')),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(requester_id, contact_id, request_type)
);

-- Enable Row Level Security on all tables
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_emergency_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_verification_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
DROP POLICY IF EXISTS "Users can manage their own contacts" ON emergency_contacts;
DROP POLICY IF EXISTS "Users can view contacts that added them" ON emergency_contacts;

-- RLS Policies for emergency_contacts
CREATE POLICY "Users can manage their own contacts" ON emergency_contacts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view contacts that added them" ON emergency_contacts
    FOR SELECT USING (auth.uid() = contact_user_id);

-- RLS Policies for user_emergency_profiles
CREATE POLICY "Users can manage their own profile" ON user_emergency_profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Emergency contacts can view limited profile info" ON user_emergency_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM emergency_contacts 
            WHERE (contact_user_id = auth.uid() AND user_id = user_emergency_profiles.user_id) OR
                  (user_id = auth.uid() AND contact_user_id = user_emergency_profiles.user_id)
        )
    );

-- RLS Policies for emergency_groups
CREATE POLICY "Group members can view groups" ON emergency_groups
    FOR SELECT USING (
        auth.uid() = admin_id OR 
        EXISTS (SELECT 1 FROM emergency_group_members WHERE group_id = emergency_groups.id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can manage their groups" ON emergency_groups
    FOR ALL USING (auth.uid() = admin_id);

-- RLS Policies for emergency_group_members
CREATE POLICY "Group members can view members" ON emergency_group_members
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM emergency_group_members egm WHERE egm.group_id = emergency_group_members.group_id AND egm.user_id = auth.uid())
    );

CREATE POLICY "Group admins can manage members" ON emergency_group_members
    FOR ALL USING (
        EXISTS (SELECT 1 FROM emergency_groups WHERE id = group_id AND admin_id = auth.uid())
    );

-- RLS Policies for emergency_chat_messages
CREATE POLICY "Users can view their own messages" ON emergency_chat_messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON emergency_chat_messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update message status" ON emergency_chat_messages
    FOR UPDATE USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

-- RLS Policies for emergency_broadcasts
CREATE POLICY "Senders can manage their broadcasts" ON emergency_broadcasts
    FOR ALL USING (auth.uid() = sender_id);

CREATE POLICY "Recipients can view broadcasts sent to them" ON emergency_broadcasts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM emergency_broadcast_recipients WHERE broadcast_id = emergency_broadcasts.id AND recipient_id = auth.uid())
    );

-- RLS Policies for emergency_broadcast_recipients
CREATE POLICY "Recipients can view and update their delivery status" ON emergency_broadcast_recipients
    FOR ALL USING (auth.uid() = recipient_id);

CREATE POLICY "Senders can view delivery status" ON emergency_broadcast_recipients
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM emergency_broadcasts WHERE id = broadcast_id AND sender_id = auth.uid())
    );

-- RLS Policies for contact_verification_requests
CREATE POLICY "Users can manage verification requests they created" ON contact_verification_requests
    FOR ALL USING (auth.uid() = requester_id OR auth.uid() = contact_id);

-- Create indexes for better performance (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
                   WHERE c.relname = 'emergency_contacts_contact_user_id_idx' AND n.nspname = 'public') THEN
        CREATE INDEX emergency_contacts_contact_user_id_idx ON emergency_contacts(contact_user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
                   WHERE c.relname = 'emergency_chat_messages_sender_idx' AND n.nspname = 'public') THEN
        CREATE INDEX emergency_chat_messages_sender_idx ON emergency_chat_messages(sender_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
                   WHERE c.relname = 'emergency_chat_messages_recipient_idx' AND n.nspname = 'public') THEN
        CREATE INDEX emergency_chat_messages_recipient_idx ON emergency_chat_messages(recipient_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
                   WHERE c.relname = 'emergency_chat_messages_group_idx' AND n.nspname = 'public') THEN
        CREATE INDEX emergency_chat_messages_group_idx ON emergency_chat_messages(group_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
                   WHERE c.relname = 'emergency_chat_messages_created_at_idx' AND n.nspname = 'public') THEN
        CREATE INDEX emergency_chat_messages_created_at_idx ON emergency_chat_messages(created_at DESC);
    END IF;
END $$;

-- Create additional indexes
CREATE INDEX IF NOT EXISTS emergency_groups_admin_idx ON emergency_groups(admin_id);
CREATE INDEX IF NOT EXISTS emergency_group_members_group_idx ON emergency_group_members(group_id);
CREATE INDEX IF NOT EXISTS emergency_group_members_user_idx ON emergency_group_members(user_id);
CREATE INDEX IF NOT EXISTS emergency_broadcasts_sender_idx ON emergency_broadcasts(sender_id);
CREATE INDEX IF NOT EXISTS emergency_broadcasts_created_at_idx ON emergency_broadcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS emergency_broadcast_recipients_broadcast_idx ON emergency_broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS emergency_broadcast_recipients_recipient_idx ON emergency_broadcast_recipients(recipient_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist and create new ones
DROP TRIGGER IF EXISTS update_emergency_contacts_updated_at ON emergency_contacts;
CREATE TRIGGER update_emergency_contacts_updated_at 
    BEFORE UPDATE ON emergency_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_groups_updated_at 
    BEFORE UPDATE ON emergency_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_emergency_profiles_updated_at 
    BEFORE UPDATE ON user_emergency_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for all tables
ALTER TABLE emergency_contacts REPLICA IDENTITY FULL;
ALTER TABLE user_emergency_profiles REPLICA IDENTITY FULL;
ALTER TABLE emergency_groups REPLICA IDENTITY FULL;
ALTER TABLE emergency_group_members REPLICA IDENTITY FULL;
ALTER TABLE emergency_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE emergency_broadcasts REPLICA IDENTITY FULL;
ALTER TABLE emergency_broadcast_recipients REPLICA IDENTITY FULL;
ALTER TABLE contact_verification_requests REPLICA IDENTITY FULL;

-- Add tables to realtime publication (safely)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE emergency_contacts;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_emergency_profiles;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE emergency_groups;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE emergency_group_members;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE emergency_chat_messages;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE emergency_broadcasts;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE emergency_broadcast_recipients;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE contact_verification_requests;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;