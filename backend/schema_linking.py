from schema_context import SCHEMA

KEYWORD_TABLE_MAP = {
    "cn_core.account": [
        "account", "loan", "portfolio", "outstanding", "overdue", "dpd",
        "delinquent", "delinquency", "bucket", "npa", "write-off", "writeoff",
        "settlement", "restructur", "principal", "interest", "lender",
        "product", "disburs", "installment", "emi", "sanctioned", "maturity",
        "बकाया", "खाता", "ऋण",
    ],
    "cn_core.collection_case": [
        "case", "collection", "collected", "recovery", "recover",
        "roll rate", "roll forward", "roll back", "resolution",
        "allocated", "allocation", "field", "tele", "agency",
        "case owner", "manager", "handled by", "assigned",
        "वसूली", "केस",
    ],
    "cn_core.payment_receipt": [
        "payment", "paid", "receipt", "cash", "cheque", "online",
        "channel", "mode", "bounce", "realized", "transaction",
        "भुगतान",
    ],
    "cn_core.customer": [
        "customer", "borrower", "client", "name", "contact",
        "phone", "email", "address", "state", "city", "credit score",
        "ग्राहक",
    ],
    "cn_core.product_type": [
        "product", "personal loan", "business loan", "home loan",
        "vehicle loan", "micro finance", "credit card", "loan type",
        "उत्पाद",
    ],
    "cn_core.delinquency_bucket": [
        "bucket", "dpd range", "days past due",
    ],
    "uamdb.users": [
        "agent", "user", "manager", "executive", "employee",
        "who", "handled by", "assigned to", "field manager",
        "tele manager", "case owner", "collector",
        "एजेंट", "प्रबंधक",
    ],
    "uamdb.organization": [
        "agency", "organization", "external", "outsource",
        "collection agency", "lender",
        "एजेंसी",
    ],
}

ALWAYS_INCLUDE = ["cn_core.delinquency_bucket"]


def get_relevant_tables(query: str) -> dict:
    query_lower = query.lower()
    relevant = {t: SCHEMA[t] for t in ALWAYS_INCLUDE if t in SCHEMA}

    for table, keywords in KEYWORD_TABLE_MAP.items():
        if table in relevant:
            continue
        if any(kw in query_lower for kw in keywords):
            relevant[table] = SCHEMA[table]

    if len(relevant) <= len(ALWAYS_INCLUDE):
        relevant["cn_core.account"] = SCHEMA["cn_core.account"]
        relevant["cn_core.collection_case"] = SCHEMA["cn_core.collection_case"]

    user_fk_tables = {"cn_core.collection_case", "cn_core.payment_receipt"}
    if user_fk_tables & set(relevant.keys()):
        relevant["uamdb.users"] = SCHEMA["uamdb.users"]

    return relevant


def format_schema_for_prompt(relevant_tables: dict) -> str:
    lines = ["AVAILABLE TABLES:", "=" * 50]
    for table_name, info in relevant_tables.items():
        lines.append(f"\nTABLE: {table_name}")
        lines.append(f"Description: {info['description']}")
        lines.append("Columns:")
        for col, desc in info["columns"].items():
            lines.append(f"  - {col}: {desc}")
        if "notes" in info:
            lines.append(f"Notes: {info['notes']}")
    return "\n".join(lines)
