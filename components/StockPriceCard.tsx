import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface StockPriceCardProps {
    symbol: string;
    name: string;
    price: string;
    change: string;
    changePercent: string;
    high: string;
    low: string;
    high52w: string;
    low52w: string;
    volume: string;
    marketCap: string;
}

const parseSignedNumber = (value: string) => {
    const parsed = Number.parseFloat(value.replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : 0;
};

const progressPercent = (low: string, high: string, price: string) => {
    const min = parseSignedNumber(low);
    const max = parseSignedNumber(high);
    const current = parseSignedNumber(price);

    if (!(max > min)) {
        return 0;
    }

    const percent = ((current - min) / (max - min)) * 100;
    return Math.min(100, Math.max(0, percent));
};

export function StockPriceCard({
    symbol,
    name,
    price,
    change,
    changePercent,
    high,
    low,
    high52w,
    low52w,
    volume,
    marketCap,
}: StockPriceCardProps) {
    const isUp = parseSignedNumber(change) >= 0;
    const rangeProgress = progressPercent(low52w, high52w, price);

    return (
        <Card
            className={
                isUp
                    ? "overflow-hidden border-stock-green/20 bg-white/[0.02] shadow-[0_0_30px_rgba(16,185,129,0.03)] backdrop-blur-xl transition-all hover:border-stock-green/40"
                    : "overflow-hidden border-stock-red/20 bg-white/[0.02] shadow-[0_0_30px_rgba(239,68,68,0.03)] backdrop-blur-xl transition-all hover:border-stock-red/40"
            }
        >
            <CardHeader className="space-y-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <Badge variant="outline" className="font-mono text-[10px] tracking-wider text-stock-muted border-white/10">{symbol}</Badge>
                        <CardTitle className="mt-2 text-xl tracking-tight text-white">{name}</CardTitle>
                    </div>
                    <Badge
                        variant="outline"
                        className={
                            isUp
                                ? "border-stock-green/30 bg-stock-green/10 text-stock-green font-mono"
                                : "border-stock-red/30 bg-stock-red/10 text-stock-red font-mono"
                        }
                    >
                        {isUp ? "+" : ""}{change} ({changePercent})
                    </Badge>
                </div>

                <p className="font-mono text-4xl font-bold tracking-tight text-white">₹{price}</p>
            </CardHeader>

            <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-black/20 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-stock-muted">
                            Day High
                        </p>
                        <p className="font-mono text-sm font-medium text-white">₹{high}</p>
                    </div>
                    <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-black/20 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-stock-muted">
                            Day Low
                        </p>
                        <p className="font-mono text-sm font-medium text-white">₹{low}</p>
                    </div>
                    <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-black/20 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-stock-muted">
                            Volume
                        </p>
                        <p className="font-mono text-sm font-medium text-white">{volume}</p>
                    </div>
                    <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-black/20 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-stock-muted">
                            Mkt Cap
                        </p>
                        <p className="font-mono text-sm font-medium text-white">{marketCap}</p>
                    </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-3">
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase text-stock-muted">
                        <span>52W L: <span className="text-white/80">₹{low52w}</span></span>
                        <span>52W H: <span className="text-white/80">₹{high52w}</span></span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                            className={
                                isUp
                                    ? "h-full bg-stock-green/70"
                                    : "h-full bg-stock-red/70"
                            }
                            style={{ width: `${rangeProgress}%` }}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
