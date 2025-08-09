# setup_database.py
"""
Database setup script for Music Genie
Run this once to initialize your PostgreSQL database
"""

import os
from database.database import test_connection_and_setup, create_tables
from database.models import Base, User, MusicGeneration
from database.operations import DatabaseOperations

def setup_database():
    """Complete database setup"""
    
    print("🗄️ Setting up Music Genie Database...")
    
    # Test connection
    print("\n1. Testing database connection...")
    if not test_connection_and_setup():
        print("❌ Database connection failed!")
        print("Make sure PostgreSQL is running and credentials are correct.")
        return False
    
    # Create tables
    print("\n2. Creating database tables...")
    try:
        create_tables()
        print("✅ Tables created successfully!")
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        return False
    
    # Verify tables
    print("\n3. Verifying table creation...")
    try:
        from database.database import engine
        inspector = engine.dialect.get_table_names(engine.connect())
        expected_tables = ['users', 'music_generations', 'usage_stats', 'system_metrics']
        
        for table in expected_tables:
            if table in inspector:
                print(f"  ✅ {table}")
            else:
                print(f"  ❌ {table} - Missing!")
        
    except Exception as e:
        print(f"❌ Failed to verify tables: {e}")
        return False
    
    print("\n🎉 Database setup completed successfully!")
    print("\nYou can now:")
    print("  - Start your FastAPI server")
    print("  - Generate music (data will be saved to PostgreSQL)")
    print("  - View stats at http://localhost:8000/stats")
    print("  - Search generations at http://localhost:8000/search?q=jazz")
    
    return True

def show_connection_info():
    """Show database connection information"""
    print("\n📊 Database Configuration:")
    print(f"  URL: {os.getenv('DATABASE_URL', 'postgresql://music_user:***@localhost:5432/music_genie')}")
    print("  Tables: users, music_generations, usage_stats, system_metrics")
    print("\n🔧 To customize connection, set environment variable:")
    print("  export DATABASE_URL='postgresql://user:password@host:port/dbname'")

if __name__ == "__main__":
    show_connection_info()
    setup_database()