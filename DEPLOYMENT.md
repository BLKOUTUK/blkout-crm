# BLKOUT CRM - Coolify Deployment Guide

**Target URL**: `https://crm.blkoutuk.cloud`
**Type**: Next.js 14 API + Dashboard
**Port**: 3000

---

## Coolify Setup

1. Add new Application → Docker (Dockerfile)
2. Repository: Connect to GitHub `blkout-platform` repo
3. Build path: `apps/crm`
4. Dockerfile path: `./Dockerfile`
5. Port: `3000`

---

## Environment Variables

### Required (Build Time)
```env
NEXT_PUBLIC_SUPABASE_URL=https://bgjengudzfickgomjqmz.supabase.co
NEXT_PUBLIC_APP_URL=https://crm.blkoutuk.cloud
```

### Required (Runtime)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://bgjengudzfickgomjqmz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# App URL (for referral links)
NEXT_PUBLIC_APP_URL=https://crm.blkoutuk.cloud

# SendFox (newsletter sync)
NEXT_PUBLIC_SENDFOX_FORM_URL=<your-sendfox-form-url>

# Heartbeat/BLKOUTHUB (optional)
HEARTBEAT_API_TOKEN=<your-heartbeat-api-token>
BLKOUTHUB_COMMUNITY_ID=<your-community-id>
```

---

## DNS Configuration

Add A record pointing to Hostinger VPS IP:
```
crm.blkoutuk.cloud → <VPS_IP>
```

---

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/community/join` | Unified signup (CORS enabled) |
| `GET /api/community/join` | Get consent text |
| `POST /api/community/data-rights` | GDPR export/delete |
| `GET /api/community/share` | Get member share link |
| `/join` | Public signup page |

---

## Cross-Origin Access

The following domains are whitelisted for CORS:
- `https://blkoutuk.com`
- `https://news.blkoutuk.cloud`
- `https://events.blkoutuk.cloud`
- `https://blkout-platform.vercel.app`
- `http://localhost:3000-3002`

To add more domains, update `ALLOWED_ORIGINS` in:
`app/api/community/join/route.ts`

---

## Post-Deployment Checklist

- [ ] Verify build completes successfully
- [ ] Test `/api/health` endpoint
- [ ] Test `/api/community/join` with CORS from news.blkoutuk.cloud
- [ ] Verify Supabase connection works
- [ ] Test signup flow end-to-end
- [ ] Confirm referral codes are generated

---

## Data Sovereignty

This CRM is hosted on UK-based Hostinger infrastructure to comply with:
- GDPR data residency requirements
- BLKOUT community data sovereignty commitments
- UK data protection regulations

All member data remains within UK jurisdiction.

---

*Created: December 2025*
