# Payment-provider setup — archived safety notice

> **ఈ పాత setup steps‌ను అనుసరించకండి.** ఇందులో owner నిర్ధారించని UPI recipient, పాత Compose commands, పాత webhook/test assumptions, మరియు పరీక్షించని payment-readiness claims ఉన్నాయి. ఆ values లేదా commands‌ను production‌లో copy చేయకండి.

ప్రస్తుత checkout‌లో `docker-compose.prod.yml` ద్వారా `PAYMENTS_LIVE` default `false`గా ఉంటుంది; `PAYMENT_AUTO_APPROVE` కూడా `false`. ఈ repository మార్పులు merchant account, settlement, webhook delivery, refunds, compliance, లేదా payment flow production‌లో పనిచేస్తుందని నిరూపించవు. **Production payment launch‌కు ఇప్పటికీ NO-GO.**

## Production payment enablementకు ముందు

1. వ్యాపార యజమాని అధికారిక payment-provider dashboard‌లో merchant account, settlement bank, business/KYC స్థితి, fees, refund/dispute policyలను స్వయంగా నిర్ధారించాలి.
2. Provider యొక్క ప్రస్తుత అధికారిక documentation ఆధారంగా sandbox integration‌ను staging‌లో పరీక్షించాలి: amount/currency, signature validation, duplicate/replayed webhook, failure, refund, reconciliation సహా.
3. `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` వంటి secrets‌ను owner-controlled secret manager లేదా restricted host-only `.env.production`లో మాత్రమే ఉంచాలి. వాటిని Git/chat‌లో పెట్టకండి.
4. Manual UPI enable చేయాలంటే owner నిర్ధారించిన merchant UPI ID మాత్రమే `PAY_UPI_ID`లో ఇవ్వాలి. ఈ repositoryలో లేదా ఈ పత్రంలో ఎటువంటి recipient, UTR, payment reference, లేదా fallback number అందించబడదు.
5. Owner sign-off, verified provider configuration, amount/currency and refund review, backup/restore checks పూర్తయ్యే వరకు `PAYMENTS_LIVE=false`గానే ఉంచాలి. Real-money test payment‌ను staging/sandbox verification లేకుండా చేయకండి.

తాజా release blockers మరియు storage/deployment checks‌కు [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md), staging sequence‌కు [`PRODUCTION-DEPLOY.md`](PRODUCTION-DEPLOY.md) చూడండి. Provider credential values లేదా real customer/payment data‌ను chat‌లో లేదా source control‌లో ఎప్పుడూ పంచకండి.
