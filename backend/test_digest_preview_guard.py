"""
Digest preview availability guard + retention:
1. GET /api/digest/preview is admin-only (route map contract). Unauthenticated
   calls AND calls with a VALID non-admin member token are rejected and must
      not write to the durable digest history (previously every public call
         appended a row: unbounded durable growth on a 1 GB host).
         2. Admin preview works and records exactly one bounded entry.
         3. POST /api/publish/digest (admin) still works through the guarded internal
            digest_preview(request) call - with outbound transports stubbed.
            4. POST /api/digest/personal/run (admin) logs through the bounded helper.
            5. The persisted digest history has a hard retention cap, verified across a
               disk persist/reload round-trip (db_store.save -> db_store.load).
               """
               import asyncio
               import os
               import sys
               
               os.environ[
                
               ])