# Checkout capture metadata boundary

The Razorpay checkout callback keeps its existing HMAC verification. When the capture check runs, the fetched provider payment must also have an exact integer, non-negative paise amount equal to the server order amount, the submitted payment ID, the stored provider order ID, and the exact currency `INR`. Missing metadata fails closed before fulfillment. An empty stored provider order cannot establish a binding, even if the provider field is also empty.

## Capture-check configuration

`APP_ENV=prod`, `production`, or `live` always enables the capture check, regardless of `RAZORPAY_VERIFY_CAPTURE`. Outside those environments, `RAZORPAY_VERIFY_CAPTURE=0` disables the entire provider fetch block, including these metadata binding checks, not only the captured-status check. HMAC verification still runs. Non-production environments using real provider keys should enable `RAZORPAY_VERIFY_CAPTURE=1`.

This PR does not narrow that pre-existing development/test switch. Changing it safely needs a separate compatibility review of test and staging workflows that deliberately omit provider fetching. It must never be used to bypass production verification. The regression suite forces production capture semantics with fictional provider responses and no external sockets.

## Webhook asymmetry

The signed webhook path is unchanged in this PR. It derives the payment ID and order ID from the signed entity, then looks up the local order by that provider order ID, rather than comparing a fetched entity with a separately signed checkout response. Its amount/currency validation has existing normalization and environment-specific behavior that differs from checkout's strict raw-type and case checks. Webhook signature verification remains required. Checkout hardening is not evidence that webhook parsing now has the same strictness.

Aligning webhook parsing needs its own reviewed change and regression coverage for signed events, retries and existing accepted shapes. Keeping it separate prevents this checkout fix from silently changing a second fulfillment entry point.

## Verification

`backend/tests/test_capture_provider_binding.py` runs in CI's per-file isolated pytest loop. It covers raw adapter output, malformed/missing metadata, empty stored and fetched order IDs, a swapped payment/order entity, clean HTTP 400 errors, actual HMAC, provider fetch failures, and real credit fulfillment exactly once. The captured-exact route case from the legacy Wave34 script is also exercised here, without requiring configured merchant credentials. The legacy script may still explicitly skip provider-dependent cases when no merchant integration is configured.
