from pydantic import BaseModel
from typing import Any, Literal


class QueryRequest(BaseModel):
    session_id: str | None = None
    query: str
    language: Literal["en", "hi"] | None = None
    model: str | None = None


class ChartSpec(BaseModel):
    chart_type: Literal[
        "bar", "grouped_bar", "line", "pie", "histogram", "table", "none"
    ]
    title: str
    x_key: str | None = None
    y_keys: list[str] = []
    data: list[dict[str, Any]] = []


class QueryResponse(BaseModel):
    session_id: str
    answer: str
    sql: str | None = None
    rows_returned: int = 0
    chart: ChartSpec | None = None
    clarification_needed: bool = False
    language: str = "en"
    export_available: bool = False
    export_query: str | None = None


class SQLRequest(BaseModel):
    sql: str
    session_id: str | None = None
