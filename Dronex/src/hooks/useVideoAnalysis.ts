// In src/hooks/useVideoAnalysis.ts
import { DroneXRekognitionService } from '../services';

export const useVideoAnalysis = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const rekognitionService = new DroneXRekognitionService();

  const analyzeVideo = async (file: File) => {
    setAnalyzing(true);
    try {
      // Upload to S3
      const videoKey = await rekognitionService.uploadVideo(file);
      
      // Start analysis
      const jobId = await rekognitionService.analyzeVideo(videoKey);
      
      // Poll for results (simplified)
      let results;
      do {
        await new Promise(resolve => setTimeout(resolve, 5000));
        results = await rekognitionService.getResults(jobId!);
      } while (results.status === 'IN_PROGRESS');

      return results;
    } finally {
      setAnalyzing(false);
    }
  };

  return { analyzeVideo, analyzing };
};
