# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Accept API_KEY from Secret Manager (passed from cloudbuild.yaml)
ARG API_KEY
ENV VITE_API_KEY=$API_KEY

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app

# Install 'serve' globally to host the static files
RUN npm install -g serve

# Copy only the 'dist' folder from the builder stage
COPY --from=builder /app/dist ./dist

# Cloud Run uses port 8080 by default
EXPOSE 8080

# Serve the 'dist' folder. -s handles SPA routing.
CMD ["serve", "-s", "dist", "-l", "8080"]