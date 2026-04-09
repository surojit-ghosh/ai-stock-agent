import { tool } from "ai";
import { z } from "zod";

import { yahooFinance } from "./yahooFinance";

type QuoteSummaryResult = {
    price?: {
        shortName?: string | null;
        longName?: string | null;
        regularMarketPrice?: number | null;
        regularMarketChangePercent?: number | null;
    } | null;
    defaultKeyStatistics?: {
        trailingPE?: number | null;
        priceToBook?: number | null;
        beta?: number | null;
    } | null;
    financialData?: {
        returnOnEquity?: number | null;
    } | null;
    summaryDetail?: {
        marketCap?: number | null;
        dividendYield?: number | null;
        fiftyTwoWeekHigh?: number | null;
        fiftyTwoWeekLow?: number | null;
    } | null;
};

const toNumber = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    return null;
};

const formatMarketCapInCrores = (value: number | null) => {
    if (value === null) {
        return "N/A";
    }

    const crores = value / 1e7;
    return `₹${crores.toLocaleString("en-IN", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    })} Cr`;
};

export const compareStocks = tool({
    description:
        "Compares 2-3 Indian stocks side-by-side using valuation, profitability, and 52-week performance metrics.",
    inputSchema: z.object({
        symbols: z.array(z.string()).min(2).max(3),
    }),
    execute: async ({ symbols }: { symbols: string[] }) => {
        try {
            const invalidSymbol = symbols.find((symbol) => !/\.(NS|BO)$/i.test(symbol));
            if (invalidSymbol) {
                throw new Error("Symbol not found. Try adding .NS or .BO suffix.");
            }

            const stocks = [] as Array<{
                symbol: string;
                name: string;
                currentPrice: number | null;
                changePct: number;
                pe: number | null;
                pb: number | null;
                marketCap: string;
                roe: string;
                roeValue: number | null;
                dividendYield: string;
                beta: number | null;
                performance52w: string;
                performance52wValue: number | null;
            }>;

            for (const symbol of symbols) {
                const summary = (await yahooFinance.quoteSummary(symbol, {
                    modules: ["price", "defaultKeyStatistics", "financialData", "summaryDetail"],
                }, { validateResult: false })) as QuoteSummaryResult;

                const currentPrice = toNumber(summary.price?.regularMarketPrice);
                const changePct = toNumber(summary.price?.regularMarketChangePercent);
                const pe = toNumber(summary.defaultKeyStatistics?.trailingPE);
                const pb = toNumber(summary.defaultKeyStatistics?.priceToBook);
                const beta = toNumber(summary.defaultKeyStatistics?.beta);
                const roe = toNumber(summary.financialData?.returnOnEquity);
                const marketCap = toNumber(summary.summaryDetail?.marketCap);
                const dividendYield = toNumber(summary.summaryDetail?.dividendYield);
                const weekLow = toNumber(summary.summaryDetail?.fiftyTwoWeekLow);

                const performance52w =
                    currentPrice !== null && weekLow !== null && weekLow > 0
                        ? ((currentPrice - weekLow) / weekLow) * 100
                        : null;

                stocks.push({
                    symbol,
                    name: summary.price?.shortName ?? summary.price?.longName ?? symbol,
                    currentPrice,
                    changePct: changePct ?? 0,
                    pe,
                    pb,
                    marketCap: formatMarketCapInCrores(marketCap),
                    roe: roe !== null ? `${(roe * 100).toFixed(2)}%` : "N/A",
                    roeValue: roe,
                    dividendYield:
                        dividendYield !== null ? `${(dividendYield * 100).toFixed(2)}%` : "N/A",
                    beta,
                    performance52w: performance52w !== null ? `${performance52w.toFixed(2)}%` : "N/A",
                    performance52wValue: performance52w,
                });

                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            const bestPE = [...stocks]
                .filter((stock) => stock.pe !== null && stock.pe > 0)
                .sort((a, b) => (a.pe as number) - (b.pe as number))[0]?.symbol ?? "N/A";

            const bestROE = [...stocks]
                .filter((stock) => stock.roeValue !== null)
                .sort((a, b) => (b.roeValue as number) - (a.roeValue as number))[0]?.symbol ?? "N/A";

            const best52w = [...stocks]
                .filter((stock) => stock.performance52wValue !== null)
                .sort((a, b) => (b.performance52wValue as number) - (a.performance52wValue as number))[0]
                ?.symbol ?? "N/A";

            return {
                stocks,
                comparison: {
                    bestPE,
                    bestROE,
                    best52w,
                },
            };
        } catch (error) {
            return {
                error:
                    error instanceof Error
                        ? error.message
                        : "Symbol not found. Try adding .NS or .BO suffix.",
                symbols,
            };
        }
    },
});
