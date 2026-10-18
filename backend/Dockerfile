# Mana Vivaha backend — ARM64/x86_64 compatible runtime image.
# The OCI Free Tier target is an Ampere ARM VM; all dependencies are pinned in
# requirements.txt and the image deliberately contains no runtime JSON/media.

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

# Fonts are required for truthful Telugu profile cards. libpq5 is kept only for
# compatibility with the planned relational-store adapter.
RUN apt-get update && apt-get install -y --no-install-recommends \
        fonts-dejavu-core \
        fonts-noto-core \
        fonts-noto-ui-core \
        libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt
COPY . .

# Empty named volumes inherit these private ownerships on first creation. If an
# existing volume was created by the old root runtime, perform the documented,
# one-time maintenance chown before switching the production target to `prod`.
RUN addgroup --system --gid 10001 app \
    && adduser --system --uid 10001 --ingroup app app \
    && mkdir -p /var/lib/manavivaha /tmp/cards /tmp/photos \
    && chown -R app:app /var/lib/manavivaha /tmp/cards /tmp/photos /app

FROM base AS dev
# Development bind mounts intentionally remain root-compatible. Never use this
# target for a public deployment.
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM base AS prod
USER app
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
