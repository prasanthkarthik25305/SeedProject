import torch
import sqlite3
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

# Try to import transformers (optional)
try:
    from transformers import CLIPProcessor, CLIPModel
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("⚠️ Transformers not available - using YOLOv8 detection only")

# Computer Vision Models
from ultralytics import YOLO
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import cv2
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DisasterResult:
    """Data class for disaster detection results"""
    is_disaster: bool
    disaster_type: str
    confidence: float
    objects_detected: List[Dict]
    timestamp: str
    image_path: str
    severity: str = "medium"

class DisasterDetectionPipeline:
    """
    Modular Disaster Detection Pipeline using CLIP and YOLOv8
    """
    
    def __init__(self, device: Optional[str] = None, use_clip: bool = False):
        """Initialize pipeline with models"""
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"🖥️ Using device: {self.device}")
        
        # Initialize models
        self._load_models(use_clip and TRANSFORMERS_AVAILABLE)
        
        # Initialize database
        self._init_database()
        
        # Disaster prompts for CLIP
        self.disaster_prompts = [
            "a fire accident with flames and smoke",
            "a flood with submerged buildings", 
            "an earthquake with collapsed buildings",
            "a tsunami with large waves",
            "a cyclone or storm",
            "a normal safe scene"
        ]
        
    def _load_models(self, use_clip: bool):
        """Load CLIP and YOLOv8 models"""
        try:
            logger.info("📥 Loading YOLOv8 model...")
            # PyTorch 2.6+ defaults torch.load(weights_only=True) which can break Ultralytics
            # weight loading. We temporarily patch torch.load to force weights_only=False.
            _orig_torch_load = torch.load
            def _torch_load_no_weights_only(*args, **kwargs):
                kwargs.setdefault("weights_only", False)
                return _orig_torch_load(*args, **kwargs)
            torch.load = _torch_load_no_weights_only
            try:
                self.yolo_model = YOLO("yolov8n.pt")  # Use nano for speed
            finally:
                torch.load = _orig_torch_load
            
            if use_clip and TRANSFORMERS_AVAILABLE:
                logger.info("📥 Loading CLIP model...")
                try:
                    self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
                    self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
                    
                    if self.device == 'cuda':
                        self.clip_model = self.clip_model.to('cuda')
                    
                    logger.info("✅ CLIP model loaded successfully!")
                except Exception as e:
                    logger.error(f"⚠️ CLIP model not available: {e}")
                    logger.info("🔄 Continuing with YOLOv8 detection only...")
                    self.clip_model = None
                    self.clip_processor = None
            else:
                if not TRANSFORMERS_AVAILABLE:
                    logger.info("🔄 Transformers not available - using YOLOv8 detection only...")
                else:
                    logger.info("🔄 Skipping CLIP model loading...")
                self.clip_model = None
                self.clip_processor = None
            
            logger.info("✅ All models loaded successfully!")
            
        except Exception as e:
            logger.error(f"❌ Error loading models: {e}")
            raise
    
    def _init_database(self):
        """Initialize SQLite database for storing results"""
        try:
            self.db_path = "disaster_detections.db"
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create table if not exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS detections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    disaster_type TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    objects_detected TEXT NOT NULL,
                    image_path TEXT NOT NULL,
                    severity TEXT DEFAULT 'medium'
                )
            """)
            
            conn.commit()
            conn.close()
            logger.info("✅ Database initialized successfully!")
            
        except Exception as e:
            logger.error(f"❌ Error initializing database: {e}")
            raise
    
    def process_image(self, image_path: str, filename: str) -> Dict:
        """
        Process image for disaster detection
        """
        try:
            logger.info(f"🔍 Processing image: {filename}")
            
            # Load image
            image = Image.open(image_path).convert('RGB')
            
            # YOLOv8 detection
            results = self.yolo_model(image_path)
            
            # Process YOLOv8 results
            objects_detected = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        conf = box.conf[0].cpu().numpy()
                        cls = int(box.cls[0].cpu().numpy())
                        
                        # Get class name
                        class_name = self.yolo_model.names[cls]
                        
                        objects_detected.append({
                            "class": class_name,
                            "confidence": float(conf),
                            "bbox": [float(x1), float(y1), float(x2), float(y2)]
                        })
            
            # Determine if disaster based on detected objects
            disaster_objects = ['fire', 'smoke', 'flame', 'person', 'car', 'truck', 'building']
            detected_disaster_objects = [obj for obj in objects_detected if obj['class'] in disaster_objects]
            
            is_disaster = len(detected_disaster_objects) > 0
            disaster_type = self._classify_disaster_type(objects_detected)
            confidence = max([obj['confidence'] for obj in objects_detected]) if objects_detected else 0.0
            severity = self._determine_severity(objects_detected)
            
            # Create result
            result = {
                "is_disaster": is_disaster,
                "disaster_type": disaster_type,
                "confidence": confidence,
                "objects_detected": objects_detected,
                "timestamp": datetime.now().isoformat(),
                "image_path": image_path,
                "severity": severity
            }
            
            # Save to database
            self._save_to_database(result)
            
            logger.info(f"✅ Processing complete: {disaster_type} ({confidence:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error processing image: {e}")
            return {
                "error": str(e),
                "is_disaster": False,
                "disaster_type": "error",
                "confidence": 0.0,
                "objects_detected": []
            }
    
    def _classify_disaster_type(self, objects_detected: List[Dict]) -> str:
        """Classify disaster type based on detected objects"""
        if not objects_detected:
            return "normal"
        
        object_classes = [obj['class'].lower() for obj in objects_detected]
        
        # Check for fire-related objects
        if any(obj in ['fire', 'smoke', 'flame'] for obj in object_classes):
            return "fire"
        
        # Check for water-related objects
        if any(obj in ['boat', 'surfboard'] for obj in object_classes):
            return "flood"
        
        # Check for building damage
        if any(obj in ['building', 'house'] for obj in object_classes):
            return "earthquake"
        
        # Check for people in emergency
        if 'person' in object_classes:
            return "emergency"
        
        return "unknown"
    
    def _determine_severity(self, objects_detected: List[Dict]) -> str:
        """Determine severity based on detected objects"""
        if not objects_detected:
            return "low"
        
        high_severity_objects = ['fire', 'smoke', 'flame']
        medium_severity_objects = ['person', 'car', 'truck']
        
        object_classes = [obj['class'].lower() for obj in objects_detected]
        
        if any(obj in high_severity_objects for obj in object_classes):
            return "high"
        elif any(obj in medium_severity_objects for obj in object_classes):
            return "medium"
        else:
            return "low"
    
    def _save_to_database(self, result: Dict):
        """Save detection result to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO detections 
                (timestamp, disaster_type, confidence, objects_detected, image_path, severity)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                result['timestamp'],
                result['disaster_type'],
                result['confidence'],
                json.dumps(result['objects_detected']),
                result['image_path'],
                result['severity']
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Error saving to database: {e}")
    
    def get_recent_detections(self, limit: int = 10) -> List[Dict]:
        """Get recent detections from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM detections 
                ORDER BY timestamp DESC 
                LIMIT ?
            """, (limit,))
            
            columns = [description[0] for description in cursor.description]
            results = []
            
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            conn.close()
            return results
            
        except Exception as e:
            logger.error(f"❌ Error fetching recent detections: {e}")
            return []

# FastAPI app and endpoints
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize pipeline on startup"""
    global pipeline
    try:
        pipeline = DisasterDetectionPipeline()
        logger.info("✅ Pipeline initialized successfully!")
        yield
    except Exception as e:
        logger.error(f"❌ Failed to initialize pipeline: {e}")
        raise

app = FastAPI(title="Disaster Detection API", version="1.0.0", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080", 
        "http://localhost:5173", 
        "https://dronex-aisurveillance.vercel.app",
        "https://dronex-python-ai.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global pipeline instance
pipeline = None

@app.post("/detect")
async def detect_disaster(file: UploadFile = File(...)):
    """Detect disaster in uploaded image"""
    if not pipeline:
        raise HTTPException(status_code=500, detail="Pipeline not initialized")
    
    try:
        # Read uploaded file
        contents = await file.read()
        
        # Save temporarily
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(contents)
        
        # Process image
        result = pipeline.process_image(temp_path, file.filename)
        
        # Clean up
        os.remove(temp_path)
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error processing upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recent")
async def get_recent(limit: int = 10):
    """Get recent detections"""
    if not pipeline:
        raise HTTPException(status_code=500, detail="Pipeline not initialized")
    
    try:
        results = pipeline.get_recent_detections(limit)
        return JSONResponse(content=results)
    except Exception as e:
        logger.error(f"❌ Error fetching recent detections: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Disaster Detection API", "status": "running"}

if __name__ == "__main__":
    # Production configuration for Render
    import os
    
    # Get port from environment (Render provides this)
    port = int(os.environ.get('PORT', 8000))
    
    # Create pipeline instance
    pipeline = DisasterDetectionPipeline()
    
    # Start API server
    print("🌐 Starting FastAPI server...")
    print(f"📖 API will be available at: http://0.0.0.0:{port}")
    print(f"📖 API docs at: http://0.0.0.0:{port}/docs")
    uvicorn.run(app, host="0.0.0.0", port=port)
