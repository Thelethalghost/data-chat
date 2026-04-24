import json
import os
import logging

logger = logging.getLogger(__name__)

# In-memory session store — good enough for demo
# For production replace with Redis
_sessions: dict[str, list] = {}

SESSION_MAX_TURNS = 5
MAX_SESSIONS = 1000  # prevent memory leak


async def get_history(session_id: str) -> list:
    return _sessions.get(session_id, [])


async def save_turn(session_id: str, turn: dict) -> None:
    if session_id not in _sessions:
        # Evict oldest session if at capacity
        if len(_sessions) >= MAX_SESSIONS:
            oldest = next(iter(_sessions))
            del _sessions[oldest]
        _sessions[session_id] = []

    _sessions[session_id].append(turn)

    # Keep only last N turns
    if len(_sessions[session_id]) > SESSION_MAX_TURNS:
        _sessions[session_id] = _sessions[session_id][-SESSION_MAX_TURNS:]

    logger.debug("Session %s now has %d turns", session_id, len(_sessions[session_id]))
