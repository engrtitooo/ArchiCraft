# Stage 1: Build the Vite + React Frontend
FROM node:22-slim AS build
WORKDIR /app
# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci
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

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Run uvicorn on port 8080
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
