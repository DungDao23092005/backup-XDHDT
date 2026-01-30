# shared/cache/base.py
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, Optional

class BaseCache(ABC):
    """Strategy interface for cache backends."""

    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        ...

    @abstractmethod
    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        ...

    @abstractmethod
    async def delete(self, key: str) -> None:
        ...

    @abstractmethod
    async def clear(self) -> None:
        ...

    async def get_or_set(self, key: str, ttl: int, loader, *, cache_none: bool = False) -> Any:
        """
        Cache-Aside helper:
        - Try get from cache
        - If miss -> call loader() -> set -> return
        """
        cached = await self.get(key)
        if cached is not None:
            return cached

        value = await loader()
        if value is None and not cache_none:
            return value

        await self.set(key, value, ttl=ttl)
        return value
