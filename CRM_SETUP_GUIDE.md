# BLKOUT CRM Setup Guide

## Overview
The BLKOUT CRM is a Community Relationship Management system for managing contacts, organizations, grants, and partnerships.

## Deployment Status
- **Production URL**: https://crm.blkoutuk.cloud
- **Status**: Deployed via Coolify
- **Database**: Supabase (bgjengudzfickgomjqmz)

## Recent Fixes (January 8, 2026)

### Issue: Root Route 404 Error
**Problem**: Accessing `https://crm.blkoutuk.cloud/` returned a 404 error despite having a redirect to `/dashboard`.

**Root Cause**: The `redirect()` function in `/app/page.tsx` was not properly configured, causing Next.js to return 404 instead of a proper HTTP redirect.

**Fix Applied**:
1. Updated `/app/page.tsx` to use `RedirectType.replace` for proper client-side navigation
2. Created `/middleware.ts` for authentication checks and protected route handling
3. Added environment variable documentation

### Authentication Flow

The CRM now has a complete authentication flow:

1. **Unauthenticated Access**: Users visiting any protected route (e.g., `/`, `/dashboard`, `/contacts`) are redirected to `/join`
2. **Join Page** (`/join`): Public signup page where users can create an account
3. **Protected Routes**: All routes except `/join` and API routes require authentication
4. **Root Route** (`/`): Automatically redirects authenticated users to `/dashboard`

## Environment Variables

### Required Variables

Create or update `/apps/crm/.env.local` with:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://bgjengudzfickgomjqmz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnamVuZ3VkemZpY2tnb21qcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTI3NjcsImV4cCI6MjA3MTE4ODc2N30.kYQ2oFuQBGmu4V_dnj_1zDMDVsd-qpDZJwNvswzO6M0

# Service role key for server-side operations (NEVER expose to client!)
# Get from: https://supabase.com/dashboard/project/bgjengudzfickgomjqmz/settings/api
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]

# Sendfox Configuration (for newsletter signups)
NEXT_PUBLIC_SENDFOX_FORM_URL=https://sendfox.com/form/3zpwee/1wj276

# App Configuration
NEXT_PUBLIC_APP_URL=https://crm.blkoutuk.cloud
```

### Optional Variables (for full functionality)

```bash
# Heartbeat.chat (BLKOUTHUB) Integration
HEARTBEAT_API_TOKEN=[YOUR_HEARTBEAT_API_TOKEN]
BLKOUTHUB_COMMUNITY_ID=[YOUR_COMMUNITY_ID]
```

## Database Setup

### Verified Tables
The following tables exist in the Supabase database:
- ✅ `contacts` - Community members and stakeholders
- ✅ `organizations` - Partner organizations
- ✅ `grants` - Grant applications and funding

### Schema Notes
The `contacts` table includes:
- Basic info: `first_name`, `last_name`, `email`, `phone`
- Demographics: `preferred_name`, `pronouns`
- Categorization: `contact_type` (array), `status`, `engagement_level`
- Organization links: `organization_id`, `job_title`, `department`
- Policy influence: `policy_responsibilities`, `influence_level`, `decision_areas`
- Communication: `communication_preferences` (jsonb), `preferred_contact_method`

## File Structure Changes

### New Files Created
1. `/middleware.ts` - Authentication middleware for protected routes
2. `/CRM_SETUP_GUIDE.md` - This documentation file

### Modified Files
1. `/app/page.tsx` - Updated redirect logic
2. `/.env.local` - Added service role key placeholder

## Testing Checklist

### Local Testing
```bash
cd /home/robbe/blkout-platform/apps/crm
npm install
npm run dev
```

Test the following:
- [ ] Root route (`http://localhost:3002`) redirects to `/join` (unauthenticated)
- [ ] Join page loads correctly (`http://localhost:3002/join`)
- [ ] Dashboard is protected (redirects unauthenticated users)
- [ ] API route works: `POST /api/community/join`

### Production Testing
- [ ] Root route (`https://crm.blkoutuk.cloud/`) redirects properly
- [ ] Join page accessible (`https://crm.blkoutuk.cloud/join`)
- [ ] Dashboard requires authentication
- [ ] Supabase connection works
- [ ] Newsletter signup integration works

## Deployment Instructions

### Coolify Deployment
1. Ensure environment variables are set in Coolify:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (CRITICAL - must be added!)
   - `NEXT_PUBLIC_SENDFOX_FORM_URL`
   - `NEXT_PUBLIC_APP_URL`

2. Push changes to GitHub:
```bash
git add .
git commit -m "Fix CRM root route 404 and add authentication middleware"
git push origin main
```

3. Coolify will automatically deploy the changes

### Vercel Deployment (Alternative)
```bash
npm run build
vercel --prod
```

## Known Issues & TODOs

### CRITICAL: Missing Service Role Key
**Status**: 🔴 Blocking
**Impact**: API route `/api/community/join` will fail without this key
**Action Required**: Add `SUPABASE_SERVICE_ROLE_KEY` to production environment variables

Steps:
1. Go to https://supabase.com/dashboard/project/bgjengudzfickgomjqmz/settings/api
2. Copy "service_role" key (secret key)
3. Add to Coolify environment variables
4. Restart CRM deployment

### User Authentication Not Yet Implemented
**Status**: ⚠️ Future work
**Current Behavior**: Middleware redirects to `/join`, but Supabase Auth not fully configured
**Next Steps**:
1. Enable Supabase Auth in project settings
2. Add login/signup flows with Supabase Auth
3. Test authentication with real user accounts

### Dashboard Shows Mock Data
**Status**: ℹ️ Expected
**Current Behavior**: Dashboard displays mock data (see `app/dashboard/page.tsx`)
**Next Steps**: Connect to real Supabase queries when data is available

## Support & Troubleshooting

### 404 on Root Route
- Verify `middleware.ts` is present in root directory
- Check that `app/page.tsx` uses `RedirectType.replace`
- Ensure Next.js build is successful (`npm run build`)

### Database Connection Errors
- Verify environment variables are set correctly
- Check Supabase project status: https://supabase.com/dashboard/project/bgjengudzfickgomjqmz
- Test connection with: `npm run db:generate`

### API Route Failures
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
- Check Supabase logs for errors
- Verify CORS settings allow your domain

## Architecture Decisions

### Why Middleware Instead of Route Handlers?
- Middleware runs before all requests, providing consistent auth checks
- More efficient than per-route authentication logic
- Easier to maintain centralized authentication rules

### Why Redirect to /join Instead of /login?
- CRM is currently in pre-launch phase
- Join page serves as both signup and login entry point
- Simpler user flow for early adopters

### Why Service Role Key?
- Required for admin operations (creating contacts, managing data)
- Browser-side anon key has limited permissions (read-only)
- Follows Supabase security best practices

## References

- [Next.js Middleware Docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase Auth with SSR](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [BLKOUT Platform Documentation](../../DELIVERY_ROADMAP.md)

---

**Last Updated**: January 8, 2026
**Maintainer**: Claude Code (via Robbe)
**Status**: Root route fixed, authentication middleware added, service role key pending
