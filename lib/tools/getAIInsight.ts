import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText, tool } from "ai";
import { z } from "zod";

import { yahooFinance } from "./yahooFinance";

type QuoteSummaryResult = {
    defaultKeyStatistics?: {
        trailingPE?: number | null;
        priceToBook?: number | null;
        beta?: number | null;
        trailingEps?: number | null;
    } | null;
    financialData?: {
        returnOnEquity?: number | null;
        targetMeanPrice?: number | null;
        revenueGrowth?: number | null;
        earningsGrowth?: number | null;
        operatingMargins?: number | null;
        profitMargins?: number | null;
        currentRatio?: number | null;
        debtToEquity?: number | null;
    } | null;
    summaryDetail?: {
        dividendYield?: number | null;
        averageVolume?: number | null;
        fiftyTwoWeekHigh?: number | null;
        fiftyTwoWeekLow?: number | null;
        marketCap?: number | null;
    } | null;
    recommendationTrend?: {
        trend?: Array<{
            strongBuy?: number | null;
            buy?: number | null;
            hold?: number | null;
            sell?: number | null;
            strongSell?: number | null;
        }>;
    } | null;
    price?: {
        regularMarketPrice?: number | null;
        regularMarketChange?: number | null;
        regularMarketChangePercent?: number | null;
        shortName?: string | null;
        longName?: string | null;
    } | null;
};

type HistoricalEntry = {
    close?: number | null;
};

type ChartResult = {
    quotes?: HistoricalEntry[];
};

const groqApiKey = (process.env.GROQ_API_KEY ?? "").trim();

const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: groqApiKey,
});

const toNumber = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    return null;
};

const getRecentCloses = async (symbol: string) => {
    const period2 = new Date();
    const period1 = new Date();
    period1.setDate(period2.getDate() - 90);

    try {
        const chart = (await (
            yahooFinance.chart as unknown as (
                input: string,
                query: { period1: Date; period2: Date; interval: "1d" },
            ) => Promise<ChartResult>
        )(symbol, {
            period1,
            period2,
            interval: "1d",
        })) as ChartResult;

        const chartCloses = (chart.quotes ?? [])
            .map((entry) => toNumber(entry.close))
            .filter((close): close is number => close !== null);

        if (chartCloses.length > 0) {
            return chartCloses;
        }
    } catch {
        // Fallback handled below.
    }

    const historical = (await (
        yahooFinance.historical as unknown as (
            input: string,
            query: { period1: Date; period2: Date; interval: "1d" },
            options?: { validateResult?: boolean },
        ) => Promise<HistoricalEntry[]>
    )(symbol, {
        period1,
        period2,
        interval: "1d",
    }, {
        validateResult: false,
    })) as HistoricalEntry[];

    return historical
        .map((entry) => toNumber(entry.close))
        .filter((close): close is number => close !== null);
};

const InsightSchema = z.object({
    conviction: z
        .number()
        .min(1)
        .max(10)
        .describe("Investment conviction score, 1 = very bearish, 10 = very bullish"),
    horizonLabel: z
        .enum(["Short-Term", "Medium-Term", "Long-Term"])
        .describe("Recommended investment horizon"),
    thesis: z.string().describe("2-3 sentence investment thesis summarizing the AI's view"),
    bullCase: z.array(z.string()).min(1).max(4).describe("Key bullish arguments"),
    bearCase: z.array(z.string()).min(1).max(4).describe("Key bearish arguments"),
    riskSignals: z
        .array(z.string())
        .min(1)
        .max(3)
        .describe("Specific risk warnings or red flags"),
    catalysts: z
        .array(z.string())
        .min(1)
        .max(3)
        .describe("Upcoming catalysts that could move the stock"),
    verdict: z
        .enum(["STRONG BUY", "BUY", "HOLD", "SELL", "STRONG SELL"])
        .describe("Final AI verdict"),
});

type InsightObject = z.infer<typeof InsightSchema>;

const parseInsightFromText = (text: string): InsightObject | null => {
    const stripped = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
        return null;
    }

    const candidate = stripped.slice(start, end + 1);
    try {
        const parsed = JSON.parse(candidate);
        const validated = InsightSchema.safeParse(parsed);
        return validated.success ? validated.data : null;
    } catch {
        return null;
    }
};

const buildHeuristicInsight = (
    priceChangePct: number | null,
    rsi: number | null,
    sma20: number | null,
    sma50: number | null,
): InsightObject => {
    const trendBullish = sma20 !== null && sma50 !== null && sma20 > sma50;
    const rsiNeutralToStrong = rsi !== null && rsi >= 45 && rsi <= 70;
    const momentumPositive = (priceChangePct ?? 0) > 0;

    let conviction = 5;
    conviction += trendBullish ? 2 : -1;
    conviction += rsiNeutralToStrong ? 1 : 0;
    conviction += momentumPositive ? 1 : -1;
    conviction = Math.max(1, Math.min(10, conviction));

    let verdict: InsightObject["verdict"] = "HOLD";
    if (conviction >= 8) verdict = "BUY";
    if (conviction <= 3) verdict = "SELL";

    return {
        conviction,
        horizonLabel: conviction >= 7 ? "Long-Term" : "Medium-Term",
        thesis:
            "Signal quality is mixed, so position sizing should stay disciplined and decisions should be confirmed with upcoming earnings and guidance.",
        bullCase: [
            "Price structure and short-term trend can support upside continuation if broad market risk stays stable.",
            "Momentum profile is constructive when RSI avoids extreme overbought readings.",
        ],
        bearCase: [
            "Any breakdown below recent support could quickly invalidate the bullish setup.",
            "Macro volatility and sector rotation can pressure valuation multiples in the near term.",
        ],
        riskSignals: [
            "Watch for abrupt reversal after strong up-moves near resistance.",
            "Track earnings surprises and management guidance for thesis confirmation.",
        ],
        catalysts: [
            "Quarterly earnings release and commentary.",
            "Sector-level demand/pricing updates.",
        ],
        verdict,
    };
};

export const getAIInsight = tool({
    description:
        "Generates an AI-powered deep investment thesis for a stock including conviction score, bull/bear cases, risk signals, and catalysts. Use this for in-depth analysis requests.",
    inputSchema: z.object({
        symbol: z.string().describe("NSE ticker symbol e.g. RELIANCE.NS"),
    }),
    execute: async ({ symbol }: { symbol: string }) => {
        try {
            if (!/\.(NS|BO)$/i.test(symbol)) {
                throw new Error("Symbol not found. Try adding .NS or .BO suffix.");
            }

            const quoteSummary = (await yahooFinance.quoteSummary(
                symbol,
                {
                    modules: [
                        "defaultKeyStatistics",
                        "financialData",
                        "summaryDetail",
                        "recommendationTrend",
                        "price",
                    ],
                },
                { validateResult: false },
            )) as QuoteSummaryResult;

            await new Promise((resolve) => setTimeout(resolve, 500));

            const closes = (await getRecentCloses(symbol)).slice(-50);

            const sma20 =
                closes.length >= 20
                    ? closes.slice(-20).reduce((s, c) => s + c, 0) / 20
                    : null;
            const sma50 =
                closes.length >= 50
                    ? closes.slice(-50).reduce((s, c) => s + c, 0) / 50
                    : null;

            let rsi: number | null = null;
            if (closes.length >= 15) {
                const recent = closes.slice(-15);
                let gains = 0;
                let losses = 0;
                for (let i = 1; i < recent.length; i++) {
                    const delta = recent[i] - recent[i - 1];
                    if (delta > 0) gains += delta;
                    else losses += Math.abs(delta);
                }
                const avgGain = gains / 14;
                const avgLoss = losses / 14;
                rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
            }

            const price = toNumber(quoteSummary.price?.regularMarketPrice);
            const pe = toNumber(quoteSummary.defaultKeyStatistics?.trailingPE);
            const pb = toNumber(quoteSummary.defaultKeyStatistics?.priceToBook);
            const beta = toNumber(quoteSummary.defaultKeyStatistics?.beta);
            const eps = toNumber(quoteSummary.defaultKeyStatistics?.trailingEps);
            const roe = toNumber(quoteSummary.financialData?.returnOnEquity);
            const targetMean = toNumber(quoteSummary.financialData?.targetMeanPrice);
            const revenueGrowth = toNumber(quoteSummary.financialData?.revenueGrowth);
            const earningsGrowth = toNumber(quoteSummary.financialData?.earningsGrowth);
            const operatingMargins = toNumber(quoteSummary.financialData?.operatingMargins);
            const profitMargins = toNumber(quoteSummary.financialData?.profitMargins);
            const currentRatio = toNumber(quoteSummary.financialData?.currentRatio);
            const debtToEquity = toNumber(quoteSummary.financialData?.debtToEquity);
            const dividendYield = toNumber(quoteSummary.summaryDetail?.dividendYield);
            const marketCap = toNumber(quoteSummary.summaryDetail?.marketCap);
            const weekHigh52 = toNumber(quoteSummary.summaryDetail?.fiftyTwoWeekHigh);
            const weekLow52 = toNumber(quoteSummary.summaryDetail?.fiftyTwoWeekLow);
            const changePct = toNumber(quoteSummary.price?.regularMarketChangePercent);

            const latestTrend = quoteSummary.recommendationTrend?.trend?.[0] ?? {};
            const strongBuy = toNumber(latestTrend.strongBuy) ?? 0;
            const buy = toNumber(latestTrend.buy) ?? 0;
            const hold = toNumber(latestTrend.hold) ?? 0;
            const sell =
                (toNumber(latestTrend.sell) ?? 0) + (toNumber(latestTrend.strongSell) ?? 0);

            const stockName =
                quoteSummary.price?.shortName ?? quoteSummary.price?.longName ?? symbol;

            const smaSignal =
                sma20 !== null && sma50 !== null
                    ? sma20 > sma50
                        ? "Bullish"
                        : "Bearish"
                    : "N/A";

            const formatPct = (v: number | null) =>
                v !== null ? `${(v * 100).toFixed(2)}%` : "N/A";
            const formatNum = (v: number | null) =>
                v !== null ? v.toFixed(2) : "N/A";
            const formatCr = (v: number | null) =>
                v !== null
                    ? `₹${(v / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`
                    : "N/A";

            const dataBlock = [
                `Stock: ${stockName} (${symbol})`,
                `Current Price: ₹${formatNum(price)} | Change: ${formatPct(changePct)}`,
                `Market Cap: ${formatCr(marketCap)}`,
                `P/E: ${formatNum(pe)} | P/B: ${formatNum(pb)} | EPS: ${formatNum(eps)}`,
                `ROE: ${formatPct(roe)} | Beta: ${formatNum(beta)}`,
                `Revenue Growth: ${formatPct(revenueGrowth)} | Earnings Growth: ${formatPct(earningsGrowth)}`,
                `Operating Margin: ${formatPct(operatingMargins)} | Profit Margin: ${formatPct(profitMargins)}`,
                `Current Ratio: ${formatNum(currentRatio)} | D/E: ${formatNum(debtToEquity)}`,
                `Dividend Yield: ${formatPct(dividendYield)}`,
                `52W High: ${formatNum(weekHigh52)} | 52W Low: ${formatNum(weekLow52)}`,
                `Analyst Target: ${formatNum(targetMean)}`,
                `Analyst Trend - Strong Buy: ${strongBuy}, Buy: ${buy}, Hold: ${hold}, Sell: ${sell}`,
                `RSI(14): ${formatNum(rsi)} | SMA20: ${formatNum(sma20)} | SMA50: ${formatNum(sma50)}`,
                `SMA Crossover: ${smaSignal}`,
            ].join("\n");

            if (!groqApiKey) {
                throw new Error("Missing GROQ_API_KEY in server environment");
            }

            const model = groq("qwen/qwen3-32b");
            const insightPrompt = [
                "You are a senior equity research analyst at a top investment bank.",
                "Analyze the following Indian stock data and produce a structured investment thesis.",
                "Be specific with numbers - reference actual PE, ROE, margins, and technicals in your reasoning.",
                "Do NOT give generic advice. Every bullet should reference concrete data points from below.",
                "",
                dataBlock,
            ].join("\n");

            let insight: InsightObject;
            try {
                const result = await generateObject({
                    model,
                    schema: InsightSchema,
                    prompt: insightPrompt,
                });
                insight = result.object;
            } catch (structuredError) {
                const message =
                    structuredError instanceof Error ? structuredError.message : "";
                const needsTextFallback = message.includes("json_schema");

                if (!needsTextFallback) {
                    throw structuredError;
                }

                const textResult = await generateText({
                    model,
                    prompt: [
                        "Return ONLY valid JSON (no markdown) with this exact shape:",
                        '{"conviction":1-10,"horizonLabel":"Short-Term|Medium-Term|Long-Term","thesis":"...","bullCase":["..."],"bearCase":["..."],"riskSignals":["..."],"catalysts":["..."],"verdict":"STRONG BUY|BUY|HOLD|SELL|STRONG SELL"}',
                        "Ensure arrays have practical, specific points.",
                        "",
                        insightPrompt,
                    ].join("\n"),
                });

                insight =
                    parseInsightFromText(textResult.text) ??
                    buildHeuristicInsight(changePct, rsi, sma20, sma50);
            }

            return {
                symbol,
                name: stockName,
                currentPrice: price,
                changePercent: changePct,
                marketCap: formatCr(marketCap),
                pe,
                pb,
                roe: formatPct(roe),
                beta,
                rsi,
                smaSignal,
                analystTarget: targetMean,
                ...insight,
            };
        } catch (error) {
            return {
                error:
                    error instanceof Error
                        ? error.message
                        : "Symbol not found. Try adding .NS or .BO suffix.",
                symbol,
            };
        }
    },
});
