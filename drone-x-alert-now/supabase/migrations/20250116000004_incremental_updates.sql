-- Safe Incremental Migration - Only adds missing verification features
-- Run this after the previous migrations to add contact verification system

-- 1. Add missing verification columns to emergency_contacts if they don't exist
DO $$ 
BEGIN
    -- Note: Basic columns like photo_url, gender, is_mutual, is_online, trust_level 
    -- are already handled by 20250116000002_emergency_contact_network_update.sql
    
    -- Add verification_status column (for contact verification)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'emergency_contacts' 
                   AND column_name = 'verification_status') THEN
        ALTER TABLE emergency_contacts ADD COLUMN verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed'));
        RAISE NOTICE 'Added verification_status column to emergency_contacts';
    END IF;
    
    -- Add verification_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'emergency_contacts' 
                   AND column_name = 'verification_type') THEN
        ALTER TABLE emergency_contacts ADD COLUMN verification_type text CHECK (verification_type IN ('email', 'sms', 'id', 'mutual'));
        RAISE NOTICE 'Added verification_type column to emergency_contacts';
    END IF;
    
    -- Add verified_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'emergency_contacts' 
                   AND column_name = 'verified_at') THEN
        ALTER TABLE emergency_contacts ADD COLUMN verified_at timestamp with time zone;
        RAISE NOTICE 'Added verified_at column to emergency_contacts';
    END IF;
END $$;

-- Note: Tables like emergency_chat_messages, user_emergency_profiles, emergency_groups
-- are already created by 20250116000002_emergency_contact_network_update.sql

-- 2. Add verification policies (safe to rerun)
DO $$
BEGIN
    -- Update existing policies to handle verification
    DROP POLICY IF EXISTS "Users can view contacts that added them" ON emergency_contacts;
    CREATE POLICY "Users can view contacts that added them" ON emergency_contacts
        FOR SELECT USING (
            auth.uid() = contact_user_id OR 
            (verification_status = 'verified' AND contact_user_id IS NOT NULL)
        );
        
    RAISE NOTICE 'Updated emergency contacts policies for verification';
END $$;

-- 3. Create indexes for verification features (safe with IF NOT EXISTS)
DO $$
BEGIN    
    -- Create index on emergency_contacts.verification_status
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
                   WHERE c.relname = 'emergency_contacts_verification_status_idx' AND n.nspname = 'public') THEN
        CREATE INDEX emergency_contacts_verification_status_idx ON emergency_contacts(verification_status);
        RAISE NOTICE 'Created index on emergency_contacts.verification_status';
    END IF;
    
    -- Create index on emergency_contacts.verified_at
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
                   WHERE c.relname = 'emergency_contacts_verified_at_idx' AND n.nspname = 'public') THEN
        CREATE INDEX emergency_contacts_verified_at_idx ON emergency_contacts(verified_at);
        RAISE NOTICE 'Created index on emergency_contacts.verified_at';
    END IF;
    
    RAISE NOTICE 'Completed verification indexes';
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '✅ Verification features added successfully!';
    RAISE NOTICE '✔️ Contact verification columns and policies are now ready';
    RAISE NOTICE 'ℹ️ Main features (chat, groups, storage) handled by migration 20250116000002';
END $$;
