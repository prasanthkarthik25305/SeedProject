import torch
import sqlite3
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

# Computer Vision Models
from transformers import CLIPProcessor, CLIPModel
from ultralytics import YOLO
from PIL import Image, ImageDraw, ImageFont
import numpy as np

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
    
    def __init__(self, device: Optional[str] = None):
        """Initialize the pipeline with models"""
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"🖥️ Using device: {self.device}")
        
        # Initialize models
        self._load_models()
        
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
        
    def _load_models(self):
        """Load CLIP and YOLOv8 models"""
        try:
            logger.info("📥 Loading CLIP model...")
            self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
            
            if self.device == 'cuda':
                self.clip_model = self.clip_model.to('cuda')
            
            logger.info("📥 Loading YOLOv8 model...")
            self.yolo_model = YOLO("yolov8n.pt")  # Use nano for speed
            
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
            
            # Create detections table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS detections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    image_path TEXT,
                    disaster_type TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    is_disaster INTEGER NOT NULL,
                    severity TEXT DEFAULT 'medium',
                    objects_detected TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create objects table for detailed object storage
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS detected_objects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    detection_id INTEGER,
                    object_class TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    bbox_x1 REAL,
                    bbox_y1 REAL,
                    bbox_x2 REAL,
                    bbox_y2 REAL,
                    FOREIGN KEY (detection_id) REFERENCES detections (id)
                )
            """)
            
            conn.commit()
            conn.close()
            logger.info("✅ Database initialized successfully!")
            
        except Exception as e:
            logger.error(f"❌ Error initializing database: {e}")
            raise
    
    def classify_disaster(self, image: Image.Image) -> Tuple[str, float]:
        """
        Classify disaster type using CLIP zero-shot classification
        """
        try:
            logger.info("🔍 Classifying disaster with CLIP...")
            
            # Process image and text
            inputs = self.clip_processor(
                text=self.disaster_prompts,
                images=image,
                return_tensors="pt",
                padding=True
            )
            
            if self.device == 'cuda':
                inputs = {k: v.to('cuda') for k, v in inputs.items()}
            
            # Get predictions
            with torch.no_grad():
                outputs = self.clip_model(**inputs)
                logits_per_image = outputs.logits_per_image
                probs = logits_per_image.softmax(dim=1)
            
            # Get top prediction
            top_idx = probs.argmax().item()
            confidence = probs[0][top_idx].item()
            label = self.disaster_prompts[top_idx]
            
            logger.info(f"🎯 CLIP Result: {label} (confidence: {confidence:.3f})")
            return label, confidence
            
        except Exception as e:
            logger.error(f"❌ Error in disaster classification: {e}")
            return "a normal safe scene", 0.1
    
    def detect_objects(self, image_path: str) -> List[Dict]:
        """
        Detect objects using YOLOv8
        """
        try:
            logger.info("🔍 Detecting objects with YOLOv8...")
            
            results = self.yolo_model(image_path, verbose=False)
            detections = []
            
            for r in results:
                boxes = r.boxes
                if boxes is not None:
                    for box in boxes:
                        cls_id = int(box.cls[0])
                        conf = float(box.conf[0])
                        xyxy = box.xyxy[0].cpu().numpy()
                        
                        detections.append({
                            "class": r.names[cls_id],
                            "confidence": conf,
                            "bbox": {
                                "x1": float(xyxy[0]),
                                "y1": float(xyxy[1]),
                                "x2": float(xyxy[2]),
                                "y2": float(xyxy[3])
                            }
                        })
            
            logger.info(f"🎯 YOLOv8 detected {len(detections)} objects")
            return detections
            
        except Exception as e:
            logger.error(f"❌ Error in object detection: {e}")
            return []
    
    def is_disaster(self, label: str, confidence: float, threshold: float = 0.5) -> bool:
        """
        Apply decision logic to determine if it's a disaster
        """
        if "normal safe scene" in label:
            return False
        if confidence < threshold:
            return False
        return True
    
    def determine_severity(self, confidence: float, disaster_type: str) -> str:
        """
        Determine severity based on confidence and disaster type
        """
        if confidence > 0.8:
            return "critical"
        elif confidence > 0.6:
            return "high"
        elif confidence > 0.4:
            return "medium"
        else:
            return "low"
    
    def save_result(self, result: DisasterResult) -> int:
        """
        Save detection result to database
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Save main detection
            cursor.execute("""
                INSERT INTO detections 
                (timestamp, image_path, disaster_type, confidence, is_disaster, severity, objects_detected)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                result.timestamp,
                result.image_path,
                result.disaster_type,
                result.confidence,
                int(result.is_disaster),
                result.severity,
                json.dumps(result.objects_detected)
            ))
            
            detection_id = cursor.lastrowid
            
            # Save individual objects
            for obj in result.objects_detected:
                if 'bbox' in obj:
                    cursor.execute("""
                        INSERT INTO detected_objects 
                        (detection_id, object_class, confidence, bbox_x1, bbox_y1, bbox_x2, bbox_y2)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        detection_id,
                        obj['class'],
                        obj['confidence'],
                        obj['bbox']['x1'],
                        obj['bbox']['y1'],
                        obj['bbox']['x2'],
                        obj['bbox']['y2']
                    ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"💾 Result saved to database with ID: {detection_id}")
            return detection_id
            
        except Exception as e:
            logger.error(f"❌ Error saving result: {e}")
            return -1
    
    def create_annotated_image(self, image_path: str, result: DisasterResult, output_path: str) -> str:
        """
        Create annotated image with bounding boxes and disaster info
        """
        try:
            image = Image.open(image_path)
            draw = ImageDraw.Draw(image)
            
            # Draw bounding boxes
            for obj in result.objects_detected:
                if 'bbox' in obj:
                    bbox = obj['bbox']
                    draw.rectangle([
                        (bbox['x1'], bbox['y1']),
                        (bbox['x2'], bbox['y2'])
                    ], outline="red", width=2)
                    
                    # Draw label
                    label = f"{obj['class']} ({obj['confidence']:.2f})"
                    draw.text((bbox['x1'], bbox['y1'] - 20), label, fill="red")
            
            # Draw disaster info banner
            banner_height = 60
            banner_color = "red" if result.is_disaster else "green"
            
            # Create banner
            banner = Image.new('RGB', (image.width, banner_height), banner_color)
            banner_draw = ImageDraw.Draw(banner)
            
            # Add text to banner
            try:
                font = ImageFont.truetype("arial.ttf", 16)
            except:
                font = ImageFont.load_default()
            
            banner_text = f"DISASTER: {result.disaster_type.upper()} ({result.confidence:.1%})"
            if not result.is_disaster:
                banner_text = f"STATUS: SAFE ({result.confidence:.1%})"
            
            banner_draw.text((10, 20), banner_text, fill="white", font=font)
            
            # Combine image and banner
            annotated = Image.new('RGB', (image.width, image.height + banner_height))
            annotated.paste(banner, (0, 0))
            annotated.paste(image, (0, banner_height))
            
            # Save annotated image
            annotated.save(output_path)
            logger.info(f"🖼️ Annotated image saved: {output_path}")
            
            return output_path
            
        except Exception as e:
            logger.error(f"❌ Error creating annotated image: {e}")
            return image_path
    
    def process_image(self, image_path: str, output_dir: str = "output") -> Dict:
        """
        Main pipeline function to process an image
        """
        try:
            logger.info(f"🚀 Processing image: {image_path}")
            
            # Step 1: Load image
            image = Image.open(image_path)
            
            # Step 2: Classification
            label, confidence = self.classify_disaster(image)
            
            # Step 3: Decision Logic
            disaster_flag = self.is_disaster(label, confidence)
            severity = self.determine_severity(confidence, label)
            
            # Step 4: Object Detection
            objects = self.detect_objects(image_path)
            
            # Step 5: Create result object
            result = DisasterResult(
                is_disaster=disaster_flag,
                disaster_type=label,
                confidence=confidence,
                objects_detected=objects,
                timestamp=datetime.now().isoformat(),
                image_path=image_path,
                severity=severity
            )
            
            # Step 6: Save to database
            detection_id = self.save_result(result)
            
            # Step 7: Create annotated image
            Path(output_dir).mkdir(exist_ok=True)
            output_image_path = f"{output_dir}/annotated_{Path(image_path).stem}.jpg"
            self.create_annotated_image(image_path, result, output_image_path)
            
            # Step 8: Prepare output
            output = {
                "id": detection_id,
                "is_disaster": disaster_flag,
                "disaster_type": label,
                "confidence": round(confidence, 3),
                "severity": severity,
                "objects_detected": objects,
                "timestamp": result.timestamp,
                "annotated_image_path": output_image_path
            }
            
            logger.info(f"✅ Processing complete! Disaster detected: {disaster_flag}")
            return output
            
        except Exception as e:
            logger.error(f"❌ Error processing image: {e}")
            return {
                "error": str(e),
                "is_disaster": False,
                "disaster_type": "error",
                "confidence": 0.0,
                "objects_detected": []
            }
    
    def get_recent_detections(self, limit: int = 10) -> List[Dict]:
        """
        Get recent detections from database
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM detections 
                ORDER BY created_at DESC 
                LIMIT ?
            """, (limit,))
            
            columns = [description[0] for description in cursor.description]
            results = []
            
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            conn.close()
            return results
            
        except Exception as e:
            logger.error(f"❌ Error getting recent detections: {e}")
            return []

# FastAPI Integration (Optional)
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Disaster Detection API", version="1.0.0")

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

@app.on_event("startup")
async def startup_event():
    """Initialize the pipeline on startup"""
    global pipeline
    pipeline = DisasterDetectionPipeline()

@app.post("/detect")
async def detect_disaster(file: UploadFile = File(...)):
    """
    API endpoint to detect disaster in uploaded image
    """
    try:
        # Save uploaded file
        contents = await file.read()
        image_path = f"temp_{file.filename}"
        with open(image_path, "wb") as f:
            f.write(contents)
        
        # Process image
        result = pipeline.process_image(image_path)
        
        # Clean up
        import os
        os.remove(image_path)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/detections")
async def get_detections(limit: int = 10):
    """
    Get recent detections
    """
    return JSONResponse(content=pipeline.get_recent_detections(limit))

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
    
    # Test with an image (optional)
    test_image = "test_disaster.jpg"  # Replace with actual image path
    if Path(test_image).exists():
        result = pipeline.process_image(test_image)
        print("🎯 Detection Result:")
        print(json.dumps(result, indent=2))
    
    # Start API server
    print("🌐 Starting FastAPI server...")
    print(f"📖 API will be available at: http://0.0.0.0:{port}")
    print(f"📖 API docs at: http://0.0.0.0:{port}/docs")
    uvicorn.run(app, host="0.0.0.0", port=port)
