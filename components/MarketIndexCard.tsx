import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface MarketIndexCardProps {
    indexName: string;
    value: number;
    change: number;
    changePct: number;
    dayHigh: number;
    dayLow: number;
    advances: number;
    declines: number;
    topGainers: Array<{ symbol: string; changePct: number }>;
    topLosers: Array<{ symbol: string; changePct: number }>;
}

const formatNumber = (value: number, fractionDigits = 2) => {
    if (!Number.isFinite(value)) {
        return "N/A";
    }

    return value.toLocaleString("en-IN", {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
    });
};

const formatPct = (value: number) => {
    if (!Number.isFinite(value)) {
        return "N/A";
    }

    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
};

const moverBadgeClass = (value: number) => {
    if (value >= 0) {
        return "border-stock-green/30 bg-stock-green/10 text-stock-green font-mono";
    }

    return "border-stock-red/30 bg-stock-red/10 text-stock-red font-mono";
};

export function MarketIndexCard({
    indexName,
    value,
    change,
    changePct,
    dayHigh,
    dayLow,
    advances,
    declines,
    topGainers,
    topLosers,
}: MarketIndexCardProps) {
    const total = Math.max(advances + declines, 1);
    const advanceWidth = (advances / total) * 100;
    const declineWidth = 100 - advanceWidth;
    const isUp = change >= 0;

    return (
        <Card className="overflow-hidden border-white/10 bg-white/[0.02] shadow-2xl backdrop-blur-xl text-stock-text">
            <CardHeader className="space-y-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle className="text-lg font-bold tracking-tight text-white">{indexName}</CardTitle>
                        <p className="mt-1 font-mono text-3xl font-bold tracking-tight text-white">
                            ₹{formatNumber(value)}
                        </p>
                    </div>

                    <Badge
                        variant="outline"
                        className={
                            isUp
                                ? "border-stock-green/30 bg-stock-green/10 text-stock-green font-mono"
                                : "border-stock-red/30 bg-stock-red/10 text-stock-red font-mono"
                        }
                    >
                        {formatNumber(change)} ({formatPct(changePct)})
                    </Badge>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-stock-muted">
                        <span>Advances: <span className="text-stock-green">{advances}</span></span>
                        <span>Declines: <span className="text-stock-red">{declines}</span></span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div className="flex h-full w-full">
                            <div
                                className="h-full bg-stock-green/80"
                                style={{ width: `${advanceWidth}%` }}
                            />
                            <div
                                className="h-full bg-stock-red/80"
                                style={{ width: `${declineWidth}%` }}
                            />
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <section className="space-y-3">
                        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stock-muted">
                            Top Gainers
                        </h4>
                        <div className="space-y-2">
                            {topGainers.length === 0 ? (
                                <p className="text-sm text-stock-muted">
                                    No data
                                </p>
                            ) : (
                                topGainers.map((stock) => (
                                    <div
                                        key={`gainer-${stock.symbol}`}
                                        className="flex items-center justify-between rounded-md border border-white/5 bg-black/20 px-3 py-2"
                                    >
                                        <span className="font-mono text-sm font-medium text-white">
                                            {stock.symbol}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className={moverBadgeClass(
                                                stock.changePct,
                                            )}
                                        >
                                            {formatPct(stock.changePct)}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stock-muted">
                            Top Losers
                        </h4>
                        <div className="space-y-2">
                            {topLosers.length === 0 ? (
                                <p className="text-sm text-stock-muted">
                                    No data
                                </p>
                            ) : (
                                topLosers.map((stock) => (
                                    <div
                                        key={`loser-${stock.symbol}`}
                                        className="flex items-center justify-between rounded-md border border-white/5 bg-black/20 px-3 py-2"
                                    >
                                        <span className="font-mono text-sm font-medium text-white">
                                            {stock.symbol}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className={moverBadgeClass(
                                                stock.changePct,
                                            )}
                                        >
                                            {formatPct(stock.changePct)}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                <Separator className="bg-white/10" />

                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-black/20 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-stock-muted">
                            Day High
                        </p>
                        <p className="font-mono text-sm font-medium text-white">
                            ₹{formatNumber(dayHigh)}
                        </p>
                    </div>
                    <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-black/20 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-stock-muted">
                            Day Low
                        </p>
                        <p className="font-mono text-sm font-medium text-white">₹{formatNumber(dayLow)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
