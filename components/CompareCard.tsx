import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface CompareCardProps {
    stocks: Array<{
        symbol: string;
        name: string;
        price: number;
        changePct: number;
        pe: number | null;
        pb: number | null;
        roe: string;
        marketCap: string;
        dividendYield: string;
        performance52w: string;
    }>;
    comparison: {
        bestPE: string;
        bestROE: string;
        best52w: string;
    };
}

const formatPrice = (price: number) => {
    if (!Number.isFinite(price)) {
        return "N/A";
    }

    return `Rs ${price.toLocaleString("en-IN", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    })}`;
};

const formatPct = (value: number) => {
    if (!Number.isFinite(value)) {
        return "N/A";
    }

    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
};

const winnerCellClass =
    "bg-(--color-stock-green)/10 ring-1 ring-inset ring-(--color-stock-green)/40";

export function CompareCard({ stocks, comparison }: CompareCardProps) {
    const metricRows = [
        { key: "pe", label: "P/E", winner: comparison.bestPE },
        { key: "roe", label: "ROE", winner: comparison.bestROE },
        {
            key: "performance52w",
            label: "52W Perf",
            winner: comparison.best52w,
        },
        { key: "pb", label: "P/B", winner: null },
        { key: "marketCap", label: "Mkt Cap", winner: null },
        { key: "dividendYield", label: "Div Yield", winner: null },
    ] as const;

    const scoreMap = stocks.reduce<Record<string, number>>((acc, stock) => {
        acc[stock.symbol] = 0;
        return acc;
    }, {});

    if (scoreMap[comparison.bestPE] !== undefined) {
        scoreMap[comparison.bestPE] += 1;
    }
    if (scoreMap[comparison.bestROE] !== undefined) {
        scoreMap[comparison.bestROE] += 1;
    }
    if (scoreMap[comparison.best52w] !== undefined) {
        scoreMap[comparison.best52w] += 1;
    }

    const bestOverall =
        Object.entries(scoreMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

    return (
        <Card className="border-(--color-stock-border) bg-(--color-stock-card) text-(--color-stock-text)">
            <CardHeader className="space-y-4">
                <CardTitle className="text-lg">Stock Comparison</CardTitle>

                <div className="grid gap-3 md:grid-cols-3">
                    {stocks.map((stock) => (
                        <div
                            key={stock.symbol}
                            className="rounded-md border border-(--color-stock-border)/40 px-3 py-2"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold">
                                    {stock.symbol}
                                </p>
                                <Badge
                                    variant="outline"
                                    className={
                                        stock.changePct >= 0
                                            ? "border-(--color-stock-green)/60 text-(--color-stock-green)"
                                            : "border-(--color-stock-red)/60 text-(--color-stock-red)"
                                    }
                                >
                                    {formatPct(stock.changePct)}
                                </Badge>
                            </div>
                            <p className="mt-1 text-xs text-(--color-stock-muted)">
                                {stock.name}
                            </p>
                            <p className="mt-2 font-mono text-sm">
                                {formatPrice(stock.price)}
                            </p>
                        </div>
                    ))}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="overflow-x-auto rounded-md border border-(--color-stock-border)/40">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-(--color-stock-bg)/50">
                                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-(--color-stock-muted)">
                                    Metric
                                </th>
                                {stocks.map((stock) => (
                                    <th
                                        key={`head-${stock.symbol}`}
                                        className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-(--color-stock-muted)"
                                    >
                                        {stock.symbol}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {metricRows.map((row) => (
                                <tr
                                    key={row.key}
                                    className="border-t border-(--color-stock-border)/40"
                                >
                                    <td className="px-3 py-2 font-medium">
                                        {row.label}
                                    </td>
                                    {stocks.map((stock) => {
                                        const value =
                                            row.key === "pe"
                                                ? stock.pe === null
                                                    ? "N/A"
                                                    : stock.pe.toFixed(2)
                                                : row.key === "pb"
                                                  ? stock.pb === null
                                                      ? "N/A"
                                                      : stock.pb.toFixed(2)
                                                  : row.key === "roe"
                                                    ? stock.roe
                                                    : row.key === "marketCap"
                                                      ? stock.marketCap
                                                      : row.key ===
                                                          "dividendYield"
                                                        ? stock.dividendYield
                                                        : stock.performance52w;

                                        const isWinner =
                                            row.winner === stock.symbol;

                                        return (
                                            <td
                                                key={`${row.key}-${stock.symbol}`}
                                                className={`px-3 py-2 ${isWinner ? winnerCellClass : ""}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>{value}</span>
                                                    {isWinner ? (
                                                        <Badge className="bg-(--color-stock-green) text-black">
                                                            Winner
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Separator className="bg-(--color-stock-border)/40" />

                <div className="rounded-md border border-(--color-stock-border)/40 bg-(--color-stock-bg)/40 px-3 py-2 text-sm">
                    <span className="text-(--color-stock-muted)">
                        Best overall:
                    </span>{" "}
                    <span className="font-semibold text-(--color-stock-green)">
                        {bestOverall}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
