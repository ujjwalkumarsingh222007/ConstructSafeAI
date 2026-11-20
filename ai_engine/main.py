"""ConstructSafe AI - Computer Vision Engine Service
Provides HTTP API endpoints for static photo hazard inference, health check,
and model metadata inspection.
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from ai_engine.detector import HazardDetector, ALLOWED_FORMATS, MAX_IMAGE_SIZE_BYTES

app = FastAPI(
    title="ConstructSafe AI — Computer Vision Hazard Engine",
    version="1.0.0",
    description="Dedicated static photo hazard detection engine with model truthfulness and Human-in-the-Loop policy."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize detector singleton
detector = HazardDetector()

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "ConstructSafe AI Engine",
        "version": "1.0.0",
        "device": detector.device,
        "mode": detector.mode,
        "is_custom_hazard_model": detector.is_custom_hazard_model,
        "is_simulated": detector.is_simulated
    }

@app.get("/models/info", tags=["Models"])
async def get_model_info():
    return {
        "model_name": detector.model_name,
        "model_version": detector.model_version,
        "device": detector.device,
        "mode": detector.mode,
        "is_custom_hazard_model": detector.is_custom_hazard_model,
        "is_simulated": detector.is_simulated,
        "disclaimer": detector.disclaimer,
        "model_path": detector.model_path,
        "confidence_threshold": detector.confidence_threshold
    }

@app.post("/analyze/image", tags=["Hazard Analysis"])
async def analyze_image(
    file: UploadFile = File(...),
    force_demo: bool = Form(False)
):
    """
    Analyze an uploaded construction site photograph for safety hazards.
    Validates file format, size, and image integrity.
    """
    contents = await file.read()
    
    if len(contents) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image size exceeds the maximum limit of {MAX_IMAGE_SIZE_BYTES // (1024*1024)}MB."
        )
        
    try:
        active_detector = HazardDetector(force_demo_mode=force_demo) if force_demo else detector
        analysis_result = active_detector.analyze_image(contents)
        return analysis_result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference pipeline error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai_engine.main:app", host="0.0.0.0", port=8001, reload=True)
