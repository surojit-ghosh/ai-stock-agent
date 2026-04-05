import { tool } from "ai";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({
    suppressNotices: ["yahooSurvey"],
});
import { z } from "zod";

type YahooQuote = {
    symbol?: string | null;
    shortName?: string | null;
    longName?: string | null;
    regularMarketPrice?: number | null;
    regularMarketChange?: number | null;
    regularMarketChangePercent?: number | null;
    regularMarketVolume?: number | null;
    fiftyTwoWeekHigh?: number | null;
    fiftyTwoWeekLow?: number | null;
    marketCap?: number | null;
    regularMarketOpen?: number | null;
    regularMarketDayHigh?: number | null;
    regularMarketDayLow?: number | null;
};

const formatNumber = (value: number | null | undefined, digits = 2) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "N/A";
    }

    return value.toLocaleString("en-IN", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
    });
};

const formatVolume = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "N/A";
    }

    return Math.round(value).toLocaleString("en-IN");
};

const formatMarketCapInCrores = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "N/A";
    }

    const crores = value / 1e7;
    return `₹${crores.toLocaleString("en-IN", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    })} Cr`;
};

export const getStockPrice = tool({
    description:
        "Fetches live stock quote data for NSE/BSE tickers including price, change, volume, day range, and 52-week range.",
    inputSchema: z.object({
        symbol: z
            .string()
            .describe("NSE ticker e.g. RELIANCE.NS or TCS.NS"),
    }),
    execute: async ({ symbol }: { symbol: string }) => {
        try {
            if (!/\.(NS|BO)$/i.test(symbol)) {
                throw new Error("Symbol not found. Try adding .NS or .BO suffix.");
            }

            const quote = (await yahooFinance.quote(symbol)) as YahooQuote;

            if (quote.regularMarketPrice === null || quote.regularMarketPrice === undefined) {
                throw new Error("Symbol not found. Try adding .NS or .BO suffix.");
            }

            return {
                symbol: quote.symbol ?? symbol,
                name: quote.shortName ?? quote.longName ?? symbol,
                price: formatNumber(quote.regularMarketPrice),
                change: formatNumber(quote.regularMarketChange),
                changePercent: `${formatNumber(quote.regularMarketChangePercent)}%`,
                volume: formatVolume(quote.regularMarketVolume),
                fiftyTwoWeekHigh: formatNumber(quote.fiftyTwoWeekHigh),
                fiftyTwoWeekLow: formatNumber(quote.fiftyTwoWeekLow),
                marketCap: formatMarketCapInCrores(quote.marketCap),
                open: formatNumber(quote.regularMarketOpen),
                dayHigh: formatNumber(quote.regularMarketDayHigh),
                dayLow: formatNumber(quote.regularMarketDayLow),
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
