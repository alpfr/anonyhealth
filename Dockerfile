# Build stage
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# Production stage
FROM nginx:1.27-alpine

# Set up writable directories for non-root nginx
RUN mkdir -p /tmp/nginx /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp \
             /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp /var/cache/nginx/scgi_temp && \
    chown -R 101:101 /tmp/nginx /var/cache/nginx /usr/share/nginx/html /etc/nginx/conf.d

# Override main nginx.conf to use non-root compatible paths
RUN sed -i 's|/run/nginx.pid|/tmp/nginx/nginx.pid|g' /etc/nginx/nginx.conf && \
    sed -i '/user  nginx;/d' /etc/nginx/nginx.conf

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

USER 101

CMD ["nginx", "-g", "daemon off;"]
