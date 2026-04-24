SCHEMA = {

    "cn_core.account": {
        "description": "Central loan account table. One row per loan account. Contains current balances, DPD, product info, lender info.",
        "columns": {
            "id": "Primary key (integer)",
            "account_number": "Unique loan account identifier",
            "customer_id": "Links to cn_core.customer.id",
            "lender_name": "Name of the lender e.g. HDFC Bank, ICICI Bank, SBI, Axis Bank, Kotak Mahindra",
            "institution_code": "Short lender code e.g. HDFC, ICICI, SBI",
            "product_code": "Links to cn_core.product_type.product_code",
            "product_group_code": "Product group",
            "product_category_code": "SECURED or UNSECURED",
            "branch_code": "Branch identifier e.g. BR001",
            "loan_amount": "Original sanctioned loan amount (numeric)",
            "disbursed_amount": "Amount disbursed (numeric)",
            "principal_outstanding_amount": "Current principal outstanding. Denominator for recovery rate (numeric)",
            "interest_outstanding_amount": "Current interest outstanding (numeric)",
            "charges_outstanding_amount": "Current charges outstanding (numeric)",
            "total_outstanding_amount": "Total outstanding = principal + interest + charges (numeric)",
            "total_overdue_amount": "Total overdue amount (numeric)",
            "principal_overdue_amount": "Principal portion overdue (numeric)",
            "installment_amount": "EMI amount (numeric)",
            "total_paid_amount": "Total paid since opening (numeric)",
            "dpd": "Days Past Due. 0 = current. Use directly for range queries e.g. dpd >= 30 AND dpd <= 60",
            "delinquency_bucket_code": "Bucket code e.g. B0=current B1=1-30 B2=31-60. May be NULL - use dpd column for filtering",
            "account_status_id": "1=Active 2=Inactive 3=Closed. Links to cn_core.account_status",
            "npa_flag": "Y if Non-Performing Asset",
            "secured_flag": "Y if secured loan",
            "settlement_flag": "Y if under settlement",
            "restructured_flag": "Y if restructured",
            "actual_write_off_flag": "Y if written off",
            "last_payment_received_date": "Date of last payment (timestamp)",
            "open_date": "Account opening date",
            "overdue_since_date": "Date first became overdue",
            "mob": "Months on book",
            "interest_rate": "Current interest rate",
            "tenure": "Loan tenure in months",
            "record_status": "1 = active record (soft delete flag)",
        },
        "notes": (
            "Use dpd column directly for DPD range filtering. "
            "delinquency_bucket_code may be NULL. "
            "record_status = 1 for active records. "
            "account_status_id = 1 for active accounts."
        ),
    },

    "cn_core.collection_case": {
        "description": "Collection cases. One account can have multiple cases. Primary table for recovery and agent performance queries.",
        "columns": {
            "id": "Primary key",
            "account_id": "Links to cn_core.account.id",
            "case_status_id": "1=Open 2=Closed",
            "collection_status": "Collected or Outstanding",
            "resolution_status": "NRML=Normal OD=Overdue NL=Normalized ST=Stabilized RB=Roll-back RF=Roll-forward",
            "case_owner_user_id": "Senior manager. Links to uamdb.users.user_id",
            "allocated_collection_user_id": "Field manager. Links to uamdb.users.user_id",
            "allocated_tele_call_user_id": "Tele manager. Links to uamdb.users.user_id",
            "allocated_tele_call_agency_id": "External agency. Links to uamdb.organization.organization_id",
            "collected_amount": "Amount collected. Numerator for recovery rate (numeric)",
            "dpd": "DPD at case level (integer)",
            "total_outstanding_amount": "Outstanding at case level (numeric)",
            "principal_outstanding_amount": "Principal outstanding at case level (numeric)",
            "total_overdue_amount": "Overdue at case level (numeric)",
            "case_start_dpd": "DPD when case opened",
            "case_start_principal_outstanding_amount": "Principal when case opened",
            "case_start_date": "When case opened (timestamp)",
            "case_end_date": "When case closed NULL if open (timestamp)",
            "case_year": "Year case created. Use for time filtering",
            "case_month": "Month case created 1-12. Use for time filtering",
            "collection_risk_category": "Low Medium High",
            "account_priority": "Priority score 1-10",
        },
        "notes": (
            "Multiple cases per account — always SUM when computing per-account metrics. "
            "Recovery rate = SUM(collected_amount) / NULLIF(SUM(principal_outstanding_amount), 0). "
            "RF = rolled forward worsened. RB = rolled back improved. "
            "Always LEFT JOIN to uamdb tables — no FK enforcement."
        ),
    },

    "cn_core.payment_receipt": {
        "description": "Payment transactions. One row per payment.",
        "columns": {
            "id": "Primary key",
            "account_id": "Links to cn_core.account.id",
            "customer_id": "Links to cn_core.customer.id",
            "payment_amount": "Payment amount (numeric)",
            "payment_date": "Payment datetime (timestamp)",
            "payment_transaction_date": "Transaction date (date) — use for date filtering",
            "payment_status_code": "Realized Bounced Cancelled etc",
            "payment_method": "CASH CHEQUE NEFT IMPS UPI DD",
            "payment_mode": "Online Offline Mobile Branch",
            "collected_by_user": "Agent who collected. Links to uamdb.users.user_id",
            "payment_receipt_no": "Unique receipt number",
            "bounce_reason": "Reason if bounced",
            "realized_date": "Date payment cleared",
        },
        "notes": "Use payment_transaction_date for date filtering. Filter payment_status_code = 'Realized' for successful payments.",
    },

    "cn_core.customer": {
        "description": "Customer/borrower master. One row per customer.",
        "columns": {
            "id": "Primary key",
            "customer_number": "Unique customer identifier",
            "customer_name": "Full name",
            "customer_first_name": "First name",
            "customer_last_name": "Last name",
            "primary_contact_no": "Phone number",
            "primary_email": "Email",
            "primary_address_state": "State",
            "primary_address_city": "City",
            "dpd": "Customer-level DPD",
            "credit_score": "Credit score 300-850",
            "record_status": "1 = active",
        },
    },

    "cn_core.product_type": {
        "description": "Loan product lookup. Products: Personal Loan, Business Loan, Home Loan, Vehicle Loan, Micro Finance Loan, Group Loan, Credit Card, Agriculture Loan, Education Loan, B2B Loan.",
        "columns": {
            "product_code": "Primary key e.g. PL001",
            "product_name": "Product name e.g. Personal Loan",
            "product_group_code": "RETAIL BUSINESS MICROFINANCE AGRI",
            "product_category_code": "SECURED or UNSECURED",
        },
    },

    "cn_core.delinquency_bucket": {
        "description": "DPD bucket lookup. B0=0 DPD B1=1-30 B2=31-60 B3=61-90 B4=91-120 ... B13=361+",
        "columns": {
            "bucket_code": "Primary key e.g. B0 B1 B2",
            "bucket_name": "Human readable e.g. Bucket 0",
            "bucket_no": "Numeric bucket number",
            "dpd_start": "Start of DPD range inclusive",
            "dpd_end": "End of DPD range inclusive",
        },
        "notes": "Only join when bucket names needed in output. For filtering always use dpd column directly.",
    },

    "uamdb.users": {
        "description": "Agents and managers. All internal users.",
        "columns": {
            "user_id": "Primary key",
            "user_name": "Login username",
            "first_name": "First name",
            "last_name": "Last name",
            "role_id": "1=Agent 2=FieldMgr 3=RegionalMgr 4=ZonalMgr 5=NationalHead",
            "organization_id": "Links to uamdb.organization.organization_id",
            "reporting_manager_id": "Self-reference for hierarchy",
            "base_branch_code": "Home branch",
            "email": "Email",
            "designation": "Job title e.g. Collection Agent Field Manager National Head",
            "user_status": "Active or Inactive",
        },
        "notes": (
            "Always LEFT JOIN from CN_CORE tables. "
            "Join patterns: "
            "collection_case.allocated_collection_user_id = uamdb.users.user_id, "
            "collection_case.allocated_tele_call_user_id = uamdb.users.user_id, "
            "collection_case.case_owner_user_id = uamdb.users.user_id, "
            "payment_receipt.collected_by_user = uamdb.users.user_id."
        ),
    },

    "uamdb.organization": {
        "description": "Lenders and external collection agencies.",
        "columns": {
            "organization_id": "Primary key",
            "organization_name": "Name e.g. HDFC Bank Collection Agency 1",
            "organization_code": "Short code",
            "organization_type_id": "1=Lender 2=Agency",
            "organization_status": "Active or Inactive",
        },
    },
}

LOOKUP_CACHE = {
    "delinquency_buckets": [],
    "account_statuses": [],
    "resolution_statuses": [],
}


def format_lookup_cache() -> str:
    lines = []
    if LOOKUP_CACHE["delinquency_buckets"]:
        lines.append("DELINQUENCY BUCKETS:")
        for b in LOOKUP_CACHE["delinquency_buckets"]:
            lines.append(f"  {b['bucket_code']} = {b['bucket_name']} (DPD {b['dpd_start']} to {b['dpd_end']})")
    if LOOKUP_CACHE["account_statuses"]:
        lines.append("ACCOUNT STATUSES:")
        for s in LOOKUP_CACHE["account_statuses"]:
            lines.append(f"  {s['id']} = {s['account_status_code']}")
    if LOOKUP_CACHE["resolution_statuses"]:
        lines.append("RESOLUTION STATUSES:")
        for s in LOOKUP_CACHE["resolution_statuses"]:
            lines.append(f"  {s['resolution_status_code']} = {s['resolution_status_name']}")
    return "\n".join(lines)
