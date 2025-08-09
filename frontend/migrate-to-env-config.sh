#!/bin/bash

# migrate-to-env-config.sh
# Script to help migrate your existing Music Genie codebase to use environment configuration

echo "🔧 Music Genie Environment Configuration Migration Script"
echo "========================================================"
echo ""

# Function to create backup
create_backup() {
    local file=$1
    if [ -f "$file" ]; then
        cp "$file" "${file}.backup.$(date +%Y%m%d_%H%M%S)"
        echo "✅ Created backup of $file"
    fi
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from your project root."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Step 1: Create environment files
echo "📁 Step 1: Creating environment configuration files..."

# Create .env.example
cat > .env.example << 'EOF'
# =============================================================================
# REQUIRED CONFIGURATION
# =============================================================================

# Backend API URL (REQUIRED)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Environment type (development, staging, production)
NEXT_PUBLIC_ENVIRONMENT=development

# =============================================================================
# OPTIONAL CONFIGURATION
# =============================================================================

# Debug mode (true/false)
NEXT_PUBLIC_DEBUG_MODE=true

# Enable analytics (true/false)
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Enable animations (true/false)
NEXT_PUBLIC_ANIMATIONS_ENABLED=true

# Audio settings
NEXT_PUBLIC_MAX_FILE_SIZE_MB=100
NEXT_PUBLIC_SUPPORTED_FORMATS=wav,mp3
NEXT_PUBLIC_DEFAULT_SAMPLE_RATE=32000

# UI settings
NEXT_PUBLIC_MAX_RECENT_TRACKS=50
NEXT_PUBLIC_DEFAULT_PAGE_SIZE=20

# Performance settings
NEXT_PUBLIC_VERBOSE_LOGGING=true
NEXT_PUBLIC_API_TIMEOUT=30000
EOF

echo "✅ Created .env.example"

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    echo "✅ Created .env.local from template"
else
    echo "ℹ️  .env.local already exists, skipping creation"
fi

# Step 2: Create utils directory and configuration files
echo ""
echo "📁 Step 2: Creating configuration files..."

mkdir -p utils

# Create config.ts
cat > utils/config.ts << 'EOF'
// utils/config.ts - Centralized configuration management

interface EnvironmentConfig {
  apiUrl: string
  environment: 'development' | 'production' | 'staging' | 'test'
  features: {
    analytics: boolean
    realTimeProcessing: boolean
    advancedMixer: boolean
    debugMode: boolean
  }
  audio: {
    maxFileSizeMB: number
    supportedFormats: string[]
    defaultSampleRate: number
  }
  ui: {
    maxRecentTracks: number
    defaultPageSize: number
    animationsEnabled: boolean
  }
}

// Default configuration
const defaultConfig: EnvironmentConfig = {
  apiUrl: 'http://localhost:8000',
  environment: 'development',
  features: {
    analytics: true,
    realTimeProcessing: true,
    advancedMixer: true,
    debugMode: false,
  },
  audio: {
    maxFileSizeMB: 100,
    supportedFormats: ['wav', 'mp3'],
    defaultSampleRate: 32000,
  },
  ui: {
    maxRecentTracks: 50,
    defaultPageSize: 20,
    animationsEnabled: true,
  }
}

function getConfig(): EnvironmentConfig {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
                 process.env.NEXT_PUBLIC_API_BASE_URL || 
                 defaultConfig.apiUrl

  const environment = (process.env.NEXT_PUBLIC_ENVIRONMENT || 
                      process.env.NODE_ENV || 
                      'development') as EnvironmentConfig['environment']

  const analytics = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'false'
  const debugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' || 
                   environment === 'development'

  const maxFileSizeMB = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '100', 10)
  const maxRecentTracks = parseInt(process.env.NEXT_PUBLIC_MAX_RECENT_TRACKS || '50', 10)
  const defaultPageSize = parseInt(process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE || '20', 10)
  const animationsEnabled = process.env.NEXT_PUBLIC_ANIMATIONS_ENABLED !== 'false'

  return {
    apiUrl: apiUrl.replace(/\/$/, ''),
    environment,
    features: {
      analytics,
      realTimeProcessing: analytics,
      advancedMixer: true,
      debugMode,
    },
    audio: {
      maxFileSizeMB: isNaN(maxFileSizeMB) ? defaultConfig.audio.maxFileSizeMB : maxFileSizeMB,
      supportedFormats: process.env.NEXT_PUBLIC_SUPPORTED_FORMATS?.split(',') || 
                       defaultConfig.audio.supportedFormats,
      defaultSampleRate: parseInt(process.env.NEXT_PUBLIC_DEFAULT_SAMPLE_RATE || '32000', 10),
    },
    ui: {
      maxRecentTracks: isNaN(maxRecentTracks) ? defaultConfig.ui.maxRecentTracks : maxRecentTracks,
      defaultPageSize: isNaN(defaultPageSize) ? defaultConfig.ui.defaultPageSize : defaultPageSize,
      animationsEnabled,
    }
  }
}

export const config = getConfig()
export const isProduction = () => config.environment === 'production'
export const isDevelopment = () => config.environment === 'development'
export const isDebugMode = () => config.features.debugMode

export const getApiUrl = (endpoint?: string): string => {
  const baseUrl = config.apiUrl
  if (!endpoint) return baseUrl
  
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${baseUrl}${cleanEndpoint}`
}

export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  try {
    new URL(config.apiUrl)
  } catch {
    errors.push('Invalid API URL format')
  }
  
  if (config.audio.maxFileSizeMB <= 0) {
    errors.push('Max file size must be positive')
  }
  
  if (config.ui.defaultPageSize <= 0) {
    errors.push('Default page size must be positive')
  }
  
  if (isProduction() && config.apiUrl.includes('localhost')) {
    errors.push('Production environment should not use localhost API URL')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

if (isDebugMode()) {
  console.group('🔧 Music Genie Configuration')
  console.log('Environment:', config.environment)
  console.log('API URL:', config.apiUrl)
  console.log('Features:', config.features)
  console.log('Audio settings:', config.audio)
  console.log('UI settings:', config.ui)
  
  const validation = validateConfig()
  if (!validation.valid) {
    console.warn('⚠️ Configuration warnings:', validation.errors)
  } else {
    console.log('✅ Configuration is valid')
  }
  console.groupEnd()
}

export { defaultConfig, validateConfig }
EOF

echo "✅ Created utils/config.ts"

# Step 3: Update package.json scripts
echo ""
echo "📝 Step 3: Updating package.json scripts..."

# Create backup of package.json
create_backup package.json

# Add configuration check script
npm pkg set scripts.config:check="node -e \"
const fs = require('fs');
console.log('🔧 Checking configuration...');
const envLocal = fs.existsSync('.env.local');
const envExample = fs.existsSync('.env.example');
console.log('✅ .env.local:', envLocal ? 'exists' : 'missing');
console.log('✅ .env.example:', envExample ? 'exists' : 'missing');
if (!envLocal) console.log('💡 Run: cp .env.example .env.local');
console.log('🌐 API URL:', process.env.NEXT_PUBLIC_API_URL || 'not set');
\""

echo "✅ Added config:check script to package.json"

# Step 4: Update .gitignore
echo ""
echo "📝 Step 4: Updating .gitignore..."

# Create backup of .gitignore if it exists
if [ -f ".gitignore" ]; then
    create_backup .gitignore
else
    touch .gitignore
fi

# Add environment variables to .gitignore if not already present
if ! grep -q ".env.local" .gitignore; then
    echo "" >> .gitignore
    echo "# Environment variables" >> .gitignore
    echo ".env.local" >> .gitignore
    echo ".env*.local" >> .gitignore
    echo "" >> .gitignore
    echo "# Keep example files" >> .gitignore
    echo "!.env.example" >> .gitignore
    echo "✅ Added environment variables to .gitignore"
else
    echo "ℹ️  .gitignore already configured for environment variables"
fi

# Step 5: Create migration checklist
echo ""
echo "📋 Step 5: Creating migration checklist..."

cat > MIGRATION_CHECKLIST.md << 'EOF'
# Environment Configuration Migration Checklist

## ✅ Completed by Script
- [x] Created `.env.example` template
- [x] Created `.env.local` (if didn't exist)
- [x] Created `utils/config.ts` configuration file
- [x] Updated `package.json` with config check script
- [x] Updated `.gitignore` for environment files

## 🔄 Manual Tasks Required

### 1. Update Your Components
Replace hardcoded API URLs in your components:

**Before:**
```typescript
const API_BASE_URL = 'http://localhost:8000'
fetch(`${API_BASE_URL}/generate`, ...)
```

**After:**
```typescript
import { getApiUrl } from '../utils/config'
fetch(getApiUrl('/generate'), ...)
```

### 2. Update Your Hooks
Import and use the configuration in your hooks:

```typescript
import { config, isDebugMode } from '../utils/config'
import { api } from '../utils/api'

// Use config.ui.defaultPageSize instead of hardcoded values
// Use isDebugMode() for conditional logging
```

### 3. Files to Update
- [ ] `components/tabs/GenerateTab.tsx`
- [ ] `components/tabs/HistoryTab.tsx`
- [ ] `components/tabs/PopularTab.tsx`
- [ ] `components/tabs/StatsTab.tsx`
- [ ] `hooks/useGenerations.ts`
- [ ] `hooks/useStats.ts`
- [ ] `utils/api.ts`
- [ ] Any other files with hardcoded `localhost:8000`

### 4. Search and Replace
Run these searches in your IDE:

1. Search for: `http://localhost:8000`
   Replace with: `getApiUrl()` or use `config.apiUrl`

2. Search for: `'http://localhost:8000`
   Replace with: `getApiUrl(`

3. Search for: `const API_BASE_URL`
   Remove these constants and use configuration

### 5. Test Your Changes
- [ ] Run `npm run config:check` to verify configuration
- [ ] Test with `npm run dev` - should work with default settings
- [ ] Try changing `NEXT_PUBLIC_API_URL` in `.env.local`
- [ ] Test debug mode by setting `NEXT_PUBLIC_DEBUG_MODE=true`

### 6. Environment-Specific Setup
- [ ] Create `.env.production` for production settings
- [ ] Create `.env.staging` for staging settings
- [ ] Update deployment scripts to use appropriate environment files

## 🚀 Next Steps
1. Complete the manual tasks above
2. Test thoroughly in development
3. Update your deployment process to use environment variables
4. Document your environment variables for your team

## 🆘 Need Help?
- Check the console for configuration validation messages
- Run `npm run config:check` to verify setup
- Refer to the configuration files for examples
EOF

echo "✅ Created MIGRATION_CHECKLIST.md"

# Step 6: Test configuration
echo ""
echo "🧪 Step 6: Testing configuration..."

npm run config:check

# Final instructions
echo ""
echo "🎉 Migration script completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Review MIGRATION_CHECKLIST.md for manual tasks"
echo "2. Update your components to use the new configuration system"
echo "3. Test with: npm run dev"
echo "4. Run: npm run config:check to verify setup"
echo ""
echo "💡 Key changes needed in your code:"
echo "   - Replace 'http://localhost:8000' with getApiUrl()"
echo "   - Import { config, isDebugMode } from '../utils/config'"
echo "   - Use config.ui.defaultPageSize instead of hardcoded limits"
echo ""
echo "📚 Files created:"
echo "   - .env.example (template)"
echo "   - .env.local (your local config)"
echo "   - utils/config.ts (configuration system)"
echo "   - MIGRATION_CHECKLIST.md (manual tasks)"
echo ""
echo "🔧 To change your API URL:"
echo "   Edit NEXT_PUBLIC_API_URL in .env.local"
echo ""
echo "Good luck with your migration! 🚀"