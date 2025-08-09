# =============================================================================
# CRITICAL FIX #4: Fixed FastAPI Backend with Proper File Size Calculation
# File: main.py - MAJOR REWRITE FOR CONSISTENCY AND RELIABILITY
# =============================================================================

from fastapi import FastAPI, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session
import time
import os
import torch
import torchaudio
import logging
import asyncio
import psutil
from datetime import datetime, timedelta
from pydantic import BaseModel, field_validator
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any, List
import uuid
from pathlib import Path
import threading

# FIXED: Import the standardized database modules
try:
    from database import get_db, test_connection_and_setup, create_tables, get_db_session
    from database.operations import DatabaseOperations
    from database.models import MusicGeneration, validate_generation_data
    DATABASE_AVAILABLE = True
    logger = logging.getLogger(__name__)
    logger.info("✅ Database modules loaded successfully")
except ImportError as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"⚠️ Database modules not available: {e}")
    DATABASE_AVAILABLE = False

# =============================================================================
# CONFIGURATION AND SETUP
# =============================================================================

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FIXED: Environment-aware configuration (no more hardcoded paths)
AUDIO_DIR = os.getenv("AUDIO_DIR", os.getenv("AUDIO_DIRECTORY", "./audio"))
os.makedirs(AUDIO_DIR, exist_ok=True)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)

# Model caching with proper thread safety
_cached_model = None
_model_load_lock = threading.Lock()

# =============================================================================
# FIXED MODEL LOADING WITH PROPER ERROR HANDLING
# =============================================================================

def get_model():
    """Load and cache the MusicGen model with GPU acceleration"""
    global _cached_model, _model_load_lock
    
    if _cached_model is not None:
        return _cached_model
    
    with _model_load_lock:
        if _cached_model is not None:
            return _cached_model
        
        try:
            logger.info("🔄 Loading MusicGen model...")
            start_time = time.time()
            
            from audiocraft.models import MusicGen
            
            # Load model
            model = MusicGen.get_pretrained('facebook/musicgen-small')
            
            # ✅ FIXED: Properly move MusicGen model to GPU
            if torch.cuda.is_available():
                try:
                    # Clear GPU memory first
                    torch.cuda.empty_cache()
                    
                    # Move model to GPU - MusicGen has .cuda() method
                    model = model.cuda()
                    
                    # Verify it's on GPU by checking the compression model
                    device_check = next(model.compression_model.parameters()).device
                    logger.info(f"🚀 Model loaded on GPU: {torch.cuda.get_device_name()}")
                    logger.info(f"🚀 Model device: {device_check}")
                    logger.info(f"🚀 GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f}GB")
                    
                except Exception as cuda_error:
                    logger.error(f"❌ GPU loading failed: {cuda_error}")
                    logger.info("💻 Falling back to CPU")
                    
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                try:
                    # For Apple Silicon - MusicGen might support .to('mps')
                    model = model.to('mps')
                    logger.info("🍎 Model loaded on MPS (Apple Silicon)")
                except Exception as mps_error:
                    logger.error(f"❌ MPS loading failed: {mps_error}")
                    logger.info("💻 Falling back to CPU")
            else:
                logger.info("💻 Model loaded on CPU (no GPU available)")
            
            _cached_model = model
            load_time = time.time() - start_time
            
            logger.info(f"✅ Model loaded successfully in {load_time:.1f}s")
            return _cached_model
            
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            raise HTTPException(status_code=500, detail=f"Model loading failed: {str(e)}")

# FIXED: GPU info function for MusicGen
def get_gpu_info():
    """Get GPU information for debugging"""
    if torch.cuda.is_available():
        device = torch.cuda.current_device()
        return {
            "gpu_available": True,
            "device_name": torch.cuda.get_device_name(device),
            "memory_allocated": torch.cuda.memory_allocated(device) / 1e9,
            "memory_cached": torch.cuda.memory_reserved(device) / 1e9,
            "memory_total": torch.cuda.get_device_properties(device).total_memory / 1e9
        }
    return {"gpu_available": False}

# FIXED: GPU test function for MusicGen
def test_gpu_generation():
    """Test if GPU generation is working"""
    try:
        model = get_model()
        
        # Check device for MusicGen model
        if hasattr(model, 'compression_model'):
            device = next(model.compression_model.parameters()).device
            logger.info(f"🧪 Model compression_model is on device: {device}")
        elif hasattr(model, 'device'):
            device = model.device
            logger.info(f"🧪 Model device: {device}")
        else:
            logger.info("🧪 Cannot determine model device")
        
        if torch.cuda.is_available():
            logger.info(f"🧪 CUDA available: {torch.cuda.get_device_name()}")
            logger.info(f"🧪 GPU Memory: {torch.cuda.memory_allocated()/1e9:.1f}GB used")
        
        return True
    except Exception as e:
        logger.error(f"❌ GPU test failed: {e}")
        return False

# Alternative: Even simpler version that just loads on CPU
def get_model_simple():
    """Load and cache the MusicGen model (CPU only for reliability)"""
    global _cached_model, _model_load_lock
    
    if _cached_model is not None:
        return _cached_model
    
    with _model_load_lock:
        if _cached_model is not None:
            return _cached_model
        
        try:
            logger.info("🔄 Loading MusicGen model...")
            start_time = time.time()
            
            from audiocraft.models import MusicGen
            
            # Load model and keep on CPU for simplicity
            model = MusicGen.get_pretrained('facebook/musicgen-small')
            
            # Don't try to move to GPU - just use CPU
            logger.info("💻 Model loaded on CPU")
            
            _cached_model = model
            load_time = time.time() - start_time
            
            logger.info(f"✅ Model loaded successfully in {load_time:.1f}s")
            return _cached_model
            
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            raise HTTPException(status_code=500, detail=f"Model loading failed: {str(e)}")
# =============================================================================
# PYDANTIC MODELS WITH PROPER VALIDATION
# =============================================================================

class GenerateRequest(BaseModel):
    prompt: str
    duration: float = 30.0
    device: Optional[str] = None
    precision: Optional[str] = "float32"
    
    @field_validator('prompt')
    @classmethod
    def validate_prompt(cls, v):
        if not v or not v.strip():
            raise ValueError('Prompt cannot be empty')
        if len(v.strip()) < 3:
            raise ValueError('Prompt must be at least 3 characters long')
        if len(v.strip()) > 500:
            raise ValueError('Prompt cannot exceed 500 characters')
        return v.strip()
    
    @field_validator('duration')
    @classmethod
    def validate_duration(cls, v):
        if v <= 0 or v > 120:
            raise ValueError('Duration must be between 0 and 120 seconds')
        return v

class PlayTrackRequest(BaseModel):
    generation_id: str
    play_duration: Optional[float] = None

class FavoriteRequest(BaseModel):
    generation_id: str

# =============================================================================
# FIXED LIFESPAN MANAGEMENT
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting Music Genie API v2.1 - COMPLETELY FIXED!")
    logger.info("=" * 70)
    
    # Test database connection
    if DATABASE_AVAILABLE:
        try:
            if test_connection_and_setup():
                logger.info("✅ Database connection successful")
                create_tables()
                logger.info("✅ Database tables ready")
            else:
                logger.warning("⚠️ Database connection failed - running without persistence")
        except Exception as e:
            logger.error(f"❌ Database setup failed: {e}")
    
    # Pre-load model
    try:
        get_model()
        logger.info("✅ Model pre-loaded successfully")
    except Exception as e:
        logger.warning(f"⚠️ Model pre-loading failed: {e}")
    
    logger.info(f"📁 Audio Directory: {AUDIO_DIR}")
    logger.info("🎵 Ready to generate music!")
    logger.info("=" * 70)
    
    yield  # Application runs here
    
    # Shutdown
    logger.info("🎵 Music Genie API shutting down...")
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        logger.info("🧹 GPU memory cleared")

# =============================================================================
# FASTAPI APP INITIALIZATION
# =============================================================================

app = FastAPI(
    title="🎵 Music Genie API",
    version="2.1.0",
    description="FIXED Professional AI Music Generation Platform",
    lifespan=lifespan
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure as needed
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")

# =============================================================================
# MAIN ENDPOINTS WITH FIXES
# =============================================================================

@app.get("/", tags=["system"])
async def root():
    """Root endpoint"""
    return {
        "message": "🎵 Music Genie API v2.1 - COMPLETELY FIXED!",
        "status": "ready",
        "database": "available" if DATABASE_AVAILABLE else "not available",
        "model": "loaded" if _cached_model else "not loaded",
        "audio_dir": AUDIO_DIR,
        "documentation": "/docs"
    }


    # Add this endpoint to check GPU status:
@app.get("/gpu-status", tags=["system"])
async def gpu_status():
    """Get GPU status and memory info"""
    try:
        gpu_info = get_gpu_info()
        
        # FIXED: Get device info for MusicGen model
        model_device = "Not loaded"
        if _cached_model:
            try:
                if hasattr(_cached_model, 'compression_model'):
                    model_device = str(next(_cached_model.compression_model.parameters()).device)
                elif hasattr(_cached_model, 'device'):
                    model_device = str(_cached_model.device)
                else:
                    model_device = "Unknown (MusicGen structure)"
            except Exception as e:
                model_device = f"Error checking device: {e}"
        
        return {
            "success": True,
            "gpu_info": gpu_info,
            "model_device": model_device,
            "model_loaded": _cached_model is not None
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/generate", tags=["generation"])
async def generate_music(
    request: GenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """FIXED: Generate music with proper GPU handling for MusicGen"""
    generation_id = f"gen_{int(time.time())}_{uuid.uuid4().hex[:8]}"
    
    try:
        logger.info(f"🎼 Starting generation: {generation_id}")
        logger.info(f"📝 Prompt: {request.prompt}")
        
        # Load model
        model = get_model()
        
        # Determine device
        if request.device:
            device = request.device
        elif torch.cuda.is_available():
            device = "CUDA"
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            device = "MPS"
        else:
            device = "CPU"
        
        # Configure model settings
        model.set_generation_params(duration=request.duration)
        
        # ✅ FIXED: GPU-optimized generation for MusicGen
        # Log device info for MusicGen
        if hasattr(model, 'compression_model'):
            model_device = next(model.compression_model.parameters()).device
            logger.info(f"🎵 Generating on device: {model_device}")
        else:
            logger.info(f"🎵 Generating with MusicGen model")
        
        start_time = time.time()
        
        # Ensure we're using GPU if available
        with torch.no_grad():
            if torch.cuda.is_available():
                torch.cuda.empty_cache()  # Clear GPU memory before generation
            
            # Generate music (model will use GPU if loaded on GPU)
            wav = model.generate([request.prompt])
            
            # Move result to CPU for saving - MusicGen returns tensors
            if torch.is_tensor(wav):
                wav = wav.cpu()
            elif isinstance(wav, list) and len(wav) > 0:
                if torch.is_tensor(wav[0]):
                    wav = [w.cpu() for w in wav]
        
        # ✅ Calculate generation_time AFTER generation
        generation_time = time.time() - start_time
        realtime_factor = request.duration / generation_time if generation_time > 0 else 0
        
        # FIXED: Save audio file and calculate actual file size
        filename = f"generated_{generation_id}.wav"
        file_path = os.path.join(AUDIO_DIR, filename)
        
        # Save the audio file (wav is already on CPU)
        torchaudio.save(
            file_path,
            wav[0],  # No need for .cpu() since we already moved it
            sample_rate=model.sample_rate,
            format="wav"
        )
        
        # CRITICAL FIX: Calculate actual file size from saved file
        actual_file_size_mb = round(os.path.getsize(file_path) / (1024 * 1024), 2)
        
        # Create CONSISTENT generation data
        generation_data = {
            'generation_id': generation_id,
            'prompt': request.prompt,
            'status': 'completed',
            'device': device,
            'precision': request.precision,
            'generation_time': round(generation_time, 2),
            'realtime_factor': round(realtime_factor, 2),
            'file_size_mb': actual_file_size_mb,
            'duration': request.duration,
            'sample_rate': model.sample_rate,
            'model_version': 'musicgen-small'
        }
        
        # Save to database with consistent field names
        generation_record = None
        if DATABASE_AVAILABLE and db:
            generation_record = DatabaseOperations.create_generation_record(
                db, generation_data, file_path
            )
        
        # FIXED: Return consistent response structure
        response = {
            "success": True,
            "generation_id": generation_id,
            "audio_url": f"/audio/{filename}",
            "prompt": request.prompt,
            "status": "completed",
            
            # FIXED: Consistent field names matching frontend expectations
            "device": device,
            "precision": request.precision,
            "generation_time": round(generation_time, 2),
            "realtime_factor": round(realtime_factor, 2),
            "file_size_mb": actual_file_size_mb,
            "duration": request.duration,
            "sample_rate": model.sample_rate,
            
            # User interaction fields with proper defaults
            "play_count": 0,
            "download_count": 0,
            "is_favorited": False,
            "created_at": datetime.utcnow().isoformat()
        }
        
        logger.info(f"✅ Generation completed: {generation_id} "
                   f"({generation_time:.1f}s, {realtime_factor:.1f}x, {actual_file_size_mb}MB)")
        
        return response
        
    except Exception as e:
        logger.error(f"❌ Generation failed: {e}")
        
        # Save failed generation to database
        if DATABASE_AVAILABLE and db:
            try:
                failed_data = {
                    'generation_id': generation_id,
                    'prompt': request.prompt,
                    'status': 'failed',
                    'device': 'Unknown',
                    'generation_time': 0.0,
                    'file_size_mb': 0.0,
                    'error_message': str(e)
                }
                DatabaseOperations.create_generation_record(db, failed_data)
            except Exception as db_error:
                logger.error(f"Failed to save error record: {db_error}")
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "generation_id": generation_id
            }
        )
@app.get("/recent", tags=["data"])
# @limiter.limit("30/minute")
async def get_recent_generations(
    request: Request,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """FIXED: Get recent generations with consistent data structure"""
    try:
        if DATABASE_AVAILABLE and db:
            generations = DatabaseOperations.get_recent_generations(db, limit)
            
            # FIXED: Ensure all required fields are present and consistent
            for gen in generations:
                # Verify file size is accurate
                if gen.get('file_path') and os.path.exists(gen['file_path']):
                    actual_size = round(os.path.getsize(gen['file_path']) / (1024 * 1024), 2)
                    if abs(gen['file_size_mb'] - actual_size) > 0.1:  # Update if significantly different
                        gen['file_size_mb'] = actual_size
                
                # Ensure all required fields exist with proper defaults
                gen.setdefault('play_count', 0)
                gen.setdefault('download_count', 0)
                gen.setdefault('is_favorited', False)
                gen.setdefault('device', 'Unknown')
                gen.setdefault('generation_time', 0.0)
                gen.setdefault('realtime_factor', 1.0)
                gen.setdefault('file_size_mb', 0.0)
            
            return {"success": True, "data": generations}
        else:
            return {"success": True, "data": [], "message": "Database not available"}
            
    except Exception as e:
        logger.error(f"❌ Failed to get recent generations: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@app.post("/download/{generation_id}", tags=["interaction"])
# @limiter.limit("30/minute")
async def download_generation(
    generation_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """FIXED: Download generation with proper file handling"""
    try:
        # Track download in database
        if DATABASE_AVAILABLE and db:
            DatabaseOperations.record_download(db, generation_id)
            
            # Try to get generation record for proper filename
            generations = DatabaseOperations.get_recent_generations(db, limit=1000)
            target_gen = next((g for g in generations if g['generation_id'] == generation_id), None)
            
            if target_gen and target_gen.get('file_path') and os.path.exists(target_gen['file_path']):
                logger.info(f"💾 Download: {generation_id}")
                return FileResponse(
                    path=target_gen['file_path'],
                    filename=f"generation_{generation_id}.wav",
                    media_type="audio/wav"
                )
        
        # Fallback: try to find file by ID in audio directory
        for filename in os.listdir(AUDIO_DIR):
            if generation_id in filename or filename.startswith(f"generated_{generation_id.split('_')[-1]}"):
                filepath = os.path.join(AUDIO_DIR, filename)
                if os.path.exists(filepath):
                    logger.info(f"💾 Download (fallback): {filename}")
                    return FileResponse(
                        path=filepath,
                        filename=f"generation_{generation_id}.wav", 
                        media_type="audio/wav"
                    )
        
        logger.warning(f"❌ Download failed - file not found: {generation_id}")
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": "Audio file not found"}
        )
        
    except Exception as e:
        logger.error(f"❌ Download failed for {generation_id}: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/stats", tags=["analytics"])
# @limiter.limit("20/minute")
async def get_stats(request: Request, days: int = 7, db: Session = Depends(get_db)):
    """FIXED: Get generation statistics"""
    try:
        if DATABASE_AVAILABLE and db:
            stats = DatabaseOperations.get_generation_stats(db, max(1, min(days, 365)))
            return {"success": True, "data": stats}
        else:
            mock_stats = {
                "total_generations": 0,
                "successful_generations": 0,
                "failed_generations": 0,
                "success_rate": 0,
                "avg_generation_time": 0,
                "message": "Database not available"
            }
            return {"success": True, "data": mock_stats}
    except Exception as e:
        logger.error(f"❌ Stats failed: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/favorites", tags=["data"])
# @limiter.limit("30/minute")
async def get_favorites(
    request: Request,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get user's favorite generations"""
    try:
        if DATABASE_AVAILABLE and db:
            favorites = DatabaseOperations.get_favorites(db, limit)
            return {"success": True, "data": favorites}
        else:
            return {"success": True, "data": [], "message": "Database not available"}
            
    except Exception as e:
        logger.error(f"❌ Failed to get favorites: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@app.get("/most-played", tags=["data"])
# @limiter.limit("30/minute")
async def get_most_played(
    request: Request,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get most played generations"""
    try:
        if DATABASE_AVAILABLE and db:
            generations = DatabaseOperations.get_most_played(db, limit)
            return {"success": True, "data": generations}
        else:
            return {"success": True, "data": [], "message": "Database not available"}
            
    except Exception as e:
        logger.error(f"❌ Failed to get most played: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@app.get("/search", tags=["data"])
#@limiter.limit("20/minute")
async def search_generations(
    request: Request,
    q: str,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Search generations by prompt"""
    try:
        if DATABASE_AVAILABLE and db:
            generations = DatabaseOperations.search_generations(db, q, limit)
            return {"success": True, "data": generations, "query": q}
        else:
            return {"success": True, "data": [], "message": "Database not available"}
            
    except Exception as e:
        logger.error(f"❌ Search failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@app.post("/track-play", tags=["interaction"])
# @limiter.limit("100/minute")  # ❌ REMOVED: This line causes the parameter order issue
async def track_play(
    request: PlayTrackRequest,     # ✅ Now this can be first since no rate limiter
    db: Session = Depends(get_db)  # ✅ No need for http_request parameter
):
    """Track when a user plays a generation"""
    try:
        if DATABASE_AVAILABLE and db:
            success = DatabaseOperations.record_play(
                db, request.generation_id, request.play_duration
            )
            return {"success": success}
        else:
            return {"success": True, "message": "Database not available"}
            
    except Exception as e:
        logger.error(f"❌ Failed to track play: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )
    """Track when a user plays a generation"""
    try:
        if DATABASE_AVAILABLE and db:
            success = DatabaseOperations.record_play(
                db, request.generation_id, request.play_duration
            )
            return {"success": success}
        else:
            return {"success": True, "message": "Database not available"}
            
    except Exception as e:
        logger.error(f"❌ Failed to track play: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@app.post("/favorite", tags=["interaction"])
# @limiter.limit("60/minute")
async def toggle_favorite(
    request: FavoriteRequest,
    db: Session = Depends(get_db)
):
    """Toggle favorite status of a generation"""
    try:
        if DATABASE_AVAILABLE and db:
            new_status = DatabaseOperations.toggle_favorite(db, request.generation_id)
            if new_status is not None:
                return {"success": True, "is_favorited": new_status}
            else:
                return JSONResponse(
                    status_code=404,
                    content={"success": False, "error": "Generation not found"}
                )
        else:
            return {"success": True, "message": "Database not available"}
            
    except Exception as e:
        logger.error(f"❌ Failed to toggle favorite: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

# =============================================================================
# SYSTEM MONITORING AND HEALTH ENDPOINTS
# =============================================================================

@app.get("/health", tags=["system"])
async def health_check(db: Session = Depends(get_db)):
    """Comprehensive health check"""
    try:
        health_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "2.1.0",
            "components": {}
        }
        
        # Check model status
        health_data["components"]["model"] = {
            "status": "loaded" if _cached_model else "not_loaded",
            "device": str(getattr(_cached_model, 'device', 'Unknown')) if _cached_model else None
        }
        
        # Check database
        if DATABASE_AVAILABLE and db:
            try:
                # Simple query to test database
                db.execute("SELECT 1")
                health_data["components"]["database"] = {"status": "connected"}
            except Exception as e:
                health_data["components"]["database"] = {"status": "error", "error": str(e)}
                health_data["status"] = "degraded"
        else:
            health_data["components"]["database"] = {"status": "not_available"}
        
        # Check audio directory
        health_data["components"]["audio_storage"] = {
            "status": "available" if os.path.exists(AUDIO_DIR) else "error",
            "path": AUDIO_DIR,
            "writable": os.access(AUDIO_DIR, os.W_OK) if os.path.exists(AUDIO_DIR) else False
        }
        
        # System resources
        try:
            health_data["components"]["system"] = {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_percent": psutil.disk_usage('/').percent
            }
            
            if torch.cuda.is_available():
                health_data["components"]["gpu"] = {
                    "available": True,
                    "device_count": torch.cuda.device_count(),
                    "current_device": torch.cuda.current_device() if torch.cuda.is_initialized() else None
                }
        except Exception as e:
            health_data["components"]["system"] = {"status": "error", "error": str(e)}
        
        return health_data
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

@app.get("/model/status", tags=["model"])
# @limiter.limit("10/minute")
async def model_status(request: Request):
    """Get detailed model status"""
    return {
        "loaded": _cached_model is not None,
        "loading": False,  # Could add loading state tracking
        "device": str(getattr(_cached_model, 'device', 'Unknown')) if _cached_model else None,
        "gpu_available": torch.cuda.is_available(),
        "mps_available": hasattr(torch.backends, 'mps') and torch.backends.mps.is_available(),
        "model_type": "MusicGen-Small" if _cached_model else None,
        "sample_rate": getattr(_cached_model, 'sample_rate', None) if _cached_model else None
    }

@app.post("/model/reload", tags=["model"])
# @limiter.limit("2/minute")
async def reload_model(request: Request):
    """Reload the model"""
    global _cached_model
    
    try:
        logger.info("🔄 Manual model reload requested")
        _cached_model = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        model = get_model()
        return {
            "success": True,
            "message": "Model reloaded successfully",
            "device": str(getattr(model, 'device', 'Unknown'))
        }
    except Exception as e:
        logger.error(f"❌ Model reload failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

# =============================================================================
# STATIC FILE SERVING
# =============================================================================

@app.get("/audio/{filename}")
async def serve_audio_file(filename: str):
    """Serve audio files with proper CORS headers"""
    try:
        file_path = os.path.join(AUDIO_DIR, filename)
        if os.path.exists(file_path):
            return FileResponse(
                path=file_path,
                media_type="audio/wav",
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        else:
            logger.warning(f"❌ Audio file not found: {filename}")
            return JSONResponse(
                status_code=404,
                content={"error": "Audio file not found"}
            )
    except Exception as e:
        logger.error(f"❌ Error serving audio file {filename}: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

# =============================================================================
# ERROR HANDLERS
# =============================================================================

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    """Handle internal errors"""
    logger.error(f"🚨 Internal Error: {request.method} {request.url} - {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An error occurred during processing",
            "model_loaded": _cached_model is not None,
            "database_available": DATABASE_AVAILABLE
        }
    )

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 errors"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not found",
            "message": f"The requested resource {request.url.path} was not found"
        }
    )

# =============================================================================
# STARTUP LOGGING
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Starting Music Genie API v2.1 - COMPLETELY FIXED!")
    logger.info("=" * 70)
    logger.info("🔧 CRITICAL FIXES APPLIED:")
    logger.info("   ✅ FIXED database field consistency (device, generation_time)")
    logger.info("   ✅ FIXED actual file size calculation from saved files")
    logger.info("   ✅ FIXED API response structure consistency")
    logger.info("   ✅ FIXED model loading with proper thread safety")
    logger.info("   ✅ FIXED error handling and validation")
    logger.info("   ✅ FIXED environment-aware configuration")
    logger.info("=" * 70)
    logger.info("🎵 Your application will now have:")
    logger.info("   📊 Consistent data across all endpoints")
    logger.info("   📁 Accurate file sizes")
    logger.info("   🔄 Reliable model loading")
    logger.info("   🗄️ Stable database operations")
    logger.info("   📈 Proper error tracking")
    logger.info("=" * 70)
    logger.info("🎵 Ready to generate music!")
    logger.info(f"📁 Audio Directory: {AUDIO_DIR}")
    logger.info(f"🗄️ Database: {'Available' if DATABASE_AVAILABLE else 'Not available'}")
    logger.info(f"📚 Documentation: http://localhost:8000/docs")
    logger.info("=" * 70)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True
    )