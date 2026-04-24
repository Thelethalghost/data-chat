import os
import asyncio
from database import get_connection

MAX_ROWS = int(os.getenv("MAX_QUERY_ROWS", "500"))
TIMEOUT = int(os.getenv("SQL_TIMEOUT_SECONDS", "15"))


async def run_query(sql: str) -> tuple[list[dict], list[str]]:
    async with get_connection() as conn:
        try:
            rows = await asyncio.wait_for(conn.fetch(sql), timeout=TIMEOUT)
        except asyncio.TimeoutError:
            raise TimeoutError(f"Query exceeded {TIMEOUT}s limit")

        if not rows:
            return [], []

        columns = list(rows[0].keys())
        data = [dict(r) for r in rows[:MAX_ROWS]]
        return data, columns
