import os
import re
import json
import logging
import httpx
from datetime import datetime
from executor import run_query
from schema_linking import get_relevant_tables, format_schema_for_prompt
from schema_context import format_lookup_cache
from examples import get_examples

logger = logging.getLogger(__name__)

LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
SQL_LOG_FILE = os.path.join(LOG_DIR, "sql_queries.log")

BEDROCK_API_KEY = os.getenv("BEDROCK_API_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
MODEL = os.getenv("ANTHROPIC_MODEL", "global.anthropic.claude-sonnet-4-6")
MAX_RETRIES = 3

INSIGHT_KEYWORDS = [
    "surprising",
    "unusual",
    "anomaly",
    "pattern",
    "where are we losing",
    "losing maximum",
    "money on the table",
    "suddenly dropped",
    "suddenly increased",
    "changed drastically",
    "most interesting",
    "deteriorating",
    "most at risk",
    "unexpected",
    "stands out",
]

FEW_SHOT_EXAMPLES = """
EXAMPLE 1 - Active accounts
User: How many active accounts are there currently?
SQL:
SELECT COUNT(*) AS active_account_count
FROM CN_CORE.ACCOUNT
WHERE RECORD_STATUS = 1 AND ACCOUNT_STATUS_ID = 1

EXAMPLE 2 - DPD range using DPD column directly (DELINQUENCY_BUCKET_CODE may be NULL)
User: How many accounts are in 30-60 DPD?
SQL:
SELECT COUNT(*) AS account_count
FROM CN_CORE.ACCOUNT
WHERE RECORD_STATUS = 1 AND DPD >= 30 AND DPD <= 60

EXAMPLE 3 - 90+ DPD
User: How many accounts are in 90+ DPD?
SQL:
SELECT COUNT(*) AS account_count
FROM CN_CORE.ACCOUNT
WHERE RECORD_STATUS = 1 AND DPD >= 90

EXAMPLE 4 - DPD distribution grouped
User: Show accounts grouped by DPD and product
SQL:
SELECT pt.PRODUCT_NAME,
       CASE
           WHEN a.DPD = 0 THEN 'Current'
           WHEN a.DPD BETWEEN 1 AND 30 THEN '1-30 DPD'
           WHEN a.DPD BETWEEN 31 AND 60 THEN '31-60 DPD'
           WHEN a.DPD BETWEEN 61 AND 90 THEN '61-90 DPD'
           WHEN a.DPD > 90 THEN '90+ DPD'
       END AS dpd_bucket,
       COUNT(*) AS account_count,
       SUM(a.TOTAL_OUTSTANDING_AMOUNT) AS total_outstanding
FROM CN_CORE.ACCOUNT a
LEFT JOIN CN_CORE.PRODUCT_TYPE pt ON a.PRODUCT_CODE = pt.PRODUCT_CODE
WHERE a.RECORD_STATUS = 1
GROUP BY pt.PRODUCT_NAME,
         CASE WHEN a.DPD = 0 THEN 'Current' WHEN a.DPD BETWEEN 1 AND 30 THEN '1-30 DPD' WHEN a.DPD BETWEEN 31 AND 60 THEN '31-60 DPD' WHEN a.DPD BETWEEN 61 AND 90 THEN '61-90 DPD' WHEN a.DPD > 90 THEN '90+ DPD' END
ORDER BY pt.PRODUCT_NAME, MIN(a.DPD)

EXAMPLE 5 - Top agents by recovery rate
User: Show top 5 agents by recovery rate
SQL:
SELECT u.FIRST_NAME || ' ' || u.LAST_NAME AS agent_name,
       COUNT(DISTINCT cc.ACCOUNT_ID) AS accounts_handled,
       SUM(cc.COLLECTED_AMOUNT) AS total_collected,
       SUM(cc.PRINCIPAL_OUTSTANDING_AMOUNT) AS total_principal,
       ROUND(SUM(cc.COLLECTED_AMOUNT) / NULLIF(SUM(cc.PRINCIPAL_OUTSTANDING_AMOUNT), 0) * 100, 2) AS recovery_rate_pct
FROM CN_CORE.COLLECTION_CASE cc
LEFT JOIN UAMDB.USERS u ON cc.ALLOCATED_COLLECTION_USER_ID = u.USER_ID
GROUP BY u.FIRST_NAME, u.LAST_NAME, u.USER_NAME
ORDER BY recovery_rate_pct DESC
LIMIT 5

EXAMPLE 6 - Product comparison
User: Compare outstanding by product
SQL:
SELECT pt.PRODUCT_NAME,
       COUNT(a.ID) AS account_count,
       SUM(a.TOTAL_OUTSTANDING_AMOUNT) AS total_outstanding,
       AVG(a.DPD) AS avg_dpd
FROM CN_CORE.ACCOUNT a
LEFT JOIN CN_CORE.PRODUCT_TYPE pt ON a.PRODUCT_CODE = pt.PRODUCT_CODE
WHERE a.RECORD_STATUS = 1
GROUP BY pt.PRODUCT_NAME
ORDER BY total_outstanding DESC

EXAMPLE 7 - Roll rate trend using latest available data not CURRENT_DATE
User: Roll rates over last 3 months
SQL:
SELECT pt.PRODUCT_NAME, cc.CASE_YEAR, cc.CASE_MONTH,
       COUNT(CASE WHEN cc.RESOLUTION_STATUS = 'RF' THEN 1 END) AS roll_forward_count,
       COUNT(*) AS total_cases,
       ROUND(COUNT(CASE WHEN cc.RESOLUTION_STATUS = 'RF' THEN 1 END) / NULLIF(COUNT(*), 0) * 100, 2) AS roll_rate_pct
FROM CN_CORE.COLLECTION_CASE cc
LEFT JOIN CN_CORE.ACCOUNT a ON cc.ACCOUNT_ID = a.ID
LEFT JOIN CN_CORE.PRODUCT_TYPE pt ON a.PRODUCT_CODE = pt.PRODUCT_CODE
WHERE (cc.CASE_YEAR * 100 + cc.CASE_MONTH) >= (SELECT MAX(CASE_YEAR * 100 + CASE_MONTH) - 3 FROM CN_CORE.COLLECTION_CASE)
GROUP BY pt.PRODUCT_NAME, cc.CASE_YEAR, cc.CASE_MONTH
ORDER BY pt.PRODUCT_NAME, cc.CASE_YEAR, cc.CASE_MONTH

EXAMPLE 8 - Total outstanding
User: Total outstanding in portfolio
SQL:
SELECT SUM(TOTAL_OUTSTANDING_AMOUNT) AS total_outstanding_amount
FROM CN_CORE.ACCOUNT WHERE RECORD_STATUS = 1

EXAMPLE 9 - Collections by branch
User: Show collections by branch
SQL:
SELECT a.BRANCH_CODE,
       COUNT(DISTINCT cc.ACCOUNT_ID) AS accounts,
       SUM(cc.COLLECTED_AMOUNT) AS total_collected,
       ROUND(SUM(cc.COLLECTED_AMOUNT) / NULLIF(SUM(cc.PRINCIPAL_OUTSTANDING_AMOUNT), 0) * 100, 2) AS recovery_rate_pct
FROM CN_CORE.COLLECTION_CASE cc
LEFT JOIN CN_CORE.ACCOUNT a ON cc.ACCOUNT_ID = a.ID
GROUP BY a.BRANCH_CODE
ORDER BY total_collected DESC

EXAMPLE 10 - Bank wise recovery
User: Bank-wise recovery performance
SQL:
SELECT a.LENDER_NAME,
       COUNT(DISTINCT cc.ACCOUNT_ID) AS accounts,
       SUM(cc.COLLECTED_AMOUNT) AS total_collected,
       ROUND(SUM(cc.COLLECTED_AMOUNT) / NULLIF(SUM(cc.PRINCIPAL_OUTSTANDING_AMOUNT), 0) * 100, 2) AS recovery_rate_pct
FROM CN_CORE.COLLECTION_CASE cc
LEFT JOIN CN_CORE.ACCOUNT a ON cc.ACCOUNT_ID = a.ID
GROUP BY a.LENDER_NAME
ORDER BY total_collected DESC

EXAMPLE 11 - No payments in 90 days
User: Accounts with no payments in last 90 days
SQL:
SELECT a.ACCOUNT_NUMBER, a.PRODUCT_CODE, a.DPD,
       a.TOTAL_OUTSTANDING_AMOUNT, a.LAST_PAYMENT_RECEIVED_DATE
FROM CN_CORE.ACCOUNT a
WHERE a.RECORD_STATUS = 1
AND (a.LAST_PAYMENT_RECEIVED_DATE IS NULL OR a.LAST_PAYMENT_RECEIVED_DATE < CURRENT_DATE - 90)
ORDER BY a.TOTAL_OUTSTANDING_AMOUNT DESC
LIMIT 100

EXAMPLE 12 - Above/below threshold
User: Compare recovery above and below 5 lakh
SQL:
SELECT CASE WHEN cc.PRINCIPAL_OUTSTANDING_AMOUNT >= 500000 THEN 'Above 5 Lakh' ELSE 'Below 5 Lakh' END AS band,
       COUNT(DISTINCT cc.ACCOUNT_ID) AS accounts,
       SUM(cc.COLLECTED_AMOUNT) AS total_collected,
       ROUND(SUM(cc.COLLECTED_AMOUNT) / NULLIF(SUM(cc.PRINCIPAL_OUTSTANDING_AMOUNT), 0) * 100, 2) AS recovery_rate_pct
FROM CN_CORE.COLLECTION_CASE cc
GROUP BY CASE WHEN cc.PRINCIPAL_OUTSTANDING_AMOUNT >= 500000 THEN 'Above 5 Lakh' ELSE 'Below 5 Lakh' END

EXAMPLE 13 - Segment defaults
User: Which segment contributes most to defaults?
SQL:
SELECT pt.PRODUCT_NAME,
       COUNT(a.ID) AS total_accounts,
       SUM(CASE WHEN a.NPA_FLAG = 'Y' THEN 1 ELSE 0 END) AS npa_accounts,
       ROUND(SUM(CASE WHEN a.NPA_FLAG = 'Y' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.ID), 0) * 100, 2) AS npa_rate_pct
FROM CN_CORE.ACCOUNT a
LEFT JOIN CN_CORE.PRODUCT_TYPE pt ON a.PRODUCT_CODE = pt.PRODUCT_CODE
WHERE a.RECORD_STATUS = 1
GROUP BY pt.PRODUCT_NAME
ORDER BY npa_rate_pct DESC

EXAMPLE 14 - Ambiguous - make assumption
User: Show me bad accounts
-- Interpreted as: accounts with DPD > 90 or NPA
SQL:
SELECT a.ACCOUNT_NUMBER, a.PRODUCT_CODE, a.DPD,
       a.TOTAL_OUTSTANDING_AMOUNT, a.NPA_FLAG, a.TOTAL_OVERDUE_AMOUNT
FROM CN_CORE.ACCOUNT a
WHERE a.RECORD_STATUS = 1
AND (a.DPD > 90 OR a.NPA_FLAG = 'Y')
ORDER BY a.DPD DESC, a.TOTAL_OUTSTANDING_AMOUNT DESC
LIMIT 100

EXAMPLE 15 - Decline with alternative
User: What is our fraud rate?
CLARIFICATION: I don't have fraud labels in the database. I can show NPA accounts or accounts flagged for review instead. Would you like to see those?
"""

SYSTEM_PROMPT = """You are AskCN, a PostgreSQL SQL generator for a collections management system.

RULES:
1. Only SELECT statements. Never INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, MERGE.
2. Always fully qualify table names: cn_core.account not just account.
3. Always LEFT JOIN for cn_core <-> uamdb joins. No enforced foreign keys.
4. record_status = 1 filters soft-deleted records. Apply based on context.
5. account_status_id: 1=Active 2=Inactive 3=Closed. Only filter when query asks for specific status.
6. For DPD range queries use dpd column directly e.g. dpd >= 30 AND dpd <= 60. delinquency_bucket_code may be NULL.
7. collection_case has multiple rows per account. Always SUM/aggregate to avoid double counting.
8. Recovery rate = SUM(collected_amount) / NULLIF(SUM(principal_outstanding_amount), 0).
9. Use LIMIT N not FETCH FIRST. Use CURRENT_DATE not SYSDATE. Use COALESCE not NVL.
10. Use || for string concat. Use EXTRACT(YEAR FROM date) for year.
11. For time queries use latest available data via subquery. Do NOT assume current month has data.
12. For branch queries use branch_code from cn_core.account.
13. For bank-wise queries use lender_name from cn_core.account.
14. For region queries there is no region column. Use branch_code as proxy.
15. If data not in schema respond CLARIFICATION: and suggest what you CAN show.
16. For ambiguous queries make a reasonable assumption, add -- Interpreted as: comment, and attempt the query.
17. Respond in same language as user.

RESPONSE FORMAT:
- SQL only with optional -- Interpreted as: comment. No markdown, no backticks.
- CLARIFICATION: message if data unavailable. Always suggest alternative.
"""


INSIGHT_SQL_PROMPT = """You are a PostgreSQL SQL generator for a collections management system.
Generate targeted analytical SQL returning aggregated comparative data.

RULES:
- Fully qualify all table names: cn_core.account not account
- LEFT JOIN for cross-schema joins
- Use dpd column directly for DPD ranges
- Recovery rate = SUM(collected_amount) / NULLIF(SUM(principal_outstanding_amount), 0)
- Use LIMIT N not FETCH FIRST
- Use CURRENT_DATE not CURRENT_DATE, COALESCE not NVL
- Always prefix columns with table alias
- Keep result under 50 rows
- Return SQL only. No markdown.
"""


INSIGHT_ANALYSIS_PROMPT = """You are a collections portfolio analytics expert.
Analyse the data and answer the question with a specific insight.
State actual numbers, product names, time periods from the data.
3-5 sentences. No preamble like "based on the data".
Respond in same language as the question.
"""


async def _call_bedrock(system: str, user_prompt: str, max_tokens: int = 1000) -> str:
    url = f"https://bedrock-runtime.{AWS_REGION}.amazonaws.com/model/{MODEL}/invoke"
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "system": system,
        "messages": [
            {"role": "user", "content": [{"type": "text", "text": user_prompt}]}
        ],
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {BEDROCK_API_KEY}",
            },
            json=body,
        )
    response.raise_for_status()
    return response.json()["content"][0]["text"]


def _log_sql(query: str, sql: str, query_type: str = "STANDARD"):
    try:
        with open(SQL_LOG_FILE, "a") as f:
            ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            f.write(
                f"\n{'=' * 60}\n[{ts}] [{query_type}]\nUSER: {query}\nSQL:\n{sql}\n"
            )
    except Exception as e:
        logger.warning("SQL logging failed: %s", e)


def _build_prompt(query: str, history: list, language: str) -> str:
    schema_str = format_schema_for_prompt(get_relevant_tables(query))
    lookup_str = format_lookup_cache()
    history_str = ""
    if history:
        history_str = "\nCONVERSATION HISTORY:\n"
        for i, turn in enumerate(history[-5:], 1):
            history_str += (
                f"Turn {i}: User asked: {turn['query']}\n  SQL: {turn['sql']}\n"
            )
            if turn.get("columns"):
                history_str += f"  Columns: {', '.join(turn['columns'])}\n"
    lang = (
        "\nUser is asking in Hindi. Write CLARIFICATION in Hindi.\n"
        if language == "hi"
        else ""
    )
    return f"{schema_str}\n\n{lookup_str}\n\n{history_str}\n{lang}\nEXAMPLES:\n{get_examples(query)}\n\nGenerate PostgreSQL SQL for:\n{query}"


def _extract_sql(text: str) -> tuple[str | None, str | None]:
    text = text.strip()
    if text.upper().startswith("CLARIFICATION:"):
        return None, text[len("CLARIFICATION:") :].strip()
    text = re.sub(r"```sql\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"```\s*", "", text).strip()
    if not any(l.strip().upper().startswith("SELECT") for l in text.split("\n")):
        return None, "I wasn't able to generate a valid query. Could you rephrase?"
    return text, None


def _is_insight(query: str) -> bool:
    return any(kw in query.lower() for kw in INSIGHT_KEYWORDS)


async def generate_sql(query: str, history: list) -> dict:
    language = _detect_language(query)
    if _is_insight(query):
        return await _generate_insight(query, history, language)

    prompt = _build_prompt(query, history, language)
    last_error = None
    current_sql = None

    for attempt in range(MAX_RETRIES):
        retry_prompt = (
            prompt
            if attempt == 0
            else (
                f"{prompt}\n\nPrevious SQL failed:\nERROR: {last_error}\nSQL: {current_sql}\n\nFix and return corrected SQL only."
            )
        )
        try:
            response_text = await _call_bedrock(SYSTEM_PROMPT, retry_prompt)
        except Exception as e:
            logger.error("Bedrock error: %s", e)
            raise

        sql, clarification = _extract_sql(response_text)
        if clarification:
            return {
                "sql": None,
                "clarification": clarification,
                "complexity": "simple",
                "insight_data": None,
            }

        current_sql = sql
        try:
            await run_query(sql)
            _log_sql(query, sql)
            return {
                "sql": sql,
                "clarification": None,
                "complexity": _classify(sql),
                "insight_data": None,
            }
        except TimeoutError:
            raise
        except Exception as e:
            last_error = str(e)
            logger.warning("Attempt %d failed: %s", attempt + 1, last_error)

    return {
        "sql": None,
        "clarification": f"Query failed after {MAX_RETRIES} attempts. Last error: {last_error}.",
        "complexity": "simple",
        "insight_data": None,
    }


async def _generate_insight(query: str, history: list, language: str) -> dict:
    schema_str = format_schema_for_prompt(get_relevant_tables(query))
    lookup_str = format_lookup_cache()
    sql_prompt = f"{schema_str}\n\n{lookup_str}\n\nGenerate analytical SQL for:\n{query}\n\nReturn aggregated data. Max 50 rows."

    try:
        sql_response = await _call_bedrock(
            INSIGHT_SQL_PROMPT, sql_prompt, max_tokens=800
        )
    except Exception as e:
        logger.error("Insight SQL failed: %s", e)
        raise

    sql, clarification = _extract_sql(sql_response)
    if clarification:
        return {
            "sql": None,
            "clarification": clarification,
            "complexity": "insight",
            "insight_data": None,
        }

    try:
        rows, columns = await run_query(sql)
        _log_sql(query, sql, "INSIGHT")
    except Exception as e:
        return {
            "sql": sql,
            "clarification": f"Analytical query failed: {str(e)}",
            "complexity": "insight",
            "insight_data": None,
        }

    if not rows:
        return {
            "sql": sql,
            "clarification": "Not enough data for a meaningful insight. Try a more specific question.",
            "complexity": "insight",
            "insight_data": None,
        }

    lang = "Respond in Hindi." if language == "hi" else "Respond in English."
    analysis_prompt = f"Question: {query}\n\nData ({len(rows)} rows):\n{json.dumps(rows[:30], default=str)}\n\n{lang}"

    try:
        narrative = await _call_bedrock(
            INSIGHT_ANALYSIS_PROMPT, analysis_prompt, max_tokens=400
        )
    except Exception:
        narrative = f"Query returned {len(rows)} rows but analysis failed."

    return {
        "sql": sql,
        "clarification": None,
        "complexity": "insight",
        "insight_data": {"rows": rows, "columns": columns, "narrative": narrative},
    }


async def narrate(query: str, rows: list, language: str, is_capped: bool = False) -> str:
    if not rows:
        try:
            lang = "Respond in Hindi." if language == "hi" else "Respond in English."
            prompt = f"User asked: {query}\nQuery returned no results.\nGive a helpful 1-2 sentence response and suggest one alternative. {lang}"
            return await _call_bedrock(
                "You are a helpful data analyst.", prompt, max_tokens=150
            )
        except Exception:
            return (
                "No data found. Try broadening the filters or a different time period."
            )

    if len(rows) == 1 and len(rows[0]) == 1:
        key = list(rows[0].keys())[0]
        return f"{key.replace('_', ' ').title()}: {_fmt(rows[0][key])}"

    lang = "Respond in Hindi." if language == "hi" else "Respond in English."
    cap_note = f" Results capped at {len(rows)} rows, there may be more data." if is_capped else ""
    prompt = f"User asked: {query}\n{len(rows)} rows returned.{cap_note} Sample: {rows[:10]}\nWrite 1-3 sentence summary with exact numbers. No SQL explanation. {lang}"
    try:
        return await _call_bedrock(
            "You are a helpful data analyst.", prompt, max_tokens=200
        )
    except Exception as e:
        logger.error("Narration failed: %s", e)
        return f"Query returned {len(rows)} results."


def _detect_language(query: str) -> str:
    return "hi" if any("\u0900" <= c <= "\u097f" for c in query) else "en"


def _classify(sql: str) -> str:
    s = sql.upper()
    if s.count("JOIN") >= 3 or s.count("SELECT") > 1 or "PARTITION BY" in s:
        return "complex"
    elif s.count("JOIN") >= 1 or "GROUP BY" in s:
        return "moderate"
    return "simple"


def _fmt(val) -> str:
    if isinstance(val, (int, float)):
        if val >= 10_000_000:
            return f"Rs {val / 10_000_000:.2f} Cr"
        elif val >= 100_000:
            return f"Rs {val / 100_000:.2f} L"
        return f"{val:,.2f}"
    return str(val)
