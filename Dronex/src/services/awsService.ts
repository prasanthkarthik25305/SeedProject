import {
  RekognitionClient,
  StartLabelDetectionCommand,
  GetLabelDetectionCommand,
  DetectLabelsCommand,
} from "@aws-sdk/client-rekognition";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { supabase } from '@/integrations/supabase/client';

// AWS Configuration
const AWS_CONFIG = {
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
  secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
  bucketName: import.meta.env.VITE_AWS_S3_BUCKET || 'dronex-videos',
  roleArn: import.meta.env.VITE_AWS_REKOGNITION_ROLE_ARN || '',
  snsTopicArn: import.meta.env.VITE_AWS_SNS_TOPIC_ARN || '',
};

export interface VideoAnalysisResult {
  id: string;
  video_url: string;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  detected_objects: any[];
  disaster_indicators: any[];
  confidence_scores: Record<string, number>;
  aws_job_id?: string;
  created_at: string;
}

class AWSService {
  private rekognitionClient: RekognitionClient;
  private s3Client: S3Client;

  constructor() {
    const clientConfig = {
      region: AWS_CONFIG.region,
      credentials: {
        accessKeyId: AWS_CONFIG.accessKeyId,
        secretAccessKey: AWS_CONFIG.secretAccessKey,
      }
    };

    this.rekognitionClient = new RekognitionClient(clientConfig);
    this.s3Client = new S3Client(clientConfig);
  }

  async uploadVideoToS3(file: File): Promise<string> {
    try {
      const key = `dronex-videos/${Date.now()}-${file.name}`;
      
      const command = new PutObjectCommand({
        Bucket: AWS_CONFIG.bucketName,
        Key: key,
        Body: file,
        ContentType: file.type,
        Metadata: {
          'uploaded-by': 'dronex-app',
          'upload-time': new Date().toISOString(),
        }
      });

      await this.s3Client.send(command);
      
      // Return the S3 URL
      return `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new Error('Failed to upload video to S3');
    }
  }

  async analyzeVideoWithRekognition(s3Url: string): Promise<string> {
    try {
      // Extract S3 key from URL
      const s3Key = s3Url.split('.amazonaws.com/')[1];
      
      const command = new StartLabelDetectionCommand({
        Video: {
          S3Object: {
            Bucket: AWS_CONFIG.bucketName,
            Name: s3Key
          }
        },
        MinConfidence: 70,
        Features: ['GENERAL_LABELS']
      });

      const response = await this.rekognitionClient.send(command);
      return response.JobId || '';
    } catch (error) {
      console.error('Error starting Rekognition analysis:', error);
      throw new Error('Failed to start video analysis');
    }
  }

  async getRekognitionResults(jobId: string): Promise<any> {
    try {
      const command = new GetLabelDetectionCommand({ JobId: jobId });
      const response = await this.rekognitionClient.send(command);
      
      return {
        status: response.JobStatus,
        labels: response.Labels || [],
        disasters: this.detectDisasterIndicators(response.Labels || []),
        confidence: this.calculateConfidenceScores(response.Labels || [])
      };
    } catch (error) {
      console.error('Error getting Rekognition results:', error);
      throw new Error('Failed to get analysis results');
    }
  }

  private detectDisasterIndicators(labels: any[]): any[] {
    const disasterKeywords = [
      'fire', 'flame', 'smoke', 'flood', 'water', 'debris', 'destruction',
      'collapsed', 'damaged', 'emergency', 'rescue', 'accident', 'disaster',
      'evacuation', 'injured', 'medical', 'ambulance', 'police', 'helicopter'
    ];

    return labels.filter(label => {
      const labelName = label.Label?.Name?.toLowerCase() || '';
      return disasterKeywords.some(keyword => 
        labelName.includes(keyword) && label.Label?.Confidence > 70
      );
    });
  }

  private calculateConfidenceScores(labels: any[]): Record<string, number> {
    const scores: Record<string, number> = {};
    
    labels.forEach(label => {
      if (label.Label?.Name && label.Label?.Confidence) {
        scores[label.Label.Name] = label.Label.Confidence;
      }
    });

    return scores;
  }

  async saveAnalysisToSupabase(
    videoUrl: string, 
    analysisResult: any, 
    userId: string
  ): Promise<VideoAnalysisResult> {
    try {
      const { data, error } = await supabase
        .from('video_analysis')
        .insert({
          user_id: userId,
          video_url: videoUrl,
          analysis_status: analysisResult.status === 'SUCCEEDED' ? 'completed' : 'processing',
          detected_objects: analysisResult.labels,
          disaster_indicators: analysisResult.disasters,
          confidence_scores: analysisResult.confidence,
          aws_job_id: analysisResult.jobId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving analysis to Supabase:', error);
      throw new Error('Failed to save analysis results');
    }
  }

  async processVideoUpload(file: File): Promise<VideoAnalysisResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Step 1: Upload to S3
      console.log('Uploading video to S3...');
      const s3Url = await this.uploadVideoToS3(file);

      // Step 2: Start Rekognition analysis
      console.log('Starting Rekognition analysis...');
      const jobId = await this.analyzeVideoWithRekognition(s3Url);

      // Step 3: Save initial record to Supabase
      const initialResult = {
        status: 'IN_PROGRESS',
        labels: [],
        disasters: [],
        confidence: {},
        jobId
      };

      const analysisRecord = await this.saveAnalysisToSupabase(s3Url, initialResult, user.id);

      // Step 4: Poll for results (in background)
      this.pollForResults(jobId, analysisRecord.id);

      return analysisRecord;
    } catch (error) {
      console.error('Error processing video upload:', error);
      throw error;
    }
  }

  private async pollForResults(jobId: string, recordId: string): Promise<void> {
    const maxAttempts = 20; // 10 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const results = await this.getRekognitionResults(jobId);

        if (results.status === 'SUCCEEDED') {
          // Update Supabase record with results
          await supabase
            .from('video_analysis')
            .update({
              analysis_status: 'completed',
              detected_objects: results.labels,
              disaster_indicators: results.disasters,
              confidence_scores: results.confidence,
            })
            .eq('id', recordId);

          console.log('Video analysis completed successfully');
        } else if (results.status === 'FAILED') {
          await supabase
            .from('video_analysis')
            .update({ analysis_status: 'failed' })
            .eq('id', recordId);

          console.error('Video analysis failed');
        } else if (results.status === 'IN_PROGRESS' && attempts < maxAttempts) {
          // Continue polling
          setTimeout(poll, 30000); // Poll every 30 seconds
        } else if (attempts >= maxAttempts) {
          console.error('Video analysis timed out');
          await supabase
            .from('video_analysis')
            .update({ analysis_status: 'failed' })
            .eq('id', recordId);
        }
      } catch (error) {
        console.error('Error polling for results:', error);
      }
    };

    // Start polling after 30 seconds
    setTimeout(poll, 30000);
  }
}

export const awsService = new AWSService();
export default awsService;