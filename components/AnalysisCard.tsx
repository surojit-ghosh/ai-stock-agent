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
    price: number | null;
    change: number | null;
    changePct: number | null;
    high: number | null;
    low: number | null;
    high52w: number | null;
    low52w: number | null;
    volume: string;
    marketCap: string;
    pe: number | null;
    pb: number | null;
    roe: string;
    eps: number | null;
    beta: number | null;
    dividendYield: string;
    rsi: number | null;
    sma20: number | null;
    sma50: number | null;
    macdSignal: string;
    recommendation: Recommendation;
    targetPrice: number | null;
    timingNote: string;
    buyZone: string;
    stopLoss: string;
    target1: string;
    target2: string;
    riskReward: string;
    analystSummary: string;
}

const formatNumber = (value: number | null | undefined, digits = 2) =>
    typeof value === "number" && Number.isFinite(value)
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
            <span className="font-medium text-stock-text">{value}</span>
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
        timingNote,
        buyZone,
        stopLoss,
        target1,
        target2,
        riskReward,
    } = props;

    const safeRsi =
        typeof rsi === "number" && Number.isFinite(rsi) ? rsi : null;
    const rsiValue = Math.max(0, Math.min(100, safeRsi ?? 50));
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
                        {targetPrice !== null &&
                        Number.isFinite(targetPrice) ? (
                            <span className="font-mono text-lg font-medium text-stock-muted">
                                Target:{" "}
                                <span className="font-bold text-white">
                                    ₹{formatNumber(targetPrice)}
                                </span>
                            </span>
                        ) : (
                            <span className="font-mono text-lg font-medium text-stock-muted">
                                Target:{" "}
                                <span className="font-bold text-white">
                                    N/A
                                </span>
                            </span>
                        )}
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
                                        {formatNumber(safeRsi, 1)}
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
                                            : macdSignal.toLowerCase() ===
                                                "bearish"
                                              ? "border-stock-red/30 bg-stock-red/10 text-stock-red font-mono uppercase tracking-wider backdrop-blur-sm text-[10px]"
                                              : "border-white/15 bg-white/5 text-stock-muted font-mono uppercase tracking-wider backdrop-blur-sm text-[10px]"
                                    }
                                >
                                    {macdSignal}
                                </Badge>
                            </div>
                        </section>
                    </div>

                    <Separator className="bg-white/10" />

                    <section className="space-y-3 rounded-lg border border-stock-accent/20 bg-stock-accent/5 p-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-stock-accent">
                            Entry Plan (Technical)
                        </h4>
                        <p className="text-sm leading-relaxed text-white/85">
                            {timingNote}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            <MetricRow
                                label="Buy Zone"
                                value={buyZone}
                                tip="Preferred accumulation range based on trend and momentum context."
                            />
                            <MetricRow
                                label="Stop Loss"
                                value={stopLoss}
                                tip="Risk-control level to cap downside if setup fails."
                            />
                            <MetricRow
                                label="Target 1"
                                value={target1}
                                tip="Base upside objective from analyst target or conservative technical projection."
                            />
                            <MetricRow
                                label="Target 2"
                                value={target2}
                                tip="Stretch target if momentum remains supportive."
                            />
                            <MetricRow
                                label="Risk:Reward"
                                value={riskReward}
                                tip="Estimated reward potential per unit of risk from the proposed entry setup."
                            />
                        </div>
                    </section>

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
