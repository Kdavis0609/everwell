'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InsightsService } from '@/lib/services/insights-service';
import { InsightsData, AIInsight } from '@/lib/types';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  Target, 
  Activity, 
  Droplets, 
  Moon,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/loading-spinner';
import { formatDate, formatNumber } from '@/lib/utils/date';

export default function InsightsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        const supabase = createSupabaseBrowser();
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push('/login');
          return;
        }

        setUserId(user.id);

        // Load insights data
        const data = await InsightsService.getInsightsData(supabase);
        setInsightsData(data);
      } catch (error) {
        console.warn('Error loading insights:', error);
        toast.error('Failed to load insights');
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, [router]);

  const handleRegenerateInsights = async () => {
    if (!userId) return;

    setGenerating(true);
    try {
      const supabase = createSupabaseBrowser();
      const insight = await InsightsService.generateAIInsight(supabase);
      
      // Refresh the insights data
      const data = await InsightsService.getInsightsData(supabase);
      setInsightsData(data);
      
      toast.success('Insights regenerated successfully!');
    } catch (error) {
      console.warn('Error regenerating insights:', error);
      toast.error('Failed to regenerate insights');
    } finally {
      setGenerating(false);
    }
  };

  const getTrendIcon = (value: number | null) => {
    if (value === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (value: number | null) => {
    if (value === null) return 'text-muted-foreground';
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <LoadingSpinner size={20} />
            <span className="text-muted-foreground">Loading insights...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Disclaimer Banner */}
      <Alert className="mb-6 border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Informational only.</strong> These insights are for general wellness guidance and are not medical advice. 
          Always consult healthcare professionals for medical concerns.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        {/* Today's Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle>Today's AI Summary</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateInsights}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>
            <CardDescription>
              AI-powered insights based on your health data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {insightsData?.aiInsight ? (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed">
                  {insightsData.aiInsight.summary}
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Today's Actions:</h4>
                  <div className="flex flex-wrap gap-2">
                    {insightsData.aiInsight.actions.map((action, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>

                {insightsData.aiInsight.risk_flags && insightsData.aiInsight.risk_flags.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-amber-700">Observations:</h4>
                    <div className="space-y-1">
                      {insightsData.aiInsight.risk_flags.map((flag, index) => (
                        <div key={index} className="flex items-start space-x-2 text-xs text-amber-700">
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{flag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No AI insights available yet. Generate your first insight to get started.
                </p>
                <Button onClick={handleRegenerateInsights} disabled={generating}>
                  Generate Insights
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trends Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Weight Trend */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm">Weight Trend</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {insightsData?.today?.weight_lbs ? `${insightsData.today.weight_lbs} lbs` : '--'}
                  </span>
                  {getTrendIcon(insightsData?.trends.weight_trend || null)}
                </div>
                <div className="text-xs text-muted-foreground">
                  7-day avg: {insightsData?.trends.weight_7d_avg ? `${insightsData.trends.weight_7d_avg.toFixed(1)} lbs` : '--'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sleep Average */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Moon className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-sm">Sleep</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {insightsData?.today?.sleep_hours ? `${insightsData.today.sleep_hours}h` : '--'}
                  </span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-xs text-muted-foreground">
                  7-day avg: {insightsData?.trends.sleep_7d_avg ? `${insightsData.trends.sleep_7d_avg.toFixed(1)}h` : '--'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Steps */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-green-500" />
                <CardTitle className="text-sm">Steps</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {insightsData?.today?.steps ? formatNumber(insightsData.today.steps) : '--'}
                  </span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-xs text-muted-foreground">
                  7-day avg: {insightsData?.trends.steps_7d_avg ? formatNumber(insightsData.trends.steps_7d_avg) : '--'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Water */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm">Water</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {insightsData?.today?.water_oz ? `${insightsData.today.water_oz} oz` : '--'}
                  </span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-xs text-muted-foreground">
                  7-day avg: {insightsData?.trends.water_7d_avg ? `${insightsData.trends.water_7d_avg.toFixed(0)} oz` : '--'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Health Metrics */}
        {insightsData?.today && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Health Metrics</CardTitle>
              <CardDescription>
                Today's calculated health indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {insightsData.today.bmi ? insightsData.today.bmi.toFixed(1) : '--'}
                  </div>
                  <div className="text-sm text-blue-600">BMI</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {insightsData.today.waist_to_height ? (insightsData.today.waist_to_height * 100).toFixed(1) + '%' : '--'}
                  </div>
                  <div className="text-sm text-green-600">Waist-to-Height</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {insightsData.today.avg7_weight_lbs ? `${insightsData.today.avg7_weight_lbs.toFixed(1)} lbs` : '--'}
                  </div>
                  <div className="text-sm text-purple-600">7-day Weight Avg</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {insightsData?.recent && insightsData.recent.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>
                Your health data from the past week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insightsData.recent.slice(0, 5).map((day, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium">
                        {formatDate(day.day)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {day.weight_lbs && `${day.weight_lbs} lbs`}
                        {day.steps && ` • ${formatNumber(day.steps)} steps`}
                        {day.sleep_hours && ` • ${day.sleep_hours}h sleep`}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {day.bmi && `BMI: ${day.bmi.toFixed(1)}`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
