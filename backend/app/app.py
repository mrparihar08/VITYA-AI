from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.database import engine
from api.models.vitya import Base
import os

from api.routes import users, income, expense, vitya,ai

app = FastAPI()

# Create tables
Base.metadata.create_all(bind=engine)

# Allowed origins
DEFAULT_ORIGINS = [
    "https://vitya-ai-re.onrender.com",
    "http://localhost:3000"
]

cors_origins = os.environ.get("CORS_ORIGINS")

if cors_origins:
    origins = [o.strip() for o in cors_origins.split(",") if o.strip()]
else:
    origins = DEFAULT_ORIGINS


# FastAPI CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(users.router)
app.include_router(income.router)
app.include_router(expense.router)
app.include_router(vitya.router)
app.include_router(ai.router)