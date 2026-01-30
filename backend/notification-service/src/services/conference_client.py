import os
import httpx
from fastapi import HTTPException

CONFERENCE_SERVICE_URL = os.getenv(
    "CONFERENCE_SERVICE_URL",
    "http://conference-service:8000"
)

def get_conference(conference_id: int):
    url = f"{CONFERENCE_SERVICE_URL}/conferences/{conference_id}"

    try:
        response = httpx.get(url, timeout=5)
        response.raise_for_status()
        return response.json()

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail="Conference does not exist"
            )
        raise HTTPException(
            status_code=502,
            detail="Conference service error"
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Conference service unavailable"
        )
