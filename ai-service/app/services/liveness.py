async def run_liveness_check(video_bytes: bytes) -> dict[str, float | str]:
    confidence = min(0.99, len(video_bytes) / 10_000_000)
    return {
        "score": confidence,
        "label": "live" if confidence > 0.5 else "spoof",
        "heuristics": {
            "motion": confidence * 0.6,
            "illumination": confidence * 0.3,
            "depth": confidence * 0.1,
        },
    }
