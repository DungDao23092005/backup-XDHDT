# shared/cache/redis_backend.py
from __future__ import annotations
import json
import os
import base64
import pickle
from typing import Any, Optional

import redis.asyncio as redis

from .base import BaseCache

def _dumps(value: Any) -> str:
    """
    Serialize value to a string safe for Redis.
    - Prefer JSON
    - Fallback pickle (base64) for non-JSON-serializable objects
    """
    try:
        payload = {"t": "json", "v": value}
        return json.dumps(payload, ensure_ascii=False, default=str)
    except Exception:
        b = pickle.dumps(value, protocol=pickle.HIGHEST_PROTOCOL)
        payload = {"t": "pkl", "v": base64.b64encode(b).decode("ascii")}
        return json.dumps(payload)

def _loads(raw: str) -> Any:
    payload = json.loads(raw)
    t = payload.get("t")
    v = payload.get("v")
    if t == "json":
        return v
    if t == "pkl":
        b = base64.b64decode(v.encode("ascii"))
        return pickle.loads(b)
    return v

class RedisCache(BaseCache):
    def __init__(self, redis_url: Optional[str] = None, *, prefix: str = ""):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.prefix = (prefix or os.getenv("CACHE_PREFIX", "")).strip()
        self._client: Optional[redis.Redis] = None

    def _k(self, key: str) -> str:
        return f"{self.prefix}:{key}" if self.prefix else key

    async def _get_client(self) -> redis.Redis:
        if self._client is None:
            # decode_responses=True => get/set string thay vì bytes
            self._client = redis.from_url(self.redis_url, decode_responses=True)
        return self._client

    async def get(self, key: str) -> Optional[Any]:
        client = await self._get_client()
        raw = await client.get(self._k(key))
        if raw is None:
            return None
        try:
            return _loads(raw)
        except Exception:
            # Nếu data cũ không đúng format, coi như miss
            return None

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        client = await self._get_client()
        raw = _dumps(value)
        # ex=ttl => TTL seconds
        await client.set(self._k(key), raw, ex=int(ttl))

    async def delete(self, key: str) -> None:
        client = await self._get_client()
        await client.delete(self._k(key))

    async def clear(self) -> None:
        """
        Clear theo prefix. Nếu không có prefix thì FLUSHDB (cẩn thận).
        """
        client = await self._get_client()
        if not self.prefix:
            await client.flushdb()
            return

        pattern = f"{self.prefix}:*"
        async for k in client.scan_iter(match=pattern, count=1000):
            await client.delete(k)

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None
