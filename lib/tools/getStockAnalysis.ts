import { tool } from "ai";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({
    suppressNotices: ["yahooSurvey"],
});
import { z } from "zod";

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
    } | null;
    summaryDetail?: {
        dividendYield?: number | null;
        averageVolume?: number | null;
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

const toNumber = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    return null;
};

const average = (values: number[]) => {
    if (values.length === 0) {
        return null;
    }
    return values.reduce((sum, current) => sum + current, 0) / values.length;
};

const calculateSMA = (closes: number[], period: number) => {
    if (closes.length < period) {
        return null;
    }
    return average(closes.slice(-period));
};

const calculateRSI14 = (closes: number[]) => {
    if (closes.length < 15) {
        return null;
    }

    const period = 14;
    const recent = closes.slice(-(period + 1));
    let gains = 0;
    let losses = 0;

    for (let index = 1; index < recent.length; index += 1) {
        const delta = recent[index] - recent[index - 1];
        if (delta > 0) {
            gains += delta;
        } else {
            losses += Math.abs(delta);
        }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) {
        return 100;
    }

    const relativeStrength = avgGain / avgLoss;
    return 100 - 100 / (1 + relativeStrength);
};

export const getStockAnalysis = tool({
    description:
        "Provides fundamental and technical analysis for an NSE/BSE stock using Yahoo Finance summary and historical data.",
    inputSchema: z.object({
        symbol: z.string().describe("NSE ticker symbol"),
    }),
    execute: async ({ symbol }: { symbol: string }) => {
        try {
            if (!/\.(NS|BO)$/i.test(symbol)) {
                throw new Error("Symbol not found. Try adding .NS or .BO suffix.");
            }

            const quoteSummary = (await yahooFinance.quoteSummary(symbol, {
                modules: [
                    "defaultKeyStatistics",
                    "financialData",
                    "summaryDetail",
                    "recommendationTrend",
                    "price",
                ],
            }, { validateResult: false })) as QuoteSummaryResult;

            // Avoid burst requests to upstream provider on chained calls.
            await new Promise((resolve) => setTimeout(resolve, 500));


            const period2 = new Date();
            const period1 = new Date();
            period1.setDate(period2.getDate() - 80);

            const historical = (await yahooFinance.historical(symbol, {
                period1,
                period2,
                interval: "1d",
            })) as HistoricalEntry[];

            const closes = historical
                .map((entry) => toNumber(entry.close))
                .filter((close): close is number => close !== null)
                .slice(-50);

            const sma20 = calculateSMA(closes, 20);
            const sma50 = calculateSMA(closes, 50);
            const rsi = calculateRSI14(closes);
            const macdSignal =
                sma20 !== null && sma50 !== null && sma20 > sma50
                    ? "Bullish"
                    : "Bearish";

            const latestTrend = quoteSummary.recommendationTrend?.trend?.[0] ?? {};
            const strongBuy = toNumber(latestTrend.strongBuy) ?? 0;
            const buy = toNumber(latestTrend.buy) ?? 0;
            const hold = toNumber(latestTrend.hold) ?? 0;
            const sell = (toNumber(latestTrend.sell) ?? 0) + (toNumber(latestTrend.strongSell) ?? 0);

            let recommendation: "BUY" | "HOLD" | "SELL" = "HOLD";
            if (strongBuy > 5 && (rsi ?? 50) < 60) {
                recommendation = "BUY";
            } else if (sell > 5 || (rsi ?? 50) > 75) {
                recommendation = "SELL";
            }

            const roeRaw = toNumber(quoteSummary.financialData?.returnOnEquity);
            const dividendYieldRaw = toNumber(quoteSummary.summaryDetail?.dividendYield);

            return {
                symbol,
                name:
                    quoteSummary.price?.shortName ??
                    quoteSummary.price?.longName ??
                    symbol,
                currentPrice: toNumber(quoteSummary.price?.regularMarketPrice),
                change: toNumber(quoteSummary.price?.regularMarketChange),
                changePercent: toNumber(quoteSummary.price?.regularMarketChangePercent),
                pe: toNumber(quoteSummary.defaultKeyStatistics?.trailingPE),
                pb: toNumber(quoteSummary.defaultKeyStatistics?.priceToBook),
                beta: toNumber(quoteSummary.defaultKeyStatistics?.beta),
                eps: toNumber(quoteSummary.defaultKeyStatistics?.trailingEps),
                roe: roeRaw !== null ? `${(roeRaw * 100).toFixed(2)}%` : "N/A",
                dividendYield:
                    dividendYieldRaw !== null
                        ? `${(dividendYieldRaw * 100).toFixed(2)}%`
                        : "N/A",
                avgVolume: toNumber(quoteSummary.summaryDetail?.averageVolume),
                sma20,
                sma50,
                rsi,
                macdSignal,
                recommendation,
                targetPrice: toNumber(quoteSummary.financialData?.targetMeanPrice),
                analystSummary: `Analyst trend - Strong Buy: ${strongBuy}, Buy: ${buy}, Hold: ${hold}, Sell: ${sell}`,
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
