import { Check, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export interface ToolCallBadgeProps {
    toolName: string;
    state: "call" | "result";
}

const TOOL_LABELS: Record<string, string> = {
    getStockPrice: "📈 Fetching Price",
    getStockAnalysis: "🔍 Running Analysis",
    getMarketIndex: "📊 Loading Index",
    getStockNews: "📰 Fetching News",
    compareStocks: "⚖️ Comparing Stocks",
    getAIInsight: "🧠 AI Deep Analysis",
};

const getLabel = (toolName: string) =>
    TOOL_LABELS[toolName] ?? `Running ${toolName}`;

export function ToolCallBadge({ toolName, state }: ToolCallBadgeProps) {
    const label = getLabel(toolName);

    if (state === "call") {
        return (
            <div className="inline-flex items-center gap-2 rounded-full border border-(--color-stock-border)/50 bg-(--color-stock-bg)/50 px-3 py-1.5 text-(--color-stock-text)">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Loader2 className="h-3.5 w-3.5 animate-spin text-(--color-stock-accent)" />
                <span className="text-xs font-medium">{label}</span>
            </div>
        );
    }

    return (
        <Badge
            variant="outline"
            className="inline-flex h-auto items-center gap-1.5 rounded-full border-(--color-stock-green)/60 bg-(--color-stock-green)/10 px-3 py-1.5 text-xs text-(--color-stock-green)"
        >
            <Check className="h-3.5 w-3.5" />
            {label}
        </Badge>
    );
}
