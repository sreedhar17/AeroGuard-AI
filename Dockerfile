# Stage 1: Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

# Accept the API_KEY as a build argument
ARG API_KEY
# IMPORTANT: Vite requires the VITE_ prefix to expose variables to the client-side
ENV VITE_API_KEY=$API_KEY

COPY package*.json ./
RUN npm install
COPY . .

# Vite will now bake VITE_API_KEY into the static files
RUN npm run build

# Stage 2: Production Stage
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]