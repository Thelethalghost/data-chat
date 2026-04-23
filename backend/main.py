from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from anthropic import Anthropic
from dotenv import load_dotenv
import os
import json
import uuid

load_dotenv()

app = FastAPI(title="AskCN API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))

# ─────────────────────────────────────────────
# SESSION STORE — in-memory, no Redis needed
# ─────────────────────────────────────────────
sessions: dict = {}

# ─────────────────────────────────────────────
# DATABASE LAYER
# Swap execute_query() for real Oracle later.
# Everything else stays identical.
# ─────────────────────────────────────────────

def execute_query(sql: str) -> list[dict]:
    """
    RIGHT NOW: returns mock data for development.
    ON HACKATHON DAY: replace with Oracle connection.

    To switch to Oracle, replace this entire function with:

        import oracledb
        conn = oracledb.connect(
            user=os.getenv("ORACLE_USER"),
            password=os.getenv("ORACLE_PASS"),
            dsn=os.getenv("ORACLE_DSN")
        )
        cursor = conn.cursor()
        cursor.execute(sql)
        cols = [d[0] for d in cursor.description]
        rows = cursor.fetchall()
        return [dict(zip(cols, row)) for row in rows]
    """
    sql_lower = sql.lower().strip()

    # Mock data responses keyed by query pattern
    if "outstanding" in sql_lower and "sum" in sql_lower:
        return [{"TOTAL_OUTSTANDING": 284750000}]

    if "agent" in sql_lower and ("recovery" in sql_lower or "rate" in sql_lower):
        return [
            {"AGENT_NAME": "Priya Sharma",    "RECOVERY_RATE": 78.4, "ACCOUNTS": 142},
            {"AGENT_NAME": "Arjun Mehta",     "RECOVERY_RATE": 71.2, "ACCOUNTS": 138},
            {"AGENT_NAME": "Kavya Reddy",     "RECOVERY_RATE": 65.8, "ACCOUNTS": 155},
            {"AGENT_NAME": "Rahul Kumar",     "RECOVERY_RATE": 61.3, "ACCOUNTS": 129},
            {"AGENT_NAME": "Sneha Patel",     "RECOVERY_RATE": 58.9, "ACCOUNTS": 167},
            {"AGENT_NAME": "Vikram Singh",    "RECOVERY_RATE": 55.1, "ACCOUNTS": 143},
            {"AGENT_NAME": "Anjali Nair",     "RECOVERY_RATE": 52.6, "ACCOUNTS": 158},
            {"AGENT_NAME": "Deepak Joshi",    "RECOVERY_RATE": 49.8, "ACCOUNTS": 134},
            {"AGENT_NAME": "Meera Iyer",      "RECOVERY_RATE": 46.2, "ACCOUNTS": 147},
            {"AGENT_NAME": "Suresh Babu",     "RECOVERY_RATE": 43.7, "ACCOUNTS": 162},
        ]

    if "dpd" in sql_lower and ("60" in sql_lower or "90" in sql_lower):
        return [
            {"DPD_BUCKET": "1-30",   "ACCOUNT_COUNT": 8420, "OUTSTANDING": 42100000},
            {"DPD_BUCKET": "31-60",  "ACCOUNT_COUNT": 4230, "OUTSTANDING": 31750000},
            {"DPD_BUCKET": "61-90",  "ACCOUNT_COUNT": 2180, "OUTSTANDING": 21800000},
            {"DPD_BUCKET": "91-180", "ACCOUNT_COUNT": 1450, "OUTSTANDING": 18125000},
            {"DPD_BUCKET": "180+",   "ACCOUNT_COUNT": 890,  "OUTSTANDING": 14240000},
        ]

    if "ptp" in sql_lower and ("conversion" in sql_lower or "rate" in sql_lower or "fulfil" in sql_lower):
        return [
            {"PRODUCT_TYPE": "Personal Loan",  "PTP_RATE": 68.4, "FULFILLED": 1820, "TOTAL": 2660},
            {"PRODUCT_TYPE": "Business Loan",  "PTP_RATE": 54.2, "FULFILLED": 867,  "TOTAL": 1600},
            {"PRODUCT_TYPE": "Credit Card",    "PTP_RATE": 71.8, "FULFILLED": 2154, "TOTAL": 2999},
            {"PRODUCT_TYPE": "Auto Loan",      "PTP_RATE": 62.1, "FULFILLED": 540,  "TOTAL": 870},
        ]

    if "roll" in sql_lower or ("bucket" in sql_lower and "month" in sql_lower):
        return [
            {"MONTH": "Aug 2025", "ROLL_RATE_30_60": 18.2, "ROLL_RATE_60_90": 12.4, "ROLL_RATE_90_PLUS": 8.1},
            {"MONTH": "Sep 2025", "ROLL_RATE_30_60": 19.8, "ROLL_RATE_60_90": 13.1, "ROLL_RATE_90_PLUS": 8.9},
            {"MONTH": "Oct 2025", "ROLL_RATE_30_60": 21.3, "ROLL_RATE_60_90": 14.7, "ROLL_RATE_90_PLUS": 9.6},
        ]

    if "channel" in sql_lower and ("recovery" in sql_lower or "outstanding" in sql_lower):
        return [
            {"CHANNEL": "Phone Call",  "RECOVERY_AMT": 48200000, "CONTACTS": 12400},
            {"CHANNEL": "WhatsApp",    "RECOVERY_AMT": 31500000, "CONTACTS": 18700},
            {"CHANNEL": "SMS",         "RECOVERY_AMT": 12800000, "CONTACTS": 34200},
            {"CHANNEL": "Email",       "RECOVERY_AMT": 8400000,  "CONTACTS": 9800},
            {"CHANNEL": "Field Visit", "RECOVERY_AMT": 22100000, "CONTACTS": 3200},
        ]

    if "count" in sql_lower or "how many" in sql_lower:
        return [{"TOTAL_ACCOUNTS": 17140}]

    # Default fallback
    return [{"MESSAGE": "Query executed", "ROWS": 0}]


# ─────────────────────────────────────────────
# SYSTEM PROMPT — the most important text in the project
# ─────────────────────────────────────────────

SYSTEM_PROMPT = """You are AskCN, an AI analyst for CreditNirvana's collections portfolio.
You convert natural language questions into Oracle SQL queries and explain the results clearly.

## DATABASE: Oracle 19c — CN_PROD schema

### TABLES

CN_PROD.ACCOUNTS
- ACCOUNT_ID        VARCHAR2(20)  PK
- BORROWER_NAME     VARCHAR2(100)
- PRODUCT_TYPE      VARCHAR2(30)   -- 'Personal Loan','Business Loan','Credit Card','Auto Loan'
- OUTSTANDING_AMT   NUMBER(15,2)
- DPD               NUMBER(4)      -- Days Past Due
- DPD_BUCKET        VARCHAR2(20)   -- '1-30','31-60','61-90','91-180','180+'
- ASSIGNED_AGENT_ID VARCHAR2(20)   FK → CN_PROD.AGENTS.AGENT_ID
- LENDER_ID         VARCHAR2(20)   FK → CN_PROD.LENDERS.LENDER_ID
- STATE             VARCHAR2(30)
- CREATED_DATE      DATE

CN_PROD.AGENTS
- AGENT_ID          VARCHAR2(20)  PK
- AGENT_NAME        VARCHAR2(100)
- TEAM_ID           VARCHAR2(20)
- BUCKET_SPECIALTY  VARCHAR2(20)

CN_PROD.CONTACTS
- CONTACT_ID        VARCHAR2(20)  PK
- ACCOUNT_ID        VARCHAR2(20)  FK → CN_PROD.ACCOUNTS.ACCOUNT_ID
- AGENT_ID          VARCHAR2(20)  FK → CN_PROD.AGENTS.AGENT_ID
- CONTACT_DATE      DATE
- CHANNEL           VARCHAR2(20)  -- 'Phone Call','WhatsApp','SMS','Email','Field Visit'
- OUTCOME           VARCHAR2(30)  -- 'PTP','Paid','No Answer','Refused','Callback'
- CONTACT_MONTH     VARCHAR2(7)   -- 'YYYY-MM'

CN_PROD.PAYMENTS
- PAYMENT_ID        VARCHAR2(20)  PK
- ACCOUNT_ID        VARCHAR2(20)  FK → CN_PROD.ACCOUNTS.ACCOUNT_ID
- PAYMENT_DATE      DATE
- PAYMENT_AMT       NUMBER(15,2)
- PAYMENT_MODE      VARCHAR2(20)

CN_PROD.PTPS
- PTP_ID            VARCHAR2(20)  PK
- ACCOUNT_ID        VARCHAR2(20)  FK → CN_PROD.ACCOUNTS.ACCOUNT_ID
- AGENT_ID          VARCHAR2(20)  FK → CN_PROD.AGENTS.AGENT_ID
- PTP_DATE          DATE
- PTP_AMT           NUMBER(15,2)
- STATUS            VARCHAR2(20)  -- 'Fulfilled','Broken','Pending'

CN_PROD.LENDERS
- LENDER_ID         VARCHAR2(20)  PK
- LENDER_NAME       VARCHAR2(100)

## ORACLE SYNTAX RULES — NEVER DEVIATE
1. Row limiting: FETCH FIRST N ROWS ONLY — never use LIMIT
2. Dates: SYSDATE, TRUNC(), ADD_MONTHS(), TO_DATE('YYYY-MM-DD','YYYY-MM-DD')
3. NULL handling: NVL(col, 0) — never IFNULL or ISNULL
4. Current month: TRUNC(SYSDATE,'MM')
5. Last N months: contact_date >= ADD_MONTHS(TRUNC(SYSDATE,'MM'), -N)
6. Always prefix tables: CN_PROD.ACCOUNTS not just ACCOUNTS
7. String concat: use || operator
8. No BOOLEAN type — use NUMBER(1) with 0/1

## DOMAIN GLOSSARY
- DPD: Days Past Due — higher = worse delinquency
- PTP: Promise to Pay — borrower commits to pay by a date
- Roll rate: % of accounts moving to a worse DPD bucket month over month
- Recovery rate: amount recovered / total outstanding × 100
- Bucket: DPD range grouping (1-30, 31-60, 61-90, 91-180, 180+)

## RESPONSE FORMAT — always return valid JSON, nothing else
{
  "sql": "SELECT ... FROM CN_PROD.TABLE ...",
  "chart_type": "bar",
  "explanation": "Plain English explanation of what this shows",
  "insight": "One sentence of what's most interesting about this result"
}

chart_type options: "bar" | "line" | "pie" | "table" | "single_value" | "none"
- bar: rankings, comparisons, top-N
- line: trends over time, roll rates
- pie: breakdowns by category (max 6 slices)
- table: detailed lists with many columns
- single_value: one number answer
- none: question needs clarification or data unavailable

## HALLUCINATION RULE — CRITICAL
If the question asks for data NOT in the schema above, return:
{
  "sql": null,
  "chart_type": "none",
  "explanation": "I don't have [X] in the database. I can show [alternative] instead — would you like that?",
  "insight": null
}
NEVER invent column names, table names, or data that isn't in the schema.

## MULTI-TURN CONTEXT
The conversation history is provided. When user says "now filter by X" or "compare that to Y",
apply the filter to the previous query context. Always maintain the active filters.
"""


# ─────────────────────────────────────────────
# REQUEST / RESPONSE MODELS
# ─────────────────────────────────────────────

class QueryRequest(BaseModel):
    message: str
    session_id: str | None = None

class QueryResponse(BaseModel):
    session_id: str
    sql: str | None
    chart_type: str
    explanation: str
    insight: str | None
    data: list[dict]
    columns: list[str]
    row_count: int


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    # Create or retrieve session
    session_id = req.session_id or str(uuid.uuid4())
    if session_id not in sessions:
        sessions[session_id] = []

    history = sessions[session_id]

    # Build messages for Claude — last 6 turns max to stay within context
    messages = history[-6:] + [{"role": "user", "content": req.message}]

    # Call Claude
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            system=SYSTEM_PROMPT,
            messages=messages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claude API error: {str(e)}")

    raw = response.content[0].text.strip()

    # Parse JSON response from Claude
    try:
        # Strip markdown code fences if Claude added them
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw.strip())
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"Claude returned invalid JSON: {raw}")

    sql        = parsed.get("sql")
    chart_type = parsed.get("chart_type", "none")
    explanation= parsed.get("explanation", "")
    insight    = parsed.get("insight")

    # Execute SQL if we got one
    data = []
    columns = []
    if sql:
        try:
            data = execute_query(sql)
            columns = list(data[0].keys()) if data else []
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

    # Save to session history
    sessions[session_id].append({"role": "user",      "content": req.message})
    sessions[session_id].append({"role": "assistant",  "content": raw})

    return QueryResponse(
        session_id=session_id,
        sql=sql,
        chart_type=chart_type,
        explanation=explanation,
        insight=insight,
        data=data,
        columns=columns,
        row_count=len(data)
    )


@app.post("/reset")
def reset(req: dict):
    session_id = req.get("session_id")
    if session_id and session_id in sessions:
        sessions[session_id] = []
    return {"status": "reset", "session_id": session_id}


@app.get("/schema")
def schema():
    """Returns table names and columns — useful for frontend to show schema hints"""
    return {
        "tables": [
            {"name": "CN_PROD.ACCOUNTS",  "columns": ["ACCOUNT_ID","BORROWER_NAME","PRODUCT_TYPE","OUTSTANDING_AMT","DPD","DPD_BUCKET","ASSIGNED_AGENT_ID","LENDER_ID","STATE"]},
            {"name": "CN_PROD.AGENTS",    "columns": ["AGENT_ID","AGENT_NAME","TEAM_ID","BUCKET_SPECIALTY"]},
            {"name": "CN_PROD.CONTACTS",  "columns": ["CONTACT_ID","ACCOUNT_ID","AGENT_ID","CONTACT_DATE","CHANNEL","OUTCOME"]},
            {"name": "CN_PROD.PAYMENTS",  "columns": ["PAYMENT_ID","ACCOUNT_ID","PAYMENT_DATE","PAYMENT_AMT","PAYMENT_MODE"]},
            {"name": "CN_PROD.PTPS",      "columns": ["PTP_ID","ACCOUNT_ID","AGENT_ID","PTP_DATE","PTP_AMT","STATUS"]},
            {"name": "CN_PROD.LENDERS",   "columns": ["LENDER_ID","LENDER_NAME"]},
        ]
    }