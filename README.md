# Data Chat — Natural Language to SQL Analytics Assistant

**Team Name:** Agentic Starlords

**Contributors**

* **Pranav Matanhelia** — `thelethalghost`
* **Sayan Singha** — `SayanSingha07`
* **Sudip** — `popeye1235`

---

## Overview

**Data Chat** is an AI-powered analytics assistant that converts natural language questions into executable SQL queries against a PostgreSQL database and returns structured results with optional visualizations.

The system was designed to support multiple LLM providers simultaneously. **LangChain was used as an orchestration layer to inject schema context and manage interactions across models**, particularly where direct context management was not supported natively (e.g., certain Bedrock integrations).

This project was developed during an internal hackathon and focuses on building a practical, extensible architecture for real-world data querying workflows.

---

## Key Capabilities

* Natural language → SQL generation
* PostgreSQL database querying
* Multi-model LLM orchestration
* Context injection using LangChain
* SQL validation guardrails before execution
* Conversational memory support
* Query logging and traceability
* Result visualization for analytics dashboards
* Model evaluation and accuracy benchmarking

---

## Architecture

```text
User
  ↓
Next.js Chat Interface
  ↓
Python Backend API
  ↓
LangChain Orchestration Layer
  ├── Schema Context Builder
  ├── Model Router
  ├── Memory Manager
  ├── SQL Generator
  ├── Guardrail Validator
  └── Query Executor
  ↓
PostgreSQL Database
  ↓
Visualization Layer
```

---

## Multi-Model Design

The system was built to evaluate and compare multiple LLMs under the same schema and query workload.

### Models Used

The backend supports **four different models**, accessed through different mechanisms:

* Bedrock-hosted models
* Direct HTTPS-based model endpoints
* Open-weight instruction models
* High-capability reasoning models

LangChain was used to:

* Inject schema context consistently across models
* Standardize prompt structure
* Handle model switching
* Maintain conversation memory
* Provide a unified execution pipeline

This design allowed benchmarking model performance using identical queries and datasets.

---

## Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Chart.js

### Backend

* Python
* LangChain
* PostgreSQL
* REST APIs
* HTTPS model integrations

### AI / Data

* Natural language to SQL generation
* Schema linking
* Guardrail validation
* Multi-model evaluation
* Conversational memory

### Tooling

* PNPM / NPM
* Python virtual environments
* ESLint
* TypeScript

---

## Core Backend Components

### SQL Generation

File:

```text
sql_generator.py
```

Responsibilities:

* Convert natural language to SQL
* Use schema-aware prompts
* Generate executable queries

---

### Schema Linking

Files:

```text
schema_linking.py
schema_context.py
schemas.py
```

Responsibilities:

* Identify relevant tables and columns
* Build schema context for models
* Reduce prompt size and improve accuracy

---

### Guardrails

File:

```text
guardrail.py
```

Responsibilities:

* Validate generated SQL
* Prevent unsafe operations
* Ensure schema correctness

---

### Query Execution

Files:

```text
executor.py
database.py
```

Responsibilities:

* Connect to PostgreSQL
* Execute validated queries
* Return structured results

---

### Conversational Memory

File:

```text
memory.py
```

Responsibilities:

* Maintain session context
* Support multi-turn conversations
* Track user history

---

### Visualization

File:

```text
visualisation.py
```

Responsibilities:

* Convert query results into chart-friendly formats
* Support analytics dashboards

---

## Evaluation Framework

The project includes an internal evaluation system to compare model accuracy and behavior.

Artifacts:

```text
accuracy_results.json
results_llama4.txt
results_llama70b.txt
results_sonnet46.txt
results_nova.txt
tests/
```

Capabilities:

* Query correctness validation
* Ground truth comparison
* Model benchmarking
* Synthetic data testing
* Regression testing

---

## Example Workflow

1. User submits a natural language question
2. Schema context is generated
3. LangChain routes request to selected model
4. SQL query is generated
5. Guardrails validate query
6. Query is executed on PostgreSQL
7. Results are formatted
8. Visualization is returned to the UI

---

## Project Structure

```text
data-chat/

app/
  components/
    AnalyticsPage.tsx
    ReportsPage.tsx
    ChartRenderer.tsx
    HistorySidebar.tsx
    MessageBubble.tsx

backend/
  main.py
  sql_generator.py
  schema_linking.py
  schema_context.py
  guardrail.py
  executor.py
  memory.py
  visualisation.py
  database.py

  tests/
  logs/
  data/
```

---

## What This Project Demonstrates

* Building production-style LLM systems
* Multi-model orchestration using LangChain
* Schema-aware natural language interfaces
* Safe SQL execution pipelines
* Evaluation-driven model comparison
* Full-stack application development
* Rapid system design under hackathon constraints

---

## Future Improvements

* Streaming responses
* Role-based access control
* Query caching
* Model auto-selection
* Deployment automation
* Containerization
* Monitoring and observability

---

## Contributors

**Team Agentic Starlords**

* Pranav Matanhelia
* Sayan Singha
* Sudip

---

## License

MIT License

---

## Note

This project was developed as part of an internal hackathon and is presented here as a technical demonstration of applied LLM orchestration and data querying workflows.

