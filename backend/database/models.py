# =============================================================================
# CRITICAL FIX #2: Standardized Database Models
# File: database/models.py - COMPLETELY REWRITTEN FOR CONSISTENCY
# =============================================================================

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional, Dict, Any
import os

Base = declarative_base()

# =============================================================================
# FIXED USER MODEL
# =============================================================================

class User(Base):
    """User model with proper constraints and relationships"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_active = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # User preferences
    preferred_device = Column(String(20), default='auto', nullable=False)
    preferred_precision = Column(String(20), default='float32', nullable=False)
    default_duration = Column(Float, default=30.0, nullable=False)
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_active": self.last_active.isoformat() if self.last_active else None,
            "is_active": self.is_active,
            "preferred_device": self.preferred_device,
            "preferred_precision": self.preferred_precision,
            "default_duration": self.default_duration
        }

# =============================================================================
# FIXED MUSIC GENERATION MODEL - CONSISTENT FIELD NAMES
# =============================================================================

class MusicGeneration(Base):
    """
    FIXED Music generation model with standardized field names
    NO MORE device_used, total_time, or inconsistent fields
    """
    __tablename__ = "music_generations"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    generation_id = Column(String(100), unique=True, index=True, nullable=False)
    prompt = Column(Text, nullable=False)
    
    # Generation metadata - STANDARDIZED NAMES
    status = Column(String(20), default='processing', nullable=False, index=True)
    device = Column(String(50), nullable=False)  # NO MORE device_used
    precision = Column(String(20), default='float32', nullable=False)
    generation_time = Column(Float, nullable=False)  # NO MORE total_time
    realtime_factor = Column(Float, default=1.0, nullable=False)
    
    # Audio file properties
    file_path = Column(String(500), nullable=True)
    audio_url = Column(String(500), nullable=True)
    file_size_mb = Column(Float, nullable=False)
    duration = Column(Float, default=30.0, nullable=False)
    sample_rate = Column(Integer, default=32000, nullable=False)
    
    # User interaction tracking
    play_count = Column(Integer, default=0, nullable=False)
    download_count = Column(Integer, default=0, nullable=False)
    is_favorited = Column(Boolean, default=False, nullable=False)
    last_played = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Optional fields for advanced features
    user_id = Column(Integer, nullable=True)  # Foreign key to users table
    error_message = Column(Text, nullable=True)  # For failed generations
    model_version = Column(String(50), default='musicgen-small', nullable=False)
    
    def __repr__(self):
        return f"<MusicGeneration(id={self.id}, generation_id='{self.generation_id}', status='{self.status}')>"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with CONSISTENT field names"""
        return {
            "id": self.id,
            "generation_id": self.generation_id,
            "prompt": self.prompt,
            "status": self.status,
            
            # FIXED: Consistent field names
            "device": self.device,  # NO MORE device_used
            "precision": self.precision,
            "generation_time": self.generation_time,  # NO MORE total_time
            "realtime_factor": self.realtime_factor,
            
            # Audio properties
            "file_path": self.file_path,
            "audio_url": self.audio_url,
            "file_size_mb": self.file_size_mb,
            "duration": self.duration,
            "sample_rate": self.sample_rate,
            
            # User interactions
            "play_count": self.play_count,
            "download_count": self.download_count,
            "is_favorited": self.is_favorited,
            "last_played": self.last_played.isoformat() if self.last_played else None,
            
            # Timestamps
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            
            # Optional fields
            "user_id": self.user_id,
            "error_message": self.error_message,
            "model_version": self.model_version
        }
    
    def calculate_actual_file_size(self) -> float:
        """Calculate actual file size from file system"""
        if self.file_path and os.path.exists(self.file_path):
            size_bytes = os.path.getsize(self.file_path)
            size_mb = size_bytes / (1024 * 1024)
            return round(size_mb, 2)
        return 0.0
    
    def update_file_size(self) -> None:
        """Update file_size_mb with actual file size"""
        actual_size = self.calculate_actual_file_size()
        if actual_size > 0:
            self.file_size_mb = actual_size
    
    def increment_play_count(self) -> None:
        """Increment play count and update last_played"""
        self.play_count += 1
        self.last_played = datetime.utcnow()
    
    def increment_download_count(self) -> None:
        """Increment download count"""
        self.download_count += 1
    
    def toggle_favorite(self) -> bool:
        """Toggle favorite status and return new status"""
        self.is_favorited = not self.is_favorited
        return self.is_favorited

# =============================================================================
# USAGE STATISTICS MODEL - FOR ANALYTICS
# =============================================================================

class UsageStats(Base):
    """Usage statistics for analytics"""
    __tablename__ = "usage_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Daily counts
    total_generations = Column(Integer, default=0, nullable=False)
    successful_generations = Column(Integer, default=0, nullable=False)
    failed_generations = Column(Integer, default=0, nullable=False)
    
    # Performance metrics
    avg_generation_time = Column(Float, default=0.0, nullable=False)
    avg_realtime_factor = Column(Float, default=0.0, nullable=False)
    
    # User engagement
    total_plays = Column(Integer, default=0, nullable=False)
    total_downloads = Column(Integer, default=0, nullable=False)
    total_favorites = Column(Integer, default=0, nullable=False)
    unique_users = Column(Integer, default=0, nullable=False)
    
    def __repr__(self):
        return f"<UsageStats(date={self.date}, total_generations={self.total_generations})>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "date": self.date.isoformat() if self.date else None,
            "total_generations": self.total_generations,
            "successful_generations": self.successful_generations,
            "failed_generations": self.failed_generations,
            "success_rate": (self.successful_generations / max(self.total_generations, 1)) * 100,
            "avg_generation_time": self.avg_generation_time,
            "avg_realtime_factor": self.avg_realtime_factor,
            "total_plays": self.total_plays,
            "total_downloads": self.total_downloads,
            "total_favorites": self.total_favorites,
            "unique_users": self.unique_users
        }

# =============================================================================
# SYSTEM METRICS MODEL - FOR MONITORING
# =============================================================================

class SystemMetrics(Base):
    """System performance metrics"""
    __tablename__ = "system_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # System resources
    cpu_usage = Column(Float, nullable=True)
    memory_usage = Column(Float, nullable=True)
    gpu_usage = Column(Float, nullable=True)
    gpu_memory_usage = Column(Float, nullable=True)
    disk_usage = Column(Float, nullable=True)
    
    # Model performance
    model_loaded = Column(Boolean, default=False, nullable=False)
    model_load_time = Column(Float, nullable=True)
    active_generations = Column(Integer, default=0, nullable=False)
    
    # API performance
    response_time_avg = Column(Float, nullable=True)
    error_rate = Column(Float, default=0.0, nullable=False)
    requests_per_minute = Column(Integer, default=0, nullable=False)
    
    def __repr__(self):
        return f"<SystemMetrics(timestamp={self.timestamp}, cpu_usage={self.cpu_usage})>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "cpu_usage": self.cpu_usage,
            "memory_usage": self.memory_usage,
            "gpu_usage": self.gpu_usage,
            "gpu_memory_usage": self.gpu_memory_usage,
            "disk_usage": self.disk_usage,
            "model_loaded": self.model_loaded,
            "model_load_time": self.model_load_time,
            "active_generations": self.active_generations,
            "response_time_avg": self.response_time_avg,
            "error_rate": self.error_rate,
            "requests_per_minute": self.requests_per_minute
        }

# =============================================================================
# DATABASE INDEXES FOR PERFORMANCE
# =============================================================================

# Create composite indexes for common queries
Index('idx_generations_status_created', MusicGeneration.status, MusicGeneration.created_at.desc())
Index('idx_generations_favorited_created', MusicGeneration.is_favorited, MusicGeneration.created_at.desc())
Index('idx_generations_play_count_desc', MusicGeneration.play_count.desc())
Index('idx_usage_stats_date', UsageStats.date.desc())
Index('idx_system_metrics_timestamp', SystemMetrics.timestamp.desc())

# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

def validate_generation_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and clean generation data before database insertion"""
    
    # Ensure required fields exist
    required_fields = {
        'generation_id': str,
        'prompt': str,
        'device': str,
        'generation_time': float,
        'file_size_mb': float
    }
    
    for field, expected_type in required_fields.items():
        if field not in data:
            raise ValueError(f"Missing required field: {field}")
        
        if not isinstance(data[field], expected_type):
            try:
                data[field] = expected_type(data[field])
            except (ValueError, TypeError):
                raise ValueError(f"Invalid type for {field}: expected {expected_type.__name__}")
    
    # Set defaults for optional fields
    defaults = {
        'status': 'completed',
        'precision': 'float32',
        'realtime_factor': 1.0,
        'duration': 30.0,
        'sample_rate': 32000,
        'play_count': 0,
        'download_count': 0,
        'is_favorited': False,
        'model_version': 'musicgen-small'
    }
    
    for field, default_value in defaults.items():
        if field not in data or data[field] is None:
            data[field] = default_value
    
    # Validate ranges
    if data['generation_time'] <= 0:
        raise ValueError("generation_time must be positive")
    
    if data['file_size_mb'] <= 0:
        raise ValueError("file_size_mb must be positive")
    
    if data['realtime_factor'] <= 0:
        data['realtime_factor'] = 1.0  # Default fallback
    
    return data

# =============================================================================
# SCHEMA VERSION TRACKING
# =============================================================================

class SchemaVersion(Base):
    """Track database schema version for migrations"""
    __tablename__ = "schema_version"
    
    id = Column(Integer, primary_key=True)
    version = Column(String(20), nullable=False)
    applied_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    description = Column(Text, nullable=True)

# Current schema version
CURRENT_SCHEMA_VERSION = "2.1.0"