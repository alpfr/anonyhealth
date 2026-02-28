# Build stage
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# Production stage
FROM nginx:1.27-alpine

# Create nginx cache/pid directories writable by non-root
RUN mkdir -p /var/cache/nginx /var/run && \
    chown -R 101:101 /var/cache/nginx /var/run /usr/share/nginx/html

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

USER 101

CMD ["nginx", "-g", "daemon off;"]
