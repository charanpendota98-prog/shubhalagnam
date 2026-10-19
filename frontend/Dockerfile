# Mana Vivaha frontend — reproducible multi-stage image.
# The final image contains only Next.js standalone output, so Oracle Free Tier
# storage and cold-start work are materially smaller than a build+runtime image.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS builder
WORKDIR /app
ARG BACKEND_URL="http://backend:8000"
ARG NEXT_PUBLIC_SUPPORT_PHONE=""
ARG NEXT_PUBLIC_SUPPORT_WHATSAPP=""
ARG NEXT_PUBLIC_SUPPORT_EMAIL=""
ARG NEXT_PUBLIC_BUSINESS_CONTACT_NAME=""
ARG NEXT_PUBLIC_BUSINESS_LOCATION=""
ARG NEXT_PUBLIC_GRIEVANCE_OFFICER=""
ARG NEXT_PUBLIC_LEGAL_NAME=""
ENV BACKEND_URL=$BACKEND_URL \
    NEXT_PUBLIC_SUPPORT_PHONE=$NEXT_PUBLIC_SUPPORT_PHONE \
    NEXT_PUBLIC_SUPPORT_WHATSAPP=$NEXT_PUBLIC_SUPPORT_WHATSAPP \
    NEXT_PUBLIC_SUPPORT_EMAIL=$NEXT_PUBLIC_SUPPORT_EMAIL \
    NEXT_PUBLIC_BUSINESS_CONTACT_NAME=$NEXT_PUBLIC_BUSINESS_CONTACT_NAME \
    NEXT_PUBLIC_BUSINESS_LOCATION=$NEXT_PUBLIC_BUSINESS_LOCATION \
    NEXT_PUBLIC_GRIEVANCE_OFFICER=$NEXT_PUBLIC_GRIEVANCE_OFFICER \
    NEXT_PUBLIC_LEGAL_NAME=$NEXT_PUBLIC_LEGAL_NAME \
    NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

# Development target keeps dependencies/source available for docker-compose.yml.
FROM deps AS dev
WORKDIR /app
ENV NODE_ENV=development NEXT_TELEMETRY_DISABLED=1
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 10001 nodejs \
    && adduser --system --uid 10001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
