# Stage 1: Build the Vite + React Frontend
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with FastAPI
FROM python:3.11-slim AS production
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend ./backend

# Copy built React frontend from Stage 1
COPY --from=build /app/dist ./dist

# Verify the import works at build time (catches errors early)
RUN python -c "from backend.main import app; print('Startup check OK')"

EXPOSE 8080

# Use Python -m to guarantee module resolution, read PORT from env
CMD ["sh", "-c", "python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
