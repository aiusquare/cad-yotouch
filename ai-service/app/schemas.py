from pydantic import BaseModel


class EmbeddingResponse(BaseModel):
    vector: list[float]


class DetectionResponse(BaseModel):
    score: float
    label: str
    heuristics: dict[str, float]
