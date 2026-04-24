GROUND_TRUTH = [

    # ── Simple — single table ────────────────────────────────────
    {
        "id": 1,
        "query": "How many active accounts are there currently?",
        "expected_sql_contains": ["account_status_id = 1", "COUNT"],
        "expected_type": "scalar",
        "notes": "Should filter ACCOUNT_STATUS_ID = 1"
    },
    {
        "id": 2,
        "query": "What is the total outstanding amount in the portfolio?",
        "expected_sql_contains": ["SUM", "TOTAL_OUTSTANDING_AMOUNT"],
        "expected_type": "scalar",
        "notes": "Sum of total_outstanding_amount from account"
    },
    {
        "id": 3,
        "query": "How many accounts are in 30-60 DPD bucket?",
        "expected_sql_contains": ["DPD >= 30", "DPD <= 60", "COUNT"],
        "expected_type": "scalar",
        "notes": "Use DPD column directly"
    },
    {
        "id": 4,
        "query": "How many accounts are in 60-90 DPD bucket?",
        "expected_sql_contains": ["DPD >= 60", "DPD <= 90", "COUNT"],
        "expected_type": "scalar",
        "notes": "Use DPD column directly"
    },
    {
        "id": 5,
        "query": "How many accounts are in 90+ DPD bucket?",
        "expected_sql_contains": ["DPD >= 90", "COUNT"],
        "expected_type": "scalar",
        "notes": "Use DPD column directly"
    },
    {
        "id": 6,
        "query": "What is the average outstanding per account?",
        "expected_sql_contains": ["AVG", "TOTAL_OUTSTANDING_AMOUNT"],
        "expected_type": "scalar",
        "notes": "Average total_outstanding_amount"
    },
    {
        "id": 7,
        "query": "What is the highest outstanding amount?",
        "expected_sql_contains": ["MAX", "TOTAL_OUTSTANDING_AMOUNT"],
        "expected_type": "scalar",
        "notes": "Max outstanding"
    },
    {
        "id": 8,
        "query": "How many personal loan accounts do we have?",
        "expected_sql_contains": ["Personal Loan", "COUNT"],
        "expected_type": "scalar",
        "notes": "Join to product_type, filter by product name"
    },
    {
        "id": 9,
        "query": "How many NPA accounts are there?",
        "expected_sql_contains": ["NPA_FLAG", "Y", "COUNT"],
        "expected_type": "scalar",
        "notes": "Filter NPA_FLAG = Y"
    },
    {
        "id": 10,
        "query": "How many accounts are current (0 DPD)?",
        "expected_sql_contains": ["DPD = 0", "COUNT"],
        "expected_type": "scalar",
        "notes": "DPD = 0 means current"
    },

    # ── Moderate — multi table, aggregation ──────────────────────
    {
        "id": 11,
        "query": "Show top 5 agents by recovery rate",
        "expected_sql_contains": ["COLLECTED_AMOUNT", "PRINCIPAL_OUTSTANDING_AMOUNT", "users", "LIMIT 5"],
        "expected_type": "table",
        "notes": "Recovery = collected / principal outstanding"
    },
    {
        "id": 12,
        "query": "What is recovery rate by product category?",
        "expected_sql_contains": ["COLLECTED_AMOUNT", "product", "GROUP BY"],
        "expected_type": "table",
        "notes": "Group by product"
    },
    {
        "id": 13,
        "query": "Show collections by branch",
        "expected_sql_contains": ["BRANCH_CODE", "COLLECTED_AMOUNT", "GROUP BY"],
        "expected_type": "table",
        "notes": "Group by branch_code"
    },
    {
        "id": 14,
        "query": "Show bank-wise recovery performance",
        "expected_sql_contains": ["LENDER_NAME", "COLLECTED_AMOUNT", "GROUP BY"],
        "expected_type": "table",
        "notes": "Group by lender_name"
    },
    {
        "id": 15,
        "query": "Compare recovery above and below 5 lakh exposure",
        "expected_sql_contains": ["500000", "COLLECTED_AMOUNT", "CASE WHEN"],
        "expected_type": "table",
        "notes": "CASE WHEN principal >= 500000"
    },
    {
        "id": 16,
        "query": "Show top 10 agents by total collected amount",
        "expected_sql_contains": ["COLLECTED_AMOUNT", "users", "LIMIT 10"],
        "expected_type": "table",
        "notes": "Top 10 agents"
    },
    {
        "id": 17,
        "query": "Which segment contributes most to defaults?",
        "expected_sql_contains": ["NPA_FLAG", "product", "GROUP BY"],
        "expected_type": "table",
        "notes": "NPA rate by product"
    },
    {
        "id": 18,
        "query": "Identify accounts with no payments in last 90 days",
        "expected_sql_contains": ["LAST_PAYMENT_RECEIVED_DATE", "90"],
        "expected_type": "table",
        "notes": "last_payment_received_date < today - 90"
    },
    {
        "id": 19,
        "query": "Show accounts grouped by DPD and product",
        "expected_sql_contains": ["DPD", "product", "GROUP BY", "COUNT"],
        "expected_type": "table",
        "notes": "DPD buckets with product breakdown"
    },
    {
        "id": 20,
        "query": "Compare secured vs unsecured loans",
        "expected_sql_contains": ["SECURED_FLAG", "GROUP BY", "COUNT"],
        "expected_type": "table",
        "notes": "Group by secured_flag"
    },

    # ── Complex — time series, trend ─────────────────────────────
    {
        "id": 21,
        "query": "Which product segments show increasing roll rates over last 3 months?",
        "expected_sql_contains": ["RF", "CASE_YEAR", "CASE_MONTH", "GROUP BY"],
        "expected_type": "table",
        "notes": "resolution_status = RF grouped by month"
    },
    {
        "id": 22,
        "query": "Show payment trends over last 6 months",
        "expected_sql_contains": ["payment_transaction_date", "GROUP BY", "SUM"],
        "expected_type": "table",
        "notes": "Monthly payment aggregation"
    },
    {
        "id": 23,
        "query": "How many accounts rolled forward vs rolled back last month?",
        "expected_sql_contains": ["RF", "RB", "CASE_YEAR", "CASE_MONTH"],
        "expected_type": "table",
        "notes": "Count RF and RB resolution statuses"
    },
    {
        "id": 24,
        "query": "Show monthly collection trend for HDFC Bank",
        "expected_sql_contains": ["HDFC", "CASE_YEAR", "CASE_MONTH", "COLLECTED_AMOUNT"],
        "expected_type": "table",
        "notes": "HDFC lender monthly collection"
    },
    {
        "id": 25,
        "query": "Which agent has improved most month over month?",
        "expected_sql_contains": ["COLLECTED_AMOUNT", "CASE_YEAR", "CASE_MONTH", "users"],
        "expected_type": "table",
        "notes": "Agent collection trend by month"
    },

    # ── Multi-turn context ────────────────────────────────────────
    {
        "id": 26,
        "query": "Show me HDFC Bank personal loan accounts",
        "expected_sql_contains": ["HDFC", "Personal Loan"],
        "expected_type": "table",
        "notes": "First turn of multi-turn sequence"
    },
    {
        "id": 27,
        "query": "Now filter by 30-60 DPD",
        "expected_sql_contains": ["DPD >= 30", "DPD <= 60"],
        "expected_type": "table",
        "notes": "Second turn - should retain HDFC + Personal Loan filter"
    },
    {
        "id": 28,
        "query": "What's the average outstanding?",
        "expected_sql_contains": ["AVG", "OUTSTANDING"],
        "expected_type": "scalar",
        "notes": "Third turn - average on filtered set"
    },
    {
        "id": 29,
        "query": "Which agent handles most of these?",
        "expected_sql_contains": ["users", "COUNT", "ALLOCATED"],
        "expected_type": "table",
        "notes": "Fourth turn - agent for filtered accounts"
    },
    {
        "id": 30,
        "query": "Show top 5 agents",
        "expected_sql_contains": ["users", "LIMIT 5"],
        "expected_type": "table",
        "notes": "Ambiguous - should default to recovery rate"
    },

    # ── Ambiguous — should attempt with assumption ───────────────
    {
        "id": 31,
        "query": "Show me bad accounts",
        "expected_sql_contains": ["DPD", "NPA_FLAG"],
        "expected_type": "table",
        "notes": "Should interpret as DPD > 90 or NPA"
    },
    {
        "id": 32,
        "query": "Give me risky customers",
        "expected_sql_contains": ["DPD", "credit_score"],
        "expected_type": "table",
        "notes": "High DPD or low credit score"
    },
    {
        "id": 33,
        "query": "Show high value accounts",
        "expected_sql_contains": ["TOTAL_OUTSTANDING_AMOUNT", "ORDER BY"],
        "expected_type": "table",
        "notes": "Top by outstanding amount"
    },
    {
        "id": 34,
        "query": "How are we doing?",
        "expected_sql_contains": ["COUNT", "SUM", "TOTAL_OUTSTANDING"],
        "expected_type": "table",
        "notes": "Portfolio health summary"
    },
    {
        "id": 35,
        "query": "Show bottom 5 agents",
        "expected_sql_contains": ["users", "LIMIT 5", "ORDER BY"],
        "expected_type": "table",
        "notes": "Should order ascending"
    },

    # ── Guardrail — should decline ───────────────────────────────
    {
        "id": 36,
        "query": "What is our fraud rate?",
        "expected_type": "clarification",
        "notes": "No fraud data in schema — should decline"
    },
    {
        "id": 37,
        "query": "Show customer sentiment score",
        "expected_type": "clarification",
        "notes": "No sentiment data — should decline"
    },
    {
        "id": 38,
        "query": "What is expected recovery next month?",
        "expected_type": "clarification",
        "notes": "No forecast data — should decline"
    },
    {
        "id": 39,
        "query": "Show WhatsApp communication performance",
        "expected_type": "clarification",
        "notes": "No WhatsApp data — should decline"
    },
    {
        "id": 40,
        "query": "What is our NPS score?",
        "expected_type": "clarification",
        "notes": "No NPS data — should decline"
    },

    # ── Hindi ────────────────────────────────────────────────────
    {
        "id": 41,
        "query": "पोर्टफोलियो में कुल outstanding amount क्या है?",
        "expected_sql_contains": ["SUM", "TOTAL_OUTSTANDING_AMOUNT"],
        "expected_type": "scalar",
        "notes": "Hindi: total outstanding"
    },
    {
        "id": 42,
        "query": "90+ DPD में कितने accounts हैं?",
        "expected_sql_contains": ["DPD >= 90", "COUNT"],
        "expected_type": "scalar",
        "notes": "Hindi: 90+ DPD count"
    },
    {
        "id": 43,
        "query": "इस महीने सबसे ज्यादा recovery किसने की?",
        "expected_sql_contains": ["COLLECTED_AMOUNT", "users"],
        "expected_type": "table",
        "notes": "Hindi: top recovery agent this month"
    },
    {
        "id": 44,
        "query": "कितने accounts NPA हैं?",
        "expected_sql_contains": ["NPA_FLAG", "COUNT"],
        "expected_type": "scalar",
        "notes": "Hindi: NPA count"
    },
    {
        "id": 45,
        "query": "HDFC Bank के personal loan accounts दिखाओ",
        "expected_sql_contains": ["HDFC", "Personal Loan"],
        "expected_type": "table",
        "notes": "Hindi: HDFC personal loans"
    },
    {
        "id": 46,
        "query": "top 5 agents कौन हैं recovery rate के हिसाब से?",
        "expected_sql_contains": ["COLLECTED_AMOUNT", "users", "LIMIT 5"],
        "expected_type": "table",
        "notes": "Hindi: top 5 agents by recovery"
    },
    {
        "id": 47,
        "query": "branch wise collections दिखाओ",
        "expected_sql_contains": ["BRANCH_CODE", "COLLECTED_AMOUNT", "GROUP BY"],
        "expected_type": "table",
        "notes": "Hindi: branch collections"
    },
    {
        "id": 48,
        "query": "30-60 DPD में कितने accounts हैं?",
        "expected_sql_contains": ["DPD >= 30", "DPD <= 60", "COUNT"],
        "expected_type": "scalar",
        "notes": "Hindi: 30-60 DPD count"
    },
    {
        "id": 49,
        "query": "सबसे ज्यादा outstanding amount किस product का है?",
        "expected_sql_contains": ["product", "SUM", "TOTAL_OUTSTANDING"],
        "expected_type": "table",
        "notes": "Hindi: highest outstanding by product"
    },
    {
        "id": 50,
        "query": "पिछले 90 दिनों में payment नहीं किए accounts कौन से हैं?",
        "expected_sql_contains": ["LAST_PAYMENT_RECEIVED_DATE", "90"],
        "expected_type": "table",
        "notes": "Hindi: no payment in 90 days"
    },
]
