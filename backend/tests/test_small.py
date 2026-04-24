"""
Quick test - 20 representative questions covering all categories.
Run: python test_quick.py
"""

import httpx
import json
import time
import asyncio

BASE_URL = "http://localhost:8001"

TESTS = [
    # Simple
    ("simple", "How many active accounts are there currently?"),
    ("simple", "How many accounts are in 30-60 DPD bucket?"),
    ("simple", "What is the total outstanding amount in the portfolio?"),
    ("simple", "What is the average outstanding per account?"),
    ("simple", "How many personal loan accounts do we have?"),
    # Moderate
    ("moderate", "Show top 5 agents by recovery rate"),
    ("moderate", "What is recovery rate by product category?"),
    ("moderate", "Show collections by branch"),
    ("moderate", "Show bank-wise recovery performance"),
    ("moderate", "Compare recovery above and below 5 lakh exposure"),
    # Complex
    (
        "complex",
        "Which product segments show increasing roll rates over last 3 months?",
    ),
    ("complex", "Identify accounts with no payments in last 90 days"),
    ("complex", "Which segment contributes most to defaults?"),
    ("complex", "Show accounts grouped by DPD and product"),
    # Insight
    ("insight", "Where are we losing maximum recoveries?"),
    ("insight", "Which segment suddenly dropped in recovery?"),
    # Guardrail
    ("guardrail", "What is our fraud rate?"),
    ("guardrail", "Show customer sentiment score"),
    # Ambiguous
    ("ambiguous", "How are we doing?"),
    ("ambiguous", "Show me bad accounts"),
    # Hindi
    ("hindi", "इस महीने सबसे ज्यादा recovery किसने की?"),
    ("hindi", "portfolio में कुल outstanding amount क्या है?"),
    ("hindi", "90+ DPD में कितने accounts हैं?"),
]


async def run():
    results = []
    session_id = None

    print(f"Running {len(TESTS)} quick tests...\n{'=' * 60}")

    async with httpx.AsyncClient(timeout=60) as client:
        for category, question in TESTS:
            payload = {"query": question, "language": "en"}
            if session_id:
                payload["session_id"] = session_id

            start = time.time()
            try:
                r = await client.post(f"{BASE_URL}/query", json=payload)
                elapsed = round(time.time() - start, 2)
                data = r.json()
                session_id = data.get("session_id")

                has_data = data.get("rows_returned", 0) > 0
                clarify = data.get("clarification_needed", False)
                status = "DATA" if has_data else ("CLARIFY" if clarify else "EMPTY")
                icon = "✓" if has_data else ("?" if clarify else "○")

                print(f"[{icon}] [{category:10s}] ({elapsed:5.1f}s) {question[:55]}")
                print(f"     {status} | {data.get('answer', '')[:80]}")
                if data.get("sql"):
                    print(f"     SQL: {data['sql'][:80].strip()}")
                print()

                results.append(
                    {
                        "category": category,
                        "question": question,
                        "status": status,
                        "elapsed": elapsed,
                        "rows": data.get("rows_returned", 0),
                        "answer": data.get("answer", "")[:100],
                    }
                )

            except Exception as e:
                elapsed = round(time.time() - start, 2)
                print(f"[✗] [{category:10s}] ({elapsed:5.1f}s) {question[:55]}")
                print(f"     EXCEPTION: {str(e)[:80]}\n")
                results.append(
                    {
                        "category": category,
                        "question": question,
                        "status": "ERROR",
                        "elapsed": elapsed,
                    }
                )

            await asyncio.sleep(0.3)

    # Summary
    total = len(results)
    data_count = sum(1 for r in results if r["status"] == "DATA")
    clarify_count = sum(1 for r in results if r["status"] == "CLARIFY")
    empty_count = sum(1 for r in results if r["status"] == "EMPTY")
    error_count = sum(1 for r in results if r["status"] == "ERROR")
    avg_time = round(sum(r["elapsed"] for r in results) / total, 2)
    slow = sum(1 for r in results if r["elapsed"] > 9)

    print(f"\n{'=' * 60}")
    print(f"RESULTS: {total} tests")
    print(f"  Data returned:  {data_count} ({round(data_count / total * 100)}%)")
    print(f"  Clarification:  {clarify_count} ({round(clarify_count / total * 100)}%)")
    print(f"  Empty:          {empty_count} ({round(empty_count / total * 100)}%)")
    print(f"  Errors:         {error_count} ({round(error_count / total * 100)}%)")
    print(f"  Avg time:       {avg_time}s")
    print(f"  Slow (>9s):     {slow}")


if __name__ == "__main__":
    asyncio.run(run())
