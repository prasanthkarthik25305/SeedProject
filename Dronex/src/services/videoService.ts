import { supabase } from '@/integrations/supabase/client';
import { awsService, VideoAnalysisResult } from './awsService';

export interface VideoUploadResult {
  success: boolean;
  videoUrl?: string;
  analysisId?: string;
  error?: string;
}

export class VideoService {
  async validateVideoFile(file: File): Promise<{ valid: boolean; error?: string }> {
    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'];
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload MP4, MOV, or AVI files only.'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size too large. Please upload videos smaller than 100MB.'
      };
    }

    return { valid: true };
  }

  async uploadVideo(file: File): Promise<VideoUploadResult> {
    try {
      // Validate file
      const validation = await this.validateVideoFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Check user authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Check if user email is verified
      if (!user.email_confirmed_at) {
        return {
          success: false,
          error: 'Please verify your email before uploading videos'
        };
      }

      // Process upload with AWS service
      const analysisResult = await awsService.processVideoUpload(file);

      return {
        success: true,
        videoUrl: analysisResult.video_url,
        analysisId: analysisResult.id
      };

    } catch (error) {
      console.error('Video upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload video'
      };
    }
  }

  async getVideoAnalysis(analysisId: string): Promise<VideoAnalysisResult | null> {
    try {
      const { data, error } = await supabase
        .from('video_analysis')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching video analysis:', error);
      return null;
    }
  }

  async getUserVideos(userId: string): Promise<VideoAnalysisResult[]> {
    try {
      const { data, error } = await supabase
        .from('video_analysis')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user videos:', error);
      return [];
    }
  }

  async deleteVideo(analysisId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('video_analysis')
        .delete()
        .eq('id', analysisId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting video:', error);
      return false;
    }
  }
}

export const videoService = new VideoService();
export default videoService;