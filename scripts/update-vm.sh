#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# 💍 మనవివాహం — VM UPDATE (one command)
# ═══════════════════════════════════════════════════════════════════
# VM (Oracle, manavivaha.in) meeda run cheyandi:
#
#   bash update-vm.sh
#
# Em chestundi:
#   1. Data backup (backend/*.json + .env) — timestamp tar
#   2. Kotha code: production repo (shubhalagnam) + DEPLOY_BRANCH
#   3. Frontend production image rebuild (no host source volume in prod override)
#
# Pre-merge staging:
#   DEPLOY_BRANCH=arena/01a0b9af-shubhalagnam bash update-vm.sh
# After merge:
#   DEPLOY_BRANCH=main bash update-vm.sh
#   4. Containers restart + health check
#
# Data (data_db.json, payments, referral wallet...) — volume lo safe, touch cheyyam.
# Rollback: `bash update-vm.sh rollback`  (last backup nunchi data restore)
# ═══════════════════════════════════════════════════════════════════
set -uo pipefail

REPO_NEW="https://github.com/charanpendota98-prog/shubhalagnam.git"
# Default is reviewed main. Set DEPLOY_BRANCH explicitly for pre-merge staging only.
BRANCH="${DEPLOY_BRANCH:-main}"
TS=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="vm-backups"
STAMP="[$(date +%H:%M:%S)]"

say() { echo -e "$STAMP $1"; }

# ---- 0. clone dir detect (repo lopala leda standalone download — rendu work avvali) ----
FOUND=""
if [ -f "$(dirname "$0")/../docker-compose.yml" ] && [ -d "$(dirname "$0")/../backend" ]; then
    FOUND="$(cd "$(dirname "$0")/.." && pwd)"
elif [ -f docker-compose.yml ] && [ -d backend ]; then
    FOUND="$(pwd)"
else
    # common clone paths — VM meeda ekkada unna dorukutundi
    for CAND in "$HOME/matrimony-site" "$HOME/shubhalagnam" "$HOME/manavivaha"; do
        if [ -f "$CAND/docker-compose.yml" ] && [ -d "$CAND/backend" ]; then FOUND="$CAND"; break; fi
    done
fi
if [ -z "$FOUND" ]; then
    say "❌ Repo clone dorakaledu. Mee VM lo clone ekkada undo cheppandi (docker-compose.yml unna dir) —"
    say "   akkadi nunchi run cheyandi: bash <clone-dir>/scripts/update-vm.sh"
    exit 1
fi
cd "$FOUND" || { say "❌ cd fail: $FOUND"; exit 1; }
say "📁 Repo dir: $(pwd)"

mkdir -p "$BACKUP_DIR"

# ---- rollback mode ----
if [ "${1:-}" = "rollback" ]; then
    LATEST=$(ls -1t "$BACKUP_DIR"/data-*.tar.gz 2>/dev/null | head -1)
    [ -z "$LATEST" ] && { say "❌ backup file levdu"; exit 1; }
    say "↩️ Restoring: $LATEST"
    tar xzf "$LATEST" || { say "❌ restore fail"; exit 1; }
    docker compose -f docker-compose.yml -f docker-compose.prod.yml restart backend frontend
    say "✅ Data restore aindi + containers restart"
    exit 0
fi

# ---- 1. DATA BACKUP (mundu — eppudu) ----
say "💾 1/5 Data backup..."
tar czf "$BACKUP_DIR/data-$TS.tar.gz" \
    backend/*.json backend/*.jsonl .env 2>/dev/null || true
[ -f "$BACKUP_DIR/data-$TS.tar.gz" ] && say "   ✅ backup: $BACKUP_DIR/data-$TS.tar.gz ($(du -h "$BACKUP_DIR/data-$TS.tar.gz" | cut -f1))" \
    || say "   ⚠️ backup file raledu (data files levu anukunta — proceed)"

# ---- 2. KOTHA CODE ----
say "⬇️ 2/5 Kotha code (kotha repo + branch)..."
# remote switch (pata repo: matrimony-site → kotha repo: shubhalagnam)
CUR_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ "$CUR_URL" != "$REPO_NEW" ]; then
    say "   remote switch: $CUR_URL → $REPO_NEW"
    git remote set-url origin "$REPO_NEW" 2>/dev/null || git remote add origin "$REPO_NEW"
fi
git fetch origin "$BRANCH" || { say "❌ git fetch fail (internet/permissions check)"; exit 1; }
# tracked files local mods (audit logs lanti) — discard (backup lo unnayi).
# -B: local branch ni FETCH_HEAD ki set (untracked .env + gitignored data SAFE).
git checkout -f -B "$BRANCH" FETCH_HEAD
say "   ✅ code: $(git rev-parse --short HEAD) — $(git log -1 --format=%s | head -c 70)"

# ---- 3. FRONTEND REBUILD (backend volume-mounted — rebuild avvadu) ----
say "🔨 3/5 Frontend image rebuild (package.json same → npm ci cached, fast)..."
if ! docker compose -f docker-compose.yml -f docker-compose.prod.yml build frontend; then
    say "❌ frontend build fail — logs chudandi. Pata version inka nadustundi (down avvaledu)."
    exit 1
fi

# ---- 4. RESTART ----
say "🔄 4/5 Containers up..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d || { say "❌ up fail"; exit 1; }

# ---- 5. HEALTH CHECK ----
say "🩺 5/5 Health check (30s wait)..."
sleep 30
OK=0
for i in 1 2 3 4 5 6; do
    if docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T backend python -c 'import urllib.request; urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=10)' >/dev/null 2>&1; then OK=1; break; fi
    say "   wait... ($i)"
    sleep 15
done
if [ "$OK" = "1" ]; then
    say "✅ Backend OK"
else
    say "❌ Backend health fail — logs: docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail 50 backend"
    say "   Data backup unnadi: $BACKUP_DIR/data-$TS.tar.gz (rollback: bash update-vm.sh rollback)"
    exit 1
fi

FR_OK=0
for i in 1 2 3 4 5 6 7 8; do
    if curl -sf --max-time 10 -o /dev/null http://localhost:3000/; then FR_OK=1; break; fi
    sleep 10
done
[ "$FR_OK" = "1" ] && say "✅ Frontend OK" || say "⚠️ Frontend inka warm-up lo undocchu — 2-3 nimishalu tarvata https://manavivaha.in chudandi"

echo ""
say "🎉 UPDATE COMPLETE!"
say "   → https://manavivaha.in (phone lo cache clear chesi reload: chrome://... leda private tab)"
say "   → Kotha features: pricing minimal, మనవివాహం branding + logo, referral leaderboard LIVE"
say "   → Problem vaste: bash update-vm.sh rollback"
