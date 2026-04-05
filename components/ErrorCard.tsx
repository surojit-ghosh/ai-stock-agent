import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface ErrorCardProps {
    error: string;
    symbol?: string;
}

export function ErrorCard({ error, symbol }: ErrorCardProps) {
    return (
        <Card className="border-(--color-stock-red)/60 bg-(--color-stock-red)/8 text-(--color-stock-text) ring-(--color-stock-red)/25">
            <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-(--color-stock-red)" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-(--color-stock-red)">
                            Unable to Fetch Stock Data
                        </p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>

                {symbol ? (
                    <Badge
                        variant="outline"
                        className="border-(--color-stock-red)/50 text-(--color-stock-red)"
                    >
                        Input: {symbol}
                    </Badge>
                ) : null}

                <p className="text-xs text-(--color-stock-muted)">
                    Try RELIANCE.NS, TCS.NS, INFY.NS
                </p>
            </CardContent>
        </Card>
    );
}
