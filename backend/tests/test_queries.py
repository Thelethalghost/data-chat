"""
Test script for AskCN - runs all 81 unique questions and logs results.
Usage: python test_queries.py
Output: test_results.json + test_summary.txt
"""

import httpx
import json
import time
import asyncio
from datetime import datetime

BASE_URL = "http://localhost:8000"

# 30 questions from the 300 doc (deduplicated)
BASIC_QUESTIONS = [
    "How many active accounts are there currently?",
    "How many accounts are in 0-30 DPD bucket?",
    "How many accounts are in 30-60 DPD bucket?",
    "How many accounts are in 60-90 DPD bucket?",
    "How many accounts are in 90+ DPD bucket?",
    "What is the average outstanding per account?",
    "What is the highest outstanding amount?",
    "What is the lowest outstanding amount?",
    "How many personal loan accounts do we have?",
    "What is the total outstanding amount in the portfolio?",
    "What is recovery rate by product category?",
    "Show collections by branch",
    "Show collections by region",
    "Compare PTP success rate across products",
    "Show agent-wise PTP performance",
    "Show payment trends this month",
    "Show accounts grouped by DPD and product",
    "Show agent performance by region",
    "Show bank-wise recovery performance",
    "Show top 5 agents by recovery amount this month",
    "Which agents are improving month over month?",
    "Which accounts moved from 60 to 90 DPD last month?",
    "Compare recovery above and below 5 lakh exposure",
    "Identify accounts with repeated PTP failures",
    "Which regions show declining recovery trends?",
    "Where are we losing maximum recoveries?",
    "Which segment contributes most to defaults?",
    "Identify accounts with no payments in last 90 days",
    "What is the most surprising trend in the portfolio?",
    "Which product segments show increasing roll rates over last 3 months?",
]

# 51 tricky questions
TRICKY_QUESTIONS = [
    "Show me HDFC personal loan accounts",
    "Now only those above 5 lakh",
    "Filter to 60-90 DPD",
    "What's the average outstanding?",
    "Compare that with last month",
    "Show top 10 agents by recovery",
    "Remove agents with less than 50 accounts",
    "Now rank them by PTP success instead",
    "Show accounts in 30-60 DPD",
    "Now exclude accounts that paid this week",
    "What's left?",
    "How are we doing?",
    "Show me bad accounts",
    "Give me risky customers",
    "Show high value accounts",
    "What is our fraud rate?",
    "Show customer sentiment score",
    "What is expected recovery next month?",
    "Show recovery this month vs last month till date",
    "Compare last 7 days vs previous 7 days",
    "Show accounts that were 30-60 DPD last month but now 90+",
    "Show accounts that improved DPD continuously for 3 months",
    "Which agent collected most from accounts above 5 lakh in 90+ DPD?",
    "Show bank-wise recovery for accounts handled by top 5 agents",
    "Which region has highest PTP success for personal loans?",
    "Show product-wise recovery for accounts with more than 3 contacts",
    "Average recovery per agent vs median recovery per agent",
    "Show weighted recovery rate by outstanding",
    "Which agent has highest efficiency recovery per account?",
    "Show top 5 agents excluding outliers",
    "How many accounts rolled forward vs rolled back last week?",
    "Show roll rate from 30-60 to 60-90",
    "Show reverse roll rate improvement",
    "Which segment has highest deterioration?",
    "Show accounts with zero payments but multiple PTPs",
    "Show agents with no collections but many accounts",
    "Show accounts with payments but still increasing DPD",
    "Show customers with multiple loans but only one active",
    "What is the most unusual trend this month?",
    "Which segment suddenly dropped in recovery?",
    "Which agent's performance changed drastically?",
    "Compare recovery for top 10% vs bottom 10% accounts",
    "Compare secured vs unsecured loans",
    "Compare new vs old customers",
    "Show WhatsApp communication performance",
    "Show call recording quality score",
    "Show top agent tie case",
    "Show average excluding null DPD",
    "Show count of distinct customers vs accounts",
    "Show top 5 agents",
    "Actually show bottom 5",
]

ALL_QUESTIONS = BASIC_QUESTIONS + TRICKY_QUESTIONS


async def run_test():
    results = []
    session_id = None  # for multi-turn tricky questions

    print(f"Running {len(ALL_QUESTIONS)} test queries...")
    print("=" * 60)

    async with httpx.AsyncClient(timeout=30) as client:
        for i, question in enumerate(ALL_QUESTIONS):
            # Use session for tricky questions (2-11 are follow-ups to q1)
            is_followup = i >= 30 and i <= 40  # tricky questions 2-11
            payload = {"query": question, "language": "en"}
            if is_followup and session_id:
                payload["session_id"] = session_id

            start = time.time()
            try:
                response = await client.post(
                    f"{BASE_URL}/query",
                    json=payload,
                )
                elapsed = round(time.time() - start, 2)
                data = response.json()

                # Save session_id from first tricky question
                if i == 30:
                    session_id = data.get("session_id")

                result = {
                    "id": i + 1,
                    "question": question,
                    "status": "ok" if response.status_code == 200 else "error",
                    "http_code": response.status_code,
                    "answer": data.get("answer", ""),
                    "sql": data.get("sql"),
                    "rows_returned": data.get("rows_returned", 0),
                    "chart_type": data.get("chart", {}).get("chart_type") if data.get("chart") else None,
                    "clarification_needed": data.get("clarification_needed", False),
                    "elapsed_seconds": elapsed,
                    "category": "basic" if i < 30 else "tricky",
                }

            except Exception as e:
                elapsed = round(time.time() - start, 2)
                result = {
                    "id": i + 1,
                    "question": question,
                    "status": "exception",
                    "error": str(e),
                    "elapsed_seconds": elapsed,
                    "category": "basic" if i < 30 else "tricky",
                }

            results.append(result)

            # Print progress
            status_icon = "✓" if result["status"] == "ok" and not result.get("clarification_needed") else "?" if result.get("clarification_needed") else "✗"
            print(f"[{i+1:3d}] {status_icon} ({elapsed}s) {question[:60]}")
            if result.get("sql"):
                print(f"       SQL: {result['sql'][:80].strip()}...")
            elif result.get("answer"):
                print(f"       ANS: {result['answer'][:80]}")

            # Small delay to avoid hammering the server
            await asyncio.sleep(0.5)

    # Save full results
    with open("test_results.json", "w") as f:
        json.dump(results, f, indent=2)

    # Generate summary
    total = len(results)
    ok = sum(1 for r in results if r["status"] == "ok" and not r.get("clarification_needed") and r.get("rows_returned", 0) > 0)
    clarifications = sum(1 for r in results if r.get("clarification_needed"))
    no_data = sum(1 for r in results if r["status"] == "ok" and not r.get("clarification_needed") and r.get("rows_returned", 0) == 0)
    errors = sum(1 for r in results if r["status"] in ("error", "exception"))
    avg_time = round(sum(r.get("elapsed_seconds", 0) for r in results) / total, 2)
    slow = sum(1 for r in results if r.get("elapsed_seconds", 0) > 5)

    summary = f"""
AskCN Test Results — {datetime.now().strftime('%Y-%m-%d %H:%M')}
{'=' * 60}
Total questions:      {total}
Returned data:        {ok} ({round(ok/total*100)}%)
Clarification asked:  {clarifications} ({round(clarifications/total*100)}%)
No data returned:     {no_data} ({round(no_data/total*100)}%)
Errors:               {errors} ({round(errors/total*100)}%)

Average response time: {avg_time}s
Slow queries (>5s):    {slow}

BASIC QUESTIONS ({len(BASIC_QUESTIONS)}):
  Data returned:   {sum(1 for r in results[:30] if r.get('rows_returned', 0) > 0)}
  Clarifications:  {sum(1 for r in results[:30] if r.get('clarification_needed'))}
  No data:         {sum(1 for r in results[:30] if r['status'] == 'ok' and not r.get('clarification_needed') and r.get('rows_returned', 0) == 0)}
  Errors:          {sum(1 for r in results[:30] if r['status'] in ('error', 'exception'))}

TRICKY QUESTIONS ({len(TRICKY_QUESTIONS)}):
  Data returned:   {sum(1 for r in results[30:] if r.get('rows_returned', 0) > 0)}
  Clarifications:  {sum(1 for r in results[30:] if r.get('clarification_needed'))}
  No data:         {sum(1 for r in results[30:] if r['status'] == 'ok' and not r.get('clarification_needed') and r.get('rows_returned', 0) == 0)}
  Errors:          {sum(1 for r in results[30:] if r['status'] in ('error', 'exception'))}

QUESTIONS THAT NEED REVIEW:
"""

    for r in results:
        if r["status"] in ("error", "exception") or (r["status"] == "ok" and not r.get("clarification_needed") and r.get("rows_returned", 0) == 0):
            summary += f"  [{r['id']:3d}] {r['question'][:70]}\n"
            if r.get("answer"):
                summary += f"         → {r['answer'][:80]}\n"

    print(summary)

    with open("test_summary.txt", "w") as f:
        f.write(summary)

    print(f"\nFull results saved to test_results.json")
    print(f"Summary saved to test_summary.txt")


if __name__ == "__main__":
    asyncio.run(run_test())
