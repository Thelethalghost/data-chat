-- AskCN Demo Database Schema
-- PostgreSQL with cn_core and uamdb schemas

CREATE SCHEMA IF NOT EXISTS cn_core;
CREATE SCHEMA IF NOT EXISTS uamdb;

-- ── Lookup tables ─────────────────────────────────────────────

CREATE TABLE cn_core.delinquency_bucket (
    bucket_code     VARCHAR(10) PRIMARY KEY,
    bucket_name     VARCHAR(50) NOT NULL,
    bucket_no       INTEGER NOT NULL,
    dpd_start       INTEGER NOT NULL,
    dpd_end         INTEGER NOT NULL
);

CREATE TABLE cn_core.account_status (
    id                      INTEGER PRIMARY KEY,
    account_status_code     VARCHAR(20) NOT NULL
);

CREATE TABLE cn_core.resolution_status (
    resolution_status_code  VARCHAR(10) PRIMARY KEY,
    resolution_status_name  VARCHAR(50) NOT NULL
);

CREATE TABLE cn_core.product_type (
    product_code            VARCHAR(30) PRIMARY KEY,
    product_name            VARCHAR(100) NOT NULL,
    product_group_code      VARCHAR(30),
    product_category_code   VARCHAR(30)
);

-- ── UAMDB tables ──────────────────────────────────────────────

CREATE TABLE uamdb.organization (
    organization_id         SERIAL PRIMARY KEY,
    organization_name       VARCHAR(200) NOT NULL,
    organization_code       VARCHAR(50),
    organization_type_id    INTEGER,
    organization_status     VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE uamdb.users (
    user_id                 SERIAL PRIMARY KEY,
    user_name               VARCHAR(100) NOT NULL UNIQUE,
    first_name              VARCHAR(100),
    last_name               VARCHAR(100),
    role_id                 INTEGER,
    organization_id         INTEGER REFERENCES uamdb.organization(organization_id),
    reporting_manager_id    INTEGER,
    base_branch_code        VARCHAR(20),
    email                   VARCHAR(200),
    designation             VARCHAR(100),
    user_status             VARCHAR(20) DEFAULT 'Active'
);

-- ── CN_CORE main tables ───────────────────────────────────────

CREATE TABLE cn_core.customer (
    id                      SERIAL PRIMARY KEY,
    customer_number         VARCHAR(50) NOT NULL UNIQUE,
    customer_name           VARCHAR(200),
    customer_first_name     VARCHAR(100),
    customer_last_name      VARCHAR(100),
    primary_contact_no      VARCHAR(20),
    primary_email           VARCHAR(200),
    primary_address_state   VARCHAR(100),
    primary_address_city    VARCHAR(100),
    dpd                     INTEGER DEFAULT 0,
    credit_score            INTEGER,
    record_status           INTEGER DEFAULT 1,
    record_created_date     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cn_core.account (
    id                              SERIAL PRIMARY KEY,
    account_number                  VARCHAR(50) NOT NULL UNIQUE,
    customer_id                     INTEGER REFERENCES cn_core.customer(id),
    institution_code                VARCHAR(50),
    lender_name                     VARCHAR(200),
    product_code                    VARCHAR(30) REFERENCES cn_core.product_type(product_code),
    product_group_code              VARCHAR(30),
    product_category_code           VARCHAR(30),
    product_segment_code            VARCHAR(30),
    branch_code                     VARCHAR(20),
    loan_amount                     NUMERIC(18,2),
    disbursed_amount                NUMERIC(18,2),
    principal_outstanding_amount    NUMERIC(18,2),
    interest_outstanding_amount     NUMERIC(18,2),
    charges_outstanding_amount      NUMERIC(18,2),
    total_outstanding_amount        NUMERIC(18,2),
    total_overdue_amount            NUMERIC(18,2),
    principal_overdue_amount        NUMERIC(18,2),
    installment_amount              NUMERIC(18,2),
    total_paid_amount               NUMERIC(18,2),
    dpd                             INTEGER DEFAULT 0,
    delinquency_bucket_code         VARCHAR(10) REFERENCES cn_core.delinquency_bucket(bucket_code),
    account_status_id               INTEGER REFERENCES cn_core.account_status(id),
    npa_flag                        VARCHAR(1) DEFAULT 'N',
    npa_date                        DATE,
    settlement_flag                 VARCHAR(1) DEFAULT 'N',
    restructured_flag               VARCHAR(1) DEFAULT 'N',
    actual_write_off_flag           VARCHAR(1) DEFAULT 'N',
    write_off_amount                NUMERIC(18,2) DEFAULT 0,
    secured_flag                    VARCHAR(1) DEFAULT 'N',
    last_payment_received_date      TIMESTAMP,
    last_payment_received_amount    NUMERIC(18,2),
    open_date                       DATE,
    close_date                      DATE,
    overdue_since_date              DATE,
    mob                             INTEGER DEFAULT 0,
    interest_rate                   NUMERIC(8,4),
    tenure                          INTEGER,
    total_no_of_installment         INTEGER,
    total_no_of_installment_paid    INTEGER,
    total_no_of_installment_overdue INTEGER,
    record_status                   INTEGER DEFAULT 1,
    record_created_date             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    record_updated_date             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cn_core.collection_case (
    id                                      SERIAL PRIMARY KEY,
    account_id                              INTEGER REFERENCES cn_core.account(id),
    case_status_id                          INTEGER DEFAULT 1,
    collection_status                       VARCHAR(20) DEFAULT 'Outstanding',
    resolution_status                       VARCHAR(10) REFERENCES cn_core.resolution_status(resolution_status_code),
    case_owner_user_id                      INTEGER REFERENCES uamdb.users(user_id),
    allocated_collection_user_id            INTEGER REFERENCES uamdb.users(user_id),
    allocated_collection_agency_id          INTEGER REFERENCES uamdb.organization(organization_id),
    allocated_tele_call_user_id             INTEGER REFERENCES uamdb.users(user_id),
    allocated_tele_call_agency_id           INTEGER REFERENCES uamdb.organization(organization_id),
    collected_amount                        NUMERIC(18,2) DEFAULT 0,
    dpd                                     INTEGER DEFAULT 0,
    delinquency_bucket_code                 VARCHAR(10),
    total_outstanding_amount                NUMERIC(18,2),
    principal_outstanding_amount            NUMERIC(18,2),
    total_overdue_amount                    NUMERIC(18,2),
    case_start_dpd                          INTEGER,
    case_start_total_outstanding_amount     NUMERIC(18,2),
    case_start_principal_outstanding_amount NUMERIC(18,2),
    case_start_total_overdue_amount         NUMERIC(18,2),
    case_start_date                         TIMESTAMP,
    case_end_date                           TIMESTAMP,
    case_year                               INTEGER,
    case_month                              INTEGER,
    collection_risk_category                VARCHAR(20),
    account_priority                        INTEGER DEFAULT 0
);

CREATE TABLE cn_core.payment_receipt (
    id                          SERIAL PRIMARY KEY,
    account_id                  INTEGER REFERENCES cn_core.account(id),
    customer_id                 INTEGER REFERENCES cn_core.customer(id),
    payment_amount              NUMERIC(18,2),
    payment_date                TIMESTAMP,
    payment_transaction_date    DATE,
    payment_status_code         VARCHAR(20) DEFAULT 'Realized',
    payment_method              VARCHAR(50),
    payment_mode                VARCHAR(50),
    payment_type                VARCHAR(50),
    collected_by_user           INTEGER REFERENCES uamdb.users(user_id),
    payment_receipt_no          VARCHAR(50) UNIQUE,
    bounce_reason               VARCHAR(200),
    realized_date               DATE,
    bounced_date                DATE,
    record_status               INTEGER DEFAULT 1,
    record_created_date         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX idx_account_dpd ON cn_core.account(dpd);
CREATE INDEX idx_account_lender ON cn_core.account(lender_name);
CREATE INDEX idx_account_product ON cn_core.account(product_code);
CREATE INDEX idx_account_status ON cn_core.account(account_status_id);
CREATE INDEX idx_account_bucket ON cn_core.account(delinquency_bucket_code);
CREATE INDEX idx_collection_case_account ON cn_core.collection_case(account_id);
CREATE INDEX idx_collection_case_year_month ON cn_core.collection_case(case_year, case_month);
CREATE INDEX idx_collection_case_user ON cn_core.collection_case(allocated_collection_user_id);
CREATE INDEX idx_payment_account ON cn_core.payment_receipt(account_id);
CREATE INDEX idx_payment_date ON cn_core.payment_receipt(payment_transaction_date);
CREATE INDEX idx_payment_user ON cn_core.payment_receipt(collected_by_user);
