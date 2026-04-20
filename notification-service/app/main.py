from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.api.notifications import router as notif_router
from app.db.database import get_pool, close_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    yield
    await close_pool()


app = FastAPI(title="TaskFlow Notification Service", version="1.0.0", lifespan=lifespan)

app.include_router(notif_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "notification-service"}
