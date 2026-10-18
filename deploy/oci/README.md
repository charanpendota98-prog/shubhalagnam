# OCI Always Free pilot runbook

This folder is a reviewable deployment artifact, not an unattended provisioner. OCI quotas, shape availability, regional capacity, domain ownership, secrets, and provider accounts must be confirmed by the owner.

## Exact pilot shape

- Region: the tenancy's chosen low-latency region with available Ampere capacity; record the region in the release ticket.
- Compute: Oracle Linux 8/9 or Ubuntu 22.04 ARM64, Ampere A1 Flex, **4 OCPU / 24 GB RAM maximum** if available. Start at 2 OCPU / 12 GB if the pilot does not need the full shape.
- Boot volume: 50 GB, encrypted, balanced performance.
- Additional block volume: 100 GB encrypted, mounted at `/var/lib/mana-vivaha`; grow only after the 70% alarm fires.
- Public IP: reserved address for the ingress VM; no public IP for future private app nodes.
- VCN: `10.0.0.0/16`; pilot subnet `10.0.10.0/24`; future private app subnet `10.0.20.0/24`.
- Ingress: Caddy on the VM, TCP 80/443 only. Optional OCI Always Free Load Balancer is deferred until a second app node exists and the tenancy confirms the free 10 Mbps tier.
- Host ports: 80/443 from the internet; SSH only from the operator VPN/approved IP. Never expose 3000, 8000, 5432, 6379, or Docker.
- Runtime: backend `prod` target, one Uvicorn worker; frontend `runner` target; optional bot profile off by default.
- Resource caps: backend 1.75 CPU/4 GB, frontend 1 CPU/1.5 GB, bot 0.25 CPU/512 MB; leave at least 6 GB for OS/cache/upgrade headroom.
- Backups: encrypted archive of the complete app volume to OCI Object Storage, RPO 15 minutes target, RTO 1 hour target. Restore into a new volume only.

## Provisioning checklist

1. Confirm the tenancy quota, ARM availability, boot/block volume quota, outbound budget, and Object Storage bucket region.
2. Create the VCN/subnet/route table/NSG. Apply deny-by-default ingress and egress rules; allow only required DNS/NTP/HTTPS egress plus provider endpoints.
3. Create the ARM VM with a reserved IP and an operator SSH key. Disable password SSH; allow the approved admin source only.
4. Attach the encrypted block volume and record its OCID. Enable monitoring alarms for CPU, memory, disk usage, volume I/O, instance reachability, and bandwidth.
5. Run `cloud-init.yaml` only after review. It installs host dependencies and creates the deployment user/directories; it does not write application secrets.
6. Install/configure Caddy from an owner-controlled package source and verify DNS/TLS before opening promotion.
7. Clone the reviewed commit, create `.env.production` through the secret manager, and run `scripts/update-vm.sh preflight`.
8. Create/restore the named volume. Existing data must be checked and ownership migrated to UID/GID `10001:10001`; never use `chmod 777`.
9. Run Compose `config`, build both production targets, initialize only a verified new store, and start the stack.
10. Run TLS/browser/provider/backup-restore gates. Keep the site NO-GO until all external gates have evidence.

## Backup/restore

`../../scripts/backup-volume.sh` is deliberately guarded by `MANA_VIVAHA_BACKUP_APPROVED=YES`. It stops the sole JSON writer, archives the complete named volume, encrypts with an owner-controlled `AGE_RECIPIENT`, uploads with OCI instance-principal auth, and restarts the writer.

`../../scripts/restore-volume.sh` is deliberately guarded by `MANA_VIVAHA_RESTORE_APPROVED=YES`. It downloads and verifies an archive, decrypts it, and extracts into a **new** volume. It refuses the live volume and does not perform a cutover. Compare registration/payment/referral counts, media checksums, auth/session behavior, and privacy responses before an owner-approved maintenance cutover.

Use an OCI Object Storage bucket with:

- server-side encryption and versioning;
- lifecycle retention matching the privacy/retention policy;
- access only from the backup instance principal and a break-glass recovery group;
- object names that contain no member identifiers;
- an alarm/job for backup age and failed uploads.

## Monitoring and release evidence

Record these per release:

- commit SHA, image digests, Compose config output, and image user IDs;
- VM shape, volume usage, CPU/RSS headroom, and current backup age;
- `/api/health` and `/api/ready` results;
- frontend/backend/browser/device smoke results;
- provider sandbox delivery and webhook replay results;
- restore volume name, archive checksum, restore duration, and reviewer;
- rollback image and same-volume rollback result.

No document in this folder overrides `PRODUCTION-DEPLOY.md` or authorizes public launch by itself.
