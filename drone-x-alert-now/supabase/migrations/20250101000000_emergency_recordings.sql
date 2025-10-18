-- Create emergency_recordings table for storing voice emergency alerts
CREATE TABLE IF NOT EXISTS emergency_recordings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    audio_data text NOT NULL,
    analysis_result jsonb,
    urgency_level text CHECK (urgency_level IN ('low', 'medium', 'high')),
    keywords text[],
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (safe to run multiple times)
DO $$
BEGIN
    BEGIN
        ALTER TABLE emergency_recordings ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'RLS already enabled on emergency_recordings';
    END;
END $$;

-- Create policies (safe with DROP IF EXISTS)
DROP POLICY IF EXISTS "Users can insert their own emergency recordings" ON emergency_recordings;
CREATE POLICY "Users can insert their own emergency recordings" ON emergency_recordings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own emergency recordings" ON emergency_recordings;
CREATE POLICY "Users can view their own emergency recordings" ON emergency_recordings
    FOR SELECT USING (auth.uid() = user_id);

-- Create indexes (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS emergency_recordings_user_id_idx ON emergency_recordings(user_id);
CREATE INDEX IF NOT EXISTS emergency_recordings_urgency_idx ON emergency_recordings(urgency_level);
CREATE INDEX IF NOT EXISTS emergency_recordings_created_at_idx ON emergency_recordings(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger safely
DROP TRIGGER IF EXISTS update_emergency_recordings_updated_at ON emergency_recordings;
CREATE TRIGGER update_emergency_recordings_updated_at 
    BEFORE UPDATE ON emergency_recordings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
