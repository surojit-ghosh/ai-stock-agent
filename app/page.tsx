"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AnalysisCard } from "@/components/AnalysisCard";
import { CompareCard } from "@/components/CompareCard";
import { ErrorCard } from "@/components/ErrorCard";
import { InsightCard } from "@/components/InsightCard";
import { MarketIndexCard } from "@/components/MarketIndexCard";
import { NewsCard } from "@/components/NewsCard";
import { StockPriceCard } from "@/components/StockPriceCard";
import { ToolCallBadge } from "@/components/ToolCallBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
    "🎯 Best buy zone, stop-loss and targets for RELIANCE.NS",
    "🧠 Full technical + fundamental analysis for TCS.NS",
    "📊 Market pulse: NIFTY 50 with top gainers and losers",
    "⚖️ Compare HDFCBANK.NS vs ICICIBANK.NS for 6-month upside",
    "📰 Latest INFY.NS news sentiment and risk signals",
    "📌 Swing trade setup for SBIN.NS with entry and exit levels",
];

type UnknownRecord = Record<string, unknown>;

const isObject = (value: unknown): value is UnknownRecord =>
    typeof value === "object" && value !== null;

const readString = (obj: UnknownRecord, key: string, fallback = "N/A") => {
    const value = obj[key];
    return typeof value === "string" ? value : fallback;
};

const readNumber = (obj: UnknownRecord, key: string, fallback = 0) => {
    const value = obj[key];
    return typeof value === "number" && Number.isFinite(value)
        ? value
        : fallback;
};

const readNumberOrNull = (obj: UnknownRecord, key: string) => {
    const value = obj[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const readStringArray = (obj: UnknownRecord, key: string): string[] => {
    const value = obj[key];
    return Array.isArray(value)
        ? value.filter((v): v is string => typeof v === "string")
        : [];
};

const formatIndianNumber = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) {
        return "N/A";
    }
    return Math.round(value).toLocaleString("en-IN");
};

const formatMarketCapInCrores = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) {
        return "N/A";
    }
    const crores = value / 1e7;
    return `₹${crores.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} Cr`;
};

const parseToolPart = (part: unknown) => {
    if (!isObject(part)) {
        return null;
    }

    if (part.type === "tool-invocation" && isObject(part.toolInvocation)) {
        return {
            toolName:
                typeof part.toolInvocation.toolName === "string"
                    ? part.toolInvocation.toolName
                    : "",
            state: part.toolInvocation.state === "result" ? "result" : "call",
            args: isObject(part.toolInvocation.args)
                ? part.toolInvocation.args
                : {},
            result: part.toolInvocation.result,
        } as const;
    }

    if (typeof part.type === "string" && part.type.startsWith("tool-")) {
        const toolName = part.type.slice(5);
        const state = part.state === "output-available" ? "result" : "call";
        return {
            toolName,
            state,
            args: isObject(part.input) ? part.input : {},
            result: part.output,
        } as const;
    }

    return null;
};

const isLoadingState = (status: string) =>
    status === "submitted" || status === "streaming";

export default function Home() {
    const { messages, sendMessage, status } = useChat();

    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, status]);

    const loading = isLoadingState(status);
    const hasMessages = messages.length > 0;
    const canSend = input.trim().length > 0 && !loading;

    const modelLabel = useMemo(() => "qwen/qwen3-32b", []);

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const value = input.trim();
        if (!value || loading) {
            return;
        }
        setInput("");
        await sendMessage({ text: value });
    };

    const sendSuggestion = async (suggestion: string) => {
        if (loading) {
            return;
        }
        setInput("");
        await sendMessage({ text: suggestion });
    };

    return (
        <div className="flex h-dvh flex-col text-stock-text bg-stock-bg selection:bg-stock-accent/30">
            {/* Header */}
            <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-stock-bg/90 px-4 py-3 backdrop-blur-xl md:px-6">
                <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-stock-accent/20 to-stock-accent/5 text-stock-accent ring-1 ring-stock-accent/20">
                            <span className="font-mono text-xs font-bold tracking-tighter">
                                AI
                            </span>
                            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-stock-green ring-2 ring-stock-bg" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold tracking-tight text-white">
                                AI Stock Agent
                            </p>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-stock-muted/70">
                                Indian Markets
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className="border-white/[0.08] bg-white/[0.03] font-mono text-[10px] tracking-wider text-stock-muted hidden sm:inline-flex"
                        >
                            {modelLabel}
                        </Badge>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 md:px-6">
                <div className="flex-1 overflow-y-auto py-6 scroll-smooth">
                    <div className="space-y-6 pb-4">
                        {!hasMessages ? (
                            <div className="flex flex-col items-center justify-center pt-16 pb-8">
                                <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-stock-accent/20 to-stock-accent/5 ring-1 ring-stock-accent/20">
                                    <span className="font-mono text-lg font-bold text-stock-accent">
                                        AI
                                    </span>
                                </div>
                                <h1 className="mb-2 text-xl font-semibold tracking-tight text-white">
                                    AI Stock Agent
                                </h1>
                                <p className="mb-8 max-w-md text-center text-sm leading-relaxed text-stock-muted/80">
                                    Get real-time stock prices, AI-powered
                                    investment insights, market indices, and
                                    sentiment analysis for Indian markets.
                                </p>
                                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                                    {SUGGESTIONS.map((suggestion) => (
                                        <Button
                                            key={suggestion}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="border-white/[0.08] bg-white/[0.02] text-xs text-stock-muted transition-all hover:border-stock-accent/30 hover:bg-stock-accent/5 hover:text-white"
                                            onClick={() => {
                                                void sendSuggestion(suggestion);
                                            }}
                                        >
                                            {suggestion}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`space-y-3 ${message.role === "user" ? "max-w-[85%]" : "w-full max-w-3xl"}`}
                                >
                                    {message.role === "assistant" ? (
                                        <div className="mb-1.5 flex items-center gap-2 pl-0.5">
                                            <div className="grid h-5 w-5 place-items-center rounded-md bg-stock-accent/15 text-stock-accent">
                                                <span className="font-mono text-[8px] font-bold tracking-tighter">
                                                    AI
                                                </span>
                                            </div>
                                            <span className="font-mono text-[10px] uppercase tracking-widest text-stock-muted/60">
                                                Analyst
                                            </span>
                                        </div>
                                    ) : null}

                                    {(message.parts ?? []).map(
                                        (part: unknown, index: number) => {
                                            const key = `${message.id}-part-${index}`;

                                            if (
                                                isObject(part) &&
                                                part.type === "text"
                                            ) {
                                                const text =
                                                    typeof part.text ===
                                                    "string"
                                                        ? part.text
                                                        : "";
                                                return (
                                                    <div
                                                        key={key}
                                                        className={
                                                            message.role ===
                                                            "user"
                                                                ? "rounded-2xl rounded-tr-sm border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white"
                                                                : "w-full px-1 text-[15px] leading-relaxed text-stock-text/90"
                                                        }
                                                    >
                                                        {message.role ===
                                                        "user" ? (
                                                            text
                                                        ) : (
                                                            <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:tracking-tight [&>ul]:ml-4 [&>ul]:list-outside [&>ul]:list-disc [&>ul>li]:pl-1 [&>ol]:ml-4 [&>ol]:list-outside [&>ol]:list-decimal [&>ol>li]:pl-1 [&>h3]:mt-6 [&>h3]:text-base [&>h3]:font-semibold [&>h3]:text-white [&>h4]:mt-4 [&>h4]:text-sm [&>h4]:font-medium [&>h4]:text-white/90 [&>strong]:font-semibold [&>strong]:text-white [&>table]:w-full [&>table]:overflow-hidden [&>table]:rounded-lg [&>table]:border-collapse [&_th]:border [&_th]:border-white/[0.06] [&_th]:bg-white/[0.02] [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-mono [&_th]:text-[10px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-stock-muted [&_td]:border [&_td]:border-white/[0.06] [&_td]:px-3 [&_td]:py-2.5 [&_td]:text-[13px]">
                                                                <ReactMarkdown
                                                                    remarkPlugins={[
                                                                        remarkGfm,
                                                                    ]}
                                                                >
                                                                    {text}
                                                                </ReactMarkdown>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            const toolPart =
                                                parseToolPart(part);
                                            if (!toolPart) {
                                                return null;
                                            }

                                            if (toolPart.state === "call") {
                                                return (
                                                    <div key={key}>
                                                        <ToolCallBadge
                                                            toolName={
                                                                toolPart.toolName
                                                            }
                                                            state="call"
                                                        />
                                                    </div>
                                                );
                                            }

                                            const result = isObject(
                                                toolPart.result,
                                            )
                                                ? toolPart.result
                                                : {};

                                            if (
                                                typeof result.error === "string"
                                            ) {
                                                return (
                                                    <ErrorCard
                                                        key={key}
                                                        error={result.error}
                                                        symbol={
                                                            typeof result.symbol ===
                                                            "string"
                                                                ? result.symbol
                                                                : undefined
                                                        }
                                                    />
                                                );
                                            }

                                            if (
                                                toolPart.toolName ===
                                                "getStockPrice"
                                            ) {
                                                return (
                                                    <StockPriceCard
                                                        key={key}
                                                        symbol={readString(
                                                            result,
                                                            "symbol",
                                                        )}
                                                        name={readString(
                                                            result,
                                                            "name",
                                                        )}
                                                        price={readString(
                                                            result,
                                                            "price",
                                                        )}
                                                        change={readString(
                                                            result,
                                                            "change",
                                                        )}
                                                        changePercent={readString(
                                                            result,
                                                            "changePercent",
                                                        )}
                                                        high={readString(
                                                            result,
                                                            "dayHigh",
                                                        )}
                                                        low={readString(
                                                            result,
                                                            "dayLow",
                                                        )}
                                                        high52w={readString(
                                                            result,
                                                            "fiftyTwoWeekHigh",
                                                        )}
                                                        low52w={readString(
                                                            result,
                                                            "fiftyTwoWeekLow",
                                                        )}
                                                        volume={readString(
                                                            result,
                                                            "volume",
                                                        )}
                                                        marketCap={readString(
                                                            result,
                                                            "marketCap",
                                                        )}
                                                    />
                                                );
                                            }

                                            if (
                                                toolPart.toolName ===
                                                "getStockAnalysis"
                                            ) {
                                                const avgVolume =
                                                    readNumberOrNull(
                                                        result,
                                                        "avgVolume",
                                                    );
                                                const marketCap =
                                                    readNumberOrNull(
                                                        result,
                                                        "marketCap",
                                                    );
                                                return (
                                                    <AnalysisCard
                                                        key={key}
                                                        symbol={readString(
                                                            result,
                                                            "symbol",
                                                        )}
                                                        name={readString(
                                                            result,
                                                            "name",
                                                        )}
                                                        price={readNumberOrNull(
                                                            result,
                                                            "currentPrice",
                                                        )}
                                                        change={readNumberOrNull(
                                                            result,
                                                            "change",
                                                        )}
                                                        changePct={readNumberOrNull(
                                                            result,
                                                            "changePercent",
                                                        )}
                                                        high={readNumberOrNull(
                                                            result,
                                                            "fiftyTwoWeekHigh",
                                                        )}
                                                        low={readNumberOrNull(
                                                            result,
                                                            "fiftyTwoWeekLow",
                                                        )}
                                                        high52w={readNumberOrNull(
                                                            result,
                                                            "fiftyTwoWeekHigh",
                                                        )}
                                                        low52w={readNumberOrNull(
                                                            result,
                                                            "fiftyTwoWeekLow",
                                                        )}
                                                        volume={formatIndianNumber(
                                                            avgVolume,
                                                        )}
                                                        marketCap={formatMarketCapInCrores(
                                                            marketCap,
                                                        )}
                                                        pe={readNumberOrNull(
                                                            result,
                                                            "pe",
                                                        )}
                                                        pb={readNumberOrNull(
                                                            result,
                                                            "pb",
                                                        )}
                                                        roe={readString(
                                                            result,
                                                            "roe",
                                                        )}
                                                        eps={readNumberOrNull(
                                                            result,
                                                            "eps",
                                                        )}
                                                        beta={readNumberOrNull(
                                                            result,
                                                            "beta",
                                                        )}
                                                        dividendYield={readString(
                                                            result,
                                                            "dividendYield",
                                                        )}
                                                        rsi={readNumberOrNull(
                                                            result,
                                                            "rsi",
                                                        )}
                                                        sma20={readNumberOrNull(
                                                            result,
                                                            "sma20",
                                                        )}
                                                        sma50={readNumberOrNull(
                                                            result,
                                                            "sma50",
                                                        )}
                                                        macdSignal={readString(
                                                            result,
                                                            "macdSignal",
                                                            "N/A",
                                                        )}
                                                        recommendation={
                                                            readString(
                                                                result,
                                                                "recommendation",
                                                                "HOLD",
                                                            ) as
                                                                | "BUY"
                                                                | "HOLD"
                                                                | "SELL"
                                                        }
                                                        targetPrice={readNumberOrNull(
                                                            result,
                                                            "targetPrice",
                                                        )}
                                                        timingNote={readString(
                                                            result,
                                                            "timingNote",
                                                            "Wait for confirmation before entering.",
                                                        )}
                                                        buyZone={readString(
                                                            result,
                                                            "buyZone",
                                                        )}
                                                        stopLoss={readString(
                                                            result,
                                                            "stopLoss",
                                                        )}
                                                        target1={readString(
                                                            result,
                                                            "target1",
                                                        )}
                                                        target2={readString(
                                                            result,
                                                            "target2",
                                                        )}
                                                        riskReward={readString(
                                                            result,
                                                            "riskReward",
                                                        )}
                                                        analystSummary={readString(
                                                            result,
                                                            "analystSummary",
                                                        )}
                                                    />
                                                );
                                            }

                                            if (
                                                toolPart.toolName ===
                                                "getAIInsight"
                                            ) {
                                                return (
                                                    <InsightCard
                                                        key={key}
                                                        symbol={readString(
                                                            result,
                                                            "symbol",
                                                        )}
                                                        name={readString(
                                                            result,
                                                            "name",
                                                        )}
                                                        currentPrice={readNumberOrNull(
                                                            result,
                                                            "currentPrice",
                                                        )}
                                                        changePercent={readNumberOrNull(
                                                            result,
                                                            "changePercent",
                                                        )}
                                                        marketCap={readString(
                                                            result,
                                                            "marketCap",
                                                        )}
                                                        pe={readNumberOrNull(
                                                            result,
                                                            "pe",
                                                        )}
                                                        roe={readString(
                                                            result,
                                                            "roe",
                                                        )}
                                                        beta={readNumberOrNull(
                                                            result,
                                                            "beta",
                                                        )}
                                                        rsi={readNumberOrNull(
                                                            result,
                                                            "rsi",
                                                        )}
                                                        smaSignal={readString(
                                                            result,
                                                            "smaSignal",
                                                        )}
                                                        analystTarget={readNumberOrNull(
                                                            result,
                                                            "analystTarget",
                                                        )}
                                                        conviction={readNumber(
                                                            result,
                                                            "conviction",
                                                            5,
                                                        )}
                                                        horizonLabel={readString(
                                                            result,
                                                            "horizonLabel",
                                                            "Medium-Term",
                                                        )}
                                                        thesis={readString(
                                                            result,
                                                            "thesis",
                                                        )}
                                                        bullCase={readStringArray(
                                                            result,
                                                            "bullCase",
                                                        )}
                                                        bearCase={readStringArray(
                                                            result,
                                                            "bearCase",
                                                        )}
                                                        riskSignals={readStringArray(
                                                            result,
                                                            "riskSignals",
                                                        )}
                                                        catalysts={readStringArray(
                                                            result,
                                                            "catalysts",
                                                        )}
                                                        verdict={readString(
                                                            result,
                                                            "verdict",
                                                            "HOLD",
                                                        )}
                                                    />
                                                );
                                            }

                                            if (
                                                toolPart.toolName ===
                                                "getMarketIndex"
                                            ) {
                                                return (
                                                    <MarketIndexCard
                                                        key={key}
                                                        indexName={readString(
                                                            result,
                                                            "indexName",
                                                        )}
                                                        value={readNumber(
                                                            result,
                                                            "value",
                                                        )}
                                                        change={readNumber(
                                                            result,
                                                            "change",
                                                        )}
                                                        changePct={readNumber(
                                                            result,
                                                            "changePercent",
                                                        )}
                                                        dayHigh={readNumber(
                                                            result,
                                                            "dayHigh",
                                                        )}
                                                        dayLow={readNumber(
                                                            result,
                                                            "dayLow",
                                                        )}
                                                        advances={readNumber(
                                                            result,
                                                            "advances",
                                                            0,
                                                        )}
                                                        declines={readNumber(
                                                            result,
                                                            "declines",
                                                            0,
                                                        )}
                                                        topGainers={
                                                            Array.isArray(
                                                                result.topGainers,
                                                            )
                                                                ? (result.topGainers as Array<{
                                                                      symbol: string;
                                                                      changePct: number;
                                                                  }>)
                                                                : []
                                                        }
                                                        topLosers={
                                                            Array.isArray(
                                                                result.topLosers,
                                                            )
                                                                ? (result.topLosers as Array<{
                                                                      symbol: string;
                                                                      changePct: number;
                                                                  }>)
                                                                : []
                                                        }
                                                    />
                                                );
                                            }

                                            if (
                                                toolPart.toolName ===
                                                "getStockNews"
                                            ) {
                                                return (
                                                    <NewsCard
                                                        key={key}
                                                        symbol={readString(
                                                            result,
                                                            "symbol",
                                                        )}
                                                        news={
                                                            Array.isArray(
                                                                result.news,
                                                            )
                                                                ? (result.news as Array<{
                                                                      title: string;
                                                                      publisher: string;
                                                                      link: string;
                                                                      sentiment:
                                                                          | "positive"
                                                                          | "neutral"
                                                                          | "negative";
                                                                      publishedAt: string;
                                                                  }>)
                                                                : []
                                                        }
                                                    />
                                                );
                                            }

                                            if (
                                                toolPart.toolName ===
                                                "compareStocks"
                                            ) {
                                                const stocks = Array.isArray(
                                                    result.stocks,
                                                )
                                                    ? (result.stocks as Array<UnknownRecord>)
                                                    : [];
                                                const comparison = isObject(
                                                    result.comparison,
                                                )
                                                    ? result.comparison
                                                    : {};

                                                return (
                                                    <CompareCard
                                                        key={key}
                                                        stocks={stocks.map(
                                                            (stock) => ({
                                                                symbol: readString(
                                                                    stock,
                                                                    "symbol",
                                                                ),
                                                                name: readString(
                                                                    stock,
                                                                    "name",
                                                                ),
                                                                price: readNumber(
                                                                    stock,
                                                                    "currentPrice",
                                                                ),
                                                                changePct:
                                                                    readNumber(
                                                                        stock,
                                                                        "changePct",
                                                                    ),
                                                                pe:
                                                                    typeof stock.pe ===
                                                                    "number"
                                                                        ? stock.pe
                                                                        : null,
                                                                pb:
                                                                    typeof stock.pb ===
                                                                    "number"
                                                                        ? stock.pb
                                                                        : null,
                                                                roe: readString(
                                                                    stock,
                                                                    "roe",
                                                                ),
                                                                marketCap:
                                                                    readString(
                                                                        stock,
                                                                        "marketCap",
                                                                    ),
                                                                dividendYield:
                                                                    readString(
                                                                        stock,
                                                                        "dividendYield",
                                                                    ),
                                                                performance52w:
                                                                    readString(
                                                                        stock,
                                                                        "performance52w",
                                                                    ),
                                                            }),
                                                        )}
                                                        comparison={{
                                                            bestPE: readString(
                                                                comparison,
                                                                "bestPE",
                                                            ),
                                                            bestROE: readString(
                                                                comparison,
                                                                "bestROE",
                                                            ),
                                                            best52w: readString(
                                                                comparison,
                                                                "best52w",
                                                            ),
                                                        }}
                                                    />
                                                );
                                            }

                                            return (
                                                <ToolCallBadge
                                                    key={key}
                                                    toolName={toolPart.toolName}
                                                    state="result"
                                                />
                                            );
                                        },
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="flex items-center gap-2 pl-1">
                                    <div className="grid h-5 w-5 place-items-center rounded-md bg-stock-accent/15 text-stock-accent">
                                        <span className="font-mono text-[8px] font-bold tracking-tighter">
                                            AI
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stock-accent/60" />
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stock-accent/40 [animation-delay:0.2s]" />
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stock-accent/20 [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} className="h-px w-full" />
                    </div>
                </div>

                {/* Input */}
                <div className="border-t border-white/[0.06] py-4">
                    <form
                        onSubmit={(event) => {
                            void onSubmit(event);
                        }}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-1.5 transition-all focus-within:border-stock-accent/30 focus-within:bg-white/[0.03]"
                    >
                        <div className="flex items-center gap-2 px-2">
                            <input
                                value={input}
                                onChange={(event) => {
                                    setInput(event.target.value);
                                }}
                                placeholder="Ask about any stock, get AI insights, or compare..."
                                className="h-11 flex-1 bg-transparent text-sm text-white placeholder-stock-muted/50 outline-none"
                            />
                            <Button
                                type="submit"
                                disabled={!canSend}
                                size="sm"
                                className="rounded-lg bg-stock-accent px-5 text-xs font-medium text-white transition-all hover:bg-stock-accent/90 disabled:opacity-40"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 animate-spin rounded-full border border-white/60 border-t-transparent" />
                                        Analyzing
                                    </span>
                                ) : (
                                    "Send"
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
