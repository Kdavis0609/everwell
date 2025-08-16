'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form-field';
import { SubmitBar } from '@/components/submit-bar';
import { StatTile } from '@/components/stat-tile';
import { EmptyState } from '@/components/empty-state';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Activity, Plus, TrendingUp } from 'lucide-react';

type MetricRow = {
  id: string;
  user_id: string;
  date: string;
  weight_lbs: number | null;
  waist_inches: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export default function MetricsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recent, setRecent] = useState<MetricRow[]>([]);

  // ---- Form state ----
  const [weight_lbs, setWeight] = useState('');
  const [waist_inches, setWaist] = useState('');
  const [notes, setNotes] = useState('');

  // Load user + recent metrics
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setErrorMsg('Not signed in. Redirecting to login…');
        setTimeout(() => (window.location.href = '/login'), 800);
        setLoading(false);
        return;
      }

      setUserId(userData.user.id);

      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(14);

      if (error) setErrorMsg(error.message);
      else setRecent((data as MetricRow[]) || []);

      setLoading(false);
    })();
  }, []);

  // Helper to turn text -> number or null
  const asNum = (v: string) => (v.trim() === '' ? null : Number(v));

  const saveMetrics = async () => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    // Build today (YYYY-MM-DD)
    const today = new Date().toISOString().slice(0, 10);

    // Validate obvious issues
    const nWeight = asNum(weight_lbs);
    const nWaist = asNum(waist_inches);
    
    if (nWeight !== null && Number.isNaN(nWeight)) {
      toast.error('Weight must be a number.');
      return;
    }
    
    if (nWaist !== null && Number.isNaN(nWaist)) {
      toast.error('Waist measurement must be a number.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const payload = {
      user_id: userId,
      date: today,
      weight_lbs: nWeight,
      waist_inches: nWaist,
      notes: notes.trim() || null,
    };

    console.log('Saving metrics payload:', payload);

    try {
      // Upsert today's metrics
      const { error } = await supabase
        .from('metrics')
        .upsert([payload], { onConflict: 'metrics_user_date_unique' });

      if (error) {
        console.error('Supabase error:', error);
        setErrorMsg(error.message);
        toast.error('Failed to save metrics: ' + error.message);
        return;
      }

      console.log('Metrics saved successfully');
      toast.success('Today\'s metrics saved successfully!');

      // Clear the form
      setWeight('');
      setWaist('');
      setNotes('');

      // Refresh recent list
      const { data, error: refErr } = await supabase
        .from('metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(14);

      if (!refErr) setRecent((data as MetricRow[]) || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      setErrorMsg('An unexpected error occurred');
      toast.error('An unexpected error occurred');
      return;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <LoadingSpinner size={20} />
            <span className="text-muted-foreground">Loading...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Today's Metrics</h1>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-destructive text-sm">{errorMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form */}
          <div className="lg:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Add today's metrics</span>
                </CardTitle>
                <CardDescription>Track your daily health data</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); saveMetrics(); }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Weight (lbs)">
                      <Input 
                        type="number" 
                        placeholder="Enter weight" 
                        value={weight_lbs}
                        onChange={(e) => setWeight(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Waist (inches)">
                      <Input 
                        type="number" 
                        placeholder="Enter waist measurement" 
                        value={waist_inches}
                        onChange={(e) => setWaist(e.target.value)}
                      />
                    </FormField>
                  </div>
                  <FormField label="Notes">
                    <Textarea 
                      placeholder="Any notes about today's health..." 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </FormField>
                  <SubmitBar>
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <LoadingSpinner className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Save Today's Metrics
                        </>
                      )}
                    </Button>
                  </SubmitBar>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Recent list */}
          <div className="lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Recent entries</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recent.length === 0 ? (
                  <EmptyState 
                    icon={Activity} 
                    message="No metrics logged yet. Start tracking your health today!" 
                  />
                ) : (
                  <div className="space-y-3">
                    {recent.map((metric) => (
                      <StatTile key={metric.id} metric={metric} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
