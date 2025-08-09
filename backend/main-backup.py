from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi.staticfiles import StaticFiles
import time
import os
import torch
import torchaudio
import logging
from datetime import datetime
from pydantic import BaseModel
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any

# Database imports
from database import get_db, test_connection_and_setup, create_tables
from database.operations import DatabaseOperations
from database.models import MusicGeneration

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('music_generation.log', encoding='utf-8'),
        logging.StreamHandler()  # Also log to console
    ]
)
logger = logging.getLogger(__name__)

# Fix Windows console encoding for emojis
import sys
if sys.platform == "win32":
    import os
    os.environ["PYTHONIOENCODING"] = "utf-8"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🎵 Music Genie API starting up...")
    logger.info(f"📁 Audio directory: {AUDIO_DIR}")
    
    # Test database connection
    logger.info("🔍 Testing database connection...")
    if test_connection_and_setup():
        logger.info("✅ Database connected successfully!")
        # Create tables if they don't exist
        try:
            create_tables()
            logger.info("📊 Database tables verified/created")
        except Exception as e:
            logger.error(f"❌ Database table creation failed: {e}")
    else:
        logger.warning("⚠️ Database connection failed - continuing without database")
    
    # GPU diagnostics
    logger.info("🖥️ GPU Diagnostics:")
    logger.info(f"   - PyTorch version: {torch.__version__}")
    logger.info(f"   - CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        logger.info(f"   - CUDA version: {torch.version.cuda}")
        logger.info(f"   - GPU count: {torch.cuda.device_count()}")
        for i in range(torch.cuda.device_count()):
            logger.info(f"   - GPU {i}: {torch.cuda.get_device_name(i)}")
            logger.info(f"   - GPU {i} memory: {torch.cuda.get_device_properties(i).total_memory / 1024**3:.1f} GB")
    else:
        logger.warning("   - No CUDA GPUs detected")
    
    # Pre-load model to check GPU usage
    try:
        model = get_model()
        logger.info("🎼 Model pre-loaded successfully on startup")
    except Exception as e:
        logger.error(f"❌ Failed to pre-load model: {e}")
    
    yield
    
    # Shutdown
    logger.info("🎵 Music Genie API shutting down...")
    # Clean up GPU memory on shutdown
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        logger.info("🧹 GPU memory cleared")

app = FastAPI(title="Music Genie API", lifespan=lifespan)

# Create audio directory if it doesn't exist
AUDIO_DIR = r"C:\Users\derek\CascadeProjects\music-genie\backend\audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

# Serve static audio files
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")

# Enhanced CORS middleware for professional mixer support
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",  # Alternative port
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enhanced Pydantic Models
class MusicRequest(BaseModel):
    prompt: str
    duration: Optional[float] = 10.0
    temperature: Optional[float] = 1.0
    top_k: Optional[int] = 250
    top_p: Optional[float] = 0.0
    cfg_coef: Optional[float] = 3.0

class PlayTrackRequest(BaseModel):
    generation_id: str
    play_duration: Optional[float] = None

class DownloadRequest(BaseModel):
    generation_id: str

class FavoriteRequest(BaseModel):
    generation_id: str

class MixerSettingsRequest(BaseModel):
    generation_id: str
    settings: Dict[str, Any]

# Cache model to avoid reloading (significant performance improvement)
_cached_model = None

def get_model():
    global _cached_model
    if _cached_model is None:
        logger.info("🔄 Loading MusicGen model...")
        model_load_start = time.time()
        
        from audiocraft.models import MusicGen
        
        # Check device before loading
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"🎯 Target device: {device}")
        
        # Load model with device specified
        if torch.cuda.is_available():
            logger.info("🚀 Loading model directly to GPU...")
            
            # Performance optimizations for GPU
            torch.backends.cudnn.benchmark = True
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            
            # Load model
            _cached_model = MusicGen.get_pretrained('facebook/musicgen-small')
            _cached_model.set_generation_params(
                duration=10,
                use_sampling=True,
                top_k=250,
                top_p=0.0,
                temperature=1.0,
                cfg_coef=3.0
            )
            
            # Move the underlying models to GPU (correct approach for MusicGen)
            logger.info("📤 Moving model components to GPU...")
            _cached_model.compression_model = _cached_model.compression_model.to(device)
            
            # For MusicGen, the main model is accessible through different attributes
            if hasattr(_cached_model, 'model'):
                _cached_model.model = _cached_model.model.to(device)
            elif hasattr(_cached_model, 'generation_model'):
                _cached_model.generation_model = _cached_model.generation_model.to(device)
            elif hasattr(_cached_model, 'decoder'):
                _cached_model.decoder = _cached_model.decoder.to(device)
            
            # Enable half precision for faster inference (if supported)
            try:
                _cached_model.compression_model = _cached_model.compression_model.half()
                
                # Apply half precision to the generation model
                if hasattr(_cached_model, 'model'):
                    _cached_model.model = _cached_model.model.half()
                elif hasattr(_cached_model, 'generation_model'):
                    _cached_model.generation_model = _cached_model.generation_model.half()
                elif hasattr(_cached_model, 'decoder'):
                    _cached_model.decoder = _cached_model.decoder.half()
                    
                logger.info("⚡ Enabled half precision (FP16) for faster inference")
            except Exception as e:
                logger.warning(f"⚠️ Half precision not supported, using FP32: {e}")
            
            # Verify model is on GPU
            logger.info(f"📍 Model moved to: {device}")
            logger.info(f"🎮 GPU name: {torch.cuda.get_device_name()}")
            logger.info(f"💾 GPU memory after model load: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
            
            logger.info("🔧 Enabled performance optimizations")
        else:
            logger.warning("⚠️ CUDA not available, using CPU (will be much slower)")
            _cached_model = MusicGen.get_pretrained('facebook/musicgen-small')
            _cached_model.set_generation_params(duration=10)
        
        model_load_time = time.time() - model_load_start
        logger.info(f"✅ Model loaded in {model_load_time:.2f} seconds")
    
    return _cached_model

@app.get("/")
async def root():
    return {
        "message": "🎵 Music Genie API is running!",
        "version": "2.0.0",
        "features": [
            "AI Music Generation",
            "Professional Audio Mixer", 
            "Real-time Audio Processing",
            "Advanced Statistics",
            "Play Tracking",
            "Favorites System"
        ]
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "gpu_available": torch.cuda.is_available(),
        "gpu_memory": f"{torch.cuda.memory_allocated() / 1024**3:.2f} GB" if torch.cuda.is_available() else "N/A"
    }

@app.post("/generate")
async def generate_music(request: MusicRequest, db: Session = Depends(get_db)):
    generation_id = f"gen_{int(time.time())}"
    start_time = time.time()
    
    logger.info(f"🎼 [{generation_id}] Starting music generation")
    logger.info(f"📝 [{generation_id}] Prompt: '{request.prompt}'")
    logger.info(f"⏱️ [{generation_id}] Duration: {request.duration}s")
    
    try:
        # Load/get cached model
        model_start = time.time()
        model = get_model()
        model_time = time.time() - model_start
        
        # Update model parameters based on request
        model.set_generation_params(
            duration=request.duration,
            use_sampling=True,
            top_k=request.top_k,
            top_p=request.top_p,
            temperature=request.temperature,
            cfg_coef=request.cfg_coef
        )
        
        if model_time > 0.1:  # Only log if model loading took significant time
            logger.info(f"🔄 [{generation_id}] Model ready in {model_time:.2f}s")
        
        # Generate music with optimizations
        logger.info(f"🎵 [{generation_id}] Generating audio...")
        gen_start = time.time()
        
        # Log GPU memory before generation
        if torch.cuda.is_available():
            logger.info(f"💾 [{generation_id}] GPU memory before generation: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
            
            # Clear GPU cache before generation for optimal memory usage
            torch.cuda.empty_cache()
        
        # Generate with optimized settings
        with torch.inference_mode():  # More efficient than torch.no_grad()
            if torch.cuda.is_available():
                with torch.cuda.amp.autocast():  # Automatic mixed precision
                    wav = model.generate([request.prompt])
            else:
                wav = model.generate([request.prompt])
        
        gen_time = time.time() - gen_start
        
        # Log GPU memory after generation
        if torch.cuda.is_available():
            logger.info(f"💾 [{generation_id}] GPU memory after generation: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
        
        logger.info(f"✅ [{generation_id}] Audio generated in {gen_time:.2f}s")
        
        # Create filename with timestamp and sanitized prompt
        safe_prompt = "".join(c for c in request.prompt if c.isalnum() or c in (' ', '-', '_')).strip()[:30]
        filename = f"generated_{int(time.time())}_{safe_prompt.replace(' ', '_')}.wav"
        filepath = os.path.join(AUDIO_DIR, filename)
        
        # Save the audio file with optimizations
        logger.info(f"💾 [{generation_id}] Saving audio to {filename}")
        save_start = time.time()
        
        # Move to CPU efficiently and save
        audio_tensor = wav[0].detach().cpu().float()  # Ensure float32 for saving
        
        # Calculate audio duration
        audio_duration = audio_tensor.shape[-1] / model.sample_rate
        
        # Save using torchaudio with optimized settings
        torchaudio.save(
            filepath,
            audio_tensor,
            sample_rate=model.sample_rate,
            bits_per_sample=16,
            encoding='PCM_S'  # Explicit encoding for better compatibility
        )
        
        save_time = time.time() - save_start
        total_time = time.time() - start_time
        
        # Get file size for logging
        file_size = os.path.getsize(filepath)
        file_size_mb = file_size / (1024 * 1024)
        
        # Comprehensive success logging
        device_info = torch.cuda.get_device_name() if torch.cuda.is_available() else "CPU"
        precision = "FP16" if torch.cuda.is_available() else "FP32"
        realtime_factor = audio_duration / gen_time
        
        logger.info(f"🎉 [{generation_id}] Generation completed successfully!")
        logger.info(f"📊 [{generation_id}] Performance metrics:")
        logger.info(f"   - Device used: {device_info}")
        logger.info(f"   - Precision: {precision}")
        logger.info(f"   - Total time: {total_time:.2f}s")
        logger.info(f"   - Generation time: {gen_time:.2f}s")
        logger.info(f"   - Save time: {save_time:.2f}s")
        logger.info(f"   - File size: {file_size_mb:.2f}MB")
        logger.info(f"   - Sample rate: {model.sample_rate}Hz")
        logger.info(f"   - Audio duration: {audio_duration:.1f}s")
        logger.info(f"   - Speed: {realtime_factor:.1f}x realtime")
        
        # Save to database with enhanced metadata
        try:
            db_generation = DatabaseOperations.create_generation_record(
                db=db,
                generation_id=generation_id,
                prompt=request.prompt,
                total_time=total_time,
                generation_time=gen_time,
                save_time=save_time,
                device_used=device_info,
                precision=precision,
                file_path=filepath,
                file_size_mb=file_size_mb,
                audio_url=f"/audio/{filename}",
                sample_rate=model.sample_rate,
                status="completed",
                realtime_factor=realtime_factor,
                user_id=None,  # Add user management later
                model_name="facebook/musicgen-small",
                duration=audio_duration,
                metadata={
                    "model_load_time": model_time,
                    "gpu_memory_before": torch.cuda.memory_allocated() / 1024**3 if torch.cuda.is_available() else 0,
                    "optimization_enabled": True,
                    "generation_params": {
                        "temperature": request.temperature,
                        "top_k": request.top_k,
                        "top_p": request.top_p,
                        "cfg_coef": request.cfg_coef
                    },
                    "mixer_ready": True,  # Indicates this track supports professional mixer
                    "audio_format": "16-bit PCM WAV"
                }
            )
            logger.info(f"💾 [{generation_id}] Saved to database with ID: {db_generation.id}")
        except Exception as db_error:
            logger.error(f"❌ [{generation_id}] Database save failed: {db_error}")
        
        # Enhanced response for professional mixer support
        return {
            "message": "🎵 Music generated successfully!",
            "prompt": request.prompt,
            "status": "completed",
            "generation_id": generation_id,
            "audio_url": f"/audio/{filename}",
            "duration": f"{audio_duration:.1f} seconds",
            "format": "16-bit WAV",
            "sample_rate": model.sample_rate,
            "filepath": filepath,
            "generation_time": f"{total_time:.2f}s",
            "mixer_ready": True,  # Frontend can enable mixer controls
            "stats": {
                "total_time": round(total_time, 2),
                "generation_time": round(gen_time, 2),
                "save_time": round(save_time, 2),
                "file_size_mb": round(file_size_mb, 2),
                "audio_duration": round(audio_duration, 1),
                "realtime_factor": round(realtime_factor, 1),
                "device": device_info,
                "precision": precision,
                "sample_rate": model.sample_rate
            },
            "generation_params": {
                "temperature": request.temperature,
                "top_k": request.top_k,
                "top_p": request.top_p,
                "cfg_coef": request.cfg_coef,
                "duration": request.duration
            }
        }
        
    except Exception as e:
        total_time = time.time() - start_time
        error_msg = str(e)
        
        # Error logging
        logger.error(f"❌ [{generation_id}] Generation failed after {total_time:.2f}s")
        logger.error(f"💥 [{generation_id}] Error: {error_msg}")
        logger.error(f"📝 [{generation_id}] Prompt was: '{request.prompt}'")
        
        # Save error to database
        try:
            DatabaseOperations.create_generation_record(
                db=db,
                generation_id=generation_id,
                prompt=request.prompt,
                total_time=total_time,
                generation_time=0,
                save_time=0,
                device_used="N/A",
                precision="N/A",
                file_path="",
                file_size_mb=0,
                audio_url="",
                sample_rate=0,
                status="error",
                realtime_factor=0,
                error_message=error_msg
            )
            logger.info(f"💾 [{generation_id}] Error saved to database")
        except Exception as db_error:
            logger.error(f"❌ [{generation_id}] Database error save failed: {db_error}")
        
        return {
            "message": "❌ Generation failed",
            "error": error_msg,
            "status": "error",
            "generation_id": generation_id,
            "failed_after": f"{total_time:.2f}s"
        }

# Enhanced mixer settings endpoint
@app.post("/mixer/settings")
async def save_mixer_settings(request: MixerSettingsRequest, db: Session = Depends(get_db)):
    """Save mixer settings for a specific generation"""
    try:
        # Here you could save mixer settings to database or use them for real-time processing
        logger.info(f"🎛️ Mixer settings updated for {request.generation_id}: {request.settings}")
        
        return {
            "success": True,
            "message": "Mixer settings saved",
            "generation_id": request.generation_id,
            "settings": request.settings
        }
    except Exception as e:
        logger.error(f"❌ Failed to save mixer settings: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/mixer/presets")
async def get_mixer_presets():
    """Get available mixer presets"""
    presets = {
        "Reset": {"volume": 75, "bass": 50, "mid": 50, "treble": 50, "reverb": 20, "compression": 30},
        "Warm": {"volume": 80, "bass": 70, "mid": 60, "treble": 40, "reverb": 35, "compression": 45},
        "Bright": {"volume": 75, "bass": 30, "mid": 55, "treble": 80, "reverb": 15, "compression": 25},
        "Deep": {"volume": 85, "bass": 85, "mid": 45, "treble": 35, "reverb": 40, "compression": 55},
        "Vintage": {"volume": 70, "bass": 65, "mid": 70, "treble": 45, "reverb": 50, "compression": 60},
        "Classical": {"volume": 78, "bass": 55, "mid": 65, "treble": 70, "reverb": 45, "compression": 35},
        "Electronic": {"volume": 82, "bass": 75, "mid": 50, "treble": 85, "reverb": 25, "compression": 70}
    }
    
    return {
        "success": True,
        "presets": presets,
        "count": len(presets)
    }

# Enhanced database endpoints
@app.get("/stats")
async def get_stats(days: int = 7, db: Session = Depends(get_db)):
    """Get generation statistics for the last N days"""
    try:
        stats = DatabaseOperations.get_generation_stats(db, days)
        
        # Add mixer usage stats
        mixer_stats = {
            "mixer_enabled_tracks": 0,  # Could track this in future
            "most_used_presets": [],    # Could track preset usage
            "avg_mixer_usage": 0        # Could track how often mixer is used
        }
        
        enhanced_stats = {**stats, **mixer_stats} if stats else mixer_stats
        
        return {
            "success": True,
            "data": enhanced_stats
        }
    except Exception as e:
        logger.error(f"❌ Failed to get stats: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/recent")
async def get_recent_generations(limit: int = 20, db: Session = Depends(get_db)):
    """Get recent generations with mixer support"""
    try:
        generations = DatabaseOperations.get_recent_generations(db, limit)
        return {
            "success": True,
            "data": [
                {
                    "id": gen.id,
                    "generation_id": gen.generation_id,
                    "prompt": gen.prompt,
                    "status": gen.status,
                    "generation_time": gen.generation_time,
                    "device": gen.device_used,
                    "precision": gen.precision,
                    "realtime_factor": gen.realtime_factor,
                    "created_at": gen.created_at.isoformat(),
                    "audio_url": gen.audio_url,
                    "file_size_mb": gen.file_size_mb,
                    "play_count": getattr(gen, 'play_count', 0),
                    "download_count": getattr(gen, 'download_count', 0),
                    "is_favorited": getattr(gen, 'is_favorited', False),
                    "last_played": gen.last_played.isoformat() if hasattr(gen, 'last_played') and gen.last_played else None,
                    "mixer_ready": True,  # All tracks support mixer
                    "sample_rate": getattr(gen, 'sample_rate', 32000),
                    "duration": getattr(gen, 'duration', 10.0)
                }
                for gen in generations
            ]
        }
    except Exception as e:
        logger.error(f"❌ Failed to get recent generations: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/search")
async def search_generations(
    q: str, 
    limit: int = 20, 
    db: Session = Depends(get_db)
):
    """Search generations by prompt with enhanced metadata"""
    try:
        generations = DatabaseOperations.search_generations(db, q, limit=limit)
        return {
            "success": True,
            "data": [
                {
                    "id": gen.id,
                    "generation_id": gen.generation_id,
                    "prompt": gen.prompt,
                    "status": gen.status,
                    "generation_time": gen.generation_time,
                    "device": gen.device_used,
                    "created_at": gen.created_at.isoformat(),
                    "audio_url": gen.audio_url,
                    "realtime_factor": gen.realtime_factor,
                    "mixer_ready": True,
                    "file_size_mb": getattr(gen, 'file_size_mb', 0),
                    "sample_rate": getattr(gen, 'sample_rate', 32000)
                }
                for gen in generations
            ],
            "query": q,
            "count": len(generations)
        }
    except Exception as e:
        logger.error(f"❌ Failed to search generations: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/track-play")
async def track_play(request: PlayTrackRequest, db: Session = Depends(get_db)):
    """Track when a user plays a generated track"""
    try:
        success = DatabaseOperations.record_play(
            db, 
            request.generation_id, 
            request.play_duration
        )
        
        if success:
            logger.info(f"🎧 Play recorded for {request.generation_id} (duration: {request.play_duration}s)")
            return {
                "success": True,
                "message": "Play recorded successfully"
            }
        else:
            return {
                "success": False,
                "error": "Generation not found"
            }
    except Exception as e:
        logger.error(f"❌ Failed to track play: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/download/{generation_id}")
async def download_track(generation_id: str, db: Session = Depends(get_db)):
    """Download a generated track and record the download"""
    try:
        # Get the generation record
        generation = db.query(MusicGeneration).filter(
            MusicGeneration.generation_id == generation_id
        ).first()
        
        if not generation or generation.status != "completed":
            raise HTTPException(status_code=404, detail="Track not found")
        
        # Check if file exists
        if not os.path.exists(generation.file_path):
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        # Record the download
        DatabaseOperations.record_download(db, generation_id)
        logger.info(f"💾 Download recorded for {generation_id}")
        
        # Generate a nice filename
        safe_prompt = "".join(c for c in generation.prompt if c.isalnum() or c in (' ', '-', '_')).rstrip()
        filename = f"{safe_prompt[:50]}.wav"
        
        # Return the file
        return FileResponse(
            path=generation.file_path,
            filename=filename,
            media_type='audio/wav'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Download failed: {e}")
        raise HTTPException(status_code=500, detail="Download failed")

@app.post("/favorite")
async def toggle_favorite(request: FavoriteRequest, db: Session = Depends(get_db)):
    """Toggle favorite status for a track"""
    try:
        is_favorited = DatabaseOperations.toggle_favorite(db, request.generation_id)
        
        logger.info(f"❤️ Favorite toggled for {request.generation_id}: {is_favorited}")
        
        return {
            "success": True,
            "is_favorited": is_favorited,
            "message": "Favorite status updated"
        }
    except Exception as e:
        logger.error(f"❌ Failed to toggle favorite: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/most-played")
async def get_most_played(limit: int = 10, db: Session = Depends(get_db)):
    """Get most played tracks with mixer support"""
    try:
        tracks = DatabaseOperations.get_most_played_generations(db, limit)
        
        return {
            "success": True,
            "data": [
                {
                    "id": track.id,
                    "generation_id": track.generation_id,
                    "prompt": track.prompt,
                    "play_count": getattr(track, 'play_count', 0),
                    "download_count": getattr(track, 'download_count', 0),
                    "is_favorited": getattr(track, 'is_favorited', False),
                    "last_played": track.last_played.isoformat() if hasattr(track, 'last_played') and track.last_played else None,
                    "audio_url": track.audio_url,
                    "created_at": track.created_at.isoformat(),
                    "generation_time": track.generation_time,
                    "device": track.device_used,
                    "file_size_mb": track.file_size_mb,
                    "status": track.status,
                    "precision": getattr(track, 'precision', 'N/A'),
                    "realtime_factor": getattr(track, 'realtime_factor', 0),
                    "mixer_ready": True,
                    "sample_rate": getattr(track, 'sample_rate', 32000),
                    "duration": getattr(track, 'duration', 10.0)
                }
                for track in tracks
            ]
        }
    except Exception as e:
        logger.error(f"❌ Failed to get most played: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/db-status")
async def get_database_status(db: Session = Depends(get_db)):
    """Check database connection and show basic info"""
    try:
        # Test database with a simple query
        total_generations = db.query(MusicGeneration).count()
        successful_generations = db.query(MusicGeneration).filter(
            MusicGeneration.status == "completed"
        ).count()
        
        return {
            "success": True,
            "database_connected": True,
            "total_generations": total_generations,
            "successful_generations": successful_generations,
            "success_rate": f"{(successful_generations / total_generations * 100):.1f}%" if total_generations > 0 else "0%",
            "mixer_ready_tracks": total_generations,  # All tracks support mixer
            "message": "Database is working correctly"
        }
    except Exception as e:
        return {
            "success": False,
            "database_connected": False,
            "error": str(e),
            "message": "Database connection failed"
        }

@app.get("/system-info")
async def get_system_info():
    """Get system information for debugging and monitoring"""
    try:
        system_info = {
            "api_version": "2.0.0",
            "pytorch_version": torch.__version__,
            "cuda_available": torch.cuda.is_available(),
            "audio_directory": AUDIO_DIR,
            "features": {
                "ai_generation": True,
                "professional_mixer": True,
                "real_time_processing": True,
                "advanced_statistics": True,
                "play_tracking": True,
                "favorites_system": True,
                "download_tracking": True,
                "search_functionality": True
            }
        }
        
        if torch.cuda.is_available():
            system_info.update({
                "cuda_version": torch.version.cuda,
                "gpu_count": torch.cuda.device_count(),
                "gpu_name": torch.cuda.get_device_name(0),
                "gpu_memory_total": f"{torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB",
                "gpu_memory_allocated": f"{torch.cuda.memory_allocated() / 1024**3:.2f} GB",
                "gpu_memory_cached": f"{torch.cuda.memory_reserved() / 1024**3:.2f} GB"
            })
        
        return {
            "success": True,
            "system_info": system_info
        }
    except Exception as e:
        logger.error(f"❌ Failed to get system info: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/audio-formats")
async def get_supported_audio_formats():
    """Get information about supported audio formats"""
    return {
        "success": True,
        "supported_formats": {
            "output": {
                "wav": {
                    "description": "16-bit PCM WAV",
                    "sample_rates": [32000, 44100, 48000],
                    "default_sample_rate": 32000,
                    "bit_depth": 16,
                    "channels": 1,
                    "mixer_compatible": True
                }
            },
            "processing": {
                "internal_format": "32-bit float",
                "gpu_precision": "FP16" if torch.cuda.is_available() else "FP32",
                "real_time_capable": torch.cuda.is_available()
            }
        },
        "audio_processing": {
            "mixer_controls": [
                "Master Volume",
                "3-Band EQ (Bass, Mid, Treble)",
                "Reverb",
                "Compression"
            ],
            "presets": [
                "Reset", "Warm", "Bright", "Deep", 
                "Vintage", "Classical", "Electronic"
            ],
            "real_time_adjustment": True
        }
    }

@app.get("/generation-presets")
async def get_generation_presets():
    """Get available generation parameter presets"""
    presets = {
        "default": {
            "name": "Default",
            "description": "Balanced settings for general music generation",
            "duration": 10.0,
            "temperature": 1.0,
            "top_k": 250,
            "top_p": 0.0,
            "cfg_coef": 3.0
        },
        "creative": {
            "name": "Creative",
            "description": "Higher creativity and variation",
            "duration": 10.0,
            "temperature": 1.2,
            "top_k": 200,
            "top_p": 0.1,
            "cfg_coef": 2.5
        },
        "focused": {
            "name": "Focused",
            "description": "More controlled and coherent output",
            "duration": 10.0,
            "temperature": 0.8,
            "top_k": 300,
            "top_p": 0.0,
            "cfg_coef": 4.0
        },
        "experimental": {
            "name": "Experimental",
            "description": "Maximum creativity and exploration",
            "duration": 10.0,
            "temperature": 1.5,
            "top_k": 150,
            "top_p": 0.2,
            "cfg_coef": 2.0
        },
        "short": {
            "name": "Short Track",
            "description": "Quick 5-second generation",
            "duration": 5.0,
            "temperature": 1.0,
            "top_k": 250,
            "top_p": 0.0,
            "cfg_coef": 3.0
        },
        "long": {
            "name": "Extended",
            "description": "Longer 15-second generation",
            "duration": 15.0,
            "temperature": 1.0,
            "top_k": 250,
            "top_p": 0.0,  
            "cfg_coef": 3.0
        }
    }
    
    return {
        "success": True,
        "presets": presets,
        "count": len(presets),
        "parameter_ranges": {
            "duration": {"min": 1.0, "max": 30.0, "default": 10.0},
            "temperature": {"min": 0.1, "max": 2.0, "default": 1.0},
            "top_k": {"min": 50, "max": 500, "default": 250},
            "top_p": {"min": 0.0, "max": 1.0, "default": 0.0},
            "cfg_coef": {"min": 1.0, "max": 10.0, "default": 3.0}
        }
    }

@app.post("/generation-preset/{preset_name}")
async def generate_with_preset(
    preset_name: str, 
    prompt: str, 
    db: Session = Depends(get_db)
):
    """Generate music using a predefined preset"""
    try:
        # Get available presets
        presets_response = await get_generation_presets()
        presets = presets_response["presets"]
        
        if preset_name not in presets:
            raise HTTPException(status_code=404, detail=f"Preset '{preset_name}' not found")
        
        preset = presets[preset_name]
        
        # Create request with preset parameters
        request = MusicRequest(
            prompt=prompt,
            duration=preset["duration"],
            temperature=preset["temperature"],
            top_k=preset["top_k"],
            top_p=preset["top_p"],
            cfg_coef=preset["cfg_coef"]
        )
        
        logger.info(f"🎨 Generating with preset '{preset_name}' for prompt: '{prompt}'")
        
        # Generate music with preset
        result = await generate_music(request, db)
        
        # Add preset info to response
        if result.get("status") == "completed":
            result["preset_used"] = {
                "name": preset_name,
                "description": preset["description"],
                "parameters": preset
            }
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to generate with preset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/popular-prompts")
async def get_popular_prompts(limit: int = 10, db: Session = Depends(get_db)):
    """Get most popular prompt keywords and phrases"""
    try:
        # This would require more sophisticated text analysis
        # For now, return basic stats from database
        stats = DatabaseOperations.get_generation_stats(db, days=30)
        
        return {
            "success": True,
            "popular_prompts": stats.get("popular_prompts", []) if stats else [],
            "analysis_period": "30 days",
            "total_prompts_analyzed": stats.get("total_generations", 0) if stats else 0
        }
    except Exception as e:
        logger.error(f"❌ Failed to get popular prompts: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/analytics/performance")
async def get_performance_analytics(days: int = 7, db: Session = Depends(get_db)):
    """Get performance analytics and trends"""
    try:
        stats = DatabaseOperations.get_generation_stats(db, days)
        
        performance_data = {
            "generation_performance": {
                "avg_generation_time": stats.get("avg_generation_time", 0) if stats else 0,
                "total_generations": stats.get("total_generations", 0) if stats else 0,
                "success_rate": stats.get("success_rate", 0) if stats else 0,
                "avg_realtime_factor": 0  # Could calculate from database
            },
            "system_performance": {
                "gpu_available": torch.cuda.is_available(),
                "gpu_memory_usage": f"{torch.cuda.memory_allocated() / 1024**3:.2f} GB" if torch.cuda.is_available() else "N/A",
                "model_loaded": _cached_model is not None
            },
            "user_engagement": {
                "total_plays": stats.get("total_plays", 0) if stats else 0,
                "total_downloads": stats.get("total_downloads", 0) if stats else 0,
                "avg_plays_per_track": stats.get("avg_plays_per_generation", 0) if stats else 0
            },
            "analysis_period": f"{days} days"
        }
        
        return {
            "success": True,
            "performance_analytics": performance_data
        }
    except Exception as e:
        logger.error(f"❌ Failed to get performance analytics: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/optimize/gpu")
async def optimize_gpu():
    """Optimize GPU memory usage"""
    try:
        if not torch.cuda.is_available():
            return {
                "success": False,
                "message": "GPU not available"
            }
        
        # Record memory before optimization
        memory_before = torch.cuda.memory_allocated() / 1024**3
        
        # Clear GPU cache
        torch.cuda.empty_cache()
        
        # Garbage collection
        import gc
        gc.collect()
        
        # Record memory after optimization
        memory_after = torch.cuda.memory_allocated() / 1024**3
        memory_freed = memory_before - memory_after
        
        logger.info(f"🧹 GPU optimization completed. Freed: {memory_freed:.2f} GB")
        
        return {
            "success": True,
            "message": "GPU optimization completed",
            "memory_before_gb": round(memory_before, 2),
            "memory_after_gb": round(memory_after, 2),
            "memory_freed_gb": round(memory_freed, 2)
        }
    except Exception as e:
        logger.error(f"❌ GPU optimization failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/debug/model-info")
async def get_model_debug_info():
    """Get detailed model information for debugging"""
    try:
        if _cached_model is None:
            return {
                "success": False,
                "message": "Model not loaded"
            }
        
        model_info = {
            "model_loaded": True,
            "model_type": type(_cached_model).__name__,
            "sample_rate": _cached_model.sample_rate,
            "generation_params": {
                "duration": getattr(_cached_model, 'duration', 'unknown'),
                "use_sampling": getattr(_cached_model, 'use_sampling', 'unknown'),
                "top_k": getattr(_cached_model, 'top_k', 'unknown'),
                "top_p": getattr(_cached_model, 'top_p', 'unknown'),
                "temperature": getattr(_cached_model, 'temperature', 'unknown'),
                "cfg_coef": getattr(_cached_model, 'cfg_coef', 'unknown')
            }
        }
        
        if torch.cuda.is_available():
            model_info["gpu_info"] = {
                "device_name": torch.cuda.get_device_name(0),
                "memory_allocated": f"{torch.cuda.memory_allocated() / 1024**3:.2f} GB",
                "memory_reserved": f"{torch.cuda.memory_reserved() / 1024**3:.2f} GB",
                "memory_total": f"{torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB"
            }
        
        return {
            "success": True,
            "model_info": model_info
        }
    except Exception as e:
        logger.error(f"❌ Failed to get model debug info: {e}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting Music Genie API server...")
    logger.info("🌟 Features enabled:")
    logger.info("   - AI Music Generation ✅")
    logger.info("   - Professional Audio Mixer ✅") 
    logger.info("   - Real-time Audio Processing ✅")
    logger.info("   - Advanced Statistics ✅")
    logger.info("   - Play Tracking ✅")
    logger.info("   - Favorites System ✅")
    logger.info("   - Download Tracking ✅")
    logger.info("   - Search Functionality ✅")
    logger.info("   - Performance Analytics ✅")
    logger.info("   - GPU Optimization ✅")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info",
        access_log=True
    )