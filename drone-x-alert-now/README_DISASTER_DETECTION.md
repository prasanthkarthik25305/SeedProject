# 🐍 Python Disaster Detection System

Complete modular disaster detection pipeline using CLIP and YOLOv8 with real-time API integration.

## 🚀 Quick Start

### 1. Setup Environment
```bash
python setup_disaster_detection.py
```

### 2. Start the API Server
```bash
python disaster_detection_pipeline.py
```

### 3. Access the Web Interface
- Open your React app
- Go to Dashboard → **Python AI** tab
- Upload images for real-time CLIP + YOLOv8 analysis

## 🏗️ System Architecture

### **Core Pipeline Components**

1. **CLIP Zero-Shot Classification**
   - Uses OpenAI's CLIP model for disaster classification
   - Zero-shot learning with custom disaster prompts
   - Confidence scoring for each disaster type

2. **YOLOv8 Object Detection**
   - Real-time object detection with bounding boxes
   - 80 COCO classes (person, car, building, etc.)
   - Confidence scores and precise coordinates

3. **Decision Logic Engine**
   - Applies confidence thresholds
   - Determines disaster vs non-disaster
   - Calculates severity levels

4. **SQLite Database Storage**
   - Persistent storage of all detections
   - Detailed object metadata
   - Timestamp and confidence tracking

5. **FastAPI REST API**
   - Real-time image processing endpoint
   - Database query endpoints
   - Structured JSON responses

## 📁 File Structure

```
drone-x-alert-now/
├── disaster_detection_pipeline.py    # Main Python pipeline
├── disaster_api_client.py          # API client
├── setup_disaster_detection.py     # Environment setup
├── requirements.txt               # Python dependencies
├── src/components/
│   └── PythonDisasterDetection.tsx # React frontend
└── disaster_detections.db         # SQLite database (auto-created)
```

## 🔧 Technical Features

### **Deep Learning Models**
- **CLIP ViT-Base**: OpenAI's vision-language model
- **YOLOv8-Nano**: Ultralytics object detection (optimized for speed)
- **GPU Support**: Automatic CUDA detection and utilization
- **Model Caching**: Models loaded once, reused for all requests

### **Disaster Classification**
```python
disaster_prompts = [
    "a fire accident with flames and smoke",
    "a flood with submerged buildings", 
    "an earthquake with collapsed buildings",
    "a tsunami with large waves",
    "a cyclone or storm",
    "a normal safe scene"
]
```

### **Object Detection**
- 80 COCO object classes
- Bounding box coordinates
- Confidence scores
- Class-specific filtering

### **Database Schema**
```sql
CREATE TABLE detections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    image_path TEXT,
    disaster_type TEXT NOT NULL,
    confidence REAL NOT NULL,
    is_disaster INTEGER NOT NULL,
    severity TEXT DEFAULT 'medium',
    objects_detected TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detected_objects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    detection_id INTEGER,
    object_class TEXT NOT NULL,
    confidence REAL NOT NULL,
    bbox_x1 REAL, bbox_y1 REAL, bbox_x2 REAL, bbox_y2 REAL,
    FOREIGN KEY (detection_id) REFERENCES detections (id)
);
```

## 🌐 API Endpoints

### **POST /detect**
Upload image for disaster detection
```bash
curl -X POST "http://localhost:8000/detect" \
  -F "file=@disaster_image.jpg"
```

**Response:**
```json
{
  "id": 1,
  "is_disaster": true,
  "disaster_type": "a flood with submerged buildings",
  "confidence": 0.82,
  "severity": "high",
  "objects_detected": [
    {"class": "person", "confidence": 0.91},
    {"class": "car", "confidence": 0.87}
  ],
  "timestamp": "2026-04-03T11:30:00",
  "annotated_image_path": "output/annotated_image.jpg"
}
```

### **GET /detections**
Get recent detection history
```bash
curl "http://localhost:8000/detections?limit=10"
```

### **GET /**
API health check
```bash
curl "http://localhost:8000/"
# {"message": "Disaster Detection API", "status": "running"}
```

## 🎯 React Integration

The React frontend (`PythonDisasterDetection.tsx`) provides:

- **Real-time API status** monitoring
- **Image upload** with drag-and-drop
- **Sample images** for testing
- **Live processing** with progress tracking
- **Network visualization** showing alert propagation
- **Resolution workflow** with follow-up prompts
- **Database integration** displaying detection history

## 📊 Output Formats

### **Structured JSON Response**
```json
{
  "is_disaster": true,
  "disaster_type": "a fire accident with flames and smoke",
  "confidence": 0.89,
  "severity": "critical",
  "objects_detected": [
    {
      "class": "person",
      "confidence": 0.94,
      "bbox": {"x1": 120, "y1": 80, "x2": 200, "y2": 160}
    }
  ],
  "timestamp": "2026-04-03T11:30:00.000Z",
  "annotated_image_path": "output/annotated_test.jpg"
}
```

### **Annotated Images**
- Original image with bounding boxes
- Disaster classification banner
- Confidence scores
- Object labels
- Severity color coding

## 🔄 Processing Pipeline

1. **Image Input** → Load and validate image
2. **CLIP Classification** → Zero-shot disaster classification
3. **YOLOv8 Detection** → Object detection with bounding boxes
4. **Decision Logic** → Apply confidence thresholds
5. **Database Storage** → Persist results with metadata
6. **Output Generation** → JSON response + annotated image
7. **Network Alert** → Trigger emergency response workflow

## ⚡ Performance Features

- **GPU Acceleration**: Automatic CUDA detection
- **Model Optimization**: YOLOv8-Nano for speed
- **Batch Processing**: Handle multiple requests
- **Memory Management**: Efficient tensor operations
- **Error Handling**: Graceful fallbacks
- **Logging**: Comprehensive activity tracking

## 🛠️ Installation & Setup

### **Prerequisites**
- Python 3.8+
- CUDA-compatible GPU (optional but recommended)
- 8GB+ RAM (for GPU processing)

### **One-Command Setup**
```bash
# Clone and setup
git clone <repository>
cd drone-x-alert-now
python setup_disaster_detection.py

# Start API server
python disaster_detection_pipeline.py
```

### **Manual Installation**
```bash
pip install torch transformers ultralytics Pillow numpy fastapi uvicorn python-multipart
```

## 🎮 Usage Examples

### **Python API Client**
```python
from disaster_api_client import DisasterDetectionAPI

api = DisasterDetectionAPI("http://localhost:8000")
result = api.detect_disaster_from_file("test_image.jpg")
print(f"Disaster detected: {result['is_disaster']}")
print(f"Type: {result['disaster_type']}")
print(f"Confidence: {result['confidence']:.2%}")
```

### **React Frontend**
1. Start Python API server
2. Open React application
3. Navigate to **Dashboard → Python AI** tab
4. Upload image or use samples
5. View real-time CLIP + YOLOv8 results

## 🔍 Detection Capabilities

### **Disaster Types**
- ✅ **Fire**: Flames, smoke, burning structures
- ✅ **Flood**: Water submersion, flooding
- ✅ **Earthquake**: Collapsed buildings, rubble
- ✅ **Tsunami**: Large waves, coastal flooding
- ✅ **Cyclone**: Storm systems, spiral patterns
- ✅ **Normal**: Safe scenes with no disasters

### **Object Detection**
- **People**: 80+ classes with confidence scores
- **Vehicles**: Cars, trucks, buses, motorcycles
- **Buildings**: Houses, offices, structures
- **Infrastructure**: Roads, bridges, traffic signals
- **Nature**: Trees, water, terrain features

## 📈 Monitoring & Analytics

### **Real-time Metrics**
- Processing time per image
- Confidence distribution
- Disaster type frequency
- Object detection accuracy
- API response times

### **Database Analytics**
```sql
-- Get disaster frequency
SELECT disaster_type, COUNT(*) as count 
FROM detections 
WHERE is_disaster = 1 
GROUP BY disaster_type;

-- Get average confidence by type
SELECT disaster_type, AVG(confidence) as avg_conf 
FROM detections 
GROUP BY disaster_type;
```

## 🚨 Emergency Response Integration

The system triggers automated workflows:

1. **Immediate Alert** to admin network
2. **Geographic Broadcast** to nearby users
3. **Rescue Team Dispatch** based on disaster type
4. **Follow-up Monitoring** with resolution tracking
5. **Database Logging** for audit and analysis

## 🔒 Security & Reliability

- **Input Validation**: Image format and size limits
- **Error Handling**: Graceful failure recovery
- **Rate Limiting**: Prevent API abuse
- **Data Privacy**: Local processing, no external uploads
- **Redundancy**: Fallback mechanisms

## 🎯 Results

You now have a **production-ready disaster detection system** that:

✅ **Uses state-of-the-art AI** (CLIP + YOLOv8)  
✅ **Processes images in real-time** with GPU acceleration  
✅ **Provides structured JSON output** with confidence scores  
✅ **Stores results persistently** in SQLite database  
✅ **Offers REST API** for integration  
✅ **Includes React frontend** with live updates  
✅ **Handles emergency workflows** automatically  
✅ **Supports multiple disaster types** with high accuracy  

**🚁 Your RavNResQ disaster detection is now enterprise-grade!**
