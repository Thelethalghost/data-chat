import random
import psycopg2
from datetime import datetime, timedelta, date

DB_URL = "postgresql://postgres:pass@localhost:5432/askcn"
random.seed(42)

LENDERS = ["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak Mahindra"]
INSTITUTION_CODES = ["HDFC", "ICICI", "SBI", "AXIS", "KOTAK"]

PRODUCTS = [
    ("PL001", "Personal Loan", "RETAIL", "UNSECURED", 50000, 500000),
    ("BL001", "Business Loan", "BUSINESS", "SECURED", 200000, 5000000),
    ("HL001", "Home Loan", "RETAIL", "SECURED", 1000000, 10000000),
    ("VL001", "Vehicle Loan", "RETAIL", "SECURED", 100000, 1500000),
    ("MFL001", "Micro Finance Loan", "MICROFINANCE", "UNSECURED", 10000, 100000),
    ("GL001", "Group Loan", "MICROFINANCE", "UNSECURED", 5000, 50000),
    ("CC001", "Credit Card", "RETAIL", "UNSECURED", 10000, 200000),
    ("AL001", "Agriculture Loan", "AGRI", "SECURED", 50000, 500000),
    ("EL001", "Education Loan", "RETAIL", "UNSECURED", 100000, 2000000),
    ("B2B001", "B2B Loan", "BUSINESS", "SECURED", 500000, 10000000),
]

BRANCHES = [f"BR{str(i).zfill(3)}" for i in range(1, 31)]
STATES = [
    "Maharashtra",
    "Gujarat",
    "Karnataka",
    "Tamil Nadu",
    "Delhi",
    "Rajasthan",
    "UP",
    "MP",
    "Telangana",
    "Kerala",
]
CITIES = [
    "Mumbai",
    "Pune",
    "Ahmedabad",
    "Bangalore",
    "Chennai",
    "Delhi",
    "Jaipur",
    "Lucknow",
    "Hyderabad",
    "Kochi",
]

FIRST_NAMES = [
    "Amit",
    "Priya",
    "Rahul",
    "Sunita",
    "Vijay",
    "Anita",
    "Suresh",
    "Meera",
    "Rajesh",
    "Kavita",
    "Arun",
    "Deepa",
    "Sanjay",
    "Pooja",
    "Mahesh",
    "Rekha",
    "Ashish",
    "Neha",
    "Ravi",
    "Sneha",
    "Vikram",
    "Nisha",
    "Dinesh",
    "Anjali",
    "Kiran",
    "Manoj",
    "Geeta",
    "Ramesh",
    "Shweta",
    "Alok",
]

LAST_NAMES = [
    "Sharma",
    "Patel",
    "Singh",
    "Kumar",
    "Verma",
    "Gupta",
    "Joshi",
    "Mehta",
    "Shah",
    "Yadav",
    "Mishra",
    "Tiwari",
    "Pandey",
    "Dubey",
    "Sinha",
    "Rao",
    "Nair",
    "Iyer",
    "Pillai",
    "Reddy",
    "Patil",
    "Desai",
    "Jain",
    "Agarwal",
    "Chouhan",
    "Saxena",
    "Bansal",
    "Kapoor",
    "Malhotra",
    "Bhat",
]


def rname():
    return random.choice(FIRST_NAMES), random.choice(LAST_NAMES)


def rdate(s, e):
    return s + timedelta(days=random.randint(0, (e - s).days))


def get_bucket(dpd):
    thresholds = [
        (0, 0, "B0"),
        (1, 30, "B1"),
        (31, 60, "B2"),
        (61, 90, "B3"),
        (91, 120, "B4"),
        (121, 150, "B5"),
        (151, 180, "B6"),
        (181, 210, "B7"),
        (211, 240, "B8"),
        (241, 270, "B9"),
        (271, 300, "B10"),
        (301, 330, "B11"),
        (331, 360, "B12"),
    ]
    for lo, hi, code in thresholds:
        if lo <= dpd <= hi:
            return code
    return "B13"


def insert_lookups(cur):
    buckets = [
        ("B0", 1, 0, 0),
        ("B1", 2, 1, 30),
        ("B2", 3, 31, 60),
        ("B3", 4, 61, 90),
        ("B4", 5, 91, 120),
        ("B5", 6, 121, 150),
        ("B6", 7, 151, 180),
        ("B7", 8, 181, 210),
        ("B8", 9, 211, 240),
        ("B9", 10, 241, 270),
        ("B10", 11, 271, 300),
        ("B11", 12, 301, 330),
        ("B12", 13, 331, 360),
        ("B13", 14, 361, 9999),
    ]
    for code, no, s, e in buckets:
        cur.execute(
            "INSERT INTO cn_core.delinquency_bucket VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
            (code, f"Bucket {no - 1}", no, s, e),
        )

    for i, name in [(1, "Active"), (2, "Inactive"), (3, "Closed")]:
        cur.execute(
            "INSERT INTO cn_core.account_status VALUES (%s,%s) ON CONFLICT DO NOTHING",
            (i, name),
        )

    for code, name in [
        ("NRML", "Normal"),
        ("OD", "Overdue"),
        ("NL", "Normalized"),
        ("ST", "Stabilized"),
        ("RB", "Roll-back"),
        ("RF", "Roll-forward"),
    ]:
        cur.execute(
            "INSERT INTO cn_core.resolution_status VALUES (%s,%s) ON CONFLICT DO NOTHING",
            (code, name),
        )

    for p in PRODUCTS:
        cur.execute(
            "INSERT INTO cn_core.product_type VALUES (%s,%s,%s,%s) ON CONFLICT DO NOTHING",
            (p[0], p[1], p[2], p[3]),
        )
    print("Lookups done")


def insert_orgs(cur):
    ids = []
    for name, code in zip(LENDERS, INSTITUTION_CODES):
        cur.execute(
            "INSERT INTO uamdb.organization (organization_name,organization_code,organization_type_id,organization_status) VALUES (%s,%s,1,'Active') RETURNING organization_id",
            (name, code),
        )
        ids.append(cur.fetchone()[0])
    for i in range(1, 6):
        cur.execute(
            "INSERT INTO uamdb.organization (organization_name,organization_code,organization_type_id,organization_status) VALUES (%s,%s,2,'Active') RETURNING organization_id",
            (f"Collection Agency {i}", f"CA{i:03d}"),
        )
        ids.append(cur.fetchone()[0])
    print(f"Orgs: {len(ids)}")
    return ids


def insert_users(cur, org_ids):
    lender_orgs = org_ids[:5]

    def make_user(designation, role_id, manager_id):
        fn, ln = rname()
        suffix = random.randint(1000, 9999)
        uname = f"{fn.lower()}.{ln.lower()}{suffix}"
        status = "Active" if random.random() > 0.05 else "Inactive"
        cur.execute(
            """INSERT INTO uamdb.users (user_name,first_name,last_name,role_id,organization_id,
            reporting_manager_id,designation,base_branch_code,email,user_status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING user_id""",
            (
                uname,
                fn,
                ln,
                role_id,
                random.choice(lender_orgs),
                manager_id,
                designation,
                random.choice(BRANCHES),
                f"{uname}@collections.in",
                status,
            ),
        )
        return cur.fetchone()[0]

    nationals = [make_user("National Head", 5, None) for _ in range(5)]
    zonals = [
        make_user("Zonal Manager", 4, random.choice(nationals)) for _ in range(15)
    ]
    regionals = [
        make_user("Regional Manager", 3, random.choice(zonals)) for _ in range(30)
    ]
    fields = [
        make_user("Field Manager", 2, random.choice(regionals)) for _ in range(100)
    ]
    agents = [
        make_user("Collection Agent", 1, random.choice(fields)) for _ in range(360)
    ]

    total = len(nationals) + len(zonals) + len(regionals) + len(fields) + len(agents)
    print(f"Users: {total}")
    return dict(
        nationals=nationals,
        zonals=zonals,
        regionals=regionals,
        fields=fields,
        agents=agents,
    )


def insert_accounts(cur, users):
    # DPD distribution: 35% current, 15% 1-30, 15% 31-60, 10% 61-90, 25% 90+
    dpd_pool = (
        [0] * 7000
        + [random.randint(1, 30) for _ in range(3000)]
        + [random.randint(31, 60) for _ in range(3000)]
        + [random.randint(61, 90) for _ in range(2000)]
        + [random.randint(91, 365) for _ in range(5000)]
    )
    random.shuffle(dpd_pool)

    account_ids = []
    customer_ids = []

    for i in range(20000):
        fn, ln = rname()
        state, city = random.choice(STATES), random.choice(CITIES)
        cur.execute(
            """INSERT INTO cn_core.customer
            (customer_number,customer_name,customer_first_name,customer_last_name,
             primary_contact_no,primary_email,primary_address_state,primary_address_city,
             credit_score,record_status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,1) RETURNING id""",
            (
                f"CUST{i + 1:06d}",
                f"{fn} {ln}",
                fn,
                ln,
                f"9{random.randint(100000000, 999999999)}",
                f"{fn.lower()}{i}@mail.com",
                state,
                city,
                random.randint(300, 850),
            ),
        )
        cid = cur.fetchone()[0]
        customer_ids.append(cid)

        dpd = dpd_pool[i]
        lender_idx = i % len(LENDERS)
        lender = LENDERS[lender_idx]
        inst = INSTITUTION_CODES[lender_idx]
        prod = random.choice(PRODUCTS)
        lo, hi = prod[4], prod[5]

        loan = round(random.uniform(lo, hi), 2)
        disbursed = round(loan * random.uniform(0.85, 1.0), 2)
        principal = round(disbursed * random.uniform(0.1, 0.95), 2)
        interest = round(principal * random.uniform(0.01, 0.15), 2)
        charges = round(random.uniform(0, min(5000, principal * 0.02)), 2)
        total_out = round(principal + interest + charges, 2)
        overdue = (
            round(total_out * min(dpd / 180, 1.0) * random.uniform(0.3, 0.9), 2)
            if dpd > 0
            else 0
        )
        installment = round(loan / random.randint(12, 84), 2)
        paid = round(disbursed - principal, 2)
        mob = random.randint(1, 60)

        # Status flags with realistic correlation to DPD
        if dpd == 0:
            acct_status = 1  # Active
            npa = "N"
            settlement = "N"
            restructured = "N" if random.random() > 0.02 else "Y"
            writeoff = "N"
        elif dpd <= 90:
            acct_status = 1
            npa = "N"
            settlement = "Y" if random.random() > 0.9 else "N"
            restructured = "Y" if random.random() > 0.85 else "N"
            writeoff = "N"
        elif dpd <= 180:
            acct_status = 1
            npa = "Y" if random.random() > 0.3 else "N"
            settlement = "Y" if random.random() > 0.7 else "N"
            restructured = "Y" if random.random() > 0.7 else "N"
            writeoff = "N"
        else:
            acct_status = random.choices([1, 2, 3], weights=[50, 20, 30])[0]
            npa = "Y" if random.random() > 0.1 else "N"
            settlement = "Y" if random.random() > 0.6 else "N"
            restructured = "Y" if random.random() > 0.6 else "N"
            writeoff = "Y" if dpd > 270 and random.random() > 0.5 else "N"

        secured = "Y" if prod[3] == "SECURED" else "N"
        open_date = rdate(date(2019, 1, 1), date(2024, 1, 1))
        last_pay = (
            datetime.now() - timedelta(days=random.randint(1, 60))
            if dpd < 30
            else (
                datetime.now() - timedelta(days=random.randint(60, 180))
                if dpd < 90
                else None
            )
        )
        overdue_since = date.today() - timedelta(days=dpd) if dpd > 0 else None

        cur.execute(
            """INSERT INTO cn_core.account (
            account_number,customer_id,institution_code,lender_name,
            product_code,product_group_code,product_category_code,product_segment_code,
            branch_code,loan_amount,disbursed_amount,principal_outstanding_amount,
            interest_outstanding_amount,charges_outstanding_amount,total_outstanding_amount,
            total_overdue_amount,principal_overdue_amount,installment_amount,total_paid_amount,
            dpd,delinquency_bucket_code,account_status_id,npa_flag,secured_flag,
            settlement_flag,restructured_flag,actual_write_off_flag,
            last_payment_received_date,last_payment_received_amount,
            open_date,overdue_since_date,mob,interest_rate,tenure,
            total_no_of_installment,total_no_of_installment_paid,total_no_of_installment_overdue,
            record_status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id""",
            (
                f"ACC{i + 1:07d}",
                cid,
                inst,
                lender,
                prod[0],
                prod[2],
                prod[3],
                "Loan",
                random.choice(BRANCHES),
                loan,
                disbursed,
                principal,
                interest,
                charges,
                total_out,
                overdue,
                overdue * 0.8,
                installment,
                paid,
                dpd,
                get_bucket(dpd),
                acct_status,
                npa,
                secured,
                settlement,
                restructured,
                writeoff,
                last_pay,
                round(installment * random.uniform(0.8, 1.2), 2) if last_pay else None,
                open_date,
                overdue_since,
                mob,
                round(random.uniform(8, 24), 2),
                random.randint(12, 84),
                random.randint(12, 84),
                mob,
                max(0, dpd // 30),
                1,
            ),
        )
        account_ids.append(cur.fetchone()[0])

        if (i + 1) % 4000 == 0:
            print(f"  {i + 1}/20000 accounts")

    print(f"Accounts: {len(account_ids)}, Customers: {len(customer_ids)}")
    return account_ids, customer_ids


def insert_cases(cur, account_ids, users, org_ids):
    agency_ids = org_ids[5:]
    months = [
        (2024, 10),
        (2024, 11),
        (2024, 12),
        (2025, 1),
        (2025, 2),
        (2025, 3),
        (2025, 4),
        (2025, 5),
        (2025, 6),
        (2025, 7),
        (2025, 8),
        (2025, 9),
        (2025, 10),
        (2025, 11),
        (2025, 12),
        (2026, 1),
        (2026, 2),
        (2026, 3),
        (2026, 4),
    ]
    count = 0

    # Give each agent a performance tier: high/medium/low
    agent_perf = {
        uid: random.choices(["high", "medium", "low"], weights=[20, 50, 30])[0]
        for uid in users["fields"]
    }

    for acc_id in account_ids:
        num = random.randint(3, 8)
        selected = random.sample(months, min(num, len(months)))

        for year, month in selected:
            field = random.choice(users["fields"])
            tele = random.choice(users["agents"]) if random.random() > 0.3 else None
            t_agency = random.choice(agency_ids) if tele is None else None

            dpd = random.randint(0, 365)
            principal = round(random.uniform(10000, 2000000), 2)
            outstanding = round(principal * random.uniform(1.05, 1.2), 2)
            overdue = (
                round(outstanding * min(dpd / 180, 1) * random.uniform(0.2, 0.8), 2)
                if dpd > 0
                else 0
            )

            # Collected amount based on agent performance tier
            perf = agent_perf.get(field, "medium")
            if dpd == 0:
                collected = round(outstanding * random.uniform(0.8, 1.0), 2)
                col_status = "Collected"
            elif perf == "high":
                collected = round(outstanding * random.uniform(0.3, 0.7), 2)
                col_status = "Collected" if collected > 0 else "Outstanding"
            elif perf == "medium":
                collected = round(outstanding * random.uniform(0.05, 0.3), 2)
                col_status = "Collected" if collected > 0 else "Outstanding"
            else:
                collected = round(outstanding * random.uniform(0, 0.1), 2)
                col_status = "Collected" if collected > 0 else "Outstanding"

            res = random.choices(
                ["NRML", "OD", "NL", "ST", "RB", "RF"], weights=[15, 30, 15, 10, 10, 20]
            )[0]

            # Closed cases for older months
            is_recent = (year == 2026) or (year == 2025 and month >= 10)
            case_status = 1 if is_recent or random.random() > 0.4 else 2

            case_start = datetime(year, month, random.randint(1, 28))

            cur.execute(
                """INSERT INTO cn_core.collection_case (
                account_id,case_status_id,collection_status,resolution_status,
                case_owner_user_id,allocated_collection_user_id,
                allocated_tele_call_user_id,allocated_tele_call_agency_id,
                collected_amount,dpd,delinquency_bucket_code,
                total_outstanding_amount,principal_outstanding_amount,total_overdue_amount,
                case_start_dpd,case_start_total_outstanding_amount,
                case_start_principal_outstanding_amount,case_start_total_overdue_amount,
                case_start_date,case_year,case_month,collection_risk_category,account_priority)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (
                    acc_id,
                    case_status,
                    col_status,
                    res,
                    random.choice(users["nationals"]),
                    field,
                    tele,
                    t_agency,
                    collected,
                    dpd,
                    get_bucket(dpd),
                    outstanding,
                    principal,
                    overdue,
                    dpd,
                    outstanding,
                    principal,
                    overdue,
                    case_start,
                    year,
                    month,
                    random.choice(["Low", "Medium", "High"]),
                    random.randint(1, 10),
                ),
            )
            count += 1

        if acc_id % 5000 == 0:
            print(f"  {acc_id}/20000 accounts for cases")

    print(f"Cases: {count}")


def insert_payments(cur, account_ids, users):
    count = 0
    start = date(2024, 10, 1)
    end = date(2026, 4, 30)

    # High DPD accounts get fewer payments
    for _ in range(55000):
        acc_id = random.choice(account_ids)
        pay_date = rdate(start, end)
        amount = round(random.uniform(1000, 150000), 2)
        method = random.choice(["CASH", "CHEQUE", "NEFT", "IMPS", "UPI", "DD"])
        mode = random.choice(["Online", "Offline", "Mobile", "Branch"])
        agent = random.choice(users["agents"])
        status = random.choices(
            ["Realized", "Bounced", "Cancelled"], weights=[85, 10, 5]
        )[0]

        cur.execute(
            """INSERT INTO cn_core.payment_receipt (
            account_id,payment_amount,payment_date,payment_transaction_date,
            payment_status_code,payment_method,payment_mode,
            collected_by_user,payment_receipt_no,realized_date,record_status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,1)""",
            (
                acc_id,
                amount,
                datetime.combine(pay_date, datetime.min.time()),
                pay_date,
                status,
                method,
                mode,
                agent,
                f"RCP{count + 1:08d}",
                pay_date if status == "Realized" else None,
            ),
        )
        count += 1
        if count % 10000 == 0:
            print(f"  {count}/55000 payments")

    print(f"Payments: {count}")


def main():
    print("Connecting...")
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        insert_lookups(cur)
        conn.commit()
        org_ids = insert_orgs(cur)
        conn.commit()
        users = insert_users(cur, org_ids)
        conn.commit()
        acc_ids, _ = insert_accounts(cur, users)
        conn.commit()
        insert_cases(cur, acc_ids, users, org_ids)
        conn.commit()
        insert_payments(cur, acc_ids, users)
        conn.commit()

        print("\nSummary:")
        for table, label in [
            ("cn_core.account", "Accounts"),
            ("cn_core.customer", "Customers"),
            ("cn_core.collection_case", "Cases"),
            ("cn_core.payment_receipt", "Payments"),
            ("uamdb.users", "Users"),
        ]:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            print(f"  {label}: {cur.fetchone()[0]:,}")

        # Quick data check
        print("\nData checks:")
        cur.execute("SELECT npa_flag, COUNT(*) FROM cn_core.account GROUP BY npa_flag")
        print(f"  NPA flags: {cur.fetchall()}")
        cur.execute(
            "SELECT account_status_id, COUNT(*) FROM cn_core.account GROUP BY account_status_id ORDER BY 1"
        )
        print(f"  Account statuses: {cur.fetchall()}")
        cur.execute(
            "SELECT lender_name, COUNT(*) FROM cn_core.account GROUP BY lender_name ORDER BY 2 DESC"
        )
        print(f"  Lenders: {cur.fetchall()}")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
