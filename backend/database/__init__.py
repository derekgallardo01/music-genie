# database/__init__.py - FIXED with get_db_session and get_pool_status exports
from .database import get_db, create_tables, test_connection_and_setup, engine, SessionLocal, get_db_session, get_pool_status
from .models import Base, User, MusicGeneration, UsageStats, SystemMetrics
from .operations import DatabaseOperations

__all__ = [
    "get_db",
    "get_db_session",
    "get_pool_status",
    "create_tables",
    "test_connection_and_setup",
    "engine", 
    "SessionLocal",
    "Base",
    "User",
    "MusicGeneration", 
    "UsageStats",
    "SystemMetrics",
    "DatabaseOperations"
]