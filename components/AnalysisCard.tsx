import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type Recommendation = "BUY" | "HOLD" | "SELL";

export interface AnalysisCardProps {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePct: number;
    high: number;
    low: number;
    high52w: number;
    low52w: number;
    volume: string;
    marketCap: string;
    pe: number;
    pb: number;
    roe: string;
    eps: number;
    beta: number;
    dividendYield: string;
    rsi: number;
    sma20: number;
    sma50: number;
    macdSignal: string;
    recommendation: Recommendation;
    targetPrice: number;
    analystSummary: string;
}

const formatNumber = (value: number, digits = 2) =>
    Number.isFinite(value)
        ? value.toLocaleString("en-IN", {
              minimumFractionDigits: digits,
              maximumFractionDigits: digits,
          })
        : "N/A";

const recommendationClass: Record<Recommendation, string> = {
    BUY: "bg-stock-green/15 text-stock-green border-stock-green/30",
    HOLD: "bg-stock-accent/15 text-stock-accent border-stock-accent/30",
    SELL: "bg-stock-red/15 text-stock-red border-stock-red/30",
};

const rsiStrokeClass = (rsi: number) => {
    if (rsi > 70) {
        return "text-[var(--color-stock-red)]";
    }
    if (rsi < 30) {
        return "text-[var(--color-stock-green)]";
    }
    return "text-[var(--color-stock-accent)]";
};

function MetricRow({
    label,
    value,
    tip,
}: {
    label: string;
    value: string;
    tip: string;
}) {
    return (
        <div className="flex items-center justify-between rounded-md border border-white/5 bg-black/20 px-3 py-2">
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="cursor-help text-xs text-stock-muted underline decoration-dotted underline-offset-4">
                        {label}
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="max-w-56 text-xs">{tip}</p>
                </TooltipContent>
            </Tooltip>
            <span className="font-medium text-stock-text">
                {value}
            </span>
        </div>
    );
}

export function AnalysisCard(props: AnalysisCardProps) {
    const {
        symbol,
        name,
        price,
        targetPrice,
        recommendation,
        pe,
        pb,
        roe,
        eps,
        beta,
        dividendYield,
        rsi,
        sma20,
        sma50,
        macdSignal,
        analystSummary,
    } = props;

    const rsiValue = Math.max(0, Math.min(100, Number.isFinite(rsi) ? rsi : 0));
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const progress = (rsiValue / 100) * circumference;

    return (
        <TooltipProvider>
            <Card className="overflow-hidden border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
                <CardHeader className="space-y-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <CardTitle className="text-xl font-bold tracking-tight text-white">
                                {name}
                            </CardTitle>
                            <p className="font-mono text-xs text-stock-muted">
                                {symbol}
                            </p>
                        </div>
                        <Badge
                            className={`px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider backdrop-blur-sm ${recommendationClass[recommendation]}`}
                        >
                            {recommendation}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="font-mono text-2xl font-bold text-white">
                            ₹{formatNumber(price)}
                        </span>
                        <ArrowRight className="h-4 w-4 text-stock-muted" />
                        <span className="font-mono text-lg font-medium text-stock-muted">
                            Target: <span className="font-bold text-white">₹{formatNumber(targetPrice)}</span>
                        </span>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <section className="space-y-3">
                            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stock-muted">
                                Fundamentals
                            </h4>
                            <MetricRow
                                label="P/E"
                                value={formatNumber(pe)}
                                tip="Price to Earnings ratio; lower can suggest lower valuation relative to earnings."
                            />
                            <MetricRow
                                label="P/B"
                                value={formatNumber(pb)}
                                tip="Price to Book ratio; compares market value to net assets."
                            />
                            <MetricRow
                                label="ROE"
                                value={roe}
                                tip="Return on Equity; indicates how efficiently equity generates profit."
                            />
                            <MetricRow
                                label="EPS"
                                value={formatNumber(eps)}
                                tip="Earnings per Share; profitability attributable to each share."
                            />
                            <MetricRow
                                label="Beta"
                                value={formatNumber(beta)}
                                tip="Volatility relative to market; above 1 typically means higher volatility."
                            />
                            <MetricRow
                                label="Dividend Yield"
                                value={dividendYield}
                                tip="Annual dividend as a percentage of stock price."
                            />
                        </section>

                        <section className="space-y-3">
                            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stock-muted">
                                Technicals
                            </h4>
                            <div className="rounded-md border border-white/5 bg-black/20 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-stock-muted">
                                        RSI (14)
                                    </span>
                                    <span className="font-mono text-sm font-semibold text-white">
                                        {formatNumber(rsi, 1)}
                                    </span>
                                </div>
                                <div className="grid place-items-center">
                                    <svg
                                        viewBox="0 0 120 120"
                                        className="h-28 w-28 -rotate-90"
                                    >
                                        <circle
                                            cx="60"
                                            cy="60"
                                            r={radius}
                                            fill="none"
                                            stroke="currentColor"
                                            className="text-white/10"
                                            strokeWidth="10"
                                        />
                                        <circle
                                            cx="60"
                                            cy="60"
                                            r={radius}
                                            fill="none"
                                            stroke="currentColor"
                                            className={rsiStrokeClass(rsiValue)}
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                            strokeDasharray={`${progress} ${circumference - progress}`}
                                        />
                                    </svg>
                                </div>
                                <p className="mt-1 text-center font-mono text-[10px] text-stock-muted/50">
                                    0-30 oversold, 70-100 overbought
                                </p>
                            </div>

                            <MetricRow
                                label="SMA20"
                                value={formatNumber(sma20)}
                                tip="Simple moving average of the last 20 closes."
                            />
                            <MetricRow
                                label="SMA50"
                                value={formatNumber(sma50)}
                                tip="Simple moving average of the last 50 closes."
                            />

                            <div className="flex items-center justify-between rounded-md border border-white/5 bg-black/20 px-3 py-2">
                                <span className="cursor-help text-[10px] font-semibold uppercase tracking-wider text-stock-muted underline decoration-dotted underline-offset-4">
                                    SMA Crossover
                                </span>
                                <Badge
                                    variant="outline"
                                    className={
                                        macdSignal.toLowerCase() === "bullish"
                                            ? "border-stock-green/30 bg-stock-green/10 text-stock-green font-mono uppercase tracking-wider backdrop-blur-sm text-[10px]"
                                            : "border-stock-red/30 bg-stock-red/10 text-stock-red font-mono uppercase tracking-wider backdrop-blur-sm text-[10px]"
                                    }
                                >
                                    {macdSignal}
                                </Badge>
                            </div>
                        </section>
                    </div>

                    <Separator className="bg-white/10" />

                    <p className="text-center text-[10px] uppercase tracking-widest text-stock-muted/50">
                        This is for informational purposes only.
                    </p>
                </CardContent>

                <CardFooter className="border-t border-white/10 bg-black/40 px-6 py-4">
                    <p className="text-sm leading-relaxed text-stock-text/80">
                        {analystSummary}
                    </p>
                </CardFooter>
            </Card>
        </TooltipProvider>
    );
}
