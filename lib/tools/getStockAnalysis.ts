import { tool } from "ai";
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

const formatLevel = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) {
        return "N/A";
    }
    return `₹${value.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
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


            const closes = (await getRecentCloses(symbol)).slice(-50);

            const sma20 = calculateSMA(closes, 20);
            const sma50 = calculateSMA(closes, 50);
            const rsi = calculateRSI14(closes);
            const macdSignal =
                sma20 !== null && sma50 !== null
                    ? sma20 > sma50
                        ? "Bullish"
                        : "Bearish"
                    : "N/A";

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
            const currentPrice = toNumber(quoteSummary.price?.regularMarketPrice);
            const targetPrice = toNumber(quoteSummary.financialData?.targetMeanPrice);
            const weekHigh52 = toNumber(quoteSummary.summaryDetail?.fiftyTwoWeekHigh);
            const weekLow52 = toNumber(quoteSummary.summaryDetail?.fiftyTwoWeekLow);

            const trendBullish = sma20 !== null && sma50 !== null && sma20 > sma50;
            const oversold = rsi !== null && rsi < 35;
            const overbought = rsi !== null && rsi > 70;

            let buyLow: number | null = null;
            let buyHigh: number | null = null;
            let stopLoss: number | null = null;
            let primaryTarget: number | null = null;
            let stretchTarget: number | null = null;
            let riskReward: string = "N/A";
            let timingNote = "Wait for price confirmation with healthy volume before taking a position.";

            if (currentPrice !== null) {
                if (oversold) {
                    buyLow = currentPrice * 0.98;
                    buyHigh = currentPrice;
                    timingNote = "RSI is near oversold. Consider staggered buying over 3-5 sessions around support.";
                } else if (overbought) {
                    buyLow = currentPrice * 0.95;
                    buyHigh = currentPrice * 0.97;
                    timingNote = "RSI is elevated. Prefer buying on a 3-5% pullback instead of chasing.";
                } else if (trendBullish) {
                    buyLow = (sma20 ?? currentPrice) * 0.99;
                    buyHigh = (sma20 ?? currentPrice) * 1.01;
                    timingNote = "Trend is constructive. Best entries are on dips near SMA20.";
                } else {
                    buyLow = currentPrice * 0.95;
                    buyHigh = currentPrice * 0.98;
                    timingNote = "Trend is mixed. Accumulate gradually near support or after breakout confirmation.";
                }

                stopLoss = buyLow * 0.96;
                if (weekLow52 !== null) {
                    stopLoss = Math.min(stopLoss, weekLow52 * 0.99);
                }

                primaryTarget = targetPrice ?? currentPrice * 1.08;
                stretchTarget =
                    weekHigh52 !== null && weekHigh52 > primaryTarget
                        ? weekHigh52
                        : currentPrice * 1.15;

                if (buyHigh > (stopLoss ?? 0) && primaryTarget > buyHigh) {
                    const downside = buyHigh - (stopLoss ?? 0);
                    const upside = primaryTarget - buyHigh;
                    if (downside > 0) {
                        riskReward = `1:${(upside / downside).toFixed(2)}`;
                    }
                }
            }

            return {
                symbol,
                name:
                    quoteSummary.price?.shortName ??
                    quoteSummary.price?.longName ??
                    symbol,
                currentPrice,
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
                fiftyTwoWeekHigh: weekHigh52,
                fiftyTwoWeekLow: weekLow52,
                marketCap: toNumber(quoteSummary.summaryDetail?.marketCap),
                sma20,
                sma50,
                rsi,
                macdSignal,
                recommendation,
                targetPrice,
                timingNote,
                buyZone:
                    buyLow !== null && buyHigh !== null
                        ? `${formatLevel(buyLow)} - ${formatLevel(buyHigh)}`
                        : "N/A",
                stopLoss: formatLevel(stopLoss),
                target1: formatLevel(primaryTarget),
                target2: formatLevel(stretchTarget),
                riskReward,
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
