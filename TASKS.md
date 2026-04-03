# AI Stock Agent — Implementation Todo

> **Stack:** Next.js 15 (App Router) · Vercel AI SDK · yahoo-finance2 · Zod · Tailwind CSS v4 · shadcn/ui
> **Goal:** A multi-tool AI chat agent for NSE/BSE stocks with rich card UI
> **Agent instruction:** Work through each phase in order. Complete all checklist items before moving to the next phase. Do not skip steps.

---

## PHASE 0 — Project Bootstrap ✅ COMPLETE

### 0.1 Scaffold the Next.js app ✅

```bash
npx create-next-app@latest ai-stock-agent --typescript --tailwind --app --src-dir
```

### 0.2 Install core dependencies ✅

```bash
npm install ai @ai-sdk/openai yahoo-finance2 zod
npm install -D @types/node
```

### 0.3 Install Tailwind v4 ✅

```bash
npm install tailwindcss@next @tailwindcss/vite
```

> Tailwind v4 uses CSS-first config — no `tailwind.config.ts` file needed.
> All tokens defined in `src/app/globals.css` using `@theme {}`.

### 0.4 Install and init shadcn/ui ✅

```bash
npx shadcn@latest init
```

Select: New York style · CSS variables · Tailwind v4

### 0.5 Environment variables ✅

- [x] `.env.local` created
- [x] `OPENAI_API_KEY=sk-...` added
- [x] `.env.local` in `.gitignore`

### 0.6 Folder structure ✅

```
src/
├── app/
│   ├── api/chat/
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   └── tools/
└── components/
    └── ui/          ← shadcn components live here
```

---

## PHASE 1 — Build the Tools (Data Layer)

> Each tool is a Zod-validated function that fetches Indian market data via `yahoo-finance2`.
> All NSE tickers use `.NS` suffix. BSE tickers use `.BO` suffix.

---

### 1.1 Create `src/lib/tools/getStockPrice.ts`

**Purpose:** Fetch live price, change, volume, 52-week range for any NSE/BSE stock.

```typescript
// Schema input:
symbol: z.string().describe("NSE ticker e.g. RELIANCE.NS or TCS.NS")

// Data to fetch from yahoo-finance2:
- quote.regularMarketPrice          → current price
- quote.regularMarketChange         → absolute change
- quote.regularMarketChangePercent  → % change
- quote.regularMarketVolume         → volume
- quote.fiftyTwoWeekHigh            → 52w high
- quote.fiftyTwoWeekLow             → 52w low
- quote.marketCap                   → market cap
- quote.shortName                   → company name
- quote.regularMarketOpen           → open price
- quote.regularMarketDayHigh        → day high
- quote.regularMarketDayLow         → day low
```

**Implementation steps:**

- [ ] Import `yahooFinance` from `yahoo-finance2`
- [ ] Import `z` from `zod` and `tool` from `ai`
- [ ] Define the tool with `tool({ description, parameters, execute })`
- [ ] In `execute`: call `yahooFinance.quote(symbol)`
- [ ] Return a plain object with all fields formatted
- [ ] Format price as Indian locale: `price.toLocaleString('en-IN')`
- [ ] Format marketCap as `₹X Cr` (divide by 1e7)
- [ ] Wrap in try/catch — return `{ error: "Stock not found" }` on failure
- [ ] Export as named export `getStockPrice`

---

### 1.2 Create `src/lib/tools/getStockAnalysis.ts`

**Purpose:** Deep fundamental + technical analysis for a stock.

```typescript
// Schema input:
symbol: z.string().describe("NSE ticker symbol");

// From yahooFinance.quoteSummary(symbol, { modules: [...] })
modules: [
    "defaultKeyStatistics", // PE, PB, beta, EPS
    "financialData", // revenue, margins, ROE
    "summaryDetail", // dividend yield, avg volume
    "recommendationTrend", // analyst buy/sell/hold
    "price", // current price data
];
```

**Technical indicators (compute manually):**

- [ ] Fetch 50 days historical via `yahooFinance.historical(symbol, { period1, period2 })`
- [ ] Calculate SMA20: average of last 20 closes
- [ ] Calculate SMA50: average of last 50 closes
- [ ] Calculate RSI(14): `RSI = 100 - (100 / (1 + avgGain/avgLoss))`
- [ ] MACD signal: SMA20 > SMA50 → "Bullish" else "Bearish"

**Recommendation logic:**

- [ ] analyst strong buy > 5 AND RSI < 60 → "BUY"
- [ ] analyst sell > 5 OR RSI > 75 → "SELL"
- [ ] Otherwise → "HOLD"

**Steps:**

- [ ] Define tool with `tool()`
- [ ] Call `quoteSummary` with modules
- [ ] Call `historical` for 50 days
- [ ] Compute RSI, SMA20, SMA50
- [ ] Build and return analysis object
- [ ] Export as `getStockAnalysis`

---

### 1.3 Create `src/lib/tools/getMarketIndex.ts`

**Purpose:** Fetch NIFTY 50, SENSEX, NIFTY BANK snapshot.

```typescript
// Schema input:
index: z.enum(["nifty50", "sensex", "niftybank", "niftymidcap"]);

// Symbol map:
const INDEX_MAP = {
    nifty50: "^NSEI",
    sensex: "^BSESN",
    niftybank: "^NSEBANK",
    niftymidcap: "^NSEMDCP50",
};
```

**Steps:**

- [ ] Map enum to Yahoo symbol
- [ ] Fetch index quote
- [ ] Hardcode top 10 NIFTY50 symbols, bulk fetch via `yahooFinance.quote([...symbols])`
- [ ] Sort by `regularMarketChangePercent`, slice top 3 gainers + top 3 losers
- [ ] Return formatted object
- [ ] Export as `getMarketIndex`

---

### 1.4 Create `src/lib/tools/getStockNews.ts`

**Purpose:** Fetch latest news headlines with basic sentiment scoring.

```typescript
// Schema input:
symbol: z.string();
limit: z.number().default(5);

// Sentiment keywords:
const POSITIVE = [
    "surge",
    "beat",
    "profit",
    "growth",
    "record",
    "strong",
    "buy",
    "upgrade",
];
const NEGATIVE = [
    "fall",
    "loss",
    "cut",
    "downgrade",
    "weak",
    "crash",
    "sell",
    "miss",
];

// net = positiveHits - negativeHits
// net > 0 → "positive" | net < 0 → "negative" | 0 → "neutral"
```

**Steps:**

- [ ] Call `yahooFinance.search(symbol, { newsCount: limit })`
- [ ] Score sentiment per headline
- [ ] Format `providerPublishTime` as relative time ("2 hours ago")
- [ ] Return `{ title, publisher, link, sentiment, publishedAt }[]`
- [ ] Export as `getStockNews`

---

### 1.5 Create `src/lib/tools/compareStocks.ts`

**Purpose:** Side-by-side comparison of 2–3 stocks.

```typescript
// Schema input:
symbols: z.array(z.string()).min(2).max(3);

// Per symbol via quoteSummary:
// currentPrice, PE, PB, marketCap, ROE, dividendYield, beta, 52w performance
```

**Steps:**

- [ ] Loop symbols, call `quoteSummary` for each
- [ ] Add `winner` field per metric (best PE, best ROE, best 52w)
- [ ] Return `{ stocks: [...], comparison: { bestPE, bestROE, best52w } }`
- [ ] Export as `compareStocks`

---

### 1.6 Create `src/lib/tools/index.ts`

- [ ] Re-export all 5 tools:

```typescript
export { getStockPrice } from "./getStockPrice";
export { getStockAnalysis } from "./getStockAnalysis";
export { getMarketIndex } from "./getMarketIndex";
export { getStockNews } from "./getStockNews";
export { compareStocks } from "./compareStocks";
```

---

## PHASE 2 — API Route (The Brain)

### 2.1 Create `src/app/api/chat/route.ts`

**Imports:**

```typescript
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
    getStockPrice,
    getStockAnalysis,
    getMarketIndex,
    getStockNews,
    compareStocks,
} from "@/lib/tools";
```

**System prompt:**

```
You are AI Stock Agent, an expert Indian stock market assistant.
You help users with NSE and BSE stocks, NIFTY/SENSEX indices, and investment research.

Rules:
- Always use .NS suffix for NSE stocks (e.g., RELIANCE.NS, TCS.NS, INFY.NS)
- Always use .BO suffix for BSE stocks
- For index queries → use getMarketIndex
- For price queries → call getStockPrice first
- For "should I buy/sell" → call BOTH getStockAnalysis AND getStockNews
- For comparisons → call compareStocks
- Never give financial advice — present data, let users decide
- Always add: "This is for informational purposes only"
- Format numbers in Indian system (lakhs, crores)
- Be concise but thorough
```

**Handler steps:**

- [ ] Export `async function POST(req: Request)`
- [ ] Parse `const { messages } = await req.json()`
- [ ] Call `streamText()` with:
    - `model: openai('gpt-4o-mini')`
    - `system: SYSTEM_PROMPT`
    - `messages`
    - `tools: { getStockPrice, getStockAnalysis, getMarketIndex, getStockNews, compareStocks }`
    - `maxSteps: 5`
- [ ] Return `result.toDataStreamResponse()`
- [ ] Export `export const runtime = 'edge'`

---

## PHASE 3 — shadcn/ui Component Setup

> Install all needed shadcn primitives before building custom cards.
> These are used as building blocks inside the tool result cards.

### 3.1 Install shadcn components

```bash
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add button
npx shadcn@latest add separator
npx shadcn@latest add skeleton
npx shadcn@latest add scroll-area
npx shadcn@latest add tooltip
npx shadcn@latest add avatar
```

> All components land in `src/components/ui/` automatically.

---

## PHASE 4 — Tool Result Cards (Custom Components)

> Each card wraps shadcn `<Card>` with domain-specific content.
> Dark theme: use CSS variables from `globals.css` — do not hardcode hex values.

### 4.1 Create `src/components/StockPriceCard.tsx`

**shadcn used:** `Card`, `CardHeader`, `CardContent`, `Badge`

```typescript
interface StockPriceCardProps {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePct: number;
    high: number;
    low: number;
    high52w: number;
    low52w: number;
    volume: string;
    marketCap: string;
}
```

**UI elements:**

- [ ] `<Card>` with dark bg, coloured border (green if up, red if down)
- [ ] `<Badge>` for symbol ticker top-left
- [ ] `<Badge variant="outline">` for up/down % change chip (coloured)
- [ ] Large price in monospace font
- [ ] 4-column stat grid: High · Low · Volume · Mkt Cap using `<Separator />`
- [ ] 52-week range progress bar (native `<progress>` or div-based)
- [ ] Subtle box-shadow glow matching up/down colour

---

### 4.2 Create `src/components/AnalysisCard.tsx`

**shadcn used:** `Card`, `CardHeader`, `CardContent`, `CardFooter`, `Badge`, `Separator`, `Tooltip`

```typescript
// Extends StockPriceCardProps with:
pe: number;
pb: number;
roe: string;
eps: number;
beta: number;
dividendYield: string;
rsi: number;
sma20: number;
sma50: number;
macdSignal: string;
recommendation: "BUY" | "HOLD" | "SELL";
targetPrice: number;
analystSummary: string;
```

**UI elements:**

- [ ] Large `<Badge>` for BUY/HOLD/SELL (green/yellow/red variant)
- [ ] Price → target price with `→` arrow
- [ ] Two-column grid via CSS grid: Fundamentals | Technicals
- [ ] RSI arc gauge (SVG-based, 0–100, zones coloured)
- [ ] `<Tooltip>` on each metric label explaining what it means
- [ ] SMA crossover `<Badge>`: "Bullish" (green) or "Bearish" (red)
- [ ] Analyst summary in a `<CardFooter>` with left border accent
- [ ] Disclaimer in muted text at very bottom

---

### 4.3 Create `src/components/MarketIndexCard.tsx`

**shadcn used:** `Card`, `CardHeader`, `CardContent`, `Badge`, `Separator`

```typescript
interface MarketIndexCardProps {
    indexName: string;
    value: number;
    change: number;
    changePct: number;
    dayHigh: number;
    dayLow: number;
    advances: number;
    declines: number;
    topGainers: Array<{ symbol: string; changePct: number }>;
    topLosers: Array<{ symbol: string; changePct: number }>;
}
```

**UI elements:**

- [ ] Index name + large value display
- [ ] Change `<Badge>` (coloured)
- [ ] Advances vs declines bar: `width = (advances / total) * 100%` in green/red
- [ ] Two columns: Top Gainers | Top Losers
- [ ] Each mover: symbol + `<Badge>` for % change

---

### 4.4 Create `src/components/NewsCard.tsx`

**shadcn used:** `Card`, `CardHeader`, `CardContent`, `Badge`, `Separator`

```typescript
interface NewsCardProps {
    symbol: string;
    news: Array<{
        title: string;
        publisher: string;
        link: string;
        sentiment: "positive" | "neutral" | "negative";
        publishedAt: string;
    }>;
}
```

**UI elements:**

- [ ] Header: "Latest News · {symbol}"
- [ ] Each item: sentiment dot + title (line-clamp-2) + publisher + time
- [ ] `<Badge>` for sentiment: 🟢 Positive / ⚪ Neutral / 🔴 Negative
- [ ] Full item is `<a target="_blank">` with hover highlight
- [ ] `<Separator />` between items

---

### 4.5 Create `src/components/CompareCard.tsx`

**shadcn used:** `Card`, `CardHeader`, `CardContent`, `Badge`, `Separator`

```typescript
interface CompareCardProps {
    stocks: Array<{
        symbol: string;
        name: string;
        price: number;
        changePct: number;
        pe: number | null;
        pb: number | null;
        roe: string;
        marketCap: string;
        dividendYield: string;
        performance52w: string;
    }>;
    comparison: {
        bestPE: string;
        bestROE: string;
        best52w: string;
    };
}
```

**UI elements:**

- [ ] Table: metric rows × stock columns
- [ ] Winning cell highlighted with green background + `<Badge>`
- [ ] Stock column header: symbol + price + change chip
- [ ] Summary row: "Best overall: {stock}" at bottom

---

### 4.6 Create `src/components/ToolCallBadge.tsx`

**shadcn used:** `Badge`, `Skeleton`

```typescript
interface ToolCallBadgeProps {
    toolName: string;
    state: "call" | "result";
}
```

- [ ] `state === "call"` → animated `<Skeleton>` pill + spinner icon + label
- [ ] `state === "result"` → static `<Badge>` with ✓ checkmark + label
- [ ] Label map:
    - `getStockPrice` → "📈 Fetching Price"
    - `getStockAnalysis` → "🔍 Running Analysis"
    - `getMarketIndex` → "📊 Loading Index"
    - `getStockNews` → "📰 Fetching News"
    - `compareStocks` → "⚖️ Comparing Stocks"

---

### 4.7 Create `src/components/ErrorCard.tsx`

**shadcn used:** `Card`, `CardContent`, `Badge`

- [ ] Props: `{ error: string, symbol?: string }`
- [ ] Red-bordered `<Card>` with error icon
- [ ] Suggest correct format: "Try RELIANCE.NS, TCS.NS, INFY.NS"

---

## PHASE 5 — Chat Page UI

### 5.1 Create `src/app/page.tsx`

**Setup:**

```typescript
"use client";
import { useChat } from "ai/react";
```

**shadcn used:** `Button`, `ScrollArea`, `Avatar`, `AvatarFallback`, `Separator`

```typescript
const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat(
    {
        api: "/api/chat",
        maxSteps: 5,
    },
);
```

**Layout (full height flex column):**

- [ ] Sticky header: logo + "AI Stock Agent" + `<Badge>` "LIVE" + model label
- [ ] `<ScrollArea>` for messages (takes remaining height)
- [ ] Sticky input bar at bottom with blur backdrop

**Message rendering:**

```typescript
messages.map(message =>
  message.parts.map((part, i) => {
    if (part.type === 'text')             → chat bubble
    if (part.type === 'tool-invocation')  → tool card or badge
  })
)
```

**Tool card switch:**

```typescript
switch (part.toolInvocation.toolName) {
  case 'getStockPrice':    → <StockPriceCard    {...result} />
  case 'getStockAnalysis': → <AnalysisCard      {...result} />
  case 'getMarketIndex':   → <MarketIndexCard   {...result} />
  case 'getStockNews':     → <NewsCard          {...result} />
  case 'compareStocks':    → <CompareCard       {...result} />
}
// if result has .error field → <ErrorCard />
// if state === 'call'        → <ToolCallBadge state="call" />
```

**Chat bubbles:**

- [ ] User → right-aligned, `bg-primary text-primary-foreground` (shadcn token)
- [ ] Assistant → left-aligned, `<Card>` with border
- [ ] `<Avatar>` for assistant with "AI" fallback text

**Input bar:**

- [ ] Full-width text `<input>` (shadcn `Input` component)
- [ ] `<Button>` send (disabled when `isLoading`)
- [ ] Loading: animated spinner inside button

**Suggestion chips (empty state only):**

- [ ] Render as `<Button variant="outline" size="sm">` chips
- [ ] Chips:
    - "📈 Reliance Industries price"
    - "🔍 Analyse TCS stock"
    - "📊 NIFTY 50 today"
    - "⚖️ Compare HDFC vs ICICI Bank"
    - "📰 Infosys latest news"
- [ ] Clicking chip sets input value and submits

---

## PHASE 6 — Global Styles (Tailwind v4)

### 6.1 Update `src/app/globals.css`

> Tailwind v4 uses `@theme {}` block instead of `tailwind.config.ts`.
> shadcn init already sets up CSS variables — extend them here.

```css
@import "tailwindcss";

@theme {
    /* Fonts */
    --font-mono: "IBM Plex Mono", monospace;
    --font-display: "Syne", sans-serif;

    /* Custom colour tokens */
    --color-stock-bg: #080e18;
    --color-stock-card: #111c2d;
    --color-stock-border: #1e3a5f;
    --color-stock-accent: #3b82f6;
    --color-stock-green: #00e596;
    --color-stock-red: #ff4d6d;
    --color-stock-muted: #6b8aaa;
    --color-stock-text: #c8d8f0;
}
```

### 6.2 Update `src/app/layout.tsx`

- [ ] Set `<title>AI Stock Agent</title>`
- [ ] Set `<meta name="description" content="AI-powered NSE/BSE stock analysis">`
- [ ] Import IBM Plex Mono + Syne via `next/font/google`
- [ ] Apply `font-display bg-stock-bg min-h-screen` on `<body>`

---

## PHASE 7 — Error Handling & Edge Cases

- [ ] Every tool `execute` wrapped in try/catch → return `{ error, symbol }` on failure
- [ ] UI: check `result?.error` before rendering card → show `<ErrorCard>` instead
- [ ] Unknown ticker: throw "Symbol not found. Try adding .NS or .BO suffix."
- [ ] Rate limit guard: `await new Promise(r => setTimeout(r, 500))` between chained calls

---

## PHASE 8 — Testing

### 8.1 Tool unit tests (`src/lib/tools/__tests__/`)

- [ ] `getStockPrice("RELIANCE.NS")` → price object returned
- [ ] `getStockPrice("INVALID.NS")` → error object returned
- [ ] `getMarketIndex("nifty50")` → index data returned
- [ ] `getStockNews("TCS.NS")` → news array returned
- [ ] `compareStocks(["RELIANCE.NS", "TCS.NS"])` → comparison returned

### 8.2 API route tests (Postman / curl)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Reliance share price"}]}'
```

- [ ] Streaming response received
- [ ] Tool call block appears in stream
- [ ] Final text response received

### 8.3 UI smoke tests

- [ ] "Reliance price" → `StockPriceCard` renders
- [ ] "Analyse HDFC Bank" → `AnalysisCard` renders
- [ ] "NIFTY 50 today" → `MarketIndexCard` renders
- [ ] "Compare TCS and Infosys" → `CompareCard` renders
- [ ] "Infy news" → `NewsCard` renders
- [ ] "BADTICKER.NS" → `ErrorCard` renders
- [ ] Suggestion chips submit correctly

---

## PHASE 9 — Deploy to Vercel

```bash
npx vercel
```

- [ ] Set `OPENAI_API_KEY` in Vercel dashboard → Environment Variables
- [ ] `npx vercel --prod` for production
- [ ] Verify Edge Runtime on production URL
- [ ] Test streaming on mobile browser

---

## Quick Reference — NSE/BSE Tickers

| Company             | NSE             | BSE         |
| ------------------- | --------------- | ----------- |
| Reliance Industries | `RELIANCE.NS`   | `500325.BO` |
| TCS                 | `TCS.NS`        | `532540.BO` |
| Infosys             | `INFY.NS`       | `500209.BO` |
| HDFC Bank           | `HDFCBANK.NS`   | `500180.BO` |
| ICICI Bank          | `ICICIBANK.NS`  | `532174.BO` |
| Wipro               | `WIPRO.NS`      | `507685.BO` |
| SBI                 | `SBIN.NS`       | `500112.BO` |
| Bajaj Finance       | `BAJFINANCE.NS` | `500034.BO` |
| Maruti Suzuki       | `MARUTI.NS`     | `532500.BO` |
| Adani Ports         | `ADANIPORTS.NS` | `532921.BO` |

---

## Dependency Versions

```json
{
    "ai": "^3.4.0",
    "@ai-sdk/openai": "^0.0.66",
    "yahoo-finance2": "^2.11.3",
    "zod": "^3.23.0",
    "next": "15.0.0",
    "tailwindcss": "^4.0.0",
    "shadcn": "latest"
}
```

---

## File Creation Order (strict)

```
── TOOLS ──────────────────────────────
1.  src/lib/tools/getStockPrice.ts
2.  src/lib/tools/getStockNews.ts
3.  src/lib/tools/getMarketIndex.ts
4.  src/lib/tools/getStockAnalysis.ts
5.  src/lib/tools/compareStocks.ts
6.  src/lib/tools/index.ts

── API ────────────────────────────────
7.  src/app/api/chat/route.ts

── SHADCN INSTALLS ────────────────────
8.  npx shadcn@latest add card badge button separator skeleton scroll-area tooltip avatar

── CUSTOM COMPONENTS ──────────────────
9.  src/components/ToolCallBadge.tsx
10. src/components/ErrorCard.tsx
11. src/components/StockPriceCard.tsx
12. src/components/NewsCard.tsx
13. src/components/MarketIndexCard.tsx
14. src/components/AnalysisCard.tsx
15. src/components/CompareCard.tsx

── PAGE + LAYOUT ──────────────────────
16. src/app/page.tsx
17. src/app/layout.tsx
18. src/app/globals.css  (update @theme block)
```

---

_Phase 0 complete. Phases 1–9 remaining. Estimated time for AI coding agent: ~40 minutes sequential execution._
