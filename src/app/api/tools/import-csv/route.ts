import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { logError } from '@/lib/logError';
import Papa from 'papaparse';

interface CSVRow {
  date: string;
  metric_slug: string;
  value: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logError('import-csv.auth', authError || new Error('No user'));
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { csvData } = await request.json();

    if (!csvData) {
      return NextResponse.json(
        { error: 'CSV data is required' },
        { status: 400 }
      );
    }

    // Parse CSV data
    const parseResult = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim()
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid CSV format', details: parseResult.errors },
        { status: 400 }
      );
    }

    const rows = parseResult.data as CSVRow[];
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No data rows found in CSV' },
        { status: 400 }
      );
    }

    // Validate required columns
    const firstRow = rows[0];
    if (!firstRow.date || !firstRow.metric_slug || !firstRow.value) {
      return NextResponse.json(
        { error: 'CSV must contain date, metric_slug, and value columns' },
        { status: 400 }
      );
    }

    // Get metric definitions to validate slugs and get metric IDs
    const { data: metricDefinitions, error: metricError } = await supabase
      .from('metric_definitions')
      .select('id, slug, input_kind');

    if (metricError) {
      logError('import-csv.metric-definitions', metricError, { userId: user.id });
      return NextResponse.json(
        { error: 'Failed to fetch metric definitions' },
        { status: 500 }
      );
    }

    const metricMap = new Map(metricDefinitions.map(m => [m.slug, m]));

    // Prepare measurements for insertion
    const measurements = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
        errors.push(`Row ${i + 1}: Invalid date format (expected YYYY-MM-DD): ${row.date}`);
        continue;
      }

      // Validate metric slug
      const metricDef = metricMap.get(row.metric_slug);
      if (!metricDef) {
        errors.push(`Row ${i + 1}: Unknown metric slug: ${row.metric_slug}`);
        continue;
      }

      // Parse value based on input kind
      let valueNumeric = null;
      let valueText = null;
      let valueBool = null;

      if (metricDef.input_kind === 'number' || metricDef.input_kind === 'integer') {
        const num = parseFloat(row.value);
        if (isNaN(num)) {
          errors.push(`Row ${i + 1}: Invalid numeric value: ${row.value}`);
          continue;
        }
        valueNumeric = metricDef.input_kind === 'integer' ? Math.round(num) : num;
      } else if (metricDef.input_kind === 'boolean') {
        const lowerValue = row.value.toLowerCase();
        if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
          valueBool = true;
        } else if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
          valueBool = false;
        } else {
          errors.push(`Row ${i + 1}: Invalid boolean value: ${row.value}`);
          continue;
        }
      } else {
        valueText = row.value;
      }

      measurements.push({
        user_id: user.id,
        metric_id: metricDef.id,
        measured_at: `${row.date}T00:00:00Z`,
        value_numeric: valueNumeric,
        value_text: valueText,
        value_bool: valueBool,
        created_at: new Date().toISOString()
      });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation errors found', details: errors },
        { status: 400 }
      );
    }

    if (measurements.length === 0) {
      return NextResponse.json(
        { error: 'No valid measurements to import' },
        { status: 400 }
      );
    }

    // Insert measurements
    const { data: insertedMeasurements, error: insertError } = await supabase
      .from('measurements')
      .insert(measurements)
      .select();

    if (insertError) {
      logError('import-csv.insert', insertError, { userId: user.id, count: measurements.length });
      return NextResponse.json(
        { error: 'Failed to insert measurements' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: insertedMeasurements.length,
      total: measurements.length
    });

  } catch (error) {
    logError('import-csv.unexpected', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
