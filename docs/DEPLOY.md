# HireSwift — Production Deployment & Single Container Guide

This guide is prepared for backend engineering (Akshita) to serve the production-built React frontend directly from FastAPI within a single container or server process.

---

## 1. Frontend Build Outputs & Configuration

The frontend is configured with:
- **Vite Base URL**: `/` (root absolute paths for all static chunks)
- **API Base URL**: `/api` (relative endpoint prefix by default)
- **Output Directory**: `frontend/dist`

To build the frontend:
```bash
npm --prefix frontend install
npm --prefix frontend run build
```
This produces:
- `frontend/dist/index.html` (SPA entry point)
- `frontend/dist/assets/*.js` and `*.css` (hashed chunks)
- `frontend/dist/favicon.svg` and static icons

---

## 2. Mounting Frontend in FastAPI (`main.py`)

In FastAPI, route registration order is essential:
1. Register **`/api` routers FIRST** so backend requests are never intercepted by static handlers.
2. Mount **`/assets` StaticFiles** to serve JS/CSS chunks with proper MIME types.
3. Register the **SPA Fallback catch-all route LAST** to return `index.html` for deep links (e.g. `/app/dashboard`, `/app/pipeline`) while strictly returning JSON 404s for unmatched `/api` and documentation routes.

### FastAPI Implementation Snippet:

```python
import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="HireSwift ATS API")

# 1. Register API Router FIRST
app.include_router(api_router, prefix="/api")

# 2. Mount built static assets directory
DIST_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")
ASSETS_DIR = os.path.join(DIST_DIR, "assets")

if os.path.exists(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

# 3. SPA Fallback Handler (Registered LAST)
# Serves index.html for client-side routing while exempting /api, /docs, and /openapi.json
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Exclude API endpoints and OpenAPI doc routes
    if (
        full_path.startswith("api")
        or full_path.startswith("docs")
        or full_path.startswith("redoc")
        or full_path == "openapi.json"
    ):
        raise HTTPException(status_code=404, detail="API route not found")

    target_file = os.path.join(DIST_DIR, full_path)
    if os.path.exists(target_file) and os.path.isfile(target_file):
        return FileResponse(target_file)

    # Return index.html for all client-side routes (/app/dashboard, /app/pipeline, etc.)
    index_file = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)

    raise HTTPException(status_code=404, detail="Frontend build not found. Run 'npm run build' first.")
```

---

## 3. Multi-Stage Production Dockerfile

For a single container deployment (e.g. Render, Railway, AWS ECS, Fly.io, or DigitalOcean), use a multi-stage Dockerfile that builds the React assets in Node and copies them into the Python runtime:

```dockerfile
# =============================================================
# Stage 1: Build Frontend SPA
# =============================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /build

# Install dependencies with lockfile caching
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build production bundle
COPY frontend/ ./
RUN npm run build

# =============================================================
# Stage 2: Python Backend Runtime
# =============================================================
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies if required for PDF/DOCX processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Copy built frontend assets from Stage 1 into frontend/dist
COPY --from=frontend-builder /build/dist /app/frontend/dist

# Expose FastAPI port
EXPOSE 8000

# Environment defaults
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start Uvicorn ASGI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 4. Verification & Testing

Before deploying, verify the built bundle:

```bash
# 1. Run the dist verification script
npm run verify:dist

# 2. Check health and static routes locally:
curl http://127.0.0.1:8000/health                # Returns 200 OK
curl -I http://127.0.0.1:8000/assets/index.js    # Returns 200 with Content-Type: application/javascript
curl http://127.0.0.1:8000/app/dashboard         # Returns index.html (SPA fallback)
curl http://127.0.0.1:8000/api/unknown           # Returns JSON 404 (not HTML)
```
