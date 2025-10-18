import { supabase } from '@/integrations/supabase/client';

export const initializeStorageBucket = async () => {
  // Skip bucket checking entirely - assume it exists or will be created
  console.log('✅ Storage initialization skipped - using direct bucket access');
  return true;
};

export const getPhotoUrl = (path: string | null): string | null => {
  if (!path) return null;
  
  try {
    const { data } = supabase.storage
      .from('contact-photos')
      .getPublicUrl(path);
    
    return data.publicUrl;
  } catch (error) {
    console.error('Error getting photo URL:', error);
    return null;
  }
};

export const uploadPhoto = async (file: File, userId: string): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `contact-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/contacts/${fileName}`;

    const { data, error } = await supabase.storage
      .from('contact-photos')
      .upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('contact-photos')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Photo upload error:', error);
    return null;
  }
};

export const deletePhoto = async (photoUrl: string): Promise<boolean> => {
  try {
    // Extract file path from URL
    const urlParts = photoUrl.split('/storage/v1/object/public/contact-photos/');
    if (urlParts.length < 2) return false;
    
    const filePath = urlParts[1];
    
    const { error } = await supabase.storage
      .from('contact-photos')
      .remove([filePath]);
    
    if (error) {
      console.error('Delete error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Photo delete error:', error);
    return false;
  }
};