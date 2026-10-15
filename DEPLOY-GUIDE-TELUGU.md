# పాత Deployment Guide — నిలిపివేయబడింది

> **ఈ ఫైల్‌లోని పాత deployment steps‌ను అమలు చేయకండి.** ఇవి వేరే repository/branch‌ను సూచిస్తున్నాయి; GitHub repository visibility‌ను `Public` చేయమనే ప్రమాదకరమైన సూచన కూడా ఉంది. ఆ సూచనను అనుసరించకండి—source repository private గానే ఉంచండి.

ప్రస్తుత release సూచనలకు మాత్రమే వీటిని చూడండి:

- [`PRODUCTION-DEPLOY.md`](PRODUCTION-DEPLOY.md) — తాజా deployment checklist, స్పష్టమైన release gates‌తో.
- [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md) — పరీక్షించినవి, ఇంకా production‌కు అడ్డంకులుగా ఉన్నవి.

**ప్రస్తుత స్థితి:** public registration/payments‌తో production launch‌కు ఇంకా `NO-GO`. ప్రస్తుత standalone `docker-compose.prod.yml` JSON/state/media paths‌ను named volume‌కు map చేస్తుంది; అయితే existing production data ఉందో లేదో, దాని migration/restore సరిగా జరిగిందో తెలియదు. Off-host encrypted backup మరియు isolated restore drill పూర్తయ్యే వరకు live stack‌ను మార్చకండి. తాజా verification వివరాలకు [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md) చూడండి.

Secrets, passwords, API keys, SSH private keys‌ను chat‌లో లేదా source control‌లో ఎప్పుడూ పంపకండి. Production secrets‌ను target host/secret manager‌లోనే ఉంచండి.
