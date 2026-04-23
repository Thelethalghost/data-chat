import httpx
import asyncio
import time
import json
from ground_truth import GROUND_TRUTH

BASE_URL = "http://localhost:8000"


def check_answer(result: dict, expected: dict) -> tuple[bool, str]:
    exp_type = expected["expected_type"]
    rows = result.get("rows_returned", 0)
    clarify = result.get("clarification_needed", False)
    sql = (result.get("sql") or "").upper()

    if exp_type == "clarification":
        if clarify:
            return True, "correctly declined"
        return False, f"should have declined but returned {rows} rows"

    if clarify:
        return False, f"asked clarification but should have returned data"

    if rows == 0:
        return False, "returned no data"

    sql_checks = expected.get("expected_sql_contains", [])
    missing = [c for c in sql_checks if c.upper() not in sql]
    if missing:
        return False, f"SQL missing: {missing}"

    return True, f"{rows} rows returned"


async def run():
    results = []
    session_id = None

    print(f"Running accuracy test: {len(GROUND_TRUTH)} queries\n{'='*60}")

    async with httpx.AsyncClient(timeout=60) as client:
        for gt in GROUND_TRUTH:
            payload = {"query": gt["query"], "language": "en"}
            if session_id and gt["id"] in [27, 28, 29]:
                payload["session_id"] = session_id

            start = time.time()
            try:
                r = await client.post(f"{BASE_URL}/query", json=payload)
                elapsed = round(time.time() - start, 2)
                data = r.json()

                if gt["id"] == 26:
                    session_id = data.get("session_id")

                passed, reason = check_answer(data, gt)
                icon = "✓" if passed else "✗"

                print(f"[{icon}] [{gt['id']:2d}] ({elapsed:5.1f}s) {gt['query'][:55]}")
                if not passed:
                    print(f"       FAIL: {reason}")
                    print(f"       ANS: {data.get('answer','')[:80]}")

                results.append({
                    "id": gt["id"],
                    "query": gt["query"],
                    "passed": passed,
                    "reason": reason,
                    "elapsed": elapsed,
                    "rows": data.get("rows_returned", 0),
                    "clarify": data.get("clarification_needed", False),
                })

            except Exception as e:
                elapsed = round(time.time() - start, 2)
                print(f"[✗] [{gt['id']:2d}] ({elapsed:5.1f}s) {gt['query'][:55]}")
                print(f"       ERROR: {str(e)[:80]}")
                results.append({"id": gt["id"], "query": gt["query"], "passed": False, "reason": str(e), "elapsed": elapsed})

            await asyncio.sleep(0.3)

    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    accuracy = round(passed / total * 100, 1)
    avg_time = round(sum(r["elapsed"] for r in results) / total, 2)

    print(f"\n{'='*60}")
    print(f"ACCURACY: {passed}/{total} = {accuracy}%")
    print(f"Avg time: {avg_time}s")

    failed = [r for r in results if not r["passed"]]
    if failed:
        print(f"\nFailed queries ({len(failed)}):")
        for r in failed:
            print(f"  [{r['id']:2d}] {r['query'][:60]}")
            print(f"         {r['reason']}")

    with open("accuracy_results.json", "w") as f:
        json.dump({"accuracy": accuracy, "passed": passed, "total": total, "results": results}, f, indent=2)
    print(f"\nSaved to accuracy_results.json")


if __name__ == "__main__":
    asyncio.run(run())
