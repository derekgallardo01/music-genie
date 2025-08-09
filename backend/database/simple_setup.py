# simple_setup.py
"""
Simple database setup for Music Genie
This script will create the database files and test the connection
"""

import os
import sys

def create_database_files():
    """Create the database module files"""
    
    print("📁 Creating database directory structure...")
    
    # Create database directory
    os.makedirs("database", exist_ok=True)
    
    # Create __init__.py
    with open("database/__init__.py", "w") as f:
        f.write("# Database module for Music Genie\n")
    
    print("✅ Database directory created")
    print("\n📝 Next steps:")
    print("1. Copy the database files from the artifacts:")
    print("   - database/models.py")
    print("   - database/database.py") 
    print("   - database/operations.py")
    print("\n2. Set your DATABASE_URL environment variable:")
    print("   $env:DATABASE_URL=\"postgresql://music_user:password@localhost:5432/music_genie\"")
    print("\n3. Install dependencies:")
    print("   pip install psycopg2-binary sqlalchemy")
    print("\n4. Run: python test_db.py")

def test_environment():
    """Test if we have the required packages"""
    print("🔍 Checking environment...")
    
    try:
        import sqlalchemy
        print("✅ SQLAlchemy installed")
    except ImportError:
        print("❌ SQLAlchemy not installed")
        print("   Run: pip install sqlalchemy")
        return False
    
    try:
        import psycopg2
        print("✅ psycopg2 installed")
    except ImportError:
        print("❌ psycopg2 not installed")
        print("   Run: pip install psycopg2-binary")
        return False
    
    # Check environment variable
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        print(f"✅ DATABASE_URL set: {db_url[:30]}...")
    else:
        print("❌ DATABASE_URL not set")
        print("   Set with: $env:DATABASE_URL=\"postgresql://user:pass@localhost:5432/dbname\"")
        return False
    
    return True

if __name__ == "__main__":
    create_database_files()
    print("\n" + "="*50)
    test_environment()