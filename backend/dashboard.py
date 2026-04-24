from fastapi import APIRouter
from executor import run_query
from visualisation import pick_chart
from schemas import ChartSpec

router = APIRouter()

DASHBOARD_QUERIES = {
    "metrics": """
        SELECT
            SUM(a.total_outstanding_amount) AS total_outstanding_amount,
            ROUND(AVG(a.dpd), 0) AS avg_dpd,
            COUNT(CASE WHEN a.account_status_id = 1 THEN 1 END) AS active_accounts,
            SUM(CASE WHEN a.npa_flag = 'Y' THEN 1 ELSE 0 END) AS npa_accounts,
            ROUND(SUM(CASE WHEN a.npa_flag = 'Y' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS npa_rate_pct,
            COUNT(DISTINCT a.lender_name) AS total_lenders
        FROM cn_core.account a
        WHERE a.record_status = 1
    """,

    "agents": """
        SELECT
            u.first_name || ' ' || u.last_name AS agent_name,
            ROUND(SUM(cc.collected_amount) / NULLIF(SUM(cc.principal_outstanding_amount), 0) * 100, 2) AS recovery_rate_pct,
            SUM(cc.collected_amount) AS total_collected,
            COUNT(DISTINCT cc.account_id) AS accounts_handled
        FROM cn_core.collection_case cc
        LEFT JOIN uamdb.users u ON cc.allocated_collection_user_id = u.user_id
        WHERE u.user_id IS NOT NULL
        GROUP BY u.user_id, u.first_name, u.last_name
        HAVING SUM(cc.principal_outstanding_amount) > 0
        ORDER BY recovery_rate_pct DESC
        LIMIT 8
    """,

    "dpd_buckets": """
        SELECT
            CASE
                WHEN a.dpd = 0 THEN 'Current'
                WHEN a.dpd BETWEEN 1 AND 30 THEN '1-30'
                WHEN a.dpd BETWEEN 31 AND 60 THEN '31-60'
                WHEN a.dpd BETWEEN 61 AND 90 THEN '61-90'
                WHEN a.dpd BETWEEN 91 AND 180 THEN '91-180'
                ELSE '180+'
            END AS dpd_bucket,
            COUNT(*) AS account_count,
            SUM(a.total_outstanding_amount) AS total_outstanding
        FROM cn_core.account a
        WHERE a.record_status = 1
        GROUP BY
            CASE
                WHEN a.dpd = 0 THEN 'Current'
                WHEN a.dpd BETWEEN 1 AND 30 THEN '1-30'
                WHEN a.dpd BETWEEN 31 AND 60 THEN '31-60'
                WHEN a.dpd BETWEEN 61 AND 90 THEN '61-90'
                WHEN a.dpd BETWEEN 91 AND 180 THEN '91-180'
                ELSE '180+'
            END
        ORDER BY MIN(a.dpd)
    """,

    "payment_trends": """
        SELECT
            cc.case_year || '-' || LPAD(cc.case_month::text, 2, '0') AS month,
            SUM(cc.collected_amount) AS total_collected,
            COUNT(DISTINCT cc.account_id) AS accounts_collected,
            ROUND(SUM(cc.collected_amount) / NULLIF(SUM(cc.principal_outstanding_amount), 0) * 100, 2) AS recovery_rate_pct
        FROM cn_core.collection_case cc
        WHERE (cc.case_year * 100 + cc.case_month) >= (
            SELECT MAX(case_year * 100 + case_month) - 6
            FROM cn_core.collection_case
        )
        GROUP BY cc.case_year, cc.case_month
        ORDER BY cc.case_year, cc.case_month
    """,

    "product_recovery": """
        SELECT
            pt.product_name,
            COUNT(DISTINCT cc.account_id) AS accounts,
            ROUND(SUM(cc.collected_amount) / NULLIF(SUM(cc.principal_outstanding_amount), 0) * 100, 2) AS recovery_rate_pct,
            SUM(cc.collected_amount) AS total_collected
        FROM cn_core.collection_case cc
        LEFT JOIN cn_core.account a ON cc.account_id = a.id
        LEFT JOIN cn_core.product_type pt ON a.product_code = pt.product_code
        GROUP BY pt.product_name
        ORDER BY recovery_rate_pct DESC
    """,

    "lender_recovery": """
        SELECT
            COALESCE(a.lender_name, 'Unknown') AS lender_name,
            COUNT(DISTINCT cc.account_id) AS accounts,
            SUM(cc.collected_amount) AS total_collected,
            SUM(cc.principal_outstanding_amount) AS total_principal,
            ROUND(SUM(cc.collected_amount) / NULLIF(SUM(cc.principal_outstanding_amount), 0) * 100, 2) AS recovery_rate_pct
        FROM cn_core.collection_case cc
        LEFT JOIN cn_core.account a ON cc.account_id = a.id
        GROUP BY a.lender_name
        ORDER BY total_collected DESC
    """,
}


@router.get("/dashboard")
async def get_dashboard():
    result = {}

    for key, sql in DASHBOARD_QUERIES.items():
        try:
            rows, columns = await run_query(sql)
            chart = pick_chart(rows, columns, key)
            result[key] = {
                "rows": rows,
                "columns": columns,
                "chart": chart,
                "rows_returned": len(rows),
            }
        except Exception as e:
            result[key] = {
                "rows": [],
                "columns": [],
                "chart": None,
                "rows_returned": 0,
                "error": str(e),
            }

    return result
