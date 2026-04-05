"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AnalysisCard } from "@/components/AnalysisCard";
import { CompareCard } from "@/components/CompareCard";
import { ErrorCard } from "@/components/ErrorCard";
import { MarketIndexCard } from "@/components/MarketIndexCard";
import { NewsCard } from "@/components/NewsCard";
import { StockPriceCard } from "@/components/StockPriceCard";
import { ToolCallBadge } from "@/components/ToolCallBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const SUGGESTIONS = [
    "📈 Reliance Industries price",
    "🔍 Analyse TCS stock",
    "📊 NIFTY 50 today",
    "⚖️ Compare HDFC vs ICICI Bank",
    "📰 Infosys latest news",
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
            <header className="sticky top-0 z-20 border-b border-white/5 bg-stock-bg/80 px-4 py-3 backdrop-blur-xl md:px-6">
                <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-stock-accent/15 text-stock-accent shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                            <span className="font-mono text-sm font-bold tracking-tighter">AI</span>
                        </div>
                        <div>
                            <p className="font-sans font-bold tracking-tight text-white">
                                AI Stock Agent
                            </p>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-stock-muted">
                                Indian Markets
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge className="border-stock-green/30 bg-stock-green/10 font-mono tracking-widest text-stock-green shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            LIVE
                        </Badge>
                        <Badge
                            variant="outline"
                            className="border-white/10 font-mono tracking-wider text-stock-muted backdrop-blur-sm hidden sm:inline-flex"
                        >
                            {modelLabel}
                        </Badge>
                    </div>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden px-4 md:px-6">
                <div className="flex-1 overflow-y-auto py-4 scroll-smooth">
                    <div className="space-y-4 pb-4">
                        {!hasMessages ? (
                            <Card className="border-white/5 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md">
                                <p className="text-sm leading-relaxed text-stock-muted">
                                    Ask for stock prices, in-depth analysis, market indices,
                                    head-to-head comparisons, or the latest financial news.
                                </p>
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {SUGGESTIONS.map((suggestion) => (
                                        <Button
                                            key={suggestion}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="border-white/10 bg-transparent text-stock-text transition-all hover:border-stock-accent/30 hover:bg-stock-accent/10 hover:text-white"
                                            onClick={() => {
                                                void sendSuggestion(suggestion);
                                            }}
                                        >
                                            {suggestion}
                                        </Button>
                                    ))}
                                </div>
                            </Card>
                        ) : null}

                        {messages.map((message: any) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div className="w-full max-w-3xl space-y-3">
                                    {message.role === "assistant" ? (
                                        <div className="mb-2 flex items-center gap-3 pl-1">
                                            <div className="grid h-6 w-6 place-items-center rounded bg-stock-accent/20 text-stock-accent shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                                                <span className="font-mono text-[9px] font-bold tracking-tighter">AI</span>
                                            </div>
                                            <span className="font-mono text-[10px] uppercase tracking-widest text-stock-muted">
                                                Quantitative Analyst
                                            </span>
                                        </div>
                                    ) : null}

                                    {(message.parts ?? []).map(
                                        (part: any, index: number) => {
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
                                                            message.role === "user"
                                                                ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-sm border border-stock-accent/30 bg-stock-accent/10 px-5 py-3.5 text-[15px] leading-relaxed text-white shadow-[0_4px_24px_-8px_rgba(59,130,246,0.3)] backdrop-blur-md"
                                                                : "w-full px-2 text-[15px] leading-relaxed text-stock-text"
                                                        }
                                                    >
                                                        {message.role === "user" ? (
                                                            text
                                                        ) : (
                                                            <div className="prose prose-invert max-w-none space-y-4 [&>ul]:ml-4 [&>ul]:list-outside [&>ul]:list-disc [&>ul>li]:pl-1 [&>ol]:ml-4 [&>ol]:list-outside [&>ol]:list-decimal [&>ol>li]:pl-1 [&>h3]:mt-6 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-white [&>h4]:mt-4 [&>h4]:text-base [&>h4]:font-medium [&>h4]:text-white/90 [&>strong]:font-semibold [&>strong]:text-white [&>table]:w-full [&>table]:overflow-hidden [&>table]:rounded-lg [&>table]:border-collapse [&_th]:border [&_th]:border-white/10 [&_th]:bg-black/40 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-mono [&_th]:text-[10px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-stock-muted [&_td]:border [&_td]:border-white/10 [&_td]:px-4 [&_td]:py-3 [&_td]:text-[14px]">
                                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                                                        price={readNumber(
                                                            result,
                                                            "currentPrice",
                                                        )}
                                                        change={readNumber(
                                                            result,
                                                            "change",
                                                        )}
                                                        changePct={readNumber(
                                                            result,
                                                            "changePercent",
                                                        )}
                                                        high={0}
                                                        low={0}
                                                        high52w={0}
                                                        low52w={0}
                                                        volume={readString(
                                                            result,
                                                            "avgVolume",
                                                        )}
                                                        marketCap="N/A"
                                                        pe={readNumber(
                                                            result,
                                                            "pe",
                                                        )}
                                                        pb={readNumber(
                                                            result,
                                                            "pb",
                                                        )}
                                                        roe={readString(
                                                            result,
                                                            "roe",
                                                        )}
                                                        eps={readNumber(
                                                            result,
                                                            "eps",
                                                        )}
                                                        beta={readNumber(
                                                            result,
                                                            "beta",
                                                        )}
                                                        dividendYield={readString(
                                                            result,
                                                            "dividendYield",
                                                        )}
                                                        rsi={readNumber(
                                                            result,
                                                            "rsi",
                                                        )}
                                                        sma20={readNumber(
                                                            result,
                                                            "sma20",
                                                        )}
                                                        sma50={readNumber(
                                                            result,
                                                            "sma50",
                                                        )}
                                                        macdSignal={readString(
                                                            result,
                                                            "macdSignal",
                                                            "Bearish",
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
                                                        targetPrice={readNumber(
                                                            result,
                                                            "targetPrice",
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
                                                                changePct: 0,
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
                        <div ref={messagesEndRef} className="h-px w-full" />
                    </div>
                </div>

                <Separator className="bg-white/5" />

                <form
                    onSubmit={(event) => {
                        void onSubmit(event);
                    }}
                    className="sticky bottom-0 z-20 my-4 rounded-xl border border-white/10 bg-white/[0.02] p-2 shadow-2xl backdrop-blur-2xl transition-all focus-within:border-stock-accent/50 focus-within:bg-white/[0.04] focus-within:shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                >
                    <div className="flex items-center gap-3 px-2">
                        <input
                            value={input}
                            onChange={(event) => {
                                setInput(event.target.value);
                            }}
                            placeholder="Ask about RELIANCE.NS, NIFTY 50, compare stocks, or latest news..."
                            className="h-12 flex-1 bg-transparent text-[15px] text-white placeholder-stock-muted/60 outline-none"
                        />
                        <Button 
                            type="submit" 
                            disabled={!canSend}
                            className="bg-stock-accent text-white hover:bg-stock-accent/90 rounded-lg px-6 font-semibold tracking-wide transition-all data-[disabled]:opacity-50 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                        >
                            {loading ? "Analyzing..." : "Analyze"}
                        </Button>
                    </div>
                </form>
            </main>
        </div>
    );
}
