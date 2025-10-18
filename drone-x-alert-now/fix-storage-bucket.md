# 🔧 Quick Fix: Create Storage Bucket via Dashboard

## The Problem
The app is trying to create a storage bucket client-side, but it lacks permissions. The bucket should be created via the Supabase dashboard.

## 🚀 Quick Fix (2 minutes)

### Step 1: Create Storage Bucket
1. Go to **[supabase.com](https://supabase.com)** → Your project
2. Click **"Storage"** in the left sidebar
3. Click **"New bucket"**
4. **Bucket settings**:
   - **Name**: `contact-photos`
   - **Public bucket**: ✅ **Enabled**
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/gif,image/webp`
5. Click **"Create bucket"**

### Step 2: Set Storage Policies (Important!)
1. Still in **Storage**, click on **"contact-photos"** bucket
2. Go to **"Policies"** tab
3. Click **"New policy"**
4. **Create 4 policies**:

#### Policy 1: Upload
```sql
CREATE POLICY "Users can upload their own contact photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'contact-photos' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);
```

#### Policy 2: View
```sql
CREATE POLICY "Users can view their own contact photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'contact-photos' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);
```

#### Policy 3: Update
```sql
CREATE POLICY "Users can update their own contact photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'contact-photos' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);
```

#### Policy 4: Delete
```sql
CREATE POLICY "Users can delete their own contact photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'contact-photos' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);
```

## ✅ Alternative: SQL Editor Method

If the UI is confusing, go to **SQL Editor** and run:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contact-photos',
  'contact-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their own contact photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'contact-photos' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can view their own contact photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'contact-photos' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can update their own contact photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'contact-photos' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can delete their own contact photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'contact-photos' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);
```

## 🧪 Test After Fix

1. **Restart your dev server**: `npm run dev`
2. **Check browser console**: Should see "✅ Contact photos bucket is available"
3. **Test verification**: Should work without storage errors
4. **Try uploading a contact photo**: Should work properly

---

**This will fix the storage bucket RLS violation error!** 🎯