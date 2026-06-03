# Technical Architecture Document
## TradeLoop — Open-Source Multi-Agent AI Trading Intelligence

**Version:** 1.0  
**Status:** Draft  
**Author:** Architecture Review  
**Based on:** PRD v1.1  
**Last Updated:** June 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack — Every Choice Justified](#2-tech-stack--every-choice-justified)
3. [System Design & Component Map](#3-system-design--component-map)
4. [Complete File & Folder Structure](#4-complete-file--folder-structure)
5. [Database Schema — Full Specification](#5-database-schema--full-specification)
6. [API Contract — Endpoints & WebSocket Events](#6-api-contract--endpoints--websocket-events)
7. [LangGraph Agent Architecture](#7-langgraph-agent-architecture)
8. [Data Flow — An Analysis Run, Step by Step](#8-data-flow--an-analysis-run-step-by-step)
9. [Environment Variables — Complete Reference](#9-environment-variables--complete-reference)
10. [Docker & Deployment Configuration](#10-docker--deployment-configuration)
11. [Key Engineering Decisions & Trade-offs](#11-key-engineering-decisions--trade-offs)
12. [What to Build First — Sequenced Build Order](#12-what-to-build-first--sequenced-build-order)

---

## 1. Architecture Overview

TradeLoop is a **monorepo** containing two applications and shared infrastructure:

```
Browser (Next.js UI)
    │
    │  HTTP (REST)           WebSocket (ws://)
    │                              │
    ▼                              ▼
Next.js API Routes ──────▶ FastAPI (Python)
(thin proxy only)               │        │
                           LangGraph    Data
                           (8 agents)   Fetchers
                                │        │
                                └───┬────┘
                                    │
                          ┌─────────┴─────────┐
                          │                   │
                       SQLite               Redis
                    (analyses,          (task queue,
                     history)             WS pub/sub,
                                           cache)
                                    │
                                Celery Worker
                              (runs analyses in
                               background)
```

**Key architectural principles:**

1. **Python is the backend** — FastAPI handles all business logic, agents, and data. Next.js API routes are proxies only (< 10 lines each). Never add logic to Next.js routes.
2. **SQLite for V1** — single-user, self-hosted tool. No Postgres complexity until multi-user is a real requirement.
3. **All LLM calls go through one factory** — `apps/api/llm/factory.py` is the only place that knows about LLM providers. Agents never import OpenAI or Anthropic directly.
4. **Agent outputs are typed Pydantic models** — every agent returns a `AgentOutput` schema, never a raw string. This makes the frontend predictable.
5. **API keys live in `.env` only** — never stored in the database, never logged, never sent to the frontend.

---

## 2. Tech Stack — Every Choice Justified

### Frontend

#### Next.js 14+ (App Router) — TypeScript
**Why:** App Router gives you React Server Components for fast first load (important for the dashboard which can pre-render history), file-based routing that matches the app's information architecture perfectly, and built-in API routes that save you from running a separate proxy. The alternative was Vite + React Router — rejected because you'd need to handle SSR manually and set up a separate proxy for the FastAPI calls. Next.js gives all of that for free.

**What you're using it for:** All pages (Dashboard, War Room, Report, History, Settings), API route proxies to FastAPI, PDF download endpoints.

#### Tailwind CSS
**Why:** Utility-first CSS is the fastest way to build a consistent design system for a project where one person is building both backend and frontend. No fighting with CSS module scoping or styled-components overhead. Tailwind's JIT compiler means no bundle bloat. The alternative was plain CSS modules — rejected because you'd spend 30% of frontend time naming classes.

#### shadcn/ui
**Why:** Not a component library you install as a dependency — it's a collection of copy-paste components built on Radix UI primitives. You own the code, so you can modify anything without fighting library internals. Radix handles all accessibility (ARIA, keyboard navigation) for free. The alternative was MUI or Ant Design — rejected because they impose strong visual opinions that are hard to override, and they're heavy.

**Components you'll use:** Button, Card, Badge, Dialog, Dropdown, Tabs, Skeleton (for loading states), Toast (for errors), Sheet (for mobile sidebar).

#### lightweight-charts (TradingView)
**Why:** This is TradingView's open-source charting library. It is purpose-built for financial OHLCV data — candlestick charts, volume bars, line overlays. Recharts can technically do candlesticks but it's painful and the result looks like a generic chart. lightweight-charts renders via canvas (not SVG), handles 10,000+ data points without stuttering, and looks exactly like what users expect from a trading app. Zero alternative considered for the price chart.

**What you're using it for:** Candlestick chart on the report page with MA, RSI, MACD toggles.

#### Zustand
**Why:** Global state for the war room (which agents are complete, their partial outputs) needs to be shared across multiple components. React Context re-renders the whole tree on every update — bad for a real-time streaming UI. Zustand is a minimal (< 1KB) state library with selector-based subscriptions, meaning only the specific agent card that updated re-renders. Redux rejected for being overkill for a single-user app.

#### SWR
**Why:** For data fetching on the History and Dashboard pages. SWR handles caching, revalidation, and loading states with one hook call. You don't want to manage `useEffect` + `useState` + `loading` + `error` manually for every API call.

---

### Backend

#### FastAPI (Python 3.12+)
**Why:** The entire intelligence layer — LangGraph, LangChain, yfinance, pandas, PRAW — is Python. Running a Node.js backend alongside would mean cross-process HTTP calls just to reach Python agents. FastAPI gives you async request handling (critical for WebSocket streaming), automatic OpenAPI docs (invaluable for debugging during development), Pydantic v2 integration for request/response validation, and WebSocket support — all natively. Flask was considered but rejected because it doesn't support async natively and WebSocket support requires extensions.

#### LangGraph
**Why:** This is what TradingAgents (the inspiration project) uses, and it's the right tool. LangGraph models the agent pipeline as a directed graph — nodes are agents, edges define the flow. This means: (a) parallel execution of the four data-analyst agents is first-class, not a hack; (b) you can stream events as each node executes, powering the war room UI; (c) the graph state is a typed Python dataclass, so all inter-agent data passing is explicit and debuggable; (d) checkpoint/resume is built-in (useful for long analyses). The alternative was a hand-rolled async orchestrator — rejected because you'd rebuild LangGraph badly.

#### LangChain
**Why:** The only library that provides a unified interface across OpenAI, Anthropic, Gemini, DeepSeek, and Ollama with a single import swap. Without it, you'd write provider-specific code for each LLM. With it, `llm = ChatOpenAI(...)` and `llm = ChatAnthropic(...)` are interchangeable. Also provides structured output (`.with_structured_output(Schema)`) which is how agents return typed Pydantic objects instead of raw strings.

#### SQLAlchemy 2.0 (async)
**Why:** Python's standard ORM. Version 2.0's async support works natively with FastAPI's async handlers. Writing raw SQL is fine for simple projects but as the schema grows (and it will), migrations, relationships, and query composability become painful. SQLAlchemy + Alembic gives you a professional migration workflow from day one. The alternative was Tortoise ORM or raw sqlite3 — rejected because SQLAlchemy has the best ecosystem and Alembic support.

#### SQLite (V1)
**Why:** Single-user, self-hosted tool. SQLite is a single file (`tradeloop.db`) in the project directory. Zero configuration, zero separate service to run, can be backed up with `cp`. The entire app works with just Python and Node installed — no Postgres server needed. SQLAlchemy makes switching to Postgres later a one-line change in `DATABASE_URL`. The trade-off: no concurrent writes from multiple processes. Celery workers writing analysis results while the API is reading history is a real concurrency scenario — solved by using SQLite WAL mode (`PRAGMA journal_mode=WAL`), which allows concurrent readers and one writer.

#### Alembic
**Why:** Database schema will change. You'll add columns, change types, add tables. Without a migration tool, you're manually running ALTER TABLE statements and hoping you remember them. Alembic auto-generates migration files from SQLAlchemy model changes. Every schema change becomes a versioned, reversible migration file that goes into git.

#### Redis
**Why:** Three distinct jobs: (1) Celery's task queue broker — stores the task messages that workers pick up; (2) Pub/Sub for WebSocket streaming — the Celery worker publishes agent events to a Redis channel, the FastAPI WebSocket handler subscribes and forwards them to the browser; (3) Analysis result cache — if someone requests RELIANCE analysis and one was done 3 hours ago, serve the cached result. Redis is the right tool for all three. The alternative was using SQLite for the queue — rejected because SQLite is not designed for pub/sub messaging patterns.

#### Celery
**Why:** A full 8-agent analysis takes 60–150 seconds. You cannot block an HTTP request for 2 minutes — the browser will time out, load balancers will cut the connection, and users will think it crashed. Celery runs analyses as background tasks. The API creates the task, returns a `run_id` immediately, and the client subscribes to a WebSocket to receive progress. When the analysis completes, the result is written to SQLite. The alternative was FastAPI's `BackgroundTasks` — considered but rejected because it runs in the same process as the web server, so a CPU-heavy analysis would block other requests.

#### yfinance
**Why:** Free, no API key, covers all NSE (`.NS`) and BSE (`.BO`) tickers, returns price history, fundamentals (P/E, market cap, earnings), and income statement / balance sheet data. The data has a 15-minute delay for prices, which is perfectly acceptable for a research tool. The alternative was paying for TrueData or Kite Connect from day one — rejected for V1 because yfinance covers 90% of needs for free.

#### pandas-ta
**Why:** Computes all technical indicators (MACD, RSI, Bollinger Bands, EMA, SMA, ATR, etc.) as pandas DataFrame columns with one method call. Built on pandas so it integrates naturally with yfinance data. The alternative was TA-Lib — rejected because TA-Lib requires a C library installation that breaks Docker builds on some platforms and is notoriously painful to install on Windows.

#### PRAW (Python Reddit API Wrapper)
**Why:** Reddit is the best free source of Indian retail investor sentiment (r/IndiaInvestments, r/IndianStockMarket have hundreds of thousands of members). PRAW is the official Reddit API client for Python. Free tier allows sufficient requests for a personal tool.

#### feedparser
**Why:** Parsing RSS feeds from Economic Times, Moneycontrol, Mint, and NSE announcements. One-line feed parsing. No alternative needed — it's the standard Python RSS library.

#### WeasyPrint
**Why:** Generates PDFs from HTML/CSS. You write the report template as HTML (which you already have from the React report page), and WeasyPrint renders it to PDF with full CSS support. The alternative was ReportLab (programmatic PDF generation) — rejected because writing a complex report layout in ReportLab code is extremely tedious. WeasyPrint lets you reuse CSS from the web report.

---

### Infrastructure

#### Docker + Docker Compose
**Why:** The entire value proposition of TradeLoop as OSS is "clone and run." Without Docker, users need Python 3.12, Node 20, Redis, and the right system libraries installed. With Docker, they need nothing except Docker Desktop. `docker compose up` starts four services (web, api, worker, redis) with correct networking between them. Every developer's machine runs the exact same environment.

#### Turborepo (optional but recommended)
**Why:** Monorepo task runner. Runs `build`, `dev`, `lint`, and `test` across both `apps/web` and `apps/api` in parallel with dependency-aware ordering. Without it, you'd manually manage `cd apps/web && npm run dev & cd apps/api && uvicorn...` in multiple terminals. With it: `turbo dev` starts everything. Can be skipped in V1 if complexity feels like overhead — just use `docker compose up` for development too.

---

## 3. System Design & Component Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER                                     │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Dashboard   │  │   War Room   │  │    Full Report Page      │  │
│  │  (SWR fetch) │  │  (Zustand +  │  │  (Static after load)     │  │
│  │              │  │   WebSocket) │  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────────┘  │
└─────────┼────────────────┼────────────────────────────────────────┘
          │                │  WebSocket
          │ HTTP           │
┌─────────▼────────────────▼────────────────────────────────────────┐
│                    NEXT.JS API ROUTES                              │
│              (pure proxies — no logic here)                        │
│                                                                    │
│  POST /api/analysis → FastAPI POST /analyses                       │
│  GET  /api/analysis/[id] → FastAPI GET /analyses/{id}              │
│  GET  /api/history → FastAPI GET /analyses                         │
│  CRUD /api/watchlist → FastAPI /watchlist                          │
└───────────────────────────┬────────────────────────────────────────┘
                            │  HTTP to localhost:8000
┌───────────────────────────▼────────────────────────────────────────┐
│                       FASTAPI                                      │
│                   (apps/api/main.py)                               │
│                                                                    │
│  Routers:  /analyses  /watchlist  /tickers  /settings  /ws        │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                  Analysis Service                           │  │
│  │         (creates Celery task, returns run_id)               │  │
│  └──────────────────────────┬──────────────────────────────────┘  │
│                             │ enqueue                              │
│  ┌──────────────────────────▼──────────────────────────────────┐  │
│  │              WebSocket Handler (/ws/{run_id})               │  │
│  │      subscribes to Redis channel → forwards to browser      │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
          ┌────────────────────┼───────────────────┐
          │                   │                   │
   ┌──────▼──────┐    ┌───────▼──────┐    ┌──────▼──────┐
   │   SQLite    │    │    Redis     │    │   Celery    │
   │  (history,  │    │  (queue +    │    │   Worker    │
   │   reports)  │    │   pub/sub +  │    │  (runs the  │
   └─────────────┘    │   cache)     │    │  LangGraph) │
                      └──────────────┘    └──────┬──────┘
                                                 │
                              ┌──────────────────▼──────────────────┐
                              │           LANGGRAPH                 │
                              │      (apps/api/graph/)              │
                              │                                     │
                              │  ┌──────┐  ┌──────┐  ┌──────┐     │
                              │  │Fund. │  │Tech. │  │News  │  ← parallel
                              │  │Agent │  │Agent │  │Agent │     │
                              │  └──┬───┘  └──┬───┘  └──┬───┘     │
                              │     └──────────┴──────────┘        │
                              │              │                      │
                              │         ┌────▼────┐                 │
                              │         │Sentiment│                 │
                              │         │ Agent   │                 │
                              │         └────┬────┘                 │
                              │         ┌────▼────┐  ┌──────┐      │
                              │         │  Bull   │  │ Bear │  ← parallel
                              │         │Research │  │Resrch│      │
                              │         └────┬────┘  └──┬───┘      │
                              │              └──────┬───┘           │
                              │              ┌──────▼──────┐        │
                              │              │ Risk Manager│        │
                              │              └──────┬──────┘        │
                              │              ┌──────▼──────┐        │
                              │              │  Portfolio  │        │
                              │              │  Manager    │        │
                              │              └─────────────┘        │
                              └─────────────────────────────────────┘
                                                 │ publishes events
                                                 ▼
                                            Redis Pub/Sub
                                   (channel: "analysis:{run_id}")
```

---

## 4. Complete File & Folder Structure

Every file listed below has a purpose. Annotated inline.

```
tradeloop/
│
├── apps/
│   │
│   ├── web/                                   # Next.js 14 frontend
│   │   │
│   │   ├── app/                               # App Router root
│   │   │   ├── layout.tsx                     # Root layout: sidebar, theme provider, fonts
│   │   │   ├── page.tsx                       # Dashboard / home page
│   │   │   ├── globals.css                    # Tailwind base + CSS variables for dark/light
│   │   │   │
│   │   │   ├── analysis/
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx               # Analysis config: ticker input + date range
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx               # Full report page (reads completed analysis)
│   │   │   │       └── war-room/
│   │   │   │           └── page.tsx           # Live war room (WS + agent cards streaming)
│   │   │   │
│   │   │   ├── history/
│   │   │   │   └── page.tsx                   # Paginated list of past analyses
│   │   │   │
│   │   │   ├── watchlist/
│   │   │   │   └── page.tsx                   # Saved tickers; quick-launch analysis
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   └── page.tsx                   # BYOK key entry, model selection, preferences
│   │   │   │
│   │   │   └── api/                           # Next.js API routes (proxy only)
│   │   │       ├── analyses/
│   │   │       │   ├── route.ts               # GET (list) + POST (create) → FastAPI
│   │   │       │   └── [id]/
│   │   │       │       ├── route.ts           # GET analysis by ID → FastAPI
│   │   │       │       └── export/
│   │   │       │           └── route.ts       # GET PDF export → FastAPI (streams file)
│   │   │       ├── tickers/
│   │   │       │   └── search/
│   │   │       │       └── route.ts           # GET /api/tickers/search?q=reliance → FastAPI
│   │   │       ├── watchlist/
│   │   │       │   └── route.ts               # GET + POST + DELETE → FastAPI
│   │   │       └── settings/
│   │   │           └── route.ts               # GET + PUT → FastAPI
│   │   │
│   │   ├── components/
│   │   │   │
│   │   │   ├── ui/                            # shadcn/ui copies (owned by you)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   └── ...                        # Add as needed via `npx shadcn-ui@latest add`
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx                # Left nav: Dashboard, History, Watchlist, Settings
│   │   │   │   ├── Header.tsx                 # Top bar: ticker search, theme toggle
│   │   │   │   ├── ThemeToggle.tsx            # Dark/Light mode switch
│   │   │   │   └── Providers.tsx              # Wraps app in ThemeProvider + SWR config
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   ├── SearchBar.tsx              # Main ticker search with fuzzy autocomplete
│   │   │   │   ├── RecentAnalysesList.tsx     # Last 5 analyses with verdict badges
│   │   │   │   └── WatchlistQuickBar.tsx      # Pinned tickers for one-click rerun
│   │   │   │
│   │   │   ├── war-room/
│   │   │   │   ├── WarRoomBoard.tsx           # The animated agent status grid
│   │   │   │   ├── AgentStatusRow.tsx         # Single agent row: icon + name + status + preview
│   │   │   │   ├── AgentStatusIcon.tsx        # Animated icons: spinner, check, error, queued
│   │   │   │   └── EtaBar.tsx                 # Estimated time remaining progress bar
│   │   │   │
│   │   │   ├── report/
│   │   │   │   ├── ThesisCard.tsx             # Hero card: BUY/HOLD/SELL verdict + conviction
│   │   │   │   ├── AgentReportCard.tsx        # Expandable card for each agent's full report
│   │   │   │   ├── PriceChart.tsx             # lightweight-charts wrapper: OHLCV + overlays
│   │   │   │   ├── OverlayToggle.tsx          # MA/RSI/MACD toggle buttons for the chart
│   │   │   │   ├── KeyMetricsBar.tsx          # P/E, Market Cap, 52W High/Low strip
│   │   │   │   ├── RiskBadge.tsx              # Coloured risk rating badge
│   │   │   │   ├── VerdictBadge.tsx           # BUY (green) / HOLD (yellow) / SELL (red) pill
│   │   │   │   ├── DisclaimerBanner.tsx       # Required disclaimer — always visible, not collapsible
│   │   │   │   └── ExportButton.tsx           # Triggers PDF download
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── ApiKeyForm.tsx             # Provider selector + key input + test connection btn
│   │   │       ├── ModelSelector.tsx          # Dropdown of models for chosen provider
│   │   │       └── ConnectionTest.tsx         # Shows ✓ valid / ✗ invalid after test
│   │   │
│   │   ├── hooks/
│   │   │   ├── useWarRoom.ts                  # Manages WebSocket connection + Zustand store updates
│   │   │   ├── useAnalysisList.ts             # SWR hook for history page
│   │   │   ├── useAnalysis.ts                 # SWR hook for single report page
│   │   │   ├── useWatchlist.ts                # SWR hook + mutations for watchlist
│   │   │   ├── useTickerSearch.ts             # Debounced search with SWR
│   │   │   └── useSettings.ts                # SWR hook for settings page
│   │   │
│   │   ├── store/
│   │   │   └── warRoomStore.ts                # Zustand store: agent statuses + partial outputs
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts                         # Typed fetch wrapper (base URL, error handling)
│   │   │   ├── websocket.ts                   # WS singleton with reconnect logic
│   │   │   ├── formatters.ts                  # INR formatting, date formatting, % formatting
│   │   │   └── constants.ts                   # AGENT_NAMES, VERDICT_COLORS, AGENT_ORDER, etc.
│   │   │
│   │   ├── types/
│   │   │   └── index.ts                       # All shared TS types (Analysis, AgentReport, etc.)
│   │   │
│   │   ├── public/
│   │   │   ├── logo.svg
│   │   │   └── favicon.ico
│   │   │
│   │   ├── package.json
│   │   ├── next.config.ts                     # rewrites: /api/* → FastAPI (dev only; prod uses env)
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   └── api/                                   # FastAPI Python backend
│       │
│       ├── main.py                            # App entry point: creates FastAPI instance,
│       │                                      # includes all routers, configures CORS, lifespan
│       │
│       ├── config.py                          # Pydantic BaseSettings: reads all .env vars,
│       │                                      # validates types, provides typed settings object
│       │
│       ├── database.py                        # SQLAlchemy async engine + session factory,
│       │                                      # Base declarative class, get_db dependency
│       │
│       ├── models/                            # SQLAlchemy ORM table definitions
│       │   ├── __init__.py                    # Imports all models (needed for Alembic discovery)
│       │   ├── analysis.py                    # Analysis table
│       │   ├── agent_report.py                # AgentReport table
│       │   ├── watchlist.py                   # WatchlistItem table
│       │   ├── ticker_cache.py                # TickerMetadata cache table
│       │   └── settings.py                    # AppSettings key-value table
│       │
│       ├── schemas/                           # Pydantic models for API requests/responses
│       │   ├── __init__.py
│       │   ├── analysis.py                    # AnalysisCreate, AnalysisResponse, AnalysisList
│       │   ├── agent_report.py                # AgentReportResponse, AgentOutput (LLM output schema)
│       │   ├── watchlist.py                   # WatchlistItemCreate, WatchlistItemResponse
│       │   ├── ticker.py                      # TickerSearchResult, TickerInfo
│       │   └── settings.py                    # SettingsRead, SettingsUpdate
│       │
│       ├── routers/                           # FastAPI route handlers (thin; call services)
│       │   ├── __init__.py
│       │   ├── analyses.py                    # POST /analyses, GET /analyses, GET /analyses/{id},
│       │   │                                  # DELETE /analyses/{id}
│       │   ├── export.py                      # GET /analyses/{id}/export (returns PDF bytes)
│       │   ├── watchlist.py                   # CRUD /watchlist
│       │   ├── tickers.py                     # GET /tickers/search, GET /tickers/{symbol}/info
│       │   ├── settings.py                    # GET /settings, PUT /settings, POST /settings/test
│       │   └── websocket.py                   # WS /ws/analyses/{run_id}
│       │
│       ├── agents/                            # Individual agent logic
│       │   ├── __init__.py
│       │   ├── base.py                        # BaseAgent: abstract class, run(), format_output()
│       │   ├── fundamentals_analyst.py        # Fetches financials, prompts LLM, returns schema
│       │   ├── technical_analyst.py           # Fetches OHLCV, computes indicators, prompts LLM
│       │   ├── sentiment_analyst.py           # Fetches Reddit posts, prompts LLM
│       │   ├── news_analyst.py                # Fetches RSS + NSE announcements, prompts LLM
│       │   ├── bull_researcher.py             # Synthesises all data into bull thesis
│       │   ├── bear_researcher.py             # Synthesises all data into bear thesis
│       │   ├── risk_manager.py                # Evaluates risk from all inputs
│       │   └── portfolio_manager.py           # Final verdict: reads all agent outputs
│       │
│       ├── graph/                             # LangGraph orchestration
│       │   ├── __init__.py
│       │   ├── state.py                       # GraphState TypedDict: all shared data between agents
│       │   ├── nodes.py                       # Node functions: wrap each agent, publish events
│       │   └── builder.py                     # Builds and compiles the StateGraph
│       │
│       ├── data/                              # Data fetchers (pure functions, no LLM)
│       │   ├── __init__.py
│       │   ├── price_fetcher.py               # yfinance: OHLCV history, returns cleaned DataFrame
│       │   ├── fundamentals_fetcher.py        # yfinance: income stmt, balance sheet, ratios
│       │   ├── news_fetcher.py                # feedparser: ET, Moneycontrol, Mint RSS feeds
│       │   ├── announcements_fetcher.py       # NSE corporate announcements endpoint scraper
│       │   ├── sentiment_fetcher.py           # PRAW: subreddit search by ticker, last 30 days
│       │   └── ticker_resolver.py             # "reliance" → "RELIANCE.NS" + fuzzy match
│       │
│       ├── llm/
│       │   ├── __init__.py
│       │   └── factory.py                     # get_llm(provider, model, api_key) → LangChain LLM
│       │                                      # Supports: openai, anthropic, google, deepseek, ollama
│       │
│       ├── services/
│       │   ├── __init__.py
│       │   ├── analysis_service.py            # Creates DB record, enqueues Celery task, returns id
│       │   └── export_service.py              # Renders HTML report template → WeasyPrint PDF bytes
│       │
│       ├── tasks/
│       │   ├── __init__.py
│       │   └── analysis_tasks.py              # @celery.task run_analysis(analysis_id):
│       │                                      # runs LangGraph, writes results to DB, publishes events
│       │
│       ├── utils/
│       │   ├── __init__.py
│       │   ├── cache.py                       # Redis helpers: get_cached_analysis, set_cache
│       │   ├── events.py                      # Publish AgentEvent to Redis pub/sub channel
│       │   └── formatting.py                  # Formatters: INR, percentage, date strings
│       │
│       ├── templates/
│       │   └── report.html                    # WeasyPrint HTML template for PDF export
│       │
│       ├── migrations/                        # Alembic
│       │   ├── env.py
│       │   ├── script.py.mako
│       │   └── versions/
│       │       └── 001_initial_schema.py      # First migration: creates all tables
│       │
│       ├── tests/
│       │   ├── conftest.py                    # Pytest fixtures: test DB, mock LLM, test client
│       │   ├── test_agents/
│       │   │   ├── test_fundamentals.py
│       │   │   └── test_technical.py
│       │   ├── test_data/
│       │   │   ├── test_price_fetcher.py
│       │   │   └── test_ticker_resolver.py
│       │   └── test_routers/
│       │       ├── test_analyses.py
│       │       └── test_watchlist.py
│       │
│       ├── requirements.txt                   # Pinned production deps
│       ├── requirements-dev.txt               # pytest, httpx, black, ruff, mypy
│       ├── pyproject.toml                     # Black + Ruff config
│       └── alembic.ini
│
├── docker/
│   ├── web.Dockerfile                         # Multi-stage: deps → build → runner
│   ├── api.Dockerfile                         # Python slim: installs requirements, runs uvicorn
│   └── worker.Dockerfile                      # Same as api.Dockerfile but CMD is celery worker
│
├── docker-compose.yml                         # Production-like compose: all 4 services
├── docker-compose.dev.yml                     # Dev overrides: volume mounts, hot reload
├── .env.example                               # Template with all variables, none filled in
├── .env                                       # GITIGNORED — your actual keys
├── .gitignore
├── turbo.json                                 # Turborepo pipeline (optional)
├── package.json                               # Root: scripts for turbo or direct commands
├── README.md
├── CONTRIBUTING.md
└── LICENSE                                    # MIT
```

---

## 5. Database Schema — Full Specification

> All tables use SQLite in V1. The schema is designed to be Postgres-compatible — switching requires only changing `DATABASE_URL`.

---

### Table: `analyses`

**Plain English:** This is the master record for every stock analysis run. One row per analysis, created the moment a user hits "Run Analysis," updated as the analysis progresses.

```sql
CREATE TABLE analyses (
    id              TEXT PRIMARY KEY,           -- UUID4, generated in Python before DB insert
    ticker          TEXT NOT NULL,              -- Canonical ticker symbol, e.g. "RELIANCE.NS"
    display_ticker  TEXT NOT NULL,              -- Display form, e.g. "RELIANCE"
    company_name    TEXT NOT NULL,              -- "Reliance Industries Limited"
    exchange        TEXT NOT NULL,              -- "NSE" or "BSE"
    date_from       DATE NOT NULL,              -- Start of the analysis window (YYYY-MM-DD)
    date_to         DATE NOT NULL,              -- End of the analysis window (YYYY-MM-DD)
    depth           TEXT NOT NULL DEFAULT 'full',  -- "quick" (3 agents) or "full" (8 agents)
    status          TEXT NOT NULL DEFAULT 'pending',
                                                -- "pending" | "running" | "complete" | "error"
    verdict         TEXT,                       -- NULL until complete. "BUY"|"HOLD"|"SELL"|"AVOID"
    conviction_score REAL,                      -- NULL until complete. Float 1.0–10.0
    risk_rating     TEXT,                       -- NULL until complete. "low"|"medium"|"high"|"speculative"
    target_price_low  REAL,                     -- Lower bound of Portfolio Manager's target range (INR)
    target_price_high REAL,                     -- Upper bound of target range (INR)
    bull_summary    TEXT,                       -- 2–3 sentence bull case (from Portfolio Manager)
    bear_summary    TEXT,                       -- 2–3 sentence bear case (from Portfolio Manager)
    key_assumptions TEXT,                       -- JSON array of strings: assumptions the thesis depends on
    key_risks       TEXT,                       -- JSON array of strings: top 3–5 risks
    llm_provider    TEXT NOT NULL,              -- Which provider was used: "openai"|"anthropic"|"google"|etc.
    llm_model       TEXT NOT NULL,              -- Which model: "gpt-4o-mini", "claude-sonnet-4-5", etc.
    total_tokens_used INTEGER DEFAULT 0,        -- Sum of tokens across all agents (for user awareness)
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at      DATETIME,                   -- When Celery worker actually began (may lag creation)
    completed_at    DATETIME,                   -- When Portfolio Manager finished
    error_message   TEXT                        -- NULL unless status = "error"
);
```

**Indexes:**
```sql
CREATE INDEX idx_analyses_status     ON analyses(status);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);  -- for history page ordering
CREATE INDEX idx_analyses_ticker     ON analyses(ticker);            -- for watchlist re-run lookup
```

**Relationships:** One `analyses` row → many `agent_reports` rows.

---

### Table: `agent_reports`

**Plain English:** One row per agent per analysis. If an analysis has all 8 agents, there will be 8 rows in this table for that analysis. This table is populated progressively as each agent finishes — not all at once.

```sql
CREATE TABLE agent_reports (
    id              TEXT PRIMARY KEY,           -- UUID4
    analysis_id     TEXT NOT NULL,              -- Foreign key → analyses.id
    agent_type      TEXT NOT NULL,              -- "fundamentals" | "technical" | "sentiment" |
                                                -- "news" | "bull" | "bear" | "risk" | "portfolio_manager"
    status          TEXT NOT NULL DEFAULT 'pending',
                                                -- "pending" | "running" | "complete" | "error" | "skipped"
    summary         TEXT,                       -- 2–3 sentence headline summary (shown in collapsed card)
    full_reasoning  TEXT,                       -- Full markdown text of the agent's reasoning
    key_findings    TEXT,                       -- JSON array: [{finding: "...", sentiment: "positive|negative|neutral"}]
    confidence      TEXT,                       -- "low" | "medium" | "high"
    data_sources    TEXT,                       -- JSON array: [{name: "Yahoo Finance", as_of: "2026-06-03"}]
    tokens_used     INTEGER DEFAULT 0,          -- Token count for this agent's LLM call
    started_at      DATETIME,
    completed_at    DATETIME,
    error_message   TEXT,                       -- NULL unless status = "error"

    FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
);
```

**Indexes:**
```sql
CREATE INDEX idx_agent_reports_analysis_id ON agent_reports(analysis_id);
CREATE UNIQUE INDEX idx_agent_reports_unique ON agent_reports(analysis_id, agent_type);
-- Ensures only one report per agent per analysis run
```

**Relationship:** Many `agent_reports` → one `analyses`. When an `analyses` row is deleted (CASCADE), all its `agent_reports` are deleted too.

---

### Table: `watchlist_items`

**Plain English:** The user's saved tickers for quick access. Simple list — no per-item metadata beyond the ticker info.

```sql
CREATE TABLE watchlist_items (
    id              TEXT PRIMARY KEY,           -- UUID4
    ticker          TEXT NOT NULL UNIQUE,       -- "INFY.NS" — unique per user (single-user app)
    display_ticker  TEXT NOT NULL,              -- "INFY"
    company_name    TEXT NOT NULL,              -- "Infosys Limited"
    exchange        TEXT NOT NULL,              -- "NSE"
    sector          TEXT,                       -- "Technology" (from ticker metadata)
    notes           TEXT,                       -- Optional freetext the user can add
    added_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_analysed_at DATETIME,                  -- Updated when user runs analysis from watchlist
    last_verdict    TEXT                        -- Last BUY/HOLD/SELL for quick-glance display
);
```

**No foreign keys** — watchlist items are independent of analyses. A ticker can be in the watchlist even if it has never been analysed.

---

### Table: `ticker_metadata_cache`

**Plain English:** When a user searches for "tata motors" or runs analysis on TATAMOTORS, we fetch ticker metadata from yfinance. This table caches that metadata so we don't make repeated API calls for the same ticker. Cache entries expire after 24 hours.

```sql
CREATE TABLE ticker_metadata_cache (
    ticker          TEXT PRIMARY KEY,           -- "TATAMOTORS.NS" — canonical yfinance form
    display_ticker  TEXT NOT NULL,              -- "TATAMOTORS"
    company_name    TEXT NOT NULL,              -- "Tata Motors Limited"
    exchange        TEXT NOT NULL,              -- "NSE"
    sector          TEXT,                       -- "Consumer Cyclical"
    industry        TEXT,                       -- "Auto Manufacturers"
    market_cap      REAL,                       -- In INR (can be very large number)
    current_price   REAL,                       -- Last known price (not real-time)
    currency        TEXT DEFAULT 'INR',
    isin            TEXT,                       -- International Securities Identification Number
    cached_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                -- Used to determine if cache is stale (> 24h = refetch)
);
```

**Note on usage:** Before every analysis, `ticker_resolver.py` first checks this table. If found and `cached_at` < 24 hours ago, skip the yfinance metadata call and use the cached row.

---

### Table: `app_settings`

**Plain English:** Key-value store for user preferences that should persist across app restarts. This is NOT where API keys go (those stay in `.env`). This stores UI preferences like chosen LLM provider, default model, analysis depth preference, chart preferences.

```sql
CREATE TABLE app_settings (
    key             TEXT PRIMARY KEY,           -- e.g. "default_llm_provider", "default_model",
                                                -- "default_analysis_depth", "chart_theme",
                                                -- "analysis_cache_ttl_hours"
    value           TEXT NOT NULL,              -- Always stored as string; parse in application layer
    value_type      TEXT NOT NULL DEFAULT 'string',
                                                -- "string" | "integer" | "float" | "boolean" | "json"
                                                -- Tells the app how to deserialise the value
    description     TEXT,                       -- Human-readable description (shown in settings UI)
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Seed data (inserted on first run):**
```sql
INSERT INTO app_settings VALUES
    ('default_llm_provider', 'openai',    'string',  'LLM provider for all agents', CURRENT_TIMESTAMP),
    ('default_model',        'gpt-4o-mini','string', 'Default model within provider', CURRENT_TIMESTAMP),
    ('default_depth',        'full',       'string', 'full or quick analysis', CURRENT_TIMESTAMP),
    ('cache_ttl_hours',      '12',         'integer','Hours to cache repeated analyses', CURRENT_TIMESTAMP),
    ('chart_default_days',   '180',        'integer','Days of price history shown on load', CURRENT_TIMESTAMP);
```

---

### Entity Relationship Diagram (Text)

```
analyses (1) ──────────────────── (many) agent_reports
    │                                         │
    │  analysis_id links them                 │
    │  CASCADE DELETE: deleting an analysis   │
    │  removes all its agent reports          │
    │                                         │
    └─ no FK to watchlist_items               │
       (analyses are independent)             │
                                              │
watchlist_items (independent)                 │
                                              │
ticker_metadata_cache (independent cache)     │
                                              │
app_settings (independent key-value)          │
```

---

### Schema Design Decisions Explained

**Why UUIDs for primary keys, not auto-increment integers?**
Run IDs are passed in URLs (`/analysis/550e8400-e29b-41d4-a716-446655440000`) and in WebSocket channel names (`analysis:550e8400...`). Integers are guessable — user 1 could request analysis ID 5 and see someone else's data. With a self-hosted single-user app this doesn't matter today, but the habit is worth keeping. UUIDs also survive database merges if you ever combine two instances.

**Why store `key_assumptions` and `key_risks` as JSON strings instead of separate tables?**
They're always read together with the analysis. A separate table would require a JOIN on every report page load. Since this data is never filtered or sorted individually, denormalising as a JSON column in SQLite is the right call.

**Why `display_ticker` as a separate column from `ticker`?**
`ticker` is the canonical form yfinance needs (`RELIANCE.NS`). `display_ticker` is what humans want to see (`RELIANCE`). Having both means you never need to strip/add the `.NS` suffix in UI code.

---

## 6. API Contract — Endpoints & WebSocket Events

### REST Endpoints (FastAPI)

```
POST   /analyses
       Body:  { ticker: "RELIANCE", date_from: "2026-01-01", date_to: "2026-06-01", depth: "full" }
       Returns: { id: "uuid", status: "pending", ticker: "RELIANCE.NS", company_name: "..." }
       Side effect: Creates DB row, enqueues Celery task

GET    /analyses
       Query: ?page=1&page_size=20&ticker=RELIANCE
       Returns: { items: [...], total: 45, page: 1, page_size: 20 }

GET    /analyses/{id}
       Returns: Full analysis object including all agent_reports

DELETE /analyses/{id}
       Returns: 204 No Content. Cascades to agent_reports.

GET    /analyses/{id}/export
       Returns: PDF bytes (Content-Type: application/pdf)
       This is a synchronous endpoint — generates PDF on demand

GET    /tickers/search?q=tata+motors
       Returns: [{ ticker: "TATAMOTORS.NS", display: "TATAMOTORS", name: "Tata Motors...", exchange: "NSE" }]

GET    /tickers/{symbol}/info
       Returns: Full ticker metadata from cache or fresh yfinance fetch

GET    /watchlist
POST   /watchlist      Body: { ticker: "INFY", ... }
DELETE /watchlist/{id}

GET    /settings
PUT    /settings       Body: { key: "default_model", value: "gpt-4o" }
POST   /settings/test  Body: { provider: "openai", api_key: "sk-..." }
       Returns: { valid: true, model_list: ["gpt-4o", "gpt-4o-mini", ...] }
       Note: This is the ONLY endpoint that receives an API key. It is never stored.
```

### WebSocket Events

**Endpoint:** `ws://localhost:8000/ws/analyses/{run_id}`

The client connects immediately after creating an analysis. The server sends a stream of JSON events. The client disconnects after receiving `analysis_complete` or `analysis_error`.

```typescript
// TypeScript type for all WS events
type WarRoomEvent =
  | { type: "agent_started";    agent: AgentType; timestamp: string }
  | { type: "agent_streaming";  agent: AgentType; chunk: string }   // partial text as it streams
  | { type: "agent_complete";   agent: AgentType; summary: string; confidence: "low"|"medium"|"high" }
  | { type: "agent_error";      agent: AgentType; error: string }
  | { type: "analysis_complete"; verdict: Verdict; conviction: number }
  | { type: "analysis_error";   error: string }
  | { type: "heartbeat" }       // sent every 15s to keep connection alive
```

---

## 7. LangGraph Agent Architecture

### GraphState — the shared data object passed between nodes

```python
# apps/api/graph/state.py

from typing import TypedDict, Optional
from datetime import date

class GraphState(TypedDict):
    # ── Input ──────────────────────────────────────────────
    analysis_id:        str
    ticker:             str          # "RELIANCE.NS"
    display_ticker:     str          # "RELIANCE"
    company_name:       str
    date_from:          date
    date_to:            date
    depth:              str          # "quick" | "full"

    # ── Raw Data (populated by data fetch node) ────────────
    price_data:         Optional[dict]   # OHLCV DataFrame as dict
    fundamentals_data:  Optional[dict]   # income stmt, balance sheet
    news_items:         Optional[list]   # list of {title, source, date, url}
    announcements:      Optional[list]   # NSE/BSE announcements
    reddit_posts:       Optional[list]   # list of {title, body, score, date}
    technical_data:     Optional[dict]   # computed indicators (MACD, RSI, etc.)

    # ── Agent Outputs (populated as each agent runs) ───────
    fundamentals_report:   Optional[dict]
    technical_report:      Optional[dict]
    sentiment_report:      Optional[dict]
    news_report:           Optional[dict]
    bull_thesis:           Optional[dict]
    bear_thesis:           Optional[dict]
    risk_assessment:       Optional[dict]
    final_verdict:         Optional[dict]

    # ── Metadata ───────────────────────────────────────────
    errors:             list[str]    # accumulates non-fatal errors
```

### Graph Execution Flow

```python
# apps/api/graph/builder.py

from langgraph.graph import StateGraph, END
from .state import GraphState
from .nodes import (
    fetch_all_data,
    run_fundamentals,  run_technical,
    run_sentiment,     run_news,
    run_bull,          run_bear,
    run_risk,          run_portfolio_manager,
    save_results
)

def build_graph() -> StateGraph:
    graph = StateGraph(GraphState)

    # Node definitions
    graph.add_node("fetch_data",          fetch_all_data)
    graph.add_node("fundamentals",        run_fundamentals)
    graph.add_node("technical",           run_technical)
    graph.add_node("sentiment",           run_sentiment)
    graph.add_node("news",                run_news)
    graph.add_node("bull_researcher",     run_bull)
    graph.add_node("bear_researcher",     run_bear)
    graph.add_node("risk_manager",        run_risk)
    graph.add_node("portfolio_manager",   run_portfolio_manager)
    graph.add_node("save_results",        save_results)

    # Entry
    graph.set_entry_point("fetch_data")

    # After data fetch: run 4 analyst agents in PARALLEL
    graph.add_edge("fetch_data", "fundamentals")
    graph.add_edge("fetch_data", "technical")
    graph.add_edge("fetch_data", "sentiment")
    graph.add_edge("fetch_data", "news")

    # After all 4 analysts: run bull + bear in PARALLEL
    # (LangGraph uses a join node pattern here)
    for node in ["fundamentals", "technical", "sentiment", "news"]:
        graph.add_edge(node, "bull_researcher")
        graph.add_edge(node, "bear_researcher")

    # After bull + bear: risk manager
    graph.add_edge("bull_researcher", "risk_manager")
    graph.add_edge("bear_researcher", "risk_manager")

    # Final chain
    graph.add_edge("risk_manager",      "portfolio_manager")
    graph.add_edge("portfolio_manager", "save_results")
    graph.add_edge("save_results",      END)

    return graph.compile()
```

### Agent Output Schema (Pydantic, used with `.with_structured_output()`)

```python
# apps/api/schemas/agent_report.py

from pydantic import BaseModel, Field
from typing import Literal

class KeyFinding(BaseModel):
    finding:   str
    sentiment: Literal["positive", "negative", "neutral"]

class DataSource(BaseModel):
    name:   str    # "Yahoo Finance"
    as_of:  str    # "2026-06-03"

class AgentOutput(BaseModel):
    summary:       str              = Field(..., description="2-3 sentence summary for the card header")
    full_reasoning: str             = Field(..., description="Full markdown analysis, 200-500 words")
    key_findings:  list[KeyFinding] = Field(..., min_length=3, max_length=7)
    confidence:    Literal["low", "medium", "high"]
    data_sources:  list[DataSource]

class FinalVerdictOutput(AgentOutput):
    verdict:           Literal["BUY", "HOLD", "SELL", "AVOID"]
    conviction_score:  float         = Field(..., ge=1.0, le=10.0)
    risk_rating:       Literal["low", "medium", "high", "speculative"]
    target_price_low:  float | None
    target_price_high: float | None
    bull_summary:      str           = Field(..., description="2-3 sentence bull case")
    bear_summary:      str           = Field(..., description="2-3 sentence bear case")
    key_assumptions:   list[str]     = Field(..., min_length=2, max_length=5)
    key_risks:         list[str]     = Field(..., min_length=2, max_length=5)
```

---

## 8. Data Flow — An Analysis Run, Step by Step

This traces exactly what happens when a user types `TATASTEEL` and clicks "Run Analysis":

```
1.  USER
    Types "TATASTEEL" in the search bar.
    SearchBar component calls GET /api/tickers/search?q=tatasteel (debounced 300ms)
    Returns: "TATASTEEL.NS" + "Tata Steel Limited"
    User selects it, picks date range (defaults to last 90 days), clicks Run.

2.  NEXT.JS (POST /api/analyses)
    Next.js API route receives the form data.
    Proxies to FastAPI: POST http://api:8000/analyses
    with body: { ticker: "TATASTEEL.NS", date_from: "2026-03-01",
                 date_to: "2026-06-01", depth: "full" }

3.  FASTAPI — analyses router (POST /analyses)
    Calls analysis_service.create_analysis().
    Generates UUID: run_id = "a3f7..."
    Inserts analyses row: status="pending"
    Enqueues Celery task: run_analysis.delay(run_id)
    Returns immediately: { id: "a3f7...", status: "pending" }

4.  BROWSER — redirects to /analysis/a3f7.../war-room
    useWarRoom hook opens WebSocket: ws://localhost:8000/ws/analyses/a3f7...
    War room page renders with all 8 agents in "Queued" state.

5.  CELERY WORKER — picks up run_analysis("a3f7...")
    Updates DB: status="running", started_at=now()
    Publishes event: { type: "agent_started", agent: "fetch_data" }

6.  LANGGRAPH — fetch_data node
    price_fetcher.py:        yfinance.download("TATASTEEL.NS", period="90d") → DataFrame
    fundamentals_fetcher.py: yf.Ticker("TATASTEEL.NS").financials, .balance_sheet
    news_fetcher.py:         feedparser.parse("economictimes.com/rss") → filter for "Tata Steel"
    announcements_fetcher.py: NSE announcements endpoint → filter for "TATASTEEL"
    sentiment_fetcher.py:    PRAW search r/IndiaInvestments + r/IndianStockMarket → "TATASTEEL"
    technical_data:          pandas_ta.add_all_ta_features(price_df) → RSI, MACD, BB, etc.
    All data stored in GraphState.

7.  LANGGRAPH — parallel fan-out (4 agents at once)
    
    fundamentals_analyst.py:
        Builds prompt: system_prompt + formatted financials data
        Calls: llm.with_structured_output(AgentOutput).invoke(messages)
        Publishes: { type: "agent_complete", agent: "fundamentals", summary: "..." }
        Writes agent_reports row to DB
    
    technical_analyst.py:    (same pattern, technical data)
    sentiment_analyst.py:    (same pattern, reddit posts)
    news_analyst.py:         (same pattern, news headlines + announcements)

8.  WEBSOCKET — browser receives 4 agent_complete events
    War room UI: Fundamentals ✅, Technical ✅, News ✅, Sentiment ✅
    Agent cards render with summaries.

9.  LANGGRAPH — parallel: bull_researcher + bear_researcher
    Both receive ALL 4 analyst reports via GraphState.
    Bull constructs strongest possible buy case.
    Bear constructs strongest possible sell case.
    Both publish events, write to DB.

10. LANGGRAPH — risk_manager
    Receives all 6 previous reports.
    Evaluates downside risk, macro environment, position sizing context.
    Writes to DB, publishes event.

11. LANGGRAPH — portfolio_manager
    Receives ALL 7 previous reports.
    Makes final BUY/HOLD/SELL/AVOID call.
    Returns FinalVerdictOutput (includes verdict, conviction, target range, etc.)
    Writes to DB, publishes: { type: "analysis_complete", verdict: "HOLD", conviction: 7.2 }

12. CELERY WORKER — save_results node
    Updates analyses row: status="complete", verdict="HOLD", conviction_score=7.2,
    completed_at=now(), all other final fields.

13. WEBSOCKET — browser receives analysis_complete
    War room auto-redirects to: /analysis/a3f7.../
    Full report page renders with all agent cards + final thesis + price chart.
    WebSocket connection closes.
```

**Total elapsed time:** ~60–120 seconds (parallel agent execution, gated by LLM API latency)

---

## 9. Environment Variables — Complete Reference

Every variable your app reads from `.env`, what it's for, whether it's required or optional, and what the safe default is.

```bash
# ════════════════════════════════════════════════════════════════
# LLM PROVIDERS — provide at least ONE
# Keys are READ-ONLY in the app; never written to DB, never logged
# ════════════════════════════════════════════════════════════════

OPENAI_API_KEY=
# Format: sk-proj-... (OpenAI project key) or sk-... (legacy)
# Get it: https://platform.openai.com/api-keys
# Required if: DEFAULT_LLM_PROVIDER=openai

ANTHROPIC_API_KEY=
# Format: sk-ant-...
# Get it: https://console.anthropic.com/
# Required if: DEFAULT_LLM_PROVIDER=anthropic

GOOGLE_API_KEY=
# Format: AIza...
# Get it: https://aistudio.google.com/app/apikey
# Required if: DEFAULT_LLM_PROVIDER=google

DEEPSEEK_API_KEY=
# Format: sk-...
# Get it: https://platform.deepseek.com/api_keys
# Required if: DEFAULT_LLM_PROVIDER=deepseek

OLLAMA_BASE_URL=http://localhost:11434
# Default: http://localhost:11434
# Only set this if you're running Ollama locally.
# In Docker, if Ollama runs on the host: http://host.docker.internal:11434

# ════════════════════════════════════════════════════════════════
# LLM DEFAULTS — which provider + model to use out of the box
# Users can override these in the Settings UI (stored in app_settings table)
# ════════════════════════════════════════════════════════════════

DEFAULT_LLM_PROVIDER=openai
# Options: "openai" | "anthropic" | "google" | "deepseek" | "ollama"

DEFAULT_LLM_MODEL=gpt-4o-mini
# Recommended defaults by provider:
#   openai:    gpt-4o-mini (cheap, fast) or gpt-4o (better reasoning)
#   anthropic: claude-haiku-4-5-20251001 (fast) or claude-sonnet-4-6 (better)
#   google:    gemini-2.0-flash (fast, cheap)
#   deepseek:  deepseek-chat (very cheap, surprisingly good)
#   ollama:    llama3.2 or mistral (free, local, slower)

# COST GUIDANCE (per full 8-agent analysis, approximate):
#   gpt-4o-mini:        ~$0.02–0.05  (~₹2–4)
#   gpt-4o:             ~$0.20–0.50  (~₹17–42)
#   claude-haiku:       ~$0.01–0.03  (~₹1–3)
#   claude-sonnet:      ~$0.15–0.40  (~₹13–34)
#   gemini-2.0-flash:   ~$0.01–0.03  (~₹1–3)
#   deepseek-chat:      ~$0.005–0.02 (~₹0.4–2)
#   ollama (local):     $0.00

# ════════════════════════════════════════════════════════════════
# DATABASE
# ════════════════════════════════════════════════════════════════

DATABASE_URL=sqlite+aiosqlite:///./tradeloop.db
# SQLite (default, V1): sqlite+aiosqlite:///./tradeloop.db
# Postgres (V2+):       postgresql+asyncpg://user:pass@host:5432/tradeloop
# The file path is relative to where uvicorn is started (project root in Docker)

# ════════════════════════════════════════════════════════════════
# REDIS
# ════════════════════════════════════════════════════════════════

REDIS_URL=redis://localhost:6379/0
# Docker Compose: redis://redis:6379/0 (uses service name "redis")
# Local dev:      redis://localhost:6379/0
# Database 0 = Celery task queue
# Database 1 = Pub/Sub (hardcoded in events.py)
# Database 2 = Analysis cache (hardcoded in cache.py)

# ════════════════════════════════════════════════════════════════
# CELERY
# ════════════════════════════════════════════════════════════════

CELERY_BROKER_URL=redis://redis:6379/0
# Same Redis for broker. Can be different Redis instance in production.

CELERY_RESULT_BACKEND=redis://redis:6379/0
# Where Celery stores task results (in addition to our SQLite writes).

# ════════════════════════════════════════════════════════════════
# OPTIONAL INDIAN DATA SOURCES
# If key is missing, the relevant fetcher skips that source gracefully
# ════════════════════════════════════════════════════════════════