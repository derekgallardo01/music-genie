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
