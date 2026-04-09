import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface InsightCardProps {
    symbol: string;
    name: string;
    currentPrice: number | null;
    changePercent: number | null;
    marketCap: string;
    pe: number | null;
    roe: string;
    beta: number | null;
    rsi: number | null;
    smaSignal: string;
    analystTarget: number | null;
    conviction: number;
    horizonLabel: string;
    thesis: string;
    bullCase: string[];
    bearCase: string[];
    riskSignals: string[];
    catalysts: string[];
    verdict: string;
}

const verdictColor: Record<string, string> = {
    "STRONG BUY": "bg-stock-green/20 text-stock-green border-stock-green/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]",
    BUY: "bg-stock-green/15 text-stock-green border-stock-green/30",
    HOLD: "bg-stock-accent/15 text-stock-accent border-stock-accent/30",
    SELL: "bg-stock-red/15 text-stock-red border-stock-red/30",
    "STRONG SELL": "bg-stock-red/20 text-stock-red border-stock-red/40 shadow-[0_0_20px_rgba(239,68,68,0.3)]",
};

const convictionColor = (score: number) => {
    if (score >= 8) return "text-stock-green";
    if (score >= 5) return "text-stock-accent";
    return "text-stock-red";
};

const convictionBarColor = (score: number) => {
    if (score >= 8) return "bg-stock-green";
    if (score >= 5) return "bg-stock-accent";
    return "bg-stock-red";
};

const formatNum = (v: number | null) =>
    v !== null && Number.isFinite(v) ? v.toFixed(2) : "N/A";

export function InsightCard(props: InsightCardProps) {
    const {
        symbol,
        name,
        currentPrice,
        marketCap,
        conviction,
        horizonLabel,
        thesis,
        bullCase,
        bearCase,
        riskSignals,
        catalysts,
        verdict,
        pe,
        roe,
        beta,
        rsi,
        smaSignal,
        analystTarget,
    } = props;

    const convictionClamped = Math.max(1, Math.min(10, conviction));
    const barWidth = (convictionClamped / 10) * 100;

    return (
        <Card className="overflow-hidden border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
            <CardHeader className="space-y-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="mb-1 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-stock-accent/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-stock-accent">
                                <span className="h-1.5 w-1.5 rounded-full bg-stock-accent animate-pulse" />
                                AI Deep Analysis
                            </span>
                        </div>
                        <CardTitle className="text-xl font-bold tracking-tight text-white">
                            {name}
                        </CardTitle>
                        <p className="font-mono text-xs text-stock-muted">
                            {symbol}
                        </p>
                    </div>
                    <Badge
                        className={`px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider backdrop-blur-sm ${verdictColor[verdict] ?? verdictColor.HOLD}`}
                    >
                        {verdict}
                    </Badge>
                </div>

                <div className="flex items-baseline gap-4">
                    <span className="font-mono text-3xl font-bold text-white">
                        ₹{formatNum(currentPrice)}
                    </span>
                    {analystTarget ? (
                        <span className="font-mono text-sm text-stock-muted">
                            Target: <span className="font-bold text-white">₹{formatNum(analystTarget)}</span>
                        </span>
                    ) : null}
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Conviction Score */}
                <div className="rounded-lg border border-white/5 bg-black/20 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-stock-muted">
                            AI Conviction Score
                        </span>
                        <span className={`font-mono text-2xl font-bold ${convictionColor(convictionClamped)}`}>
                            {convictionClamped}/10
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${convictionBarColor(convictionClamped)}`}
                            style={{ width: `${barWidth}%` }}
                        />
                    </div>
                    <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-wider text-stock-muted/50">
                        <span>Very Bearish</span>
                        <span>Neutral</span>
                        <span>Very Bullish</span>
                    </div>
                </div>

                {/* Thesis */}
                <div className="rounded-lg border border-white/5 bg-black/20 p-4">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stock-muted">
                        Investment Thesis
                    </h4>
                    <p className="text-sm leading-relaxed text-white/90">
                        {thesis}
                    </p>
                    <Badge
                        variant="outline"
                        className="mt-3 border-white/10 font-mono text-[10px] text-stock-muted"
                    >
                        Horizon: {horizonLabel}
                    </Badge>
                </div>

                {/* Key Metrics Summary */}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {[
                        { label: "P/E", value: formatNum(pe) },
                        { label: "ROE", value: roe },
                        { label: "Beta", value: formatNum(beta) },
                        { label: "RSI", value: formatNum(rsi) },
                        { label: "SMA", value: smaSignal },
                        { label: "Mkt Cap", value: marketCap },
                    ].map((m) => (
                        <div
                            key={m.label}
                            className="flex flex-col items-center gap-1 rounded-md border border-white/5 bg-black/20 px-2 py-2"
                        >
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-stock-muted">
                                {m.label}
                            </span>
                            <span className="font-mono text-xs font-medium text-white">
                                {m.value}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Bull & Bear Cases */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 rounded-lg border border-stock-green/20 bg-stock-green/5 p-4">
                        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stock-green">
                            <span className="h-2 w-2 rounded-full bg-stock-green" />
                            Bull Case
                        </h4>
                        <ul className="space-y-1.5">
                            {bullCase.map((point, i) => (
                                <li
                                    key={`bull-${i}`}
                                    className="flex items-start gap-2 text-sm leading-relaxed text-white/80"
                                >
                                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stock-green/60" />
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="space-y-2 rounded-lg border border-stock-red/20 bg-stock-red/5 p-4">
                        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stock-red">
                            <span className="h-2 w-2 rounded-full bg-stock-red" />
                            Bear Case
                        </h4>
                        <ul className="space-y-1.5">
                            {bearCase.map((point, i) => (
                                <li
                                    key={`bear-${i}`}
                                    className="flex items-start gap-2 text-sm leading-relaxed text-white/80"
                                >
                                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stock-red/60" />
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Risk Signals & Catalysts */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 rounded-lg border border-white/5 bg-black/20 p-4">
                        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-yellow-500">
                            ⚠️ Risk Signals
                        </h4>
                        <ul className="space-y-1.5">
                            {riskSignals.map((signal, i) => (
                                <li
                                    key={`risk-${i}`}
                                    className="text-sm leading-relaxed text-white/70"
                                >
                                    • {signal}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="space-y-2 rounded-lg border border-white/5 bg-black/20 p-4">
                        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stock-accent">
                            🚀 Catalysts
                        </h4>
                        <ul className="space-y-1.5">
                            {catalysts.map((catalyst, i) => (
                                <li
                                    key={`cat-${i}`}
                                    className="text-sm leading-relaxed text-white/70"
                                >
                                    • {catalyst}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <Separator className="bg-white/10" />

                <p className="text-center text-[10px] uppercase tracking-widest text-stock-muted/50">
                    AI-generated investment analysis for informational purposes only.
                </p>
            </CardContent>

            <CardFooter className="border-t border-white/10 bg-black/40 px-6 py-3">
                <div className="flex w-full items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-stock-muted">
                        Powered by AI Deep Analysis Engine
                    </span>
                    <Badge
                        variant="outline"
                        className="border-stock-accent/30 bg-stock-accent/10 font-mono text-[10px] text-stock-accent"
                    >
                        qwen3-32b
                    </Badge>
                </div>
            </CardFooter>
        </Card>
    );
}
