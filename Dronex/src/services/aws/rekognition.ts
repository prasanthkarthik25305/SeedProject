import {
  RekognitionClient,
  StartLabelDetectionCommand,
  GetLabelDetectionCommand
} from "@aws-sdk/client-rekognition";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { AWS_CONFIG } from './config';

export class DroneXRekognitionService {
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

  async uploadVideo(file: File): Promise<string> {
    const key = `dronex-videos/${Date.now()}-${file.name}`;
    
    const command = new PutObjectCommand({
      Bucket: AWS_CONFIG.bucketName,
      Key: key,
      Body: file,
      ContentType: file.type
    });

    await this.s3Client.send(command);
    return key;
  }

  async analyzeVideo(videoKey: string) {
    // Start video analysis
    const startCommand = new StartLabelDetectionCommand({
      Video: {
        S3Object: {
          Bucket: AWS_CONFIG.bucketName,
          Name: videoKey
        }
      },
      NotificationChannel: {
        RoleArn: AWS_CONFIG.roleArn,
        SNSTopicArn: AWS_CONFIG.snsTopicArn
      },
      MinConfidence: 70
    });

    const startResponse = await this.rekognitionClient.send(startCommand);
    return startResponse.JobId;
  }

  async getResults(jobId: string) {
    const getCommand = new GetLabelDetectionCommand({ JobId: jobId });
    const response = await this.rekognitionClient.send(getCommand);
    
    return {
      status: response.JobStatus,
      labels: response.Labels || [],
      disasters: this.detectDisasters(response.Labels || []),
      firstObject: response.Labels?.[0] || null
    };
  }

  private detectDisasters(labels: any[]) {
    const disasterKeywords = [
      'fire', 'flood', 'earthquake', 'tornado', 'hurricane',
      'collapsed building', 'debris', 'smoke', 'destruction'
    ];

    return labels.filter(label => 
      disasterKeywords.some(keyword => 
        label.Label?.Name?.toLowerCase().includes(keyword)
      )
    );
  }
}
