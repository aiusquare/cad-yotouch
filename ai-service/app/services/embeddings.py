import numpy as np


async def generate_face_embedding(image_bytes: bytes) -> list[float]:
    # Placeholder until ONNX ArcFace graph is wired in
    rng = np.random.default_rng()
    return rng.random(512).astype(float).tolist()
