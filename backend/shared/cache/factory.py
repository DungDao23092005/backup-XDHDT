# shared/cache/factory.py
from __future__ import annotations
import os
from typing import Optional

from .base import BaseCache
from .redis_backend import RedisCache
from .memory_backend import MemoryCache

class CacheFactory:
    """
    Factory + Singleton per-process.
    """
    _instance: Optional[BaseCache] = None

    @classmethod
    def get_instance(cls) -> BaseCache:
        if cls._instance is not None:
            return cls._instance

        cache_type = os.getenv("CACHE_TYPE", "redis").strip().lower()
        prefix = os.getenv("CACHE_PREFIX", "").strip()

        if cache_type == "memory":
            cls._instance = MemoryCache(prefix=prefix)
        else:
            # default redis
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            cls._instance = RedisCache(redis_url=redis_url, prefix=prefix)

        return cls._instance

def get_cache() -> BaseCache:
    return CacheFactory.get_instance()
