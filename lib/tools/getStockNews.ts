import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, tool } from "ai";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({
    suppressNotices: ["yahooSurvey"],
});
import { z } from "zod";

type YahooSearchNewsItem = {
    title?: string;
    publisher?: string;
    link?: string;
    providerPublishTime?: Date | number;
};

const groqApiKey = (process.env.GROQ_API_KEY ?? "").trim();

const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: groqApiKey,
});

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

type Sentiment = "positive" | "neutral" | "negative";

const AiNewsSchema = z.object({
    overallSentiment: z.enum(["positive", "neutral", "negative"]),
    summary: z.string(),
    items: z.array(
        z.object({
            index: z.number().int().nonnegative(),
            sentiment: z.enum(["positive", "neutral", "negative"]),
            reason: z.string(),
            confidence: z.number().min(0).max(1),
        }),
    ),
});

const sentimentFromKeywords = (title: string): Sentiment => {
    const lower = title.toLowerCase();
    const positiveHits = POSITIVE.reduce(
        (count, word) => (lower.includes(word) ? count + 1 : count),
        0,
    );
    const negativeHits = NEGATIVE.reduce(
        (count, word) => (lower.includes(word) ? count + 1 : count),
        0,
    );

    const net = positiveHits - negativeHits;
    if (net > 0) {
        return "positive";
    }
    if (net < 0) {
        return "negative";
    }
    return "neutral";
};

const relativeTime = (timestamp: Date | number | null | undefined): string => {
    if (!timestamp) {
        return "Unknown";
    }

    const nowMs = Date.now();
    const thenMs = typeof timestamp === "number" ? timestamp * 1000 : timestamp.getTime();
    const diffSeconds = Math.max(0, Math.floor((nowMs - thenMs) / 1000));

    if (diffSeconds < 60) {
        return `${diffSeconds} sec ago`;
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
        return `${diffMinutes} min ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

export const getStockNews = tool({
    description:
        "Fetches latest stock headlines and performs AI-assisted sentiment analysis.",
    inputSchema: z.object({
        symbol: z.string(),
        limit: z.number().int().min(1).max(10).default(5),
    }),
    execute: async ({ symbol, limit }: { symbol: string; limit?: number }) => {
        try {
            if (!/\.(NS|BO)$/i.test(symbol)) {
                throw new Error("Symbol not found. Try adding .NS or .BO suffix.");
            }

            const newsLimit = limit ?? 5;
            const searchResult = (await yahooFinance.search(symbol, {
                newsCount: newsLimit,
            })) as { news?: YahooSearchNewsItem[] };

            const newsItems = (searchResult.news ?? [])
                .filter((item) => item.title && item.link)
                .slice(0, newsLimit)
                .map((item) => ({
                    title: item.title ?? "Untitled",
                    publisher: item.publisher ?? "Unknown Publisher",
                    link: item.link ?? "",
                    providerPublishTime: item.providerPublishTime ?? null,
                }));

            if (newsItems.length === 0) {
                return {
                    symbol,
                    overallSentiment: "neutral",
                    summary: "No recent headlines found for this symbol.",
                    news: [],
                };
            }

            let aiResult: z.infer<typeof AiNewsSchema> | null = null;

            try {
                if (!groqApiKey) {
                    throw new Error(
                        "Missing GROQ_API_KEY (or OPENAI_API_KEY) in server environment",
                    );
                }

                const headlines = newsItems
                    .map(
                        (item, index) =>
                            `${index}. ${item.title} | publisher: ${item.publisher}`,
                    )
                    .join("\n");

                const result = await generateObject({
                    model: groq("qwen/qwen3-32b"),
                    schema: AiNewsSchema,
                    prompt: [
                        "You are a financial news sentiment analyst.",
                        "Classify each headline sentiment as positive, neutral, or negative for the stock.",
                        "Return one concise overall summary and confidence for each headline.",
                        "Headlines:",
                        headlines,
                    ].join("\n"),
                });

                aiResult = result.object;
            } catch {
                aiResult = null;
            }

            const aiByIndex = new Map<number, z.infer<typeof AiNewsSchema>["items"][number]>();
            for (const item of aiResult?.items ?? []) {
                aiByIndex.set(item.index, item);
            }

            const news = newsItems.map((item, index) => {
                const aiItem = aiByIndex.get(index);
                return {
                    title: item.title,
                    publisher: item.publisher,
                    link: item.link,
                    sentiment: (aiItem?.sentiment ?? sentimentFromKeywords(item.title)) as Sentiment,
                    publishedAt: relativeTime(item.providerPublishTime),
                    reason: aiItem?.reason ?? "Keyword fallback sentiment.",
                    confidence:
                        typeof aiItem?.confidence === "number"
                            ? Number(aiItem.confidence.toFixed(2))
                            : 0.5,
                };
            });

            const overallSentiment =
                aiResult?.overallSentiment ??
                (() => {
                    const score = news.reduce((sum, item) => {
                        if (item.sentiment === "positive") {
                            return sum + 1;
                        }
                        if (item.sentiment === "negative") {
                            return sum - 1;
                        }
                        return sum;
                    }, 0);

                    if (score > 0) {
                        return "positive" as const;
                    }
                    if (score < 0) {
                        return "negative" as const;
                    }
                    return "neutral" as const;
                })();

            return {
                symbol,
                overallSentiment,
                summary:
                    aiResult?.summary ??
                    "Summary generated from keyword fallback sentiment.",
                news,
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
