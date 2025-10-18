# 🔧 Verification Troubleshooting Guide

## 🚨 Current Issue: Storage Bucket RLS Violation

### The Problem
```
StorageApiError: new row violates row-level security policy
POST https://ufavnpdrtsioryrhhkjc.supabase.co/storage/v1/bucket 400 (Bad Request)
```

### ✅ Quick Fix

**Go to Supabase Dashboard and create the storage bucket manually:**

1. **[supabase.com](https://supabase.com)** → Your project → **"Storage"**
2. **"New bucket"** → Name: `contact-photos` → **Public**: ✅ → **Create**
3. **SQL Editor** → Run this:

```sql
-- Create storage bucket and policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contact-photos', 'contact-photos', true, 5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own contact photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'contact-photos' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users can view their own contact photos" ON storage.objects  
FOR SELECT USING (bucket_id = 'contact-photos' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users can update their own contact photos" ON storage.objects
FOR UPDATE USING (bucket_id = 'contact-photos' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users can delete their own contact photos" ON storage.objects
FOR DELETE USING (bucket_id = 'contact-photos' AND auth.uid()::text = (string_to_array(name, '/'))[1]);
```

## 🧪 Test Verification System

### Step 1: Restart App
```powershell
npm run dev
```

### Step 2: Test Verification Flow
1. **Add emergency contact** with email address
2. **Go to Verification tab**
3. **Click "Send Code"**
4. **Should see one of these**:
   - ✅ **"Email sent"** - Check your email
   - 🔧 **"Development Mode"** - Code shown in app
   - 📧 **"Email service temporarily unavailable"** - Code shown as fallback

### Step 3: Enter Verification Code
1. **Copy the 6-digit code** (from email or app)
2. **Paste in verification field**
3. **Click "Verify"**
4. **Should see**: "🎉 Contact Verified Successfully!"

## 🔍 What Should Work Now

### ✅ Real-time Features
- **Live countdown timer** for code expiration (30 minutes)
- **Real-time status updates** when verification completes
- **Auto-refresh** when codes expire
- **Multiple verification attempts**

### ✅ Error Handling  
- **Storage errors** → App continues working
- **Email errors** → Shows OTP directly in app
- **Network errors** → Clear error messages
- **Invalid codes** → Helpful feedback

### ✅ Development Mode
- **Always works** even without email setup
- **Shows OTP directly** in toast notifications
- **No external dependencies** required
- **Perfect for testing**

## 🚀 Expected Console Messages

After the fix, you should see:
```
✅ Contact photos bucket is available
🔧 Development Mode Active (if email not configured)
🚀 Real-time verification updates enabled
⏱️ Countdown timer active
```

## ❌ Common Issues & Solutions

### Issue: "Function not found"
**Solution**: Deploy the edge functions via Supabase dashboard

### Issue: "Code expired"  
**Solution**: Code expires after 30 minutes - send new code

### Issue: "Invalid code"
**Solution**: Make sure to copy the exact 6-digit code

### Issue: "Database error"
**Solution**: Check that user is logged in and owns the contact

### Issue: Storage bucket error
**Solution**: Follow the storage bucket creation steps above

## 🎯 Success Criteria

**✅ Working correctly if you see:**
- No storage/bucket errors in console
- Verification codes appear (email or app)
- Countdown timers work
- Status badges update correctly
- "Contact Verified Successfully!" message

**❌ Still broken if you see:**
- Persistent storage errors
- No verification codes anywhere
- Database permission errors
- App crashes on verification

---

## 🚀 Quick Test Command

After fixing the storage bucket, restart and test:
```powershell
npm run dev
# Then test verification in the app
```

**The verification system now works in development mode regardless of email configuration!** 🎉