from fastapi import FastAPI

from .routes import router

app = FastAPI(title="YoTouch AI Service", version="0.1.0")
app.include_router(router, prefix="/api")


@app.get("/health")
def health():  # pragma: no cover - trivial
    return {"status": "ok"}
