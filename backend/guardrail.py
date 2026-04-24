import re

WHITELISTED_TABLES = {
    "cn_core.account",
    "cn_core.collection_case",
    "cn_core.payment_receipt",
    "cn_core.customer",
    "cn_core.product_type",
    "cn_core.delinquency_bucket",
    "cn_core.account_status",
    "cn_core.resolution_status",
    "uamdb.users",
    "uamdb.organization",
}

DANGEROUS = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "TRUNCATE",
    "ALTER",
    "CREATE",
    "MERGE",
    "EXECUTE",
    "GRANT",
    "REVOKE",
]


async def check(query: str, sql: str) -> dict:
    if not sql:
        return {"passed": False, "message": "No SQL was generated."}

    sql_upper = sql.upper().strip()
    non_comment = "\n".join(
        l for l in sql_upper.split("\n") if not l.strip().startswith("--")
    )

    if not non_comment.strip().startswith(
        "SELECT"
    ) and not non_comment.strip().startswith("WITH"):
        return {"passed": False, "message": "Only SELECT queries are allowed."}

    for kw in DANGEROUS:
        if re.search(rf"\b{kw}\b", sql_upper):
            return {"passed": False, "message": f"Disallowed operation: {kw}."}

    if ";" in sql.rstrip(";"):
        return {"passed": False, "message": "Multiple statements not allowed."}

    table_refs = re.findall(r"\b((?:cn_core|uamdb)\.[a-z_]+)\b", sql.lower())
    unknown = [r for r in set(table_refs) if r not in WHITELISTED_TABLES]

    if unknown:
        return {
            "passed": False,
            "message": f"Unknown tables referenced: {', '.join(unknown)}.",
        }

    return {"passed": True, "message": None}
