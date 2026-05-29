from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.database import engine, Base
from app.routers import auth, products, orders

# Automatically create tables on startup if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Chronos Timepieces API",
    description="Backend API services for the Chronos Timepieces luxury e-commerce application.",
    version="1.0.0"
)

# CORS middleware config (allows cross-origin requests for API development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)

# Mount frontend static files at root
# Path: '../frontend' because the app runs inside 'backend/app' folder or 'backend' root.
# Let's dynamically find the path relative to this main.py file to ensure robustness
current_dir = os.path.dirname(os.path.realpath(__file__))
frontend_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "frontend"))

# Ensure frontend dir exists so FastAPI doesn't crash on start
os.makedirs(frontend_dir, exist_ok=True)

# Mount static files at root
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")
