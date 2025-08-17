import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { logError } from '@/lib/logError';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logError('export-csv.auth', authError || new Error('No user'));
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { metrics, startDate, endDate } = await request.json();

    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return NextResponse.json(
        { error: 'At least one metric must be selected' },
        { status: 400 }
      );
    }

    // Get metric definitions
    const { data: metricDefinitions, error: metricError } = await supabase
      .from('metric_definitions')
      .select('id, slug, name, unit')
      .in('slug', metrics);

    if (metricError) {
      logError('export-csv.metric-definitions', metricError, { userId: user.id });
      return NextResponse.json(
        { error: 'Failed to fetch metric definitions' },
        { status: 500 }
      );
    }

    const metricIds = metricDefinitions.map(m => m.id);

    // Build query
    let query = supabase
      .from('measurements')
      .select(`
        measured_at,
        value_numeric,
        value_text,
        value_bool,
        metric_definitions!inner(
          slug,
          name,
          unit
        )
      `)
      .eq('user_id', user.id)
      .in('metric_id', metricIds)
      .order('measured_at', { ascending: true });

    if (startDate) {
      query = query.gte('measured_at', `${startDate}T00:00:00Z`);
    }
    if (endDate) {
      query = query.lte('measured_at', `${endDate}T23:59:59Z`);
    }

    const { data: measurements, error: measurementError } = await query;

    if (measurementError) {
      logError('export-csv.measurements', measurementError, { userId: user.id });
      return NextResponse.json(
        { error: 'Failed to fetch measurements' },
        { status: 500 }
      );
    }

    // Generate CSV content
    const csvHeaders = ['date', 'metric_slug', 'metric_name', 'value', 'unit'];
    const csvRows = [csvHeaders.join(',')];

    for (const measurement of measurements || []) {
      const date = measurement.measured_at.split('T')[0];
      const metricSlug = (measurement.metric_definitions as any).slug;
      const metricName = (measurement.metric_definitions as any).name;
      const unit = (measurement.metric_definitions as any).unit || '';
      
      let value = '';
      if (measurement.value_numeric !== null) {
        value = measurement.value_numeric.toString();
      } else if (measurement.value_text !== null) {
        value = measurement.value_text;
      } else if (measurement.value_bool !== null) {
        value = measurement.value_bool.toString();
      }

      const row = [date, metricSlug, metricName, value, unit]
        .map(field => `"${field.replace(/"/g, '""')}"`)
        .join(',');
      csvRows.push(row);
    }

    const csvContent = csvRows.join('\n');
    const filename = `everwell-export-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    logError('export-csv.unexpected', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
