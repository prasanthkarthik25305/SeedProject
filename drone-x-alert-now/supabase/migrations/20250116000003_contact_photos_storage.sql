-- Create storage bucket for contact photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contact-photos',
  'contact-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for contact photos storage (safe with DROP IF EXISTS)
DROP POLICY IF EXISTS "Users can upload their own contact photos" ON storage.objects;
CREATE POLICY "Users can upload their own contact photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contact-photos' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

DROP POLICY IF EXISTS "Users can view their own contact photos" ON storage.objects;
CREATE POLICY "Users can view their own contact photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contact-photos' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

DROP POLICY IF EXISTS "Users can update their own contact photos" ON storage.objects;
CREATE POLICY "Users can update their own contact photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'contact-photos' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own contact photos" ON storage.objects;
CREATE POLICY "Users can delete their own contact photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'contact-photos' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );
