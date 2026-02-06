"""
WestBetPro Admin Panel Backend
FastAPI server with Supabase integration
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import sys
import os

# Load environment variables
load_dotenv()

# Add backend directory to path
backend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend')
sys.path.append(backend_path)

# Import routes (from api.routes)
from api.routes import (
    matches, predictions, logs, analytics, results,
    admin_analytics_simple, upload, engine, admin_analytics,
    api_usage
)

# Create FastAPI app
app = FastAPI(
    title="WestBetPro Admin API",
    description="Admin panel backend for betting opportunity system",
    version="1.0.0"
)

# CORS middleware (allow frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003"
    ],  # Next.js dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(matches.router)
app.include_router(predictions.router)
app.include_router(logs.router)
app.include_router(analytics.router)
app.include_router(results.router)
app.include_router(admin_analytics_simple.router)
app.include_router(upload.router)
app.include_router(engine.router)
app.include_router(admin_analytics.router)
app.include_router(api_usage.router)


@app.get("/")
async def root():
    """Health check"""
    return {
        "status": "online",
        "app": "WestBetPro Admin API",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health_check():
    """
    Health check endpoint
    Verify database connection
    """
    try:
        from db import get_client
        db = get_client()

        # Test connection
        success = db.test_connection()

        return {
            "status": "healthy" if success else "unhealthy",
            "database": "connected" if success else "disconnected"
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # Auto-reload on code changes
    )
