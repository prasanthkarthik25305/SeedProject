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
    print("✅ Transformers available - full disaster detection enabled")
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("⚠️ Transformers not available - using YOLOv8 detection only")

# Computer Vision Models
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
    Automatically detects available capabilities
    """
    
    def __init__(self, device: Optional[str] = None):
        """Initialize the pipeline with models"""
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"🖥️ Using device: {self.device}")
        
        # Auto-detect if CLIP should be used
        use_clip = TRANSFORMERS_AVAILABLE
        
        # Initialize models
        self._load_models(use_clip)
        
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
            self.yolo_model = YOLO("yolov8n.pt")  # Use nano for speed
            
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
