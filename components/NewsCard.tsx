import { Fragment } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Sentiment = "positive" | "neutral" | "negative";

export interface NewsCardProps {
    symbol: string;
    news: Array<{
        title: string;
        publisher: string;
        link: string;
        sentiment: Sentiment;
        publishedAt: string;
    }>;
}

const sentimentMeta: Record<
    Sentiment,
    {
        label: string;
        dotClass: string;
        badgeClass: string;
    }
> = {
    positive: {
        label: "Positive",
        dotClass: "bg-stock-green shadow-[0_0_8px_rgba(16,185,129,0.8)]",
        badgeClass:
            "border-stock-green/30 bg-stock-green/10 text-stock-green font-mono uppercase text-[10px]",
    },
    neutral: {
        label: "Neutral",
        dotClass: "bg-stock-muted shadow-[0_0_8px_rgba(161,161,170,0.8)]",
        badgeClass:
            "border-stock-muted/30 bg-stock-muted/10 text-stock-muted font-mono uppercase text-[10px]",
    },
    negative: {
        label: "Negative",
        dotClass: "bg-stock-red shadow-[0_0_8px_rgba(239,68,68,0.8)]",
        badgeClass: "border-stock-red/30 bg-stock-red/10 text-stock-red font-mono uppercase text-[10px]",
    },
};

const sentimentIcon: Record<Sentiment, string> = {
    positive: "🟢",
    neutral: "⚪",
    negative: "🔴",
};

export function NewsCard({ symbol, news }: NewsCardProps) {
    return (
        <Card className="overflow-hidden border-white/10 bg-white/[0.02] shadow-2xl backdrop-blur-xl text-stock-text">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-stock-accent animate-pulse" />
                    Latest News · {symbol}
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {news.length === 0 ? (
                    <p className="text-sm text-stock-muted">
                        No headlines found right now.
                    </p>
                ) : (
                    news.map((item, index) => {
                        const meta = sentimentMeta[item.sentiment];
                        return (
                            <Fragment key={`${item.link}-${index}`}>
                                <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block group rounded-lg border border-transparent p-3 transition-all hover:border-white/10 hover:bg-black/20"
                                >
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`}
                                                aria-hidden
                                            />
                                            <Badge
                                                variant="outline"
                                                className={meta.badgeClass}
                                            >
                                                {sentimentIcon[item.sentiment]}{" "}
                                                {meta.label}
                                            </Badge>
                                        </div>
                                        <span className="font-mono text-[10px] uppercase text-stock-muted">
                                            {item.publishedAt}
                                        </span>
                                    </div>

                                    <p className="line-clamp-2 text-sm font-medium leading-relaxed text-white/90 group-hover:text-stock-accent transition-colors">
                                        {item.title}
                                    </p>
                                    <p className="mt-2 font-mono text-[10px] uppercase text-stock-muted">
                                        {item.publisher}
                                    </p>
                                </a>

                                {index < news.length - 1 ? (
                                    <Separator className="bg-white/5" />
                                ) : null}
                            </Fragment>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
