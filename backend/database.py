import os
import asyncpg
from contextlib import asynccontextmanager
from schema_context import LOOKUP_CACHE

_pool = None


async def init_pool():
    global _pool
    _pool = await asyncpg.create_pool(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("DB_NAME", "askcn"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "pass"),
        min_size=2,
        max_size=10,
    )
    await _load_lookup_cache()


async def close_pool():
    if _pool:
        await _pool.close()


async def _load_lookup_cache():
    async with get_connection() as conn:
        rows = await conn.fetch("SELECT bucket_code, bucket_name, dpd_start, dpd_end FROM cn_core.delinquency_bucket ORDER BY dpd_start")
        LOOKUP_CACHE["delinquency_buckets"] = [{"bucket_code": r["bucket_code"], "bucket_name": r["bucket_name"], "dpd_start": r["dpd_start"], "dpd_end": r["dpd_end"]} for r in rows]

        rows = await conn.fetch("SELECT id, account_status_code FROM cn_core.account_status")
        LOOKUP_CACHE["account_statuses"] = [{"id": r["id"], "account_status_code": r["account_status_code"]} for r in rows]

        rows = await conn.fetch("SELECT resolution_status_code, resolution_status_name FROM cn_core.resolution_status")
        LOOKUP_CACHE["resolution_statuses"] = [{"resolution_status_code": r["resolution_status_code"], "resolution_status_name": r["resolution_status_name"]} for r in rows]


@asynccontextmanager
async def get_connection():
    async with _pool.acquire() as conn:
        yield conn
