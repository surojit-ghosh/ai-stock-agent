# 📈 AI Stock Agent

An intelligent, AI-powered stock analysis platform for Indian equities (NSE/BSE). Get real-time stock prices, AI-driven investment analysis, news sentiment tracking, and portfolio comparisons powered by Groq LLM and Yahoo Finance.

## 🎯 Overview

**AI Stock Agent** is a sophisticated conversational AI system specializing in Indian stock market analysis. It behaves like a senior quantitative equity research analyst, combining real-time market data with AI-powered insights to deliver assertive, data-backed investment recommendations for NSE/BSE stocks.

The platform uses Groq's ultra-fast LLM (Qwen model) to synthesize multiple data sources in real-time, providing holistic analysis combining fundamentals, technicals, sentiment, and forward indicators.

---

## ✨ Features

### Core Capabilities

- **📊 Real-Time Stock Quotes** — Live price, change, volume, 52-week ranges, market cap
- **🔍 Fundamental & Technical Analysis** — P/E ratios, P/B ratios, RSI, SMA indicators, ROE, dividend yield
- **📰 News & Sentiment Analysis** — Latest news headlines with AI-powered sentiment classification
- **🏦 Market Index Overview** — NIFTY 50, SENSEX, NIFTY BANK, NIFTY MIDCAP 50 snapshots with top gainers/losers
- **⚖️ Stock Comparisons** — Side-by-side valuation and performance metrics for 2-3 stocks
- **🧠 AI Investment Thesis** — Deep analysis with conviction scores, bull/bear cases, risk signals, and catalysts
- **💬 Conversational Interface** — Natural language processing for stock queries and recommendations

### Analytical Framework

The AI agent follows a structured analytical process:

1. **Intent Recognition** — Identifies whether user wants price, deep analysis, comparison, or news
2. **Data Aggregation** — Calls appropriate tools to gather all relevant data
3. **Synthesis** — Cross-references fundamentals, technicals, and sentiment
4. **Verdict** — Provides data-backed recommendations with specific reasoning

---

## 🛠️ Tech Stack

### Frontend

- **Next.js 16.2.2** — React framework with App Router
- **React 19.2.4** — UI library
- **TypeScript** — Type-safe development
- **Tailwind CSS 4** — Utility-first styling
- **Shadcn/ui** — Accessible UI component library
- **Radix UI** — Headless UI components
- **Lucide React** — Icon library
- **React Markdown** — Markdown rendering with GFM support

### Backend & AI

- **Vercel AI SDK** — Unified AI framework
    - `@ai-sdk/openai` — OpenAI-compatible API
    - `@ai-sdk/react` — React hooks for AI
- **Groq API** — Ultra-fast LLM inference (Qwen 3 32B model)
- **Yahoo Finance 2** — Financial data source

### Data & Validation

- **Zod** — TypeScript-first schema validation
- **Yahoo Finance 2** — Real-time stock quotes and historical data

### UI Components & Styling

- **Class Variance Authority** — CSS class composition
- **Clsx/Tailwind Merge** — Utility class helpers
- **tw-animate-css** — Animation library
- **Remark GFM** — GitHub Flavored Markdown

### Development Tools

- **ESLint 9** — Code quality
- **PostCSS 4** — CSS processing

---

## 📁 Project Structure

```
ai-stock-agent/
├── app/                           # Next.js app directory
│   ├── page.tsx                  # Main chat interface (client component)
│   ├── layout.tsx                # Root layout with fonts & metadata
│   ├── globals.css               # Global styles & theme
│   └── api/
│       └── chat/
│           └── route.ts          # Backend API endpoint for chat streaming
│
├── components/                    # React UI components
│   ├── AnalysisCard.tsx          # Displays fundamental/technical analysis
│   ├── CompareCard.tsx           # Side-by-side stock comparison
│   ├── ErrorCard.tsx             # Error message display
│   ├── InsightCard.tsx           # AI investment thesis display
│   ├── MarketIndexCard.tsx       # Market index snapshots
│   ├── NewsCard.tsx              # News items with sentiment badges
│   ├── StockPriceCard.tsx        # Live stock quote display
│   ├── ToolCallBadge.tsx         # Visual indicator for tool invocation
│   └── ui/                        # Shadcn UI components
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── scroll-area.tsx
│       ├── separator.tsx
│       ├── skeleton.tsx
│       └── tooltip.tsx
│
├── lib/
│   ├── utils.ts                  # Utility functions
│   └── tools/                     # AI agent tools
│       ├── index.ts               # Tool exports
│       ├── getStockPrice.ts       # Real-time stock quote tool
│       ├── getStockAnalysis.ts    # Fundamental & technical analysis tool
│       ├── getStockNews.ts        # News & sentiment tool
│       ├── getMarketIndex.ts      # Market index overview tool
│       ├── compareStocks.ts       # Stock comparison tool
│       ├── getAIInsight.ts        # Deep AI analysis tool
│       └── yahooFinance.ts        # Yahoo Finance client
│
├── public/                        # Static assets
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── next.config.ts                 # Next.js config
├── postcss.config.mjs             # PostCSS config
├── eslint.config.mjs              # ESLint config
└── components.json                # Shadcn components config

```

---

## 🧠 AI Tools (Agent Capabilities)

Each tool is a specialized LLM-callable function with schema validation. The AI agent intelligently selects which tools to use based on user intent.

### 1. **getStockPrice** 📊

**Purpose:** Fetch real-time stock quote data  
**Input:** NSE ticker (e.g., `RELIANCE.NS`)  
**Output:**

- Current price and daily change
- Change percentage
- Trading volume
- 52-week high/low
- Market cap (in crores)
- Day's open, high, low

**Use Case:** `"What's Reliance stock price?"`

---

### 2. **getStockAnalysis** 🔍

**Purpose:** Provide fundamental and technical analysis  
**Input:** NSE ticker  
**Output:**

- **Fundamentals:** P/E ratio, P/B ratio, EPS, ROE, dividend yield, beta
- **Technicals:** Simple Moving Averages (50/100/200 day), RSI-14
- **Valuation:** Market cap, financials snapshot
- **Analyst Consensus:** Buy/hold/sell recommendations

**Use Case:** `"Deep dive into TCS fundamentals"`

---

### 3. **getStockNews** 📰

**Purpose:** Fetch latest news and sentiment analysis  
**Input:** NSE ticker  
**Output:**

- Recent news headlines with timestamps
- Sentiment classification (positive/negative/neutral)
- Confidence scores
- Overall sentiment aggregate
- Summary of recent developments

**Algorithm:** Keyword-based initial sentiment + AI refinement via Groq

**Use Case:** `"What's the latest news on Infosys?"`

---

### 4. **getMarketIndex** 🏦

**Purpose:** Market snapshot with top movers  
**Input:** Index type (`nifty50`, `sensex`, `niftybank`, `niftymidcap`)  
**Output:**

- Index level and daily change
- Top 3 gainers with percentages
- Top 3 losers with percentages
- Advance/decline ratio
- Breadth analysis

**Use Case:** `"Show me NIFTY 50 today"`, `"Market overview"`

---

### 5. **compareStocks** ⚖️

**Purpose:** Side-by-side comparison of 2-3 stocks  
**Input:** Array of 2-3 NSE tickers  
**Output:** Comparison table with:

- Current price and daily change
- P/E, P/B ratios
- Market cap
- ROE (profitability)
- Dividend yield
- Beta (volatility)
- 52-week performance

**Use Case:** `"Compare HDFC vs ICICI Bank"`, `"Which is better: TCS or Infosys?"`

---

### 6. **getAIInsight** 🧠

**Purpose:** AI-powered investment thesis and deep analysis  
**Input:** NSE ticker  
**Output:**

- **Conviction Score** (1-10): Bearish to bullish scale
- **Investment Horizon:** Short/Medium/Long-term recommendation
- **Thesis:** 2-3 sentence summary of AI's perspective
- **Bull Case:** 1-4 bullish arguments with specifics
- **Bear Case:** 1-4 bearish arguments with specifics
- **Risk Signals:** Specific red flags and warnings
- **Catalysts:** 1-3 upcoming events that could move the stock
- **Verdict:** STRONG BUY / BUY / HOLD / SELL / STRONG SELL

**Triggered When:** User asks for investment advice, deep analysis, conviction, thesis, etc.

**Use Case:** `"Should I invest in INFY?"`, `"AI take on Reliance"`, `"Investment thesis for TCS"`

---

## 🏗️ Architecture & Data Flow

### Request-Response Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User (Browser)                                                   │
│ "What's your take on Reliance?"                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ HTTP POST /api/chat
┌─────────────────────────────────────────────────────────────────┐
│ Next.js Backend (route.ts)                                      │
│ • Receives message from client                                  │
│ • Converts to model messages                                    │
│ • Calls Groq LLM with system prompt                             │
└────────────┬──────────────────────────────────────────────────────┘
             │
             ▼ Groq LLM (Qwen 3 32B)
┌──────────────────────────────────────────────────────────────────┐
│ AI Agent Processing                                              │
│ 1. Parses user intent                                            │
│ 2. Determines tool(s) needed:                                   │
│    - getStockPrice → Get current price                           │
│    - getStockAnalysis → Get technical/fundamental data           │
│    - getStockNews → Get news & sentiment                         │
│    - getAIInsight → Generate investment thesis                   │
│ 3. Max 5 steps per request (stepCountIs(5))                     │
│ 4. Synthesizes results                                           │
│ 5. Generates formatted analysis response                         │
└────────┬────────────────────┬────────────────────────────────────┘
         │                    │
         ▼ Tool Calls         ▼
    ┌─────────────────────────────────┐
    │ Yahoo Finance 2                 │
    │ • Quote data                    │
    │ • Historical prices             │
    │ • Summary statistics            │
    │ • News & fundamentals           │
    └────────┬────────────────────────┘
             │ Market Data
             ▼
┌──────────────────────────────────────────────────────┐
│ AI Response (Markdown formatted)                    │
│ • Text analysis                                      │
│ • Tool invocation metadata                          │
│ • Rendered as streamed content                      │
└──────────────────────┬────────────────────────────────┘
                       │ UIMessage Stream
                       ▼ HTTP Response
┌──────────────────────────────────────────────────────┐
│ Browser UI (page.tsx)                               │
│ • ToolCallBadge: Shows which tools were used        │
│ • StockPriceCard: Displays quote                    │
│ • AnalysisCard: Shows technical/fundamental data    │
│ • InsightCard: Deep AI thesis                       │
│ • NewsCard: News items with sentiment               │
│ • CompareCard: Side-by-side comparison              │
│ • MarketIndexCard: Market overview                  │
│ • React Markdown: Renders AI text analysis          │
└──────────────────────────────────────────────────────┘
```

### Key Design Patterns

**1. Tool Invocation Pattern**

- Each tool is Zod-validated with strict schemas
- Returns structured JSON for parsing
- Client-side components render based on tool type
- Async tool execution with timeout/fallback handling

**2. Streaming Response**

- Uses Vercel AI SDK's `streamText()` function
- Streams tokens in real-time for responsiveness
- UIMessage format includes tool metadata
- Browser progressively renders as data arrives

**3. Chat State Management**

- `useChat()` hook from @ai-sdk/react
- Maintains message history
- Handles loading states and status
- Client-side input buffer with useState

**4. Server-Side Processing**

- Backend validates all requests
- Enforces step limits (max 5 steps per request)
- Groq API for fast inference
- Error handling with fallback responses

---

## 📦 Libraries & Dependencies

### AI & LLM

| Library          | Version  | Purpose                      |
| ---------------- | -------- | ---------------------------- |
| `@ai-sdk/openai` | ^3.0.50  | OpenAI-compatible API client |
| `@ai-sdk/react`  | ^3.0.147 | React hooks for AI chat      |
| `ai`             | ^6.0.145 | Vercel AI SDK core           |

### UI & Styling

| Library                | Version | Purpose                |
| ---------------------- | ------- | ---------------------- |
| `react`                | 19.2.4  | React framework        |
| `react-dom`            | 19.2.4  | React DOM rendering    |
| `next`                 | 16.2.2  | Next.js framework      |
| `tailwindcss`          | ^4      | Utility CSS framework  |
| `@tailwindcss/postcss` | ^4      | PostCSS plugin         |
| `shadcn`               | ^4.1.2  | Component library      |
| `radix-ui`             | ^1.4.3  | Headless UI primitives |
| `lucide-react`         | ^1.7.0  | Icon library           |

### Data & Markdown

| Library          | Version | Purpose                  |
| ---------------- | ------- | ------------------------ |
| `yahoo-finance2` | ^3.14.0 | Stock market data        |
| `react-markdown` | ^10.1.0 | Markdown rendering       |
| `remark-gfm`     | ^4.0.1  | GitHub Flavored Markdown |
| `zod`            | ^4.3.6  | Schema validation        |

### Utilities

| Library                    | Version | Purpose                |
| -------------------------- | ------- | ---------------------- |
| `clsx`                     | ^2.1.1  | Class name composition |
| `tailwind-merge`           | ^3.5.0  | Tailwind class merging |
| `tw-animate-css`           | ^1.4.0  | Animation utilities    |
| `class-variance-authority` | ^0.7.1  | CVA utilities          |

### Development

| Tool                 | Version | Purpose               |
| -------------------- | ------- | --------------------- |
| `typescript`         | ^5      | TypeScript compiler   |
| `eslint`             | ^9      | Code linting          |
| `eslint-config-next` | 16.2.2  | Next.js ESLint config |

---

## ⚙️ Environment Variables

Create a `.env.local` file in the root:

```bash
# Required: Groq API Key (for AI Agent)
GROQ_API_KEY=your_groq_api_key_here
```

**Get Groq API Key:**

1. Visit [console.groq.com](https://console.groq.com)
2. Sign up or log in
3. Create a new API key
4. Add to `.env.local`

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ai-stock-agent

# Install dependencies
npm install
```

### Setup Environment

```bash
# Create .env.local and add your Groq API key
echo "GROQ_API_KEY=your_key_here" > .env.local
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The application will:

- Load the chat interface
- Show suggested queries to start
- Stream responses as the AI agent processes them
- Render specialized components for each tool result

### Build for Production

```bash
npm run build
npm start
```

---

## 💻 How It Works: Step-by-Step

### 1. User Sends Message

User types in the chat interface: `"Compare HDFC and ICICI Bank"`

### 2. Client Sends to Backend

The `useChat()` hook sends via POST to `/api/chat` with:

```json
{
    "messages": [{ "role": "user", "content": "Compare HDFC and ICICI Bank" }]
}
```

### 3. Backend AI Processing

- Groq LLM receives the message + system prompt
- System prompt instructs AI to use tools strategically
- AI identifies intent: **stock comparison**
- AI decides: Use `compareStocks` tool with `["HDFCBANK.NS", "ICICIBANK.NS"]`

### 4. Tool Execution

`compareStocks` tool:

- Validates ticker symbols (.NS suffix check)
- Calls Yahoo Finance for each stock
- Fetches: price, P/E, P/B, ROE, market cap, dividend yield, beta
- Returns structured comparison object

### 5. AI Synthesis

- AI receives tool result
- Adds context: "HDFC is more profitable with higher ROE..."
- Formats as readable markdown
- Includes analyst recommendations

### 6. Streaming Response

Backend streams UIMessage format:

- Tool metadata (which tools were invoked)
- AI-generated text with markdown formatting
- All streamed to client in real-time

### 7. Client-Side Rendering

Browser displays:

- `<ToolCallBadge>` showing "Used: compareStocks tool"
- `<CompareCard>` with side-by-side table
- `<ReactMarkdown>` rendering AI's written analysis
- User can scroll through entire analysis

### 8. Continuous Conversation

User asks follow-up: `"What's your AI take on HDFC?"`

- New message added to history
- AI can reference previous context
- Calls `getAIInsight` for deep analysis
- Displays `<InsightCard>` with conviction score, bull/bear case, etc.

---

## 🎨 UI Components

### Component Architecture

**ToolCallBadge**

- Shows which tools the AI invoked
- Visual feedback for transparency

**StockPriceCard**

- Displays real-time quote
- Shows daily change % with color coding (green/red)
- Lists 52-week range, market cap, volume

**AnalysisCard**

- Fundamental metrics: P/E, P/B, ROE, Beta
- Technical indicators: RSI-14, SMA (50/100/200)
- Analyst consensus

**NewsCard**

- News items with timestamps
- Sentiment badges (positive/negative/neutral)
- Confidence scores

**CompareCard**

- Table format for 2-3 stocks
- Metrics: price, change %, P/E, P/B, market cap, dividend yield, performance 52w

**InsightCard**

- Conviction score (1-10 visual bar)
- Investment thesis summary
- Bull case points
- Bear case points
- Risk signals warnings
- Upcoming catalysts
- Final verdict (STRONG BUY/BUY/HOLD/SELL/STRONG SELL)

**MarketIndexCard**

- Index name and level
- Daily change with percentage
- Top 3 gainers
- Top 3 losers
- Advance/decline ratio

**ErrorCard**

- Displays error messages
- User-friendly error handling

---

## 🔄 API Route Details

### `POST /api/chat`

**Request:**

```json
{
  "messages": [
    { "role": "user", "content": "string" },
    { "role": "assistant", "content": "string" },
    ...
  ]
}
```

**Response:** Streamed UIMessage stream

- Tool invocations with results
- AI analysis text
- Real-time data

**Error Handling:**

- Returns 500 if GROQ_API_KEY missing
- Returns 500 on chat processing failure
- Graceful error messages to client

---

## ⚡ Performance Features

1. **Fast Inference** — Groq LLM for ultra-low latency
2. **Streaming Responses** — Real-time token streaming vs. waiting for full response
3. **Smart Tool Selection** — AI limits to 5 steps max per request
4. **Caching** — React components memoize results
5. **Optimized Data Fetching** — Bulk quote API for market indices

---

## 🎯 Use Cases

### Individual Investor

- Quick price checks: `"What's Reliance price?"`
- Fundamental research: `"TCS P/E ratio and ROE"`
- News check: `"Latest on Infosys"`

### Active Trader

- Technical analysis: `"RSI and moving averages for INFY"`
- Market overview: `"NIFTY 50 today"`
- Sentiment tracking: `"News sentiment on Bajaj Auto"`

### Portfolio Manager

- Stock comparison: `"Compare HDFC Bank vs ICICI vs Axis"`
- Deep analysis: `"AI conviction on SBI for portfolio weighting"`
- Market breadth: `"NIFTY BANK vs NIFTY 50 breadth"`

### Research Analyst

- Catalyst tracking: `"Upcoming events for Reliance"`
- Valuation metrics: `"P/E trends for auto sector"`
- Deep thesis: `"Investment thesis for TCS 2026"`

---

## 🛠️ Development

### Linting

```bash
npm run lint
```

### TypeScript Type Checking

```bash
npx tsc --noEmit
```

### Build Artifacts

```bash
npm run build
# Output in .next/ directory
```

---

## 📋 Ticker Symbol Rules

- **NSE stocks**: Suffix with `.NS` (e.g., `RELIANCE.NS`, `TCS.NS`)
- **BSE stocks**: Suffix with `.BO` (e.g., `500570.BO`)
- **Common misses**:
    - ❌ `RELIANCE` → ✅ `RELIANCE.NS`
    - ❌ `Infosys` → ✅ `INFY.NS`
    - ❌ `HDFC` → ✅ `HDFCBANK.NS`

---

## 🚨 Limitations & Disclaimers

1. **Market Data Delays** — Yahoo Finance data may have slight delays
2. **AI Analysis** — All AI insights are informational, not certified financial advice
3. **Step Limit** — Maximum 5 AI steps per request to manage latency
4. **Historical Data** — Technical indicators use available Yahoo Finance historical data
5. **Accuracy** — News sentiment is keyword-based initially, AI-refined

### Mandatory Disclaimer

> _This is an AI-generated analysis for informational purposes only. Do not treat this as certified financial advice. Always consult a qualified financial advisor before making investment decisions._

---

## 📚 Resources

- **Vercel AI SDK Docs:** [sdk.vercel.ai](https://sdk.vercel.ai)
- **Next.js Docs:** [nextjs.org](https://nextjs.org)
- **Groq API:** [groq.com](https://groq.com)
- **Yahoo Finance 2:** [npm/yahoo-finance2](https://www.npmjs.com/package/yahoo-finance2)
- **Shadcn/ui:** [shadcn-ui.com](https://shadcn-ui.com)
- **Tailwind CSS:** [tailwindcss.com](https://tailwindcss.com)

---

## 📝 License

This project is private and for educational/personal use.

---

## 🤝 Contributing

For bug reports and feature requests, please improve the codebase directly or create issues.

---

## ❓ FAQ

**Q: Why Groq instead of OpenAI?**  
A: Ultra-low latency inference. Groq can process chat requests in milliseconds, providing real-time responses.

**Q: Can I add more stocks?**  
A: Yes! The tools support any NSE/BSE ticker. Just add the `.NS` or `.BO` suffix.

**Q: How often is data updated?**  
A: Real-time from Yahoo Finance during market hours. Data refreshes on each request.

**Q: Can I compare more than 3 stocks?**  
A: The `compareStocks` tool is optimized for 2-3 stocks for readability. More stocks would make tables unwieldy.

**Q: Is my data secure?**  
A: Yes. All requests go through your backend. Public market data only. No personal financial data stored.

---

## 🎓 Project Highlights

- **Full-Stack TypeScript** — Type-safe throughout
- **Streaming AI** — Real-time response generation
- **Modular Tools** — Each tool is independently testable
- **Responsive UI** — Works on mobile and desktop
- **Production-Ready** — Error handling, validation, rate limiting concepts
- **Extensible** — Add more tools or components easily

---

**Made with ❤️ for the Indian stock investor**
