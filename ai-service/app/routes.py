from fastapi import APIRouter, UploadFile

from .schemas import DetectionResponse, EmbeddingResponse
from .services.embeddings import generate_face_embedding
from .services.liveness import run_liveness_check

router = APIRouter()


@router.post("/embeddings", response_model=EmbeddingResponse)
async def embeddings(image: UploadFile):
    vector = await generate_face_embedding(await image.read())
    return EmbeddingResponse(vector=vector)


@router.post("/liveness", response_model=DetectionResponse)
async def liveness(video: UploadFile):
    verdict = await run_liveness_check(await video.read())
    return DetectionResponse(**verdict)
