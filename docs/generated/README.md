# 🎵 Music Genie Documentation

**Generated:** 2025-08-08T19:51:59.372920  
**Version:** 2.1.0  
**Status:** Production Ready ✅

## 📋 Overview

AI-powered music generation platform with FastAPI backend and Next.js frontend

### 🏗️ Architecture
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL, PyTorch, AudioCraft
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion
- **Database:** PostgreSQL, SQLAlchemy ORM
- **AI/ML:** MusicGen, PyTorch, torchaudio

## 🗄️ Database Schema

### Connection Status
**Status:** not_connected

### Tables

#### 📊 music_generations
*Main table for storing music generation records*

| Column | Type | Primary Key | Nullable |
|--------|------|-------------|----------|
| id | INTEGER | ✅ | ❌ |
| generation_id | VARCHAR(100) |  | ❌ |
| prompt | TEXT |  | ❌ |
| status | VARCHAR(20) |  | ❌ |
| device | VARCHAR(50) |  | ❌ |
| precision | VARCHAR(20) |  | ❌ |
| generation_time | FLOAT |  | ❌ |
| realtime_factor | FLOAT |  | ❌ |
| file_path | VARCHAR(500) |  | ✅ |
| audio_url | VARCHAR(500) |  | ✅ |
| file_size_mb | FLOAT |  | ❌ |
| duration | FLOAT |  | ❌ |
| sample_rate | INTEGER |  | ❌ |
| play_count | INTEGER |  | ❌ |
| download_count | INTEGER |  | ❌ |
| is_favorited | BOOLEAN |  | ❌ |
| last_played | TIMESTAMP |  | ✅ |
| created_at | TIMESTAMP |  | ❌ |
| updated_at | TIMESTAMP |  | ✅ |


#### 📊 users
*User accounts and preferences*

| Column | Type | Primary Key | Nullable |
|--------|------|-------------|----------|
| id | INTEGER | ✅ | ❌ |
| username | VARCHAR(50) |  | ❌ |
| email | VARCHAR(100) |  | ✅ |
| created_at | TIMESTAMP |  | ❌ |
| preferred_device | VARCHAR(20) |  | ❌ |


#### 📊 usage_stats
*Daily usage statistics and analytics*

| Column | Type | Primary Key | Nullable |
|--------|------|-------------|----------|
| id | INTEGER | ✅ | ❌ |
| date | TIMESTAMP |  | ❌ |
| total_generations | INTEGER |  | ❌ |
| successful_generations | INTEGER |  | ❌ |
| avg_generation_time | FLOAT |  | ❌ |


#### 📊 system_metrics
*System performance monitoring*

| Column | Type | Primary Key | Nullable |
|--------|------|-------------|----------|
| id | INTEGER | ✅ | ❌ |
| timestamp | TIMESTAMP |  | ❌ |
| cpu_usage | FLOAT |  | ✅ |
| memory_usage | FLOAT |  | ✅ |
| gpu_usage | FLOAT |  | ✅ |


## 🔗 API Endpoints
**Base URL:** http://localhost:8000

### POST /generate
Generate new music from text prompt

**Rate Limit:** 10 requests per minute

**Parameters:**
- `prompt`: string (required) - Text description of music to generate
- `duration`: float (optional) - Duration in seconds (5-120)
- `device`: string (optional) - Device to use (auto/CPU/CUDA/MPS)
- `precision`: string (optional) - Model precision (float32/float16)

### GET /recent
Get recent music generations

**Rate Limit:** 30 requests per minute

**Parameters:**
- `limit`: integer (optional) - Number of generations to return (1-100)

### GET /most-played
Get most played music generations

**Rate Limit:** 30 requests per minute

**Parameters:**
- `limit`: integer (optional) - Number of generations to return

### GET /search
Search generations by prompt text

**Rate Limit:** 20 requests per minute

**Parameters:**
- `q`: string (required) - Search query
- `limit`: integer (optional) - Number of results (1-100)

### GET /stats
Get generation statistics and analytics

**Rate Limit:** 20 requests per minute

**Parameters:**
- `days`: integer (optional) - Number of days to analyze (1-365)

### POST /track-play
Track when a user plays a generation

**Rate Limit:** 100 requests per minute

**Parameters:**
- `generation_id`: string (required) - ID of the generation
- `play_duration`: float (optional) - Duration played in seconds

### POST /favorite
Toggle favorite status of a generation

**Rate Limit:** 60 requests per minute

**Parameters:**
- `generation_id`: string (required) - ID of the generation to toggle

### POST /download/{generation_id}
Download a generated audio file

**Rate Limit:** 30 requests per minute

**Parameters:**
- `generation_id`: string (required) - ID of generation to download

### GET /health
Get system health status

**Rate Limit:** 60 requests per minute


### GET /model/status
Get AI model loading status

**Rate Limit:** 10 requests per minute


### POST /model/reload
Reload the AI model

**Rate Limit:** 2 requests per minute



## 🚀 Frontend Structure

- **Framework:** Next.js 15 with React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS

### Key Components
- `app/page.tsx` - Main application with tab navigation
- `components/tabs/` - Generate, History, Popular, Stats tabs
- `components/audio/` - Audio player and generation cards
- `types/index.ts` - TypeScript type definitions
- `utils/config.ts` - Environment configuration

## ⚙️ Environment Variables

### Backend Configuration
- `AUDIO_DIR`: Directory for storing generated audio files
- `MODEL_CACHE_DIR`: Directory for caching AI models
- `ENVIRONMENT`: Environment type (affects logging and performance)
- `DEBUG`: Enable debug mode with verbose logging

### Frontend Configuration
- `NEXT_PUBLIC_API_URL`: Backend API base URL
- `NEXT_PUBLIC_ENVIRONMENT`: Frontend environment (affects behavior)
- `NEXT_PUBLIC_DEBUG_MODE`: Enable frontend debug logging
- `NEXT_PUBLIC_MAX_RECENT_TRACKS`: Maximum number of recent tracks to display


## 📦 Dependencies

### Python Backend
- `fastapi`: latest
- `uvicorn`: latest
- `sqlalchemy`: 2.0+
- `psycopg2-binary`: latest
- `torch`: 2.0+
- `torchaudio`: 2.0+
- `audiocraft`: latest
- `slowapi`: latest
- `psutil`: latest

### Node.js Frontend
- `next`: 15.4.4
- `react`: 19.1.0
- `react-dom`: 19.1.0
- `typescript`: ^5
- `tailwindcss`: ^4
- `framer-motion`: ^12.23.9
- `zustand`: ^5.0.6


## 🚀 Deployment

### Development
- **Backend:** `python main.py` (http://localhost:8000)
- **Frontend:** `npm run dev` (http://localhost:3000)

### Production
- **Backend:** Deploy to Railway, Heroku, or AWS
- **Frontend:** Deploy to Vercel or Netlify
- **Database:** Use managed PostgreSQL service

### System Requirements
- **Python:** 3.8+
- **Node.js:** 18+
- **PostgreSQL:** 13+
- **RAM:** 8GB+ (16GB recommended)
- **GPU:** Optional (4GB+ VRAM for faster generation)

## 📊 Schema Consistency Status

✅ **Database fields verified:**
- `device` (standardized, no more `device_used`)
- `generation_time` (standardized, no more `total_time`)
- `file_size_mb` (calculated from actual files)
- All user interaction fields present

## 🎯 Ready for New Features

Your Music Genie application is **production-ready** with:
- ✅ Consistent data structures
- ✅ Proper error handling
- ✅ Performance optimization
- ✅ Type safety
- ✅ Comprehensive API
- ✅ Scalable architecture

**Next features to consider:**
1. User authentication system
2. Advanced audio controls
3. Batch generation
4. Real-time collaboration
5. Mobile application

---

*Generated by Music Genie Documentation Generator v2.1.0*
