#CONCRETE STRATEGY (Memory)
# shared/cache/memory_backend.py
from __future__ import annotations
import time
import asyncio
from typing import Any, Optional, Dict, Tuple

from .base import BaseCache

class MemoryCache(BaseCache):
    """
    In-process cache (L1). Dùng tốt cho dev / fallback.
    TTL tính bằng giây.
    """
    def __init__(self, *, prefix: str = ""):
        self.prefix = prefix.strip()
        # key -> (value, expires_at)
        self._store: Dict[str, Tuple[Any, float]] = {}
        self._lock = asyncio.Lock()

    def _k(self, key: str) -> str:
        return f"{self.prefix}:{key}" if self.prefix else key

    async def get(self, key: str) -> Optional[Any]:
        k = self._k(key)
        now = time.time()
        async with self._lock:
            item = self._store.get(k)
            if item is None:
                return None
            value, expires_at = item
            if expires_at != 0 and now > expires_at:
                # expired
                self._store.pop(k, None)
                return None
            return value

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        k = self._k(key)
        expires_at = 0.0 if ttl <= 0 else (time.time() + float(ttl))
        async with self._lock:
            self._store[k] = (value, expires_at)

    async def delete(self, key: str) -> None:
        k = self._k(key)
        async with self._lock:
            self._store.pop(k, None)

    async def clear(self) -> None:
        async with self._lock:
            if not self.prefix:
                self._store.clear()
                return
            # clear theo prefix
            pref = f"{self.prefix}:"
            keys = [k for k in self._store.keys() if k.startswith(pref)]
            for k in keys:
                self._store.pop(k, None)
