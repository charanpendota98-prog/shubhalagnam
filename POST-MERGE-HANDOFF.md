# Manavivaha — Post-merge deployment handoff

## Current architecture

- Public website: `https://manavivaha.in`
- Reverse proxy: Caddy on the VM
- Frontend: Next.js container on port 3000
- Backend: FastAPI container on port 8000, exposed to the VM only on loopback for Caddy
- PostgreSQL: private Docker network
- Redis: private Docker network
- WhatsApp bridge containers: private Docker network
- Production deploy entrypoint: `bash update-vm.sh`

## Latest deployment verification

After PR #9 is merged into `main`, deploy from the VM:

```bash
cd ~/shubhalagnam
git fetch origin main
git checkout -B main FETCH_HEAD
APP_ENV=production DEPLOY_BRANCH=main bash update-vm.sh
```

The deployment script backs up JSON data, fetches merged `main`, builds the frontend, starts the production compose stack, and checks backend health inside the backend container. It must not check `localhost:8000` from the VM because the API is intentionally not publicly exposed.

Verify:

```bash
git log -1 --oneline
docker ps

docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T backend \
  python -c 'import urllib.request; print(urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=10).read().decode())'

curl -fsS https://manavivaha.in/api/health
curl -I https://manavivaha.in
```

Expected: backend `success: true`, public `/api/health` HTTP 200, homepage HTTP 200, and no public PostgreSQL/Redis/bridge ports.

## Implemented in this repository

- Premium cinematic wedding hero image with lightweight Ken Burns/petal motion.
- Bride/groom/marriage visual branding and clear register/explore CTAs.
- Match pages kept ad-free; paid promotions are not rendered in match/profile/search flows.
- Production secret guard for auth/admin secrets.
- Production compose configuration and private internal services.
- Caddy-facing backend loopback mapping.
- Container-network health check in the VM update script.
- Existing vendor/ad/channel management and Telegram/WhatsApp operations remain in the codebase.

## Important limitations — do not claim complete until verified

- The hero is an animated image, not a real 360 video. A real MP4/WebM/360 asset still needs to be supplied and integrated if required.
- `pay_mode: manual_upi` means live Razorpay reconciliation/refunds/webhook testing is not complete.
- PostgreSQL/Redis containers are present, but a complete migration away from legacy JSON/in-memory state must be verified.
- Real OTP provider delivery must be tested with a real phone; dev OTP must remain disabled.
- WhatsApp OTP/channel/personal lanes require real provider sessions, consent, rate limits, and health checks.
- Telegram bots must have explicit admin permissions in each real channel.
- Backups need an encrypted off-VM copy and a tested restore drill.
- Owner/worker control accounts must be verified at `/control/login`; do not place passwords or hashes in Git or chat.
- Dependency upgrades and security audit must pass before calling the service production-complete.

## Do not do

- Do not print `.env` values, passwords, hashes, tokens, or private keys.
- Do not expose ports 5432, 6379, 3001–3003, or public backend port 8000.
- Do not start marketing with fake channel links, fake user counts, fake success stories, or manual payment claims.
- Do not deploy an unmerged branch over `main`.

## Next-session first actions

1. Read this file and `PRE-MERGE-HANDOFF.md`.
2. Check `git log -1 --oneline` and confirm VM is on merged `main`.
3. Run the internal and public health checks above.
4. Check `docker ps` port exposure.
5. Verify `/control/login` owner and worker permissions without exposing credentials.
6. Verify wrong OTP rejection and real provider delivery.
7. Verify payment webhook/reconciliation in staging.
8. Run backup/restore drill.
9. Only then schedule production marketing.
