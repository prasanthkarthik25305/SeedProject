import subprocess
import sys
import os
from pathlib import Path

def install_requirements():
    """Install required Python packages"""
    print("📦 Installing required packages...")
    
    try:
        # Install packages
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", 
            "torch", "transformers", "ultralytics", 
            "Pillow", "numpy", "fastapi", "uvicorn", "python-multipart"
        ])
        print("✅ All packages installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing packages: {e}")
        return False

def setup_environment():
    """Setup environment for disaster detection"""
    print("🔧 Setting up disaster detection environment...")
    
    # Create necessary directories
    directories = ["output", "temp", "models"]
    for dir_name in directories:
        Path(dir_name).mkdir(exist_ok=True)
        print(f"📁 Created directory: {dir_name}")
    
    # Download sample models if needed
    print("📥 Models will be downloaded on first run...")
    
    print("✅ Environment setup complete!")

def main():
    """Main setup function"""
    print("🚁 RavNResQ Disaster Detection Setup")
    print("=" * 50)
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required!")
        return
    
    print(f"✅ Python version: {sys.version}")
    
    # Install requirements
    if install_requirements():
        # Setup environment
        setup_environment()
        
        print("\n🎉 Setup complete!")
        print("\n📋 Next steps:")
        print("1. Place disaster images in the project directory")
        print("2. Run: python disaster_detection_pipeline.py")
        print("3. Or start API server: python -c 'from disaster_detection_pipeline import app; import uvicorn; uvicorn.run(app, host=\"0.0.0.0\", port=8000)'")
        print("\n🌐 API will be available at: http://localhost:8000")
        print("📖 API docs at: http://localhost:8000/docs")
    else:
        print("❌ Setup failed! Please check the error messages above.")

if __name__ == "__main__":
    main()
