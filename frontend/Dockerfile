# MANA VIVAHA frontend — production image (build + start, no dev server)
FROM node:20-alpine

WORKDIR /app

# NEXT_PUBLIC_* = BUILD time bake avutundi → compose build.args nunchi
ARG BACKEND_URL="http://backend:8000"
ARG NEXT_PUBLIC_SUPPORT_PHONE=""
ARG NEXT_PUBLIC_SUPPORT_WHATSAPP=""
ARG NEXT_PUBLIC_SUPPORT_EMAIL=""
# Next evaluates rewrites during `next build`; bake the internal service URL
# into the production image rather than relying on runtime container env.
ENV BACKEND_URL=$BACKEND_URL
ENV NEXT_PUBLIC_SUPPORT_PHONE=$NEXT_PUBLIC_SUPPORT_PHONE
ENV NEXT_PUBLIC_SUPPORT_WHATSAPP=$NEXT_PUBLIC_SUPPORT_WHATSAPP
ENV NEXT_PUBLIC_SUPPORT_EMAIL=$NEXT_PUBLIC_SUPPORT_EMAIL

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
