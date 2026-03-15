"""SPV Platform — FastAPI backend entry point."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import vehicles, search

app = FastAPI(
    title="SPV Platform API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow the Next.js frontend (dev and docker) to call the API
# ---------------------------------------------------------------------------
_cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000")
_cors_origins = [o.strip() for o in _cors_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(vehicles.router, prefix="/api")
app.include_router(search.router, prefix="/api")


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok"}
