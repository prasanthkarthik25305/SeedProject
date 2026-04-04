import requests
import json
import base64
from typing import Dict, Optional

class DisasterDetectionAPI:
    """
    Python API client for disaster detection system
    """
    
    def __init__(self, api_url: str = "http://localhost:8000"):
        self.api_url = api_url.rstrip('/')
        
    def detect_disaster_from_file(self, image_path: str) -> Dict:
        """
        Send image file to API for disaster detection
        """
        try:
            with open(image_path, 'rb') as f:
                files = {'file': f}
                response = requests.post(f"{self.api_url}/detect", files=files)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return {"error": str(e), "is_disaster": False}
    
    def detect_disaster_from_base64(self, base64_data: str, filename: str = "image.jpg") -> Dict:
        """
        Send base64 image data to API for disaster detection
        """
        try:
            # Decode base64
            image_data = base64.b64decode(base64_data)
            
            # Send to API
            files = {'file': (filename, image_data, 'image/jpeg')}
            response = requests.post(f"{self.api_url}/detect", files=files)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e), "is_disaster": False}
    
    def get_recent_detections(self, limit: int = 10) -> Dict:
        """
        Get recent detections from API
        """
        try:
            response = requests.get(f"{self.api_url}/detections?limit={limit}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}

# Example usage
if __name__ == "__main__":
    api = DisasterDetectionAPI()
    
    # Test with a sample image (replace with actual path)
    result = api.detect_disaster_from_file("test_image.jpg")
    print("Detection Result:", json.dumps(result, indent=2))
