# Stage 1: Build the Vite + React Frontend
FROM node:22-slim AS build
WORKDIR /app
# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install
# Copy all source files and build
COPY . .
RUN npm run build

# Stage 2: Serve with FastAPI
FROM python:3.11-slim AS production
WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY backend /app/backend

# Copy the built frontend from Stage 1
COPY --from=build /app/dist /app/dist

# Cloud Run injects the PORT environment variable
ENV PORT=8080
EXPOSE $PORT

# Start uvicorn using shell to expand the PORT variable correctly
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port $PORT"]
