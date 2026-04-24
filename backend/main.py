import os
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from ulid import ULID

from database import init_pool, close_pool, _pool
from schemas import QueryRequest, QueryResponse, SQLRequest
from executor import run_query
from visualisation import pick_chart
import sql_generator
import guardrail
import memory
from dashboard import router as dashboard_router
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
MAX_QUERY_ROWS = int(os.getenv("MAX_QUERY_ROWS", "500"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(title="AskCN", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(dashboard_router)


@app.get("/health")
async def health():
    return {"status": "ok", "db_pool": "connected" if _pool else "not initialised"}


@app.post("/query", response_model=QueryResponse)
async def handle_query(req: QueryRequest):
    session_id = req.session_id or str(ULID())
    language = req.language or "en"

    # Detect export intent
    q_lower = req.query.lower()
    csv_keywords = [
        "export",
        "download",
        "save as csv",
        "csv",
        "extract data",
        "give me the data",
        "export this",
        "download this",
    ]
    other_formats = [
        "excel",
        "xlsx",
        "xls",
        "pdf",
        "json export",
        "xml",
        "save as excel",
    ]
    is_export = any(kw in q_lower for kw in csv_keywords)
    is_other_format = any(kw in q_lower for kw in other_formats)

    history = await memory.get_history(session_id)

    # Unsupported format — decline gracefully
    if is_other_format and not is_export:
        return QueryResponse(
            session_id=session_id,
            answer="I currently only support CSV export. Would you like me to export this data as CSV instead?",
            clarification_needed=True,
            language=language,
        )

    # Strip export keywords from query, fall back to last history query
    clean_query = req.query
    for kw in csv_keywords:
        clean_query = clean_query.lower().replace(kw, "").strip()
    if not clean_query and history:
        clean_query = history[-1]["query"]
    elif not clean_query:
        clean_query = req.query

    gen = await sql_generator.generate_sql(
        clean_query if is_export else req.query, history, model=req.model
    )

    if gen.get("clarification"):
        return QueryResponse(
            session_id=session_id,
            answer=gen["clarification"],
            clarification_needed=True,
            language=language,
        )

    guard = await guardrail.check(req.query, gen["sql"])
    if not guard["passed"]:
        return QueryResponse(
            session_id=session_id,
            answer=guard["message"],
            clarification_needed=True,
            language=language,
        )

    if gen.get("insight_data"):
        insight = gen["insight_data"]
        rows, columns = insight["rows"], insight["columns"]
        chart = pick_chart(rows, columns, req.query)
        await memory.save_turn(
            session_id,
            {
                "query": req.query,
                "sql": gen["sql"],
                "rows": rows[:50],
                "columns": columns,
            },
        )
        return QueryResponse(
            session_id=session_id,
            answer=insight["narrative"],
            sql=gen["sql"],
            rows_returned=len(rows),
            chart=chart,
            language=language,
        )

    try:
        rows, columns = await run_query(gen["sql"])
    except TimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e))
    except Exception as e:
        logging.error("SQL execution failed: %s | SQL: %s", e, gen["sql"])
        raise HTTPException(status_code=500, detail="Query execution failed")

    # For export queries note it in the response — frontend handles download via /export
    if is_export and rows:
        export_hint = True
    else:
        export_hint = False

    chart = pick_chart(rows, columns, req.query)
    answer = await sql_generator.narrate(
        req.query, rows, language, len(rows) >= MAX_QUERY_ROWS, model=req.model
    )

    await memory.save_turn(
        session_id,
        {"query": req.query, "sql": gen["sql"], "rows": rows[:50], "columns": columns},
    )

    return QueryResponse(
        session_id=session_id,
        answer=answer,
        sql=gen["sql"],
        rows_returned=len(rows),
        chart=chart,
        language=language,
    )


@app.post("/export")
async def export_query(req: QueryRequest):
    import csv
    import io as _io
    from datetime import datetime as _dt

    session_id = req.session_id or str(ULID())
    language = req.language or "en"
    # Detect export intent
    q_lower = req.query.lower()
    csv_keywords = [
        "export",
        "download",
        "save as csv",
        "csv",
        "extract data",
        "give me the data",
        "export this",
        "download this",
    ]
    other_formats = [
        "excel",
        "xlsx",
        "xls",
        "pdf",
        "json export",
        "xml",
        "save as excel",
    ]
    is_export = any(kw in q_lower for kw in csv_keywords)
    is_other_format = any(kw in q_lower for kw in other_formats)

    history = await memory.get_history(session_id)

    # Unsupported format — decline gracefully
    if is_other_format and not is_export:
        return QueryResponse(
            session_id=session_id,
            answer="I currently only support CSV export. Would you like me to export this data as CSV instead?",
            clarification_needed=True,
            language=language,
        )

    # Strip export keywords from query, fall back to last history query
    clean_query = req.query
    for kw in csv_keywords:
        clean_query = clean_query.lower().replace(kw, "").strip()
    if not clean_query and history:
        clean_query = history[-1]["query"]
    elif not clean_query:
        clean_query = req.query

    gen = await sql_generator.generate_sql(
        clean_query if is_export else req.query, history, model=req.model
    )

    if gen.get("clarification"):
        raise HTTPException(status_code=400, detail=gen["clarification"])

    guard = await guardrail.check(req.query, gen["sql"])
    if not guard["passed"]:
        raise HTTPException(status_code=400, detail=guard["message"])

    if gen.get("insight_data"):
        rows = gen["insight_data"]["rows"]
        columns = gen["insight_data"]["columns"]
    else:
        try:
            rows, columns = await run_query(gen["sql"])
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    if not rows:
        raise HTTPException(status_code=404, detail="No data found for this query")

    buf = _io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=columns)
    writer.writeheader()
    writer.writerows(rows)

    filename = f"askcn_export_{_dt.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        _io.BytesIO(buf.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.post("/execute")
async def execute_sql(req: SQLRequest):
    session_id = req.session_id or str(ULID())

    guard = await guardrail.check("", req.sql)
    if not guard["passed"]:
        return QueryResponse(
            session_id=session_id,
            answer=guard["message"],
            clarification_needed=True,
            language="en",
        )

    try:
        rows, columns = await run_query(req.sql)
    except TimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    chart = pick_chart(rows, columns, "")
    answer = f"Query returned {len(rows)} rows." if rows else "No data found."
    if len(rows) == 1 and len(rows[0]) == 1:
        key = list(rows[0].keys())[0]
        val = rows[0][key]
        answer = f"{key.replace('_', ' ').title()}: {val}"

    return QueryResponse(
        session_id=session_id,
        answer=answer,
        sql=req.sql,
        rows_returned=len(rows),
        chart=chart,
        language="en",
    )
