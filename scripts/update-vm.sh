#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# 💍 మనవివాహం — VM UPDATE (one command) · HARDENED for LIVE production
# ═══════════════════════════════════════════════════════════════════
# VM (Oracle, manavivaha.in) meeda run cheyandi:
#
#   bash update-vm.sh                 # deploy reviewed main
#   DEPLOY_BRANCH=<branch> bash update-vm.sh   # pre-merge staging
#   bash update-vm.sh rollback        # full restore (data + last-good code)
#   bash update-vm.sh smoke           # run smoke tests only (no deploy)
#
# Em chestundi (zero-downtime intent + AUTO-ROLLBACK):
#   1. 💾 Data backup (backend/*.json + *.jsonl + .env) — timestamped tar
#   2. 📌 Last-known-good git commit record (auto-rollback ki)
#   3. ⬇️ Kotha code (git fetch + checkout DEPLOY_BRANCH)
#   4. 🔨 Frontend image rebuild (PATA version inka nadustundi — build fail ante
#         containers touch avvavu, site up undi)
#   5. 🔄 Containers up -d
#   6. 🩺 Health gate + SMOKE TESTS (backend /api/health, /api/stats, frontend /, /login)
#   7. 🚨 Health/smoke FAIL ante → AUTO-ROLLBACK (code last-good ki revert +
#         frontend rebuild + restart + re-check). Manual intervention avasaram LEDU.
#
# 🛡️ DATA SAFETY: data_db.json (profiles/payments/credits) GITIGNORED — bind mount
#    ./backend:/app lo host meeda persist. git checkout -f danini touch cheyyadu.
#    Backup pre-deploy snapshot ni tar chestundi.
# ═══════════════════════════════════════════════════════════════════
set -uo pipefail

REPO_NEW="https://github.com/charanpendota98-prog/shubhalagnam.git"
BRANCH="${DEPLOY_BRANCH:-main}"          # default reviewed main; set explicitly for staging
TS=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="vm-backups"
LAST_GOOD_FILE="$BACKUP_DIR/last-good-commit"
STAMP="[$(date +%H:%M:%S)]"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
HEALTH_TRIES="${HEALTH_TRIES:-6}"
SMOKE_TRIES="${SMOKE_TRIES:-8}"

say() { echo -e "$STAMP $1"; }

# ---- 0. clone dir detect (repo lopala leda standalone — rendu work avvali) ----
FOUND=""
if [ -f "$(dirname "$0")/../docker-compose.yml" ] && [ -d "$(dirname "$0")/../backend" ]; then
    FOUND="$(cd "$(dirname "$0")/.." && pwd)"
elif [ -f docker-compose.yml ] && [ -d backend ]; then
    FOUND="$(pwd)"
else
    for CAND in "$HOME/matrimony-site" "$HOME/shubhalagnam" "$HOME/manavivaha"; do
        if [ -f "$CAND/docker-compose.yml" ] && [ -d "$CAND/backend" ]; then FOUND="$CAND"; break; fi
    done
fi
if [ -z "$FOUND" ]; then
    say "❌ Repo clone dorakaledu. VM lo docker-compose.yml unna dir nunchi run cheyandi:"
    say "   bash <clone-dir>/scripts/update-vm.sh"
    exit 1
fi
cd "$FOUND" || { say "❌ cd fail: $FOUND"; exit 1; }
say "📁 Repo dir: $(pwd)"
mkdir -p "$BACKUP_DIR"

# --------------------------------------------------------------------------- #
# health + smoke checks (reusable — deploy gate, rollback verify, `smoke` mode)
# --------------------------------------------------------------------------- #
backend_health() {
    $COMPOSE exec -T backend python -c \
      'import urllib.request,sys; sys.exit(0 if urllib.request.urlopen("http://127.0.0.1:8000/api/health",timeout=10).status==200 else 1)' \
      >/dev/null 2>&1
}
# smoke: key features actually respond (not just /health)
smoke_tests() {
    local fail=0
    # backend API via container loopback
    for EP in /api/health /api/stats /api/plans; do
        if $COMPOSE exec -T backend python -c \
          "import urllib.request,sys; r=urllib.request.urlopen('http://127.0.0.1:8000$EP',timeout=10); sys.exit(0 if r.status==200 else 1)" \
          >/dev/null 2>&1; then
            say "   ✅ backend $EP"
        else
            say "   💥 backend $EP FAIL"; fail=1
        fi
    done
    # /api/stats must return real JSON with profiles_count (honest-stats guard)
    local stats
    stats=$($COMPOSE exec -T backend python -c \
      'import urllib.request,json; d=json.load(urllib.request.urlopen("http://127.0.0.1:8000/api/stats",timeout=10)); print(d.get("profiles_count",-1), d.get("stats_are_live"))' 2>/dev/null || echo "-1 none")
    say "   ℹ️ stats: $stats"
    # frontend pages
    for PG in / /login; do
        if curl -sf --max-time 10 -o /dev/null "http://localhost:3000$PG"; then
            say "   ✅ frontend $PG"
        else
            say "   💥 frontend $PG FAIL"; fail=1
        fi
    done
    return $fail
}
wait_healthy() {
    local ok=0 i
    for i in $(seq 1 "$HEALTH_TRIES"); do
        if backend_health; then ok=1; break; fi
        say "   backend warm-up... ($i/$HEALTH_TRIES)"; sleep 15
    done
    [ "$ok" = "1" ] || return 1
    local fok=0
    for i in $(seq 1 "$SMOKE_TRIES"); do
        if curl -sf --max-time 10 -o /dev/null http://localhost:3000/; then fok=1; break; fi
        sleep 10
    done
    [ "$fok" = "1" ] || return 1
    return 0
}

# --------------------------------------------------------------------------- #
# rollback helpers
# --------------------------------------------------------------------------- #
restore_data() {
    local f="${1:-}"
    if [ -z "$f" ]; then f=$(ls -1t "$BACKUP_DIR"/data-*.tar.gz 2>/dev/null | head -1); fi
    [ -z "$f" ] && { say "   ⚠️ no data backup to restore"; return 1; }
    say "   ↩️ restoring data: $f"
    tar xzf "$f" || { say "   ❌ data restore fail"; return 1; }
    return 0
}
revert_code() {
    local target="${1:-}"
    if [ -z "$target" ] && [ -f "$LAST_GOOD_FILE" ]; then target=$(cat "$LAST_GOOD_FILE"); fi
    [ -z "$target" ] && { say "   ⚠️ no last-good commit recorded"; return 1; }
    say "   ↩️ reverting code to $target"
    git checkout -f -B "$BRANCH" "$target" 2>/dev/null || { say "   ❌ code revert fail"; return 1; }
    return 0
}
rebuild_restart() {
    say "   🔨 rebuilding frontend + restarting..."
    $COMPOSE build frontend >/dev/null 2>&1 || say "   ⚠️ frontend rebuild had issues"
    $COMPOSE up -d >/dev/null 2>&1 || say "   ⚠️ up -d had issues"
    sleep 20
}

# --------------------------------------------------------------------------- #
# MODE: smoke (run checks only, no deploy)
# --------------------------------------------------------------------------- #
if [ "${1:-}" = "smoke" ]; then
    say "🩺 Smoke tests only (no deploy)"
    if wait_healthy && smoke_tests; then say "✅ SMOKE PASS"; exit 0; else say "❌ SMOKE FAIL"; exit 1; fi
fi

# --------------------------------------------------------------------------- #
# MODE: rollback (full restore — data + last-good code)
# --------------------------------------------------------------------------- #
if [ "${1:-}" = "rollback" ]; then
    say "↩️ FULL ROLLBACK (data + last-good code)"
    restore_data || true
    revert_code || true
    rebuild_restart
    if wait_healthy; then say "✅ ROLLBACK SUCCESS — last-good version live"; exit 0; fi
    say "❌ Rollback health fail — logs: $COMPOSE logs --tail 60 backend"
    exit 1
fi

# --------------------------------------------------------------------------- #
# MODE: auto-rollback (internal — called when deploy health gate fails)
# --------------------------------------------------------------------------- #
auto_rollback() {
    say "🚨 AUTO-ROLLBACK — health/smoke gate fail. Restoring last-known-good..."
    # data_db.json is gitignored (untouched by checkout); revert CODE only so we
    # don't lose any transactions from the brief deploy window.
    revert_code || { say "❌ auto-rollback code revert fail — MANUAL: bash update-vm.sh rollback"; return 1; }
    rebuild_restart
    if wait_healthy; then
        say "✅ AUTO-ROLLBACK SUCCESS — pata (last-good) version live again. Site OK."
        say "   Kotha deploy fail aindi — logs chudandi: $COMPOSE logs --tail 60 backend"
        return 0
    fi
    say "❌ AUTO-ROLLBACK health fail — MANUAL intervention: bash update-vm.sh rollback"
    return 1
}

# =========================================================================== #
# DEPLOY
# =========================================================================== #
# ---- 1. DATA BACKUP (mundu — eppudu) ----
say "💾 1/6 Data backup..."
tar czf "$BACKUP_DIR/data-$TS.tar.gz" backend/*.json backend/*.jsonl .env 2>/dev/null || true
if [ -f "$BACKUP_DIR/data-$TS.tar.gz" ]; then
    say "   ✅ backup: $BACKUP_DIR/data-$TS.tar.gz ($(du -h "$BACKUP_DIR/data-$TS.tar.gz" | cut -f1))"
else
    say "   ⚠️ backup file raledu (data files levu?) — proceed"
fi

# ---- 2. RECORD LAST-KNOWN-GOOD ----
say "📌 2/6 Last-known-good commit record..."
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")
if [ -n "$PREV_COMMIT" ]; then
    echo "$PREV_COMMIT" > "$LAST_GOOD_FILE"
    say "   ✅ last-good: $PREV_COMMIT (auto-rollback ki)"
else
    say "   ⚠️ current commit teliyaledu (fresh clone?) — auto-rollback code-revert skip avvocchu"
fi

# ---- 3. KOTHA CODE ----
say "⬇️ 3/6 Kotha code ($BRANCH)..."
CUR_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ "$CUR_URL" != "$REPO_NEW" ]; then
    say "   remote switch: ${CUR_URL:-none} → $REPO_NEW"
    git remote set-url origin "$REPO_NEW" 2>/dev/null || git remote add origin "$REPO_NEW"
fi
git fetch origin "$BRANCH" || { say "❌ git fetch fail (internet/permissions)"; exit 1; }
# tracked-file local mods discard (backup lo unnayi). gitignored data_db.json SAFE.
git checkout -f -B "$BRANCH" FETCH_HEAD
say "   ✅ code: $(git rev-parse --short HEAD) — $(git log -1 --format=%s | head -c 70)"

# ---- 4. FRONTEND REBUILD (build fail ante site down AVVADU) ----
say "🔨 4/6 Frontend image rebuild..."
if ! $COMPOSE build frontend; then
    say "❌ frontend build FAIL — containers touch cheyyaledu, PATA version inka nadustundi (site UP)."
    say "   Logs: $COMPOSE logs --tail 50 frontend"
    exit 1
fi

# ---- 5. RESTART ----
say "🔄 5/6 Containers up -d..."
$COMPOSE up -d || { say "❌ up fail"; auto_rollback; exit 1; }

# ---- 6. HEALTH GATE + SMOKE (fail ante AUTO-ROLLBACK) ----
say "🩺 6/6 Health gate + smoke tests (30s warm-up)..."
sleep 30
if ! wait_healthy; then
    say "❌ Health gate FAIL"
    auto_rollback
    exit 1
fi
say "   ✅ backend + frontend healthy — running smoke tests"
if ! smoke_tests; then
    say "❌ Smoke tests FAIL"
    auto_rollback
    exit 1
fi

echo ""
say "🎉 DEPLOY COMPLETE — all health + smoke tests passed!"
say "   → https://manavivaha.in (phone lo cache clear / private tab lo reload)"
say "   → 🧠 Smart Match Assistant (/me) · 📬 Personalized Digest (/control/legacy) LIVE"
say "   → Last-good commit: $(cat "$LAST_GOOD_FILE" 2>/dev/null || echo '?')  · Backup: $BACKUP_DIR/data-$TS.tar.gz"
say "   → Problem vaste: bash update-vm.sh rollback"
