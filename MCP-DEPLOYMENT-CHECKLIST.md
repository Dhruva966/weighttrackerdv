# Lift MCP Deployment Checklist

Quick checklist to fix the current MCP deployment issue and verify everything works.

## Current Issue

Claude reports: "There's an error on the Lift connector right now (both lookups are failing on their end)"

This means the MCP server is either:
- ❌ Not deployed
- ❌ Missing environment variables
- ❌ Unable to connect to database
- ❌ Authentication failing

## Fix Steps (in order)

### ✅ 1. Pull Latest Code
```bash
git pull origin main
```

### ⏳ 2. Set Up Environment Variables

Create `.env.local` with:
```bash
# From Supabase Dashboard → Project Settings → API
VITE_SUPABASE_URL=https://svcjdtlmmrisrkjqdsjt.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_PROJECT_REF=svcjdtlmmrisrkjqdsjt

# Generate new token: openssl rand -hex 32
LIFT_MCP_TOKEN=<your-long-random-token>

# Enable writes
LIFT_MCP_WRITES_ENABLED=true

# Optional - for LLM parsing
ANTHROPIC_API_KEY=<your-anthropic-key>
```

### ⏳ 3. Push Secrets to Supabase
```bash
pnpm supabase:secrets
```

Expected output:
```
✅ ok pushed LIFT_MCP_TOKEN to Supabase Edge Function secrets
✅ ok pushed LIFT_MCP_WRITES_ENABLED=true
✅ next: deploy the function with `pnpm supabase:deploy-functions`
```

### ⏳ 4. Deploy Edge Functions
```bash
pnpm supabase:deploy-functions
```

This deploys:
- `lift-mcp` - MCP server
- `parse-exercise-log` - NL set parser

### ⏳ 5. Update Vercel Environment Variables

Go to Vercel Dashboard → weighttrackerdv → Settings → Environment Variables

Add/Update:
- `LIFT_MCP_TOKEN` = same value as in .env.local
- `VITE_SUPABASE_URL` = https://svcjdtlmmrisrkjqdsjt.supabase.co (if not set)
- `VITE_SUPABASE_ANON_KEY` = your anon key (if not set)

### ⏳ 6. Redeploy Vercel
```bash
# Either push to trigger auto-deploy
git push origin main

# Or manual redeploy
npx vercel --prod
```

### ⏳ 7. Verify Health
```bash
pnpm check:mcp-health
```

Expected output:
```
🔍 Checking Vercel Proxy...
   ✅ Status: Healthy (200)
   📦 Version: 0.2.0
   ⏰ Timestamp: 2026-08-22T...
   ✍️  Writes: ENABLED
   🔧 Checks:
      ✅ server: true
      ✅ database: connected
      ✅ supabaseUrl: true
      ✅ supabaseServiceKey: true
      ✅ liftMcpToken: true
```

### ⏳ 8. Test from Claude

1. Open Claude Desktop
2. Ask: "What was my last workout?"
3. Should return workout data, not an error

## Quick Verification Without .env.local

If you don't have credentials handy:

```bash
# Test Vercel proxy health (no auth needed)
curl https://weighttrackerdv.vercel.app/api/lift-mcp/health

# Should return:
# {
#   "ok": true/false,
#   "name": "lift-mcp",
#   "version": "0.2.0",
#   "checks": {...}
# }
```

## Common Issues & Fixes

### Issue: `LIFT_MCP_TOKEN is not configured on Vercel`

**Fix**: Add `LIFT_MCP_TOKEN` to Vercel environment variables, then redeploy

### Issue: `database: error: connection timeout`

**Fix**: 
1. Check Supabase project is not paused
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
3. Re-push secrets: `pnpm supabase:secrets`

### Issue: `writesEnabled: false` but you want writes

**Fix**:
1. Set `LIFT_MCP_WRITES_ENABLED=true` in .env.local
2. Re-push secrets: `pnpm supabase:secrets`
3. Health check should show `✍️  Writes: ENABLED`

### Issue: Vercel proxy returns 404

**Fix**:
1. Check `api/lift-mcp.ts` exists (✅ it does in latest code)
2. Redeploy Vercel: `git push origin main`

### Issue: Supabase Edge Function returns 500

**Fix**:
1. Check logs: `npx supabase functions logs lift-mcp --limit 50`
2. Look for missing env vars or database errors
3. Re-push secrets and redeploy

## Success Criteria

✅ Health check returns `ok: true`  
✅ Database check shows `connected`  
✅ Writes show as `ENABLED` (if you want writes)  
✅ Claude can query workout data  
✅ Claude can log sets (if writes enabled)

## Next Steps After Fix

Once deployed:
- [ ] Document actual credentials location
- [ ] Set up monitoring alerts
- [ ] Add rate limiting if needed
- [ ] Test all 8 MCP tools from Claude

## Need Help?

Check full deployment guide: `DEPLOYMENT.md`
