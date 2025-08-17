import { Calendar, Scale, Ruler } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils/date';

interface MetricRow {
  id: string;
  date: string;
  weight_lbs: number | null;
  waist_inches: number | null;
  notes: string | null;
}

interface StatTileProps {
  metric: MetricRow;
}

export function StatTile({ metric }: StatTileProps) {
  const formattedDate = formatDate(metric.date);

  return (
    <Card className="transition-all duration-150 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{formattedDate}</span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            {metric.weight_lbs && (
              <div className="flex items-center space-x-1">
                <Scale className="h-3 w-3" />
                <span>{metric.weight_lbs} lbs</span>
              </div>
            )}
            {metric.waist_inches && (
              <div className="flex items-center space-x-1">
                <Ruler className="h-3 w-3" />
                <span>{metric.waist_inches} in</span>
              </div>
            )}
          </div>
        </div>
        {metric.notes && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {metric.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
