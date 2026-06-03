# Product Requirements Document
## TradeLoop — Open-Source Multi-Agent AI Trading Intelligence for the Indian Market

**Version:** 1.1  
**Status:** Draft  
**Project Type:** Open Source (MIT License)  
**Model:** Bring Your Own Key (BYOK)  
**Last Updated:** June 2026  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Target Users & Personas](#3-target-users--personas)
4. [What TradeLoop Does](#4-what-tradeloop-does)
5. [Core Features — Must-Have vs. Nice-to-Have](#5-core-features--must-have-vs-nice-to-have)
6. [User Flow — Start to Finish](#6-user-flow--start-to-finish)
7. [MVP Scope](#7-mvp-scope)
8. [Success Metrics (OSS Edition)](#8-success-metrics-oss-edition)
9. [Deliberately Out of Scope for V1](#9-deliberately-out-of-scope-for-v1)
10. [Architecture](#10-architecture)
11. [Indian Market Data Sources](#11-indian-market-data-sources)
12. [Self-Hosting & Developer Setup](#12-self-hosting--developer-setup)
13. [OSS Community & Contribution Strategy](#13-oss-community--contribution-strategy)
14. [Disclaimer & Legal Note](#14-disclaimer--legal-note)

---

## 1. Executive Summary

**TradeLoop** is an open-source, self-hostable web application that brings a team of AI agents — each playing a specialised role in a virtual trading firm — to analyse Indian equities (NSE/BSE). It is the Indian-market equivalent of [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents), rebuilt with a polished Next.js UI, a FastAPI + LangGraph Python backend, and deep integration with Indian financial data sources.

Users bring their own LLM API keys (OpenAI, Anthropic, Gemini, DeepSeek, Ollama — anything LangChain supports). TradeLoop uses those keys to orchestrate 8 specialised agents that reason over Indian market data and produce a structured, readable investment thesis — with a live animated "war room" UI showing the agents working in real time.

**It is a research tool, not a trading platform. No orders. No broker integration. No paid tiers. Just pure intelligence.**

The name **TradeLoop** reflects the core insight: great trading decisions are not linear — they are iterative loops of analysis, debate, refinement, and synthesis. The agents loop through each other's reasoning until a coherent thesis emerges.

---

## 2. Problem Statement

### TradingAgents Is Great. But It's Not Indian.

TradingAgents (81k+ GitHub stars as of 2026) proved that multi-agent LLM frameworks for trading analysis resonate enormously with developers and finance enthusiasts. But it has three gaps that matter for Indian users:

| Gap | TradingAgents | TradeLoop |
|---|---|---|
| **Data sources** | Finnhub, Yahoo (US-first), Reddit US, StockTwits | NSE/BSE APIs, Indian news RSS, Indian Reddit communities, BSE filings |
| **Market context** | US tickers, USD, S&P/NASDAQ framing | NSE/BSE tickers, INR, Nifty/Sensex framing |
| **UI** | CLI only (`python -m tradingagents`) | Full web UI — war room, report cards, charts |

Beyond TradingAgents' gap, the broader problem is: **no open-source tool exists that lets an Indian developer or enthusiast run a self-hosted, multi-agent AI research system on Indian stocks with a great UI.** TradeLoop is that tool.

### Why BYOK + OSS is the Right Model

- **Zero infrastructure cost for the project maintainer** — users pay OpenAI/Anthropic themselves
- **No data privacy concerns** — user's API keys and analysis never touch a central server
- **Removes SEBI commercial advice risk** — a personal/research tool is categorically different from a commercial advisory service
- **Attracts contributors** — developers can extend agents, add new data sources, or swap LLM providers freely
- **Runs locally if needed** — with Ollama, the whole thing works fully offline

---

## 3. Target Users & Personas

Since this is OSS and personal-use, users are people who will **clone, configure, and self-host** TradeLoop.

### Persona 1: Aryan — The Developer-Investor
- **Profile:** Full-stack or ML developer, active in Indian markets, comfortable with Docker and `.env` files
- **Goal:** A slick local tool to analyse stocks before investing; doesn't want a SaaS subscription
- **Behaviour:** Will star the repo, self-host with Docker Compose, maybe send a PR to add a new data source
- **Key Need:** Easy setup (`git clone` → `docker compose up` → works), clean UI, good README

### Persona 2: Nikhil — The Quant / Finance Nerd
- **Profile:** CFA-track, works in finance or fintech, follows TradingAgents / QuantConnect-type projects
- **Goal:** Understand how multi-agent LLM analysis works; extend it for personal research
- **Behaviour:** Forks the repo, modifies agent prompts, contributes improvements upstream
- **Key Need:** Modular, well-documented agent code; easy to swap LLM or add a new agent

### Persona 3: Meera — The Curious Retail Investor
- **Profile:** Non-developer; follows IndiaInvestments on Reddit, interested in AI
- **Goal:** Wants to try the tool; may not self-host but will use a demo deployment a friend set up
- **Behaviour:** Uses the UI only; won't touch code; gives feedback in GitHub Issues or Discord
- **Key Need:** The UI must be so intuitive that zero onboarding is needed

### Persona 4: The Contributor
- **Profile:** Any developer who uses TradeLoop and wants to improve it
- **Goal:** Add a missing Indian data source, improve an agent prompt, add a new feature
- **Behaviour:** Opens Issues, submits PRs, participates in Discussions
- **Key Need:** Clean codebase, good contribution guide, responsive maintainer

---

## 4. What TradeLoop Does

A user navigates to their self-hosted TradeLoop instance, enters a stock ticker (e.g., `INFY`, `TATAMOTORS`, `HDFCBANK`) and an analysis date range. TradeLoop then spins up a team of 8 AI agents — each powered by the LLM API key the user configured — that work in parallel and in sequence to produce a comprehensive investment research report.

### The Agent Team

| Agent | Role | Indian Data Source |
|---|---|---|
| **Fundamentals Analyst** | Quarterly P&L, balance sheet, ROE, debt levels, promoter pledging, peer comparison | `yfinance` (`.NS`/`.BO`), FinEdge API (optional), Screener.in |
| **Technical Analyst** | Price/volume history, MACD, RSI, Bollinger Bands, support/resistance levels | `yfinance`, `ta` library (Python) |
| **Sentiment Analyst** | Retail mood from Reddit r/IndiaInvestments, r/IndianStockMarket, Twitter/X (Indian finance community) | Reddit API (PRAW), optional Twitter/X API |
| **News Analyst** | Economic Times, Moneycontrol, Mint headlines; NSE/BSE corporate announcements; RBI/SEBI policy news | RSS feeds (free), NSE announcements endpoint |
| **Bull Researcher** | Constructs the strongest possible bull thesis from all agent data | Synthesis layer |
| **Bear Researcher** | Constructs the strongest possible bear thesis from all agent data | Synthesis layer |
| **Risk Manager** | Position sizing context, downside scenarios, macro risks (RBI rate cycle, FII flows, sector headwinds) | NSE data, synthesised from above |
| **Portfolio Manager** | Final synthesiser — produces BUY / HOLD / SELL / AVOID with full reasoning | All of the above |

### The Workflow Loop (Why It's Called TradeLoop)

```
Data Fetch → Individual Agent Analysis → Bull/Bear Debate → Risk Assessment → Final Thesis
     ↑                                                                              │
     └──────────────────── Can re-run with new date / updated data ────────────────┘
```

---

## 5. Core Features — Must-Have vs. Nice-to-Have

### 🔴 Must-Have (V1 MVP)

#### F1 — Stock Analysis Engine
- Input: NSE/BSE ticker + optional date range (defaults to last 90 days)
- Resolves common name → ticker automatically (e.g., "reliance" → `RELIANCE.NS`)
- Supports all Nifty 500 stocks at minimum
- Agents run with LangGraph; parallel execution where possible

#### F2 — BYOK Configuration Screen
- First-run setup screen (or Settings page) where user enters:
  - LLM provider (OpenAI / Anthropic / Google Gemini / DeepSeek / Ollama)
  - API key for chosen provider
  - Model selection (e.g., `gpt-4o`, `claude-sonnet-4-5`, `gemini-2.0-flash`)
- Keys stored only in local `.env` or browser localStorage — never sent anywhere except the chosen LLM API
- "Test Connection" button to validate key before running analysis

#### F3 — Live War Room UI
- Animated agent status board: Idle → Fetching Data → Analysing → Complete → Error
- Streaming text output per agent as they generate (SSE / WebSocket)
- No blank loading screens — the UI is alive while agents work
- ETA indicator based on typical run times

#### F4 — Agent Report Cards
Each agent produces a card with:
- 2–3 sentence headline summary
- Key findings (bullet list)
- Confidence level: Low / Medium / High
- Expandable "full reasoning" section showing the agent's complete output
- Data sources cited (with dates)

#### F5 — Final Investment Thesis Card
- Verdict: **BUY / HOLD / SELL / AVOID** (prominently displayed)
- Conviction score: 1–10 (consensus across agents)
- Bull case summary (2–3 lines)
- Bear case summary (2–3 lines)
- Key risks
- Key assumptions
- **Disclaimer prominently displayed** (see Section 14)

#### F6 — Interactive Price Chart
- Candlestick chart (last 6 months default, adjustable)
- Toggle overlays: MA20, MA50, MA200, MACD, RSI, Bollinger Bands
- Volume bars
- Annotations: mark the analysis date, flag key news events

#### F7 — Analysis History (Local)
- Past analyses stored in local DB (SQLite for self-hosted simplicity)
- List view with ticker, date, verdict, conviction score
- Click to re-open any past report
- Simple compare: "run again" to see if verdict changes

#### F8 — Report Export
- Export full report as clean PDF (all agent cards + final thesis + chart screenshot + disclaimer)
- Copy shareable JSON of the report structure (for developers)

#### F9 — Dark Mode / Light Mode
- This is non-negotiable for a developer-focused tool. Dark mode default.

#### F10 — Docker Compose Setup (One-Command Deploy)
- `docker compose up` should give a working TradeLoop instance
- `.env.example` pre-filled with all required and optional variables
- README covers setup in under 10 minutes

---

### 🟡 Nice-to-Have (V2 / Community Contributions)

#### N1 — Backtesting Mode
Run agents on a historical date, then show what actually happened to the stock. The killer feature for building community trust.

#### N2 — Sector Sweep
Run a lightweight analysis across all stocks in a sector (e.g., all Nifty IT stocks) and produce a sentiment heatmap. Great for discovering entry points.

#### N3 — Multi-Stock Comparison
Side-by-side agent analysis of two tickers. Useful for relative value decisions.

#### N4 — Ollama / Local LLM Support (Full)
Full compatibility with local models (Llama 3, Mistral, etc.) via Ollama — so the entire app runs with zero API cost. Even the original TradingAgents supports this.

#### N5 — Prompt Customisation UI
Let power users edit agent system prompts from the UI without touching code. Makes TradeLoop a platform, not just a tool.

#### N6 — IPO Analysis Mode
Dedicated flow for upcoming IPOs — reads DRHP filings, GMP data, subscription data, promoter background.

#### N7 — F&O Snapshot
A lightweight add-on card showing Nifty option chain context for the stock's sector/index — not a full F&O analysis, just context.

#### N8 — Hindi Summary Toggle
One-click translation of the final thesis card to Hindi. Opens the tool to a much wider non-English-first audience.

#### N9 — Webhook / API Mode
Run analyses via REST API call and receive results via webhook — for developers who want to script TradeLoop into their own workflows.

#### N10 — Plugin System
Allow community-built agent "plugins" (e.g., a Pledging Analyser agent, a Corporate Governance agent). This is the long-term moat.

---

## 6. User Flow — Start to Finish

```
[ FIRST TIME ]
git clone https://github.com/yourhandle/tradeloop
cp .env.example .env
# User edits .env with their API key
docker compose up
Open http://localhost:3000
       │
       ▼
[ ONBOARDING SCREEN ] (only on first launch, no .env API key detected)
  - "Welcome to TradeLoop"
  - Select LLM provider → paste API key → test connection → Save
  - Option: Use Ollama (local, free) with setup guide link
       │
       ▼
[ DASHBOARD ]
  ┌──────────────────────────────────────────┐
  │  🔍 "Search NSE/BSE symbol or name..."  │
  │  Recent Analyses                          │
  │  [Quick access: RELIANCE | INFY | NIFTY50]│
  └──────────────────────────────────────────┘
       │  User types "TATASTEEL" + hits Enter
       ▼
[ ANALYSIS CONFIG ] (optional, can skip with defaults)
  - Date range (default: last 90 days)
  - Analysis depth: Quick (Fundamentals + Technical + Final) / Full (all 8 agents)
  - Confirm: "Run Analysis →"
       │
       ▼
[ WAR ROOM — LIVE ]
  ┌──────────────────────────────────────────────────────────────┐
  │  TATA STEEL LIMITED  ·  NSE: TATASTEEL  ·  ₹153.40          │
  │  ⏱ Running full analysis · ~90 seconds                       │
  │                                                               │
  │  ██ Fundamentals Analyst   ✅ Complete (Q4 FY25 analysed)    │
  │  ██ Technical Analyst      ✅ Complete (RSI: 58, Bullish MA) │
  │  ██ News Analyst           🔄 Scanning ET/MC headlines...    │
  │  ░░ Sentiment Analyst      ⏳ Queued                          │
  │  ░░ Bull Researcher        ⏳ Queued                          │
  │  ░░ Bear Researcher        ⏳ Queued                          │
  │  ░░ Risk Manager           ⏳ Queued                          │
  │  ░░ Portfolio Manager      ⏳ Queued                          │
  └──────────────────────────────────────────────────────────────┘
       │  Agents complete; cards appear as they finish
       ▼
[ FULL REPORT PAGE ]
  ┌──────────────────────────────────────────────────────────────┐
  │  ★ PORTFOLIO MANAGER VERDICT                                 │
  │  ┌──────────────────┐  Conviction: 7.2/10                   │
  │  │      HOLD        │  Risk: Medium                         │
  │  └──────────────────┘  Target Range: ₹148–172              │
  ├──────────────────────────────────────────────────────────────┤
  │  [Price Chart with overlays]                                  │
  ├──────────────────────────────────────────────────────────────┤
  │  ▼ Fundamentals Analyst   ▼ Technical Analyst               │
  │  ▼ News Analyst           ▼ Sentiment Analyst               │
  │  ▼ Bull Researcher        ▼ Bear Researcher                 │
  │  ▼ Risk Manager                                              │
  ├──────────────────────────────────────────────────────────────┤
  │  [ 📥 Export PDF ]  [ 🔁 Re-run ]  [ 💾 Save to History ]  │
  └──────────────────────────────────────────────────────────────┘
       │
       ▼
[ HISTORY ] — accessible from sidebar
  - Table: Ticker | Date | Verdict | Conviction | LLM Used
  - Click row → full report
```

---

## 7. MVP Scope

TradeLoop MVP is the **minimum build that is genuinely useful, genuinely beautiful, and genuinely shareable on GitHub.** If it ships ugly or broken, it won't get stars. If it ships without Indian data, it's just a TradingAgents fork.

### In MVP

| Area | Spec |
|---|---|
| **Stocks** | All Nifty 500 (NSE `.NS` tickers via yfinance) |
| **Agents** | All 8 — Fundamentals, Technical, Sentiment, News, Bull, Bear, Risk, Portfolio Manager |
| **LLM providers** | OpenAI, Anthropic Claude, Google Gemini, DeepSeek (via LangChain) |
| **Data sources** | yfinance (price + fundamentals), NSE corporate announcements RSS, ET/Moneycontrol RSS, Reddit PRAW |
| **UI** | Next.js, dark mode, war room, report cards, price chart, history |
| **Export** | PDF report |
| **Deployment** | Docker Compose (Postgres + Redis + FastAPI + Next.js) |
| **Setup time** | Target: < 10 minutes from `git clone` to first analysis |
| **Local LLM** | Ollama support (basic — may not be perfect, but documented) |

### MVP Success Bar
> "A developer in India can clone this repo, add their OpenAI key, run `docker compose up`, type `INFY`, and get a full 8-agent research report with a beautiful UI in under 3 minutes."

---

## 8. Success Metrics (OSS Edition)

Forget revenue. These are the metrics that matter for an OSS project.

### Traction
| Metric | Month 1 | Month 3 | Month 6 |
|---|---|---|---|
| GitHub Stars | 200 | 1,000 | 3,000+ |
| Forks | 30 | 150 | 500 |
| Unique contributors (PRs merged) | 3 | 10 | 25 |
| Discord / community members | 50 | 200 | 500 |

### Usage Quality
| Metric | Target |
|---|---|
| Setup success rate (issues opened about "can't get it running") | < 5% of clones |
| Analysis completion rate (no errors for valid tickers) | > 95% |
| P95 full analysis time (8 agents) | < 3 minutes |
| README "time to working" | < 10 minutes |

### Community Health
| Metric | Target |
|---|---|
| Median issue response time | < 48 hours |
| PRs from non-maintainer contributors | > 30% of merged PRs by Month 3 |
| Show-and-tell posts (Twitter/X, Reddit, LinkedIn) | Organic, not tracked — just watch for them |

### Derivative Impact
- Being listed in "Awesome LLM Finance" or "Awesome India Fintech" curated lists
- Cited by other OSS projects as a dependency or inspiration
- HN / ProductHunt / Reddit r/learnmachinelearning posts (organic)

---

## 9. Deliberately Out of Scope for V1

| Feature | Why Not V1 |
|---|---|
| **Trade execution / broker API** | Fundamentally different product. TradeLoop analyses. It never trades. |
| **Real-time tick data** | yfinance with 15-min delay is sufficient for research. Real-time adds infra cost and complexity. |
| **F&O analysis** | Option chain + Greeks = entirely separate domain. Post-V1 plugin. |
| **Portfolio-level analysis** | Multi-stock weight optimisation is complex. Single-stock first. |
| **Mobile app** | Web responsive is enough. Native app is a massive effort for marginal gain. |
| **Multi-user auth / teams** | It's a personal tool. No login, no user accounts, no multi-tenancy in V1. Just localhost. |
| **Alerts / scheduled runs** | Needs a cron system and notification infra. Deferred. |
| **Backtesting** | Valuable, but architecturally separate. Community contribution candidate. |
| **Hindi / regional language UI** | English-first. Community can contribute i18n. |
| **Crypto / commodities** | NSE/BSE equities only. |
| **Saving API keys to a database** | Keys live in `.env` only. Never stored in DB. Security non-negotiable. |
| **A hosted/cloud version** | Out of scope permanently unless there's a strong reason. Self-host is the philosophy. |

---

## 10. Architecture

### The Stack (Final Answer — No Express)

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                 │
│                    Next.js 14+ (App Router)                     │
│                                                                  │
│  • Pages: Dashboard, War Room, Report, History, Settings        │
│  • Next.js API routes: thin proxy layer to FastAPI              │
│  • WebSocket client: receives live agent stream                 │
│  • Recharts: price chart + technical overlays                   │
│  • Tailwind CSS + shadcn/ui: component library                  │
│  • Dark mode default                                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────▼──────────────────────────────────────┐
│                      AI BACKEND                                 │
│                  FastAPI (Python 3.12+)                         │
│                                                                  │
│  • LangGraph: agent graph definition + streaming execution      │
│  • LangChain: LLM provider abstraction (OpenAI, Anthropic,      │
│               Gemini, DeepSeek, Ollama)                         │
│  • Data fetchers: yfinance, NSE announcements, RSS, PRAW        │
│  • Pandas / TA-Lib: technical indicator computation             │
│  • WebSocket endpoint: streams agent events to frontend         │
│  • Background tasks: Celery (for long analyses)                 │
│  • Pydantic models for all agent outputs (typed, serialisable)  │
└──────────┬────────────────────────────────────┬─────────────────┘
           │                                    │
┌──────────▼──────────┐             ┌───────────▼─────────────┐
│      SQLite         │             │          Redis           │
│  (self-hosted V1)   │             │  • Celery task queue     │
│  • analysis runs    │             │  • WebSocket pub/sub     │
│  • agent outputs    │             │  • 12-hour analysis cache│
│  • history          │             └─────────────────────────┘
└─────────────────────┘
```

> **Why FastAPI over Express?** LangGraph, yfinance, pandas, TA-Lib, PRAW (Reddit), and all LLM SDKs are Python-native. An Express layer adds a network hop, a separate runtime, and zero benefit. FastAPI gives you auto-generated API docs, async support, Pydantic validation, and WebSocket streaming — everything you need in one service.

> **Why SQLite over Postgres in V1?** Single-user, self-hosted tool. SQLite means zero external DB dependency, zero configuration, and the DB is a single file users can back up or delete. Switch to Postgres in V2 if multi-user support is added.

### Real-Time Agent Streaming

The war room UI requires knowing when each agent starts, updates, and completes. Here's the pattern:

```python
# FastAPI WebSocket endpoint
@app.websocket("/ws/analysis/{run_id}")
async def analysis_stream(websocket: WebSocket, run_id: str):
    await websocket.accept()
    async for event in run_agent_graph(run_id):
        # event = { agent: "Technical Analyst", status: "complete", summary: "..." }
        await websocket.send_json(event)
```

LangGraph emits events as each node in the graph executes — TradeLoop wraps these into typed `AgentEvent` objects that the frontend consumes to animate the war room UI.

### Agent Graph (LangGraph)

```
                    ┌─────────────────────────┐
                    │      Data Fetch Layer    │
                    │  (price, news, filings)  │
                    └─────────┬───────────────┘
          ┌──────────────────┬┴──────────────────┬──────────────────┐
          ▼                  ▼                    ▼                  ▼
  [Fundamentals]      [Technical]           [News]           [Sentiment]
     Analyst            Analyst             Analyst            Analyst
          │                  │                    │                  │
          └──────────────────┴──────────────────┬─┘──────────────────┘
                                                 │
                               ┌─────────────────┴──────────────────┐
                               │           Synthesis Layer           │
                               │    [Bull Researcher] [Bear Researcher]│
                               └─────────────────┬──────────────────┘
                                                 │
                                         [Risk Manager]
                                                 │
                                       [Portfolio Manager]
                                                 │
                                          Final Report
```

Fundamentals, Technical, News, and Sentiment agents run **in parallel** (LangGraph fan-out). This reduces total time from ~4 min sequential to ~90 sec parallel.

### Docker Compose Layout

```yaml
# docker-compose.yml (simplified)
services:
  frontend:          # Next.js — port 3000
  api:               # FastAPI — port 8000
  worker:            # Celery worker — no exposed port
  redis:             # Redis — port 6379 (internal)
```

One command. No manual dependency setup. The README will show:
```bash
git clone https://github.com/yourhandle/tradeloop
cd tradeloop
cp .env.example .env   # paste your API key here
docker compose up
# Open http://localhost:3000
```

### Folder Structure (Monorepo)

```
tradeloop/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # FastAPI backend
│       ├── agents/       # One file per agent
│       ├── data/         # Data fetchers (yfinance, NSE, RSS, Reddit)
│       ├── graph/        # LangGraph graph definition
│       └── models/       # Pydantic output schemas
├── docker-compose.yml
├── .env.example
├── README.md
└── CONTRIBUTING.md
```

---

## 11. Indian Market Data Sources

### Free Sources (Used in MVP)

| Source | Data | Library / Method |
|---|---|---|
| **Yahoo Finance India** | Price history, OHLCV, P/E, market cap, EPS for all NSE/BSE stocks | `yfinance` — ticker suffix `.NS` (NSE) or `.BO` (BSE) |
| **NSE Corporate Announcements** | Board meetings, results dates, corporate actions | NSE website RSS / `nsetools` Python library |
| **BSE Corporate Filings** | Quarterly results (XML/XBRL), annual reports | BSE India filings endpoint |
| **Economic Times RSS** | Market news, company news, macro news | Free RSS — no key needed |
| **Moneycontrol RSS** | Indian market news headlines | Free RSS |
| **Mint / Business Standard RSS** | Macro, policy, budget, RBI news | Free RSS |
| **Reddit (r/IndiaInvestments, r/IndianStockMarket)** | Retail sentiment | PRAW library — free API key |

### Optional Paid Upgrades (user-configured)

| Source | Data | Cost | Config Variable |
|---|---|---|---|
| **TrueData** | Real-time NSE tick data, option chain | ₹5k–15k/month | `TRUEDATA_API_KEY` |
| **FinEdge API** | Structured P&L, balance sheet, ratios for all listed companies | ₹2k–8k/month | `FINEDGE_API_KEY` |
| **Twitter/X API** | Indian finance Twitter sentiment | $100/month (Basic) | `TWITTER_BEARER_TOKEN` |
| **Kite Connect (Zerodha)** | Historical OHLCV + live prices (if user has Zerodha account) | ₹2k/month | `KITE_API_KEY` |

The `.env.example` will document all optional keys. If a key is absent, the relevant agent skips that data source and notes it as "data not available."

### Ticker Resolution

Build a lightweight resolver so users can type natural names:

```python
TICKER_MAP = {
    "reliance": "RELIANCE.NS",
    "tcs": "TCS.NS",
    "infosys": "INFY.NS",
    "hdfc bank": "HDFCBANK.NS",
    "nifty": "^NSEI",
    "sensex": "^BSESN",
    # ... top 500 mappings
}
```

Also support fuzzy matching so `"tata motors"` → `TATAMOTORS.NS` without the user needing to know the exact ticker.

---

## 12. Self-Hosting & Developer Setup

This is a first-class concern for TradeLoop. A project that's hard to run locally gets abandoned.

### Setup Checklist (README must cover all of these)

- [ ] Prerequisites: Docker Desktop, Git (that's it)
- [ ] Clone → copy `.env.example` → fill API key
- [ ] `docker compose up` — all services start
- [ ] Open `localhost:3000` — onboarding screen appears if no key detected
- [ ] Type a ticker — get a report in < 3 minutes
- [ ] How to run without Docker (for contributors): Python 3.12 + Node 20 setup guide
- [ ] How to use Ollama (local LLM, free)
- [ ] How to add a custom data source (developer extension guide)

### Environment Variables (`.env.example`)

```bash
# === LLM Provider (pick one or configure in UI) ===
OPENAI_API_KEY=           # https://platform.openai.com
ANTHROPIC_API_KEY=        # https://console.anthropic.com
GOOGLE_API_KEY=           # https://aistudio.google.com
DEEPSEEK_API_KEY=         # https://platform.deepseek.com
OLLAMA_BASE_URL=          # http://localhost:11434 (local Ollama)

# === Default Model ===
DEFAULT_LLM_PROVIDER=openai        # openai | anthropic | google | deepseek | ollama
DEFAULT_MODEL=gpt-4o-mini          # cheaper default; user can override

# === Optional Indian Data Sources ===
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
TWITTER_BEARER_TOKEN=
FINEDGE_API_KEY=
TRUEDATA_API_KEY=
KITE_API_KEY=

# === App Config ===
ANALYSIS_CACHE_TTL_HOURS=12       # Cache repeated analyses for N hours
MAX_PARALLEL_AGENTS=4             # Tune based on your LLM rate limits
```

---

## 13. OSS Community & Contribution Strategy

### Repository Setup

- **License:** MIT (most permissive, maximises forks and contributors)
- **README:** Hero GIF of the war room running → one-liner pitch → quick install → screenshot of report
- **CONTRIBUTING.md:** How to add a new agent, how to add a data source, PR process
- **GitHub Issues templates:** Bug report, Feature request, Data source request
- **GitHub Discussions:** Q&A + Show and Tell (where users share their analyses)
- **Releases:** Semantic versioning (`v0.1.0` at launch, changelogs)

### Contribution Hotspots (Areas to Invite PRs)

These are intentionally under-built in V1 so the community has clear things to contribute:

| Area | What Community Can Add |
|---|---|
| `apps/api/data/` | New data fetchers (FinEdge, Kite, Upstox, Tickertape) |
| `apps/api/agents/` | New agents (Corporate Governance, Promoter Pledging, IPO Analyst) |
| Agent prompts | Better, more India-specific system prompts |
| `TICKER_MAP` | More ticker aliases and fuzzy matching |
| `apps/web/` | Hindi UI, better charts, new report card layouts |
| Docker config | ARM64 support, Raspberry Pi support |
| Docs | Agent output examples, tutorial blog posts |

### Launch Strategy

1. **GitHub README + demo GIF** — the most important marketing asset. Show the war room animation.
2. **Post on r/IndiaInvestments and r/IndianStockMarket** — this exact audience
3. **Post on r/learnmachinelearning and r/MachineLearning** — developer audience
4. **Tag TauricResearch / TradingAgents** — frame TradeLoop as the Indian sibling project
5. **Twitter/X Indian fintech and AI community** — #IndianStocks #LangChain #BuildInPublic

---

## 14. Disclaimer & Legal Note

### Why This Matters Even for OSS

TradeLoop is a research tool, not a registered investment advisory service. Every part of the product must communicate this clearly.

### Required Disclaimer (hardcoded in UI and PDF export)

> **⚠️ Research Tool Only**
> TradeLoop is an open-source AI research tool for informational and educational purposes. It is not registered with SEBI as a Research Analyst or Investment Adviser. The analysis generated is based on public data processed by AI models and may contain errors, omissions, or outdated information. **This is not investment advice.** Do not make financial decisions based solely on this output. Always consult a SEBI-registered adviser before investing.

### What This Means in Code

- The disclaimer appears on the Final Thesis card — **always visible, not collapsible**
- The disclaimer is in the footer of every PDF export
- The README includes a `## Disclaimer` section
- Agent outputs never use language like "you should buy" — they use "the analysis suggests", "agents indicate", "based on available data"

### BYOK Reduces Risk Further
Since users provide their own API keys and run TradeLoop locally, there is no central service making recommendations to users. The tool is equivalent to a personal spreadsheet model — the user controls all inputs.

---

*TradeLoop — Open Source · MIT License · Built for India*  
*Inspired by TauricResearch/TradingAgents*