'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { MetricsService } from '@/lib/services/metrics-service';

interface CSVRow {
  date: string;
  metric_slug: string;
  value: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  preview: CSVRow[];
}

export default function ImportExportPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabledMetrics, setEnabledMetrics] = useState<any[]>([]);
  
  // Import state
  const [csvData, setCsvData] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  
  // Export state
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState('30');
  const [exporting, setExporting] = useState(false);

  // Load user data and enabled metrics
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createSupabaseBrowser();
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) {
          window.location.href = '/login';
          return;
        }

        const uid = userData.user.id;
        setUserId(uid);

        const metrics = await MetricsService.getUserEnabledMetrics(supabase);
        setEnabledMetrics(metrics);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const validateCSV = (csvText: string): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const preview: CSVRow[] = [];

    if (!csvText.trim()) {
      return { isValid: false, errors: ['CSV data is required'], warnings: [], preview: [] };
    }

    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      return { isValid: false, errors: ['CSV must have at least a header row and one data row'], warnings: [], preview: [] };
    }

    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const requiredColumns = ['date', 'metric_slug', 'value'];
    
    for (const col of requiredColumns) {
      if (!header.includes(col)) {
        errors.push(`Missing required column: ${col}`);
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings: [], preview: [] };
    }

    const dateIndex = header.indexOf('date');
    const metricIndex = header.indexOf('metric_slug');
    const valueIndex = header.indexOf('value');

    // Parse data rows
    for (let i = 1; i < Math.min(lines.length, 21); i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = line.split(',').map(v => v.trim());
      if (values.length < 3) {
        errors.push(`Row ${i + 1}: Insufficient columns`);
        continue;
      }

      const row: CSVRow = {
        date: values[dateIndex],
        metric_slug: values[metricIndex],
        value: values[valueIndex]
      };

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
        errors.push(`Row ${i + 1}: Invalid date format (expected YYYY-MM-DD): ${row.date}`);
      }

      // Validate metric slug
      const metricExists = enabledMetrics.some(m => m.slug === row.metric_slug);
      if (!metricExists) {
        warnings.push(`Row ${i + 1}: Unknown metric slug: ${row.metric_slug}`);
      }

      // Validate value
      if (!row.value || row.value.trim() === '') {
        errors.push(`Row ${i + 1}: Empty value`);
      }

      preview.push(row);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      preview: preview.slice(0, 20)
    };
  };

  const handleCSVChange = (value: string) => {
    setCsvData(value);
    if (value.trim()) {
      const result = validateCSV(value);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  };

  const handleImport = async () => {
    if (!userId || !validationResult?.isValid) return;

    setImporting(true);
    try {
      const response = await fetch('/api/tools/import-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          csvData: csvData
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }

      const result = await response.json();
      toast.success(`Successfully imported ${result.importedCount} measurements`);
      setCsvData('');
      setValidationResult(null);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    if (!userId || selectedMetrics.length === 0) {
      toast.error('Please select at least one metric to export');
      return;
    }

    setExporting(true);
    try {
      const response = await fetch('/api/tools/export-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          metrics: selectedMetrics,
          days: parseInt(dateRange)
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `everwell-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleMetricToggle = (metricSlug: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricSlug)
        ? prev.filter(m => m !== metricSlug)
        : [...prev, metricSlug]
    );
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-muted-foreground">Loading...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Import & Export Data</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Import CSV Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Import CSV</span>
              </CardTitle>
              <CardDescription>
                Import measurements from a CSV file. Format: date, metric_slug, value
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="csv-data">CSV Data</Label>
                <Textarea
                  id="csv-data"
                  placeholder="date,metric_slug,value&#10;2024-01-01,weight_lbs,180&#10;2024-01-01,sleep_hours,7.5"
                  value={csvData}
                  onChange={(e) => handleCSVChange(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              {validationResult && (
                <div className="space-y-2">
                  {validationResult.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {validationResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {validationResult.warnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {validationResult.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {validationResult.isValid && validationResult.preview.length > 0 && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Preview (first {validationResult.preview.length} rows):
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-1">Date</th>
                                <th className="text-left p-1">Metric</th>
                                <th className="text-left p-1">Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {validationResult.preview.map((row, index) => (
                                <tr key={index} className="border-b">
                                  <td className="p-1">{row.date}</td>
                                  <td className="p-1">{row.metric_slug}</td>
                                  <td className="p-1">{row.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={!validationResult?.isValid || importing}
                className="w-full"
              >
                {importing ? 'Importing...' : 'Import CSV'}
              </Button>
            </CardContent>
          </Card>

          {/* Export CSV Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>Export CSV</span>
              </CardTitle>
              <CardDescription>
                Export your measurements to a CSV file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Metrics</Label>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                  {enabledMetrics.map((metric) => (
                    <div key={metric.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`metric-${metric.id}`}
                        checked={selectedMetrics.includes(metric.slug)}
                        onCheckedChange={() => handleMetricToggle(metric.slug)}
                      />
                      <Label htmlFor={`metric-${metric.id}`} className="text-sm">
                        {metric.name} ({metric.slug})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="date-range">Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleExport}
                disabled={selectedMetrics.length === 0 || exporting}
                className="w-full"
              >
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>CSV Format & Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">CSV Format</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Your CSV should have the following columns:
              </p>
              <div className="bg-muted p-3 rounded-md font-mono text-sm">
                date,metric_slug,value<br/>
                2024-01-01,weight_lbs,180<br/>
                2024-01-01,sleep_hours,7.5<br/>
                2024-01-01,water_oz,64
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Available Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {enabledMetrics.map((metric) => (
                  <div key={metric.id} className="bg-muted p-2 rounded">
                    <div className="font-medium">{metric.name}</div>
                    <div className="text-muted-foreground">{metric.slug}</div>
                  </div>
                ))}
              </div>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Before importing large amounts of data, we recommend backing up your existing measurements. 
                You can export your current data first, then import the new data. Imported measurements will be added to your existing data.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
