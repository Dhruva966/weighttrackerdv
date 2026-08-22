# Lift Deployment Guide

Complete deployment runbook for the Lift PWA and MCP server.

## Prerequisites

1. **Supabase CLI** authenticated: `npx supabase login`
2. **Vercel CLI** authenticated: `npx vercel login`
3. Environment variables in `.env.local`:
   ```bash
   VITE_SUPABASE_URL=https://svcjdtlmmrisrkjqdsjt.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   LIFT_MCP_TOKEN=...
   LIFT_MCP_WRITES_ENABLED=true
   ```

## Quick Deploy

```bash
# 1. Push secrets to Supabase
pnpm supabase:secrets

# 2. Deploy Edge Functions
pnpm supabase:deploy-functions

# 3. Deploy Vercel (auto-deploys on push to main)
git push origin main

# 4. Verify deployment
pnpm check:mcp-health
```

## Detailed Steps

### 1. Supabase Database Migrations

Apply any pending migrations:

```bash
npx supabase db push
```

Verify migrations:
```bash
npx supabase db diff
```

### 2. Supabase Edge Functions

**Push secrets** (required before first deploy):
```bash
pnpm supabase:secrets
```

This pushes:
- `ANTHROPIC_API_KEY` - For exercise log parsing
- `GROQ_API_KEY` - Fallback for exercise log parsing
- `LIFT_MCP_TOKEN` - Bearer auth token for MCP
- `LIFT_MCP_WRITES_ENABLED` - Enable/disable write operations
- `LIFT_MCP_PUBLIC_URL` - Public MCP endpoint URL

**Deploy functions**:
```bash
pnpm supabase:deploy-functions
```

Deployed functions:
- `parse-exercise-log` - Natural language set parsing
- `lift-mcp` - MCP server for Claude integration

### 3. Vercel PWA

**Environment variables** (set in Vercel dashboard):
- `VITE_SUPABASE_URL` - Supabase project URL (build-time)
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key (build-time)
- `LIFT_MCP_TOKEN` - MCP bearer token (runtime, for proxy)
- `LIFT_MCP_UPSTREAM` - Optional, override MCP upstream URL

**Deploy**:
```bash
# Auto-deploy via GitHub push
git push origin main

# Or manual deploy
npx vercel --prod
```

**Vercel configuration** (`vercel.json`):
- Rewrites `/api/lift-mcp/*` to Node.js proxy handler
- Blocks OAuth discovery paths (`.well-known/*`)
- SPR fallback for React Router

### 4. Health Checks

**Check MCP server health**:
```bash
pnpm check:mcp-health
```

This verifies:
- ✅ Vercel proxy is up
- ✅ Supabase Edge Function is up
- ✅ Database connectivity
- ✅ Environment variables are set
- ✅ Writes are enabled/disabled
- ✅ MCP protocol works

**Manual health check**:
```bash
# Vercel proxy (no auth required)
curl https://weighttrackerdv.vercel.app/api/lift-mcp/health

# Supabase direct (requires bearer token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://svcjdtlmmrisrkjqdsjt.supabase.co/functions/v1/lift-mcp/health
```

### 5. Test MCP Integration

**E2E test** (local against deployed endpoints):
```bash
pnpm test:lift-mcp
```

**Test from Claude Desktop**:
1. Open Claude Desktop
2. Go to Settings → Developer → Edit Config
3. Add MCP server:
   ```json
   {
     "mcpServers": {
       "lift": {
         "type": "http",
         "url": "https://weighttrackerdv.vercel.app/api/lift-mcp"
       }
     }
   }
   ```
4. Restart Claude Desktop
5. Test: "What was my last workout?"

## Troubleshooting

### MCP Server Returns 500

**Symptoms**: Claude reports "both lookups are failing"

**Check**:
1. Health endpoint: `pnpm check:mcp-health`
2. Supabase logs: `npx supabase functions logs lift-mcp`
3. Vercel logs: Check Vercel dashboard

**Common causes**:
- ❌ `LIFT_MCP_TOKEN` not set on Vercel
- ❌ `SUPABASE_SERVICE_ROLE_KEY` not set on Supabase
- ❌ Database connection timeout
- ❌ Edge Function not deployed

**Fix**:
```bash
# Re-push secrets
pnpm supabase:secrets

# Re-deploy functions
pnpm supabase:deploy-functions

# Verify
pnpm check:mcp-health
```

### Writes Not Working

**Symptoms**: `log_sets` or `log_weight` return "writes disabled"

**Check**:
```bash
pnpm check:mcp-health | grep writesEnabled
```

**Fix**:
```bash
# Ensure LIFT_MCP_WRITES_ENABLED=true in .env.local
echo "LIFT_MCP_WRITES_ENABLED=true" >> .env.local

# Push secrets
pnpm supabase:secrets

# Verify
pnpm check:mcp-health
```

### Database Connection Errors

**Symptoms**: Health check shows `database: error: ...`

**Check**:
1. Supabase project is not paused
2. Service role key is valid
3. Tables exist (migrations applied)

**Fix**:
```bash
# Check Supabase project status
npx supabase projects list

# Re-apply migrations
npx supabase db push

# Verify tables exist
npx supabase db diff
```

### Vercel Proxy 404

**Symptoms**: `/api/lift-mcp` returns 404

**Check**:
1. `api/lift-mcp.ts` exists
2. `vercel.json` has rewrite rules
3. Vercel build succeeded

**Fix**:
```bash
# Check Vercel deployment status
npx vercel ls

# Re-deploy
git push origin main --force

# Or manual deploy
npx vercel --prod --force
```

## Monitoring

### Supabase Logs

```bash
# Stream live logs
npx supabase functions logs lift-mcp --follow

# Show last 100 logs
npx supabase functions logs lift-mcp --limit 100

# Filter by error level
npx supabase functions logs lift-mcp --level error
```

### Vercel Logs

1. Go to https://vercel.com/dhruva966/weighttrackerdv
2. Click "Logs" tab
3. Filter by `/api/lift-mcp`

### Health Check Cron

Set up monitoring (optional):
```bash
# Add to crontab
*/5 * * * * curl -f https://weighttrackerdv.vercel.app/api/lift-mcp/health || echo "MCP is down"
```

## Rollback

### Rollback Edge Function
```bash
# List deployments
npx supabase functions list

# Deploy previous version (manual - copy old code)
```

### Rollback Vercel
```bash
# List deployments
npx vercel ls

# Promote previous deployment
npx vercel promote <deployment-url>
```

## Security Checklist

- ✅ `SUPABASE_SERVICE_ROLE_KEY` is secret (never in git)
- ✅ `LIFT_MCP_TOKEN` is random (generate with `openssl rand -base64 32`)
- ✅ Vercel environment variables are encrypted
- ✅ Supabase secrets are encrypted
- ✅ No secrets in source code
- ✅ RLS disabled acknowledged (single-user app)

## Performance

### Edge Function Cold Start
- First request after idle: ~500ms
- Subsequent requests: ~50-100ms

### Caching
- Health endpoint: No cache
- MCP responses: No cache (real-time data)

### Rate Limits
- None currently (single-user app)
- Add if needed: `Deno.env.get('RATE_LIMIT_PER_MINUTE')`

## Next Steps

1. ✅ Deploy MCP with writes enabled
2. ⏳ Add monitoring alerts
3. ⏳ Add rate limiting
4. ⏳ Add request logging
5. ⏳ Add performance metrics
