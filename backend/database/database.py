# =============================================================================
# File: database/database.py - COMPLETE REWRITE
# =============================================================================

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import QueuePool
import os
import logging
from typing import Generator
from contextlib import contextmanager

# Configure logging for database operations
logger = logging.getLogger(__name__)

# =============================================================================
# FIXED DATABASE CONFIGURATION WITH PROPER 2.0 SYNTAX
# =============================================================================

# Environment-aware database URL (FIXES CRITICAL ISSUE #4 - HARDCODED PATHS)
def get_database_url():
    """Get database URL from environment with fallbacks"""
    return os.getenv(
        "DATABASE_URL", 
        os.getenv(
            "DB_URL",  # Alternative env var name
            "postgresql://music_user:1234@localhost:5432/music_genie"
        )
    )

DATABASE_URL = get_database_url()

def get_database_config():
    """Get database configuration based on environment"""
    env = os.getenv("ENVIRONMENT", "development")
    
    configs = {
        "production": {
            "pool_size": 20,
            "max_overflow": 30,
            "pool_timeout": 60,
            "pool_recycle": 3600,
            "pool_pre_ping": True,
            "connect_args": {
                "connect_timeout": 10,
                "application_name": "MusicGenie-Production"
            }
        },
        "staging": {
            "pool_size": 10,
            "max_overflow": 20,
            "pool_timeout": 30,
            "pool_recycle": 1800,
            "pool_pre_ping": True,
            "connect_args": {
                "connect_timeout": 10,
                "application_name": "MusicGenie-Staging"
            }
        },
        "development": {
            "pool_size": 5,
            "max_overflow": 10,
            "pool_timeout": 30,
            "pool_recycle": 1800,
            "pool_pre_ping": True,
            "connect_args": {
                "connect_timeout": 10,
                "application_name": "MusicGenie-Development"
            }
        }
    }
    
    return configs.get(env, configs["development"])

# Get configuration based on environment
db_config = get_database_config()

# =============================================================================
# PROPER SQLAlchemy 2.0 ENGINE SETUP
# =============================================================================

# Create engine with proper SQLAlchemy 2.0 syntax
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=db_config["pool_size"],
    max_overflow=db_config["max_overflow"],
    pool_timeout=db_config["pool_timeout"],
    pool_recycle=db_config["pool_recycle"],
    pool_pre_ping=db_config["pool_pre_ping"],
    connect_args=db_config["connect_args"],
    echo=os.getenv("DB_ECHO", "false").lower() == "true",
    echo_pool=os.getenv("DB_ECHO_POOL", "false").lower() == "true",
    # SQLAlchemy 2.0 - future=True is now default, but we can be explicit
    future=True
)

# Create session factory with proper SQLAlchemy 2.0 syntax
SessionLocal = sessionmaker(
    bind=engine,
    expire_on_commit=False,  # SQLAlchemy 2.0 recommended setting
    autoflush=False,
    autocommit=False
)

# =============================================================================
# ENHANCED DATABASE DEPENDENCY WITH PROPER ERROR HANDLING
# =============================================================================

def get_db() -> Generator:
    """Enhanced database dependency with proper error handling and logging"""
    db = None
    try:
        db = SessionLocal()
        
        if os.getenv("DB_DEBUG", "false").lower() == "true":
            log_pool_status()
        
        yield db
        
    except Exception as e:
        logger.error(f"Database session error: {e}")
        if db:
            try:
                db.rollback()
            except Exception as rollback_error:
                logger.error(f"Failed to rollback transaction: {rollback_error}")
        raise
    finally:
        if db:
            try:
                db.close()
            except Exception as close_error:
                logger.error(f"Failed to close database session: {close_error}")

@contextmanager
def get_db_session():
    """Context manager for database sessions - MORE RELIABLE APPROACH"""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        logger.error(f"Database session error: {e}")
        session.rollback()
        raise
    finally:
        session.close()

# =============================================================================
# CONNECTION POOL MONITORING (SQLAlchemy 2.0 Compatible)
# =============================================================================

def get_pool_status():
    """Get current connection pool status for monitoring"""
    try:
        pool = engine.pool
        return {
            "pool_size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "total_connections": pool.checkedout() + pool.checkedin(),
            "max_connections": db_config["pool_size"] + db_config["max_overflow"],
            "pool_timeout": db_config["pool_timeout"],
            "pool_recycle": db_config["pool_recycle"],
            "environment": os.getenv("ENVIRONMENT", "development"),
            "sqlalchemy_version": "2.0.x",
            "database_url_host": DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else "unknown"
        }
    except Exception as e:
        logger.error(f"Failed to get pool status: {e}")
        return {"error": str(e)}

def log_pool_status():
    """Log current pool status for monitoring"""
    try:
        status = get_pool_status()
        if "error" not in status:
            logger.info(f"🏊 DB Pool Status (v2.0): {status['checked_out']}/{status['max_connections']} connections in use")
            
            usage_percent = (status['checked_out'] / status['max_connections']) * 100
            if usage_percent > 80:
                logger.warning(f"⚠️ High database pool usage: {usage_percent:.1f}%")
        else:
            logger.error(f"❌ Pool status error: {status['error']}")
    except Exception as e:
        logger.error(f"Failed to log pool status: {e}")

# =============================================================================
# DATABASE HEALTH CHECK FUNCTIONS (SQLAlchemy 2.0)
# =============================================================================

def test_connection_and_setup():
    """Enhanced connection test with proper SQLAlchemy 2.0 syntax"""
    try:
        logger.info(f"🔍 Testing SQLAlchemy 2.0 database connection...")
        logger.info(f"📊 Pool Configuration: {db_config['pool_size']} base + {db_config['max_overflow']} overflow")
        
        # SQLAlchemy 2.0 style connection test - FIXED transaction issue
        with engine.connect() as connection:
            # Test basic connectivity
            result = connection.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            
            # Get database info in same connection
            result = connection.execute(text("SELECT current_database(), current_user;"))
            db_info = result.fetchone()
            
            logger.info(f"✅ Database connected successfully with SQLAlchemy 2.0!")
            logger.info(f"📊 PostgreSQL version: {version}")
            logger.info(f"🗄️ Database: {db_info[0]}")
            logger.info(f"👤 User: {db_info[1]}")
            
            pool_status = get_pool_status()
            logger.info(f"🏊 Connection pool initialized: {pool_status['pool_size']} connections")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        logger.error(f"🔗 Connection URL: {DATABASE_URL.split('@')[0] if '@' in DATABASE_URL else 'Invalid URL'}@[HIDDEN]")
        return False
# =============================================================================
# TABLE CREATION (SQLAlchemy 2.0)
# =============================================================================

def create_tables():
    """Create all tables with SQLAlchemy 2.0 and proper error handling"""
    try:
        # Import here to avoid circular imports
        from .models import Base
        
        logger.info("📊 Creating database tables with SQLAlchemy 2.0...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created/verified successfully!")
        
        # Log pool status after table creation
        log_pool_status()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create tables: {e}")
        raise

# =============================================================================
# STARTUP VALIDATION
# =============================================================================

def validate_database_config():
    """Validate database configuration on startup"""
    logger.info("🔍 Validating SQLAlchemy 2.0 database configuration...")
    
    env = os.getenv("ENVIRONMENT", "development")
    logger.info(f"🌍 Environment: {env}")
    logger.info(f"🔧 SQLAlchemy: 2.0.x (future=True)")
    logger.info(f"🏊 Pool size: {db_config['pool_size']} + {db_config['max_overflow']} overflow")
    logger.info(f"⏰ Pool timeout: {db_config['pool_timeout']}s")
    logger.info(f"♻️ Pool recycle: {db_config['pool_recycle']}s")
    logger.info(f"🏥 Pre-ping enabled: {db_config['pool_pre_ping']}")
    
    # Validate configuration values
    if db_config["pool_size"] <= 0:
        logger.warning("⚠️ Pool size is 0 or negative!")
        return False
    
    if db_config["pool_timeout"] <= 0:
        logger.warning("⚠️ Pool timeout is 0 or negative!")
        return False
    
    # Validate DATABASE_URL format
    if not DATABASE_URL.startswith(('postgresql://', 'postgresql+psycopg2://')):
        logger.error("❌ Invalid DATABASE_URL format - must start with 'postgresql://'")
        return False
    
    logger.info("✅ SQLAlchemy 2.0 database configuration validated")
    return True

# Run validation on import
if not validate_database_config():
    logger.error("❌ Database configuration validation failed!")

# =============================================================================
# UTILITY FUNCTIONS FOR MIGRATION
# =============================================================================

def check_sqlalchemy_version():
    """Check and log SQLAlchemy version"""
    try:
        import sqlalchemy
        version = sqlalchemy.__version__
        logger.info(f"📦 SQLAlchemy version: {version}")
        
        if version.startswith('1.'):
            logger.warning(f"⚠️ Using SQLAlchemy 1.x ({version}) - consider upgrading to 2.0+")
        else:
            logger.info(f"✅ Using modern SQLAlchemy {version}")
        
        return version
    except ImportError:
        logger.error("❌ SQLAlchemy not installed!")
        return None

# Check version on import
check_sqlalchemy_version()