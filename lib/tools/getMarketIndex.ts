import { tool } from "ai";
import { z } from "zod";

import { yahooFinance } from "./yahooFinance";

type YahooQuote = {
    symbol?: string | null;
    shortName?: string | null;
    regularMarketPrice?: number | null;
    regularMarketChange?: number | null;
    regularMarketChangePercent?: number | null;
    regularMarketDayHigh?: number | null;
    regularMarketDayLow?: number | null;
};

const INDEX_MAP = {
    nifty50: "^NSEI",
    sensex: "^BSESN",
    niftybank: "^NSEBANK",
    niftymidcap: "^NSEMDCP50",
} as const;

const INDEX_LABELS: Record<keyof typeof INDEX_MAP, string> = {
    nifty50: "NIFTY 50",
    sensex: "SENSEX",
    niftybank: "NIFTY BANK",
    niftymidcap: "NIFTY MIDCAP 50",
};

const TOP_NIFTY50_SYMBOLS = [
    "RELIANCE.NS",
    "TCS.NS",
    "INFY.NS",
    "HDFCBANK.NS",
    "ICICIBANK.NS",
    "SBIN.NS",
    "LT.NS",
    "ITC.NS",
    "BHARTIARTL.NS",
    "HINDUNILVR.NS",
];

const toNumber = (value: number | null | undefined) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return null;
    }
    return value;
};

const fetchManyQuotes = async (symbols: string[]) => {
    try {
        const bulkResult = (await (yahooFinance.quote as unknown as (input: string[]) => Promise<YahooQuote[]>)
            .call(yahooFinance, symbols)) as YahooQuote[];

        if (Array.isArray(bulkResult) && bulkResult.length > 0) {
            return bulkResult;
        }
    } catch {
        // Fallback below if bulk API signature is unavailable in the installed yahoo-finance2 version.
    }

    const quotes: YahooQuote[] = [];
    for (const symbol of symbols) {
        const quote = (await yahooFinance.quote(symbol)) as YahooQuote;
        quotes.push(quote);
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return quotes;
};

export const getMarketIndex = tool({
    description:
        "Fetches Indian market index snapshot (NIFTY/SENSEX/BANK/MIDCAP) with top gainers and losers.",
    inputSchema: z.object({
        index: z.enum(["nifty50", "sensex", "niftybank", "niftymidcap"]),
    }),
    execute: async ({ index }: { index: keyof typeof INDEX_MAP }) => {
        try {
            const indexSymbol = INDEX_MAP[index];
            const indexQuote = (await yahooFinance.quote(indexSymbol)) as YahooQuote;
            await new Promise((resolve) => setTimeout(resolve, 500));
            const constituents = await fetchManyQuotes(TOP_NIFTY50_SYMBOLS);

            const movers = constituents
                .map((quote, quoteIndex) => ({
                    symbol: quote.symbol ?? TOP_NIFTY50_SYMBOLS[quoteIndex],
                    changePct: toNumber(quote.regularMarketChangePercent) ?? 0,
                }))
                .sort((a, b) => b.changePct - a.changePct);

            const topGainers = movers.slice(0, 3);
            const topLosers = [...movers].reverse().slice(0, 3);

            const advances = movers.filter((item) => item.changePct > 0).length;
            const declines = movers.filter((item) => item.changePct < 0).length;

            return {
                index: index,
                indexName: INDEX_LABELS[index],
                symbol: indexSymbol,
                value: toNumber(indexQuote.regularMarketPrice),
                change: toNumber(indexQuote.regularMarketChange),
                changePercent: toNumber(indexQuote.regularMarketChangePercent),
                dayHigh: toNumber(indexQuote.regularMarketDayHigh),
                dayLow: toNumber(indexQuote.regularMarketDayLow),
                advances,
                declines,
                topGainers,
                topLosers,
                scannedSymbols: TOP_NIFTY50_SYMBOLS,
            };
        } catch (error) {
            return {
                error:
                    error instanceof Error
                        ? error.message
                        : "Symbol not found. Try adding .NS or .BO suffix.",
                index,
            };
        }
    },
});
