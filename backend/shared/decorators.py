# shared/decorators.py
from __future__ import annotations
import os
import json
import hashlib
import inspect
from functools import wraps
from typing import Any, Callable, Optional

from shared.cache.factory import get_cache

DEFAULT_TTL = int(os.getenv("CACHE_DEFAULT_TTL", "300"))

def _canonical(obj: Any) -> Any:
    """
    Chuyển obj sang dạng JSON-serializable ổn định để build cache key.
    - basic types giữ nguyên
    - dict -> sort keys
    - list/tuple -> list canonical
    - object lạ -> dùng str(obj)
    """
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, (list, tuple)):
        return [_canonical(x) for x in obj]
    if isinstance(obj, dict):
        return {str(k): _canonical(obj[k]) for k in sorted(obj.keys(), key=lambda x: str(x))}
    return str(obj)

def _make_key(
    func: Callable,
    args: tuple,
    kwargs: dict,
    *,
    key_prefix: str,
    include_self: bool
) -> str:
    # Nếu là method, thường args[0] là self -> bỏ để key ổn định (tránh repr memory address)
    if args and not include_self:
        # heuristic: object instance thường không phải primitive
        if not isinstance(args[0], (str, int, float, bool, dict, list, tuple, type(None))):
            args = args[1:]

    payload = {
        "fn": f"{func.__module__}.{func.__qualname__}",
        "args": _canonical(args),
        "kwargs": _canonical(kwargs),
    }
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()

    # key_prefix giúp phân loại theo domain/use-case
    # digest giúp key ngắn gọn
    return f"{key_prefix}:{digest}"

def cache(
    ttl: int = DEFAULT_TTL,
    key_prefix: Optional[str] = None,
    *,
    cache_none: bool = False,
    include_self: bool = False
):
    
    def decorator(func: Callable):
        if not inspect.iscoroutinefunction(func):
            raise TypeError("@cache chỉ dùng cho async function. (Bạn có thể bọc sync thành async hoặc tự mở rộng)")

        _prefix = (key_prefix or func.__name__).strip()

        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_client = get_cache()
            key = _make_key(func, args, kwargs, key_prefix=_prefix, include_self=include_self)

            cached = await cache_client.get(key)
            if cached is not None:
                return cached

            result = await func(*args, **kwargs)

            if result is None and not cache_none:
                return result

            await cache_client.set(key, result, ttl=int(ttl))
            return result

        return wrapper
    return decorator
