
# 🗄️ Music Genie Database Schema

## Schema Status: ✅ CONSISTENT AND MIGRATED

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MUSIC_GENERATIONS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id                    INTEGER                                            │
│     generation_id         VARCHAR(100) UNIQUE                               │
│     prompt               TEXT                                                │
│     status               VARCHAR(20)                                         │
│ ✅  device               VARCHAR(50)  [FIXED: was device_used]              │
│     precision            VARCHAR(20)                                         │
│ ✅  generation_time      FLOAT        [FIXED: was total_time]               │
│     realtime_factor      FLOAT                                              │
│     file_path            VARCHAR(500)                                        │
│     audio_url            VARCHAR(500)                                        │
│ ✅  file_size_mb         FLOAT        [CALCULATED: from actual files]       │
│     duration             FLOAT                                               │
│     sample_rate          INTEGER                                             │
│ ✅  play_count           INTEGER      [USER INTERACTION]                    │
│ ✅  download_count       INTEGER      [USER INTERACTION]                    │
│ ✅  is_favorited         BOOLEAN      [USER INTERACTION]                    │
│     last_played          TIMESTAMP                                           │
│     created_at           TIMESTAMP                                           │
│     updated_at           TIMESTAMP                                           │
│     user_id              INTEGER                                             │
│     error_message        TEXT                                                │
│     model_version        VARCHAR(50)                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                   USERS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id                    INTEGER                                            │
│     username             VARCHAR(50) UNIQUE                                 │
│     email                VARCHAR(100) UNIQUE                                │
│     created_at           TIMESTAMP                                           │
│     last_active          TIMESTAMP                                           │
│     is_active            BOOLEAN                                             │
│     preferred_device     VARCHAR(20)                                         │
│     preferred_precision  VARCHAR(20)                                         │
│     default_duration     FLOAT                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                               USAGE_STATS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id                         INTEGER                                       │
│     date                       TIMESTAMP                                     │
│     total_generations          INTEGER                                       │
│     successful_generations     INTEGER                                       │
│     failed_generations         INTEGER                                       │
│     avg_generation_time        FLOAT                                        │
│     avg_realtime_factor        FLOAT                                        │
│     total_plays               INTEGER                                        │
│     total_downloads           INTEGER                                        │
│     total_favorites           INTEGER                                        │
│     unique_users              INTEGER                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                             SYSTEM_METRICS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id                    INTEGER                                            │
│     timestamp             TIMESTAMP                                          │
│     cpu_usage             FLOAT                                             │
│     memory_usage          FLOAT                                             │
│     gpu_usage             FLOAT                                             │
│     gpu_memory_usage      FLOAT                                             │
│     disk_usage            FLOAT                                             │
│     model_loaded          BOOLEAN                                            │
│     model_load_time       FLOAT                                             │
│     active_generations    INTEGER                                            │
│     response_time_avg     FLOAT                                             │
│     error_rate            FLOAT                                             │
│     requests_per_minute   INTEGER                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 Schema Migration Status

### ✅ COMPLETED FIXES:
- **device_used** → **device** ✅
- **total_time** → **generation_time** ✅
- **file_size_mb** now calculated from actual files ✅
- All user interaction fields properly implemented ✅

### 🔗 Relationships:
- `music_generations.user_id` → `users.id` (when auth is implemented)
- No foreign key constraints yet (flexibility for development)

### 📊 Indexes:
- `music_generations.generation_id` (unique)
- `music_generations.created_at` (for recent queries)
- `music_generations.status` (for filtering)
- `users.username` (unique)
- `users.email` (unique)

### 🎯 Ready for New Features:
- User authentication (users table ready)
- Advanced analytics (usage_stats table ready)
- System monitoring (system_metrics table ready)
- File management (proper file_size_mb calculation)
