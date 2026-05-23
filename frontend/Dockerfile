# Step 1: Build Environment
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Set build-time env variable targeting the routing mesh proxy entry
ENV VITE_API_URL=/api
RUN npm run build

# Step 2: High Performance Nginx Serve Edge
FROM nginx:1.25-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
# Include custom reverse proxy configurations to clean up CORS
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]