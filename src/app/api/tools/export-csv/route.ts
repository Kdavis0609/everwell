import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { userId, metrics, days } = await request.json();

    if (!userId || !metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return NextResponse.json(
        { error: 'User ID and metrics array are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days || 30));

    // Get metric definitions for the selected metrics
    const { data: metricDefinitions, error: metricError } = await supabase
      .from('metric_definitions')
      .select('id, slug, name, unit')
      .in('slug', metrics);

    if (metricError) {
      console.error('Error fetching metric definitions:', metricError);
      return NextResponse.json(
        { error: 'Failed to fetch metric definitions' },
        { status: 500 }
      );
    }

    const metricMap = new Map(metricDefinitions.map(m => [m.id, m]));

    // Fetch measurements for the selected metrics and date range
    const { data: measurements, error: measurementError } = await supabase
      .from('measurements')
      .select(`
        *,
        metric_definitions!inner(
          id,
          slug,
          name,
          unit
        )
      `)
      .eq('user_id', userId)
      .in('metric_id', metricDefinitions.map(m => m.id))
      .gte('measured_at', startDate.toISOString())
      .lte('measured_at', endDate.toISOString())
      .order('measured_at', { ascending: true });

    if (measurementError) {
      console.error('Error fetching measurements:', measurementError);
      return NextResponse.json(
        { error: 'Failed to fetch measurements' },
        { status: 500 }
      );
    }

    // Generate CSV content
    const csvRows = ['date,metric_slug,metric_name,value,unit'];

    for (const measurement of measurements) {
      const metricDef = metricMap.get(measurement.metric_id);
      if (!metricDef) continue;

      // Format the value based on the measurement type
      let value = '';
      if (measurement.value_numeric !== null) {
        value = measurement.value_numeric.toString();
      } else if (measurement.value_text !== null) {
        value = measurement.value_text;
      } else if (measurement.value_bool !== null) {
        value = measurement.value_bool.toString();
      }

      // Format date to YYYY-MM-DD
      const date = new Date(measurement.measured_at).toISOString().split('T')[0];

      // Escape CSV values (handle commas and quotes)
      const escapeCSV = (str: string) => {
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      csvRows.push([
        date,
        escapeCSV(metricDef.slug),
        escapeCSV(metricDef.name),
        escapeCSV(value),
        escapeCSV(metricDef.unit || '')
      ].join(','));
    }

    const csvContent = csvRows.join('\n');

    // Return CSV as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="everwell-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Export CSV error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
