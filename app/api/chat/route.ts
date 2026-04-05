import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, UIMessage } from "ai";

import {
    compareStocks,
    getMarketIndex,
    getStockAnalysis,
    getStockNews,
    getStockPrice,
} from "@/lib/tools";

const SYSTEM_PROMPT = `You are AI Stock Agent, an expert Indian stock market assistant and quantitative analyst.
You help users with NSE and BSE stocks, NIFTY/SENSEX indices, and investment research.

Rules:
- Always use .NS suffix for NSE stocks (e.g., RELIANCE.NS, TCS.NS, INFY.NS).
- Always use .BO suffix for BSE stocks.
- For index queries -> use getMarketIndex.
- For price queries -> call getStockPrice first.
- For "should I buy/sell" or "evaluate" -> call BOTH getStockAnalysis AND getStockNews.
- For comparisons -> call compareStocks.
- **Synthesize your findings**: When asked for a buy/sell opinion, confidently analyze the fundamentals (PE, PB, ROE) and technicals (RSI, SMA). Conclude your message with a definitive **"Recommendation: BUY"**, **"HOLD"**, or **"SELL"** based on the data.
- Structure your response professionally with clear bullet points outlining the Bull Case and Bear Case before giving your recommendation.
- Format numbers in the Indian system (lakhs, crores).
- Be concise but highly analytical.
- Always append this exact disclaimer at the end: "*Disclaimer: This is an AI-generated analysis for informational purposes only. Do not treat this as certified financial advice.*"`;

const groqApiKey = (process.env.GROQ_API_KEY ?? "").trim();

const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: groqApiKey,
});

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        if (!groqApiKey) {
            return Response.json(
                { error: "Missing GROQ_API_KEY in server environment" },
                { status: 500 },
            );
        }

        const { messages } = (await req.json()) as { messages: UIMessage[] };
        const modelMessages = await convertToModelMessages(messages);

        const result = streamText({
            model: groq("qwen/qwen3-32b"),
            system: SYSTEM_PROMPT,
            messages: modelMessages,
            tools: {
                getStockPrice,
                getStockAnalysis,
                getMarketIndex,
                getStockNews,
                compareStocks,
            },
            stopWhen: stepCountIs(5),
        });

        return result.toUIMessageStreamResponse();
    } catch {
        return Response.json(
            {
                error: "Failed to process chat request",
            },
            { status: 500 },
        );
    }
}
