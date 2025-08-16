# CSV Import/Export Feature

The CSV Import/Export feature allows users to bulk import measurements from CSV files and export their existing data for backup or analysis purposes.

## Features

### Import CSV
- **Format**: CSV with columns `date`, `metric_slug`, `value`
- **Validation**: 
  - Date format validation (YYYY-MM-DD)
  - Metric slug validation against enabled metrics
  - Value type validation based on metric input kind
  - Preview of first 20 rows before import
- **Error Handling**: Detailed error messages for invalid data
- **Data Types**: Supports numeric, text, and boolean values

### Export CSV
- **Format**: CSV with columns `date`, `metric_slug`, `metric_name`, `value`, `unit`
- **Selection**: Choose specific metrics to export
- **Date Range**: Export data for last 7, 30, 90, or 365 days
- **Download**: Automatic file download with timestamped filename

## Usage

### Accessing the Feature
1. Navigate to `/tools/import-export` in the application
2. Or use the "Import/Export" link in the top navigation

### Importing Data
1. **Prepare CSV**: Ensure your CSV has the required columns:
   ```csv
   date,metric_slug,value
   2024-01-01,weight_lbs,180
   2024-01-01,sleep_hours,7.5
   2024-01-01,water_oz,64
   ```

2. **Paste Data**: Copy your CSV content and paste it into the text area

3. **Validate**: The system will automatically validate and show:
   - Errors (must be fixed before import)
   - Warnings (unknown metric slugs)
   - Preview of data to be imported

4. **Import**: Click "Import CSV" to add the measurements to your account

### Exporting Data
1. **Select Metrics**: Check the metrics you want to export
2. **Choose Date Range**: Select from 7, 30, 90, or 365 days
3. **Export**: Click "Export CSV" to download your data

## CSV Format Specifications

### Import Format
```csv
date,metric_slug,value
2024-01-01,weight_lbs,180
2024-01-01,sleep_hours,7.5
2024-01-01,water_oz,64
2024-01-01,steps,8000
2024-01-01,meditation,true
```

### Export Format
```csv
date,metric_slug,metric_name,value,unit
2024-01-01,weight_lbs,Weight (lbs),180,lbs
2024-01-01,sleep_hours,Sleep (hours),7.5,hours
2024-01-01,water_oz,Water (oz),64,oz
```

## Data Type Handling

### Numeric Values
- **number**: Decimal values (e.g., 7.5, 180.2)
- **integer**: Whole numbers (e.g., 8000, 7)

### Boolean Values
- **true**: "true", "1", "yes"
- **false**: "false", "0", "no"

### Text Values
- Any string value for text-based metrics

## Validation Rules

### Date Format
- Must be in YYYY-MM-DD format
- Examples: 2024-01-01, 2024-12-31

### Metric Slugs
- Must match enabled metrics in your account
- Common slugs: `weight_lbs`, `sleep_hours`, `water_oz`, `steps`

### Values
- Cannot be empty
- Must match the expected data type for the metric
- Numeric values must be valid numbers
- Boolean values must be recognized boolean strings

## Error Handling

### Import Errors
- **Missing columns**: CSV must contain date, metric_slug, and value
- **Invalid date format**: Dates must be YYYY-MM-DD
- **Unknown metric**: Metric slug not found in enabled metrics
- **Invalid value type**: Value doesn't match metric's expected type
- **Empty values**: Values cannot be blank

### Import Warnings
- **Unknown metric slug**: Metric exists but isn't enabled for your account
- **Large datasets**: Recommendations for large imports

## Best Practices

### Before Importing
1. **Backup**: Export your current data first
2. **Validate**: Check your CSV format and data
3. **Test**: Import a small sample first
4. **Review**: Check the preview before confirming import

### CSV Preparation
1. **Headers**: Include the exact column names
2. **Dates**: Use YYYY-MM-DD format
3. **Values**: Ensure values match metric types
4. **Encoding**: Use UTF-8 encoding
5. **Quotes**: Escape commas and quotes in text values

### Large Imports
- Consider breaking large files into smaller chunks
- Monitor import progress
- Verify data after import
- Keep backup of original CSV files

## Troubleshooting

### Common Issues

**"Invalid date format"**
- Ensure dates are in YYYY-MM-DD format
- Check for extra spaces or characters

**"Unknown metric slug"**
- Verify the metric slug exists in your enabled metrics
- Check spelling and case sensitivity

**"Invalid numeric value"**
- Ensure numeric fields contain only numbers
- Remove any currency symbols or units

**"Import failed"**
- Check your internet connection
- Try importing smaller batches
- Verify CSV format is correct

### Getting Help
1. Check the validation preview for specific errors
2. Review the CSV format examples
3. Export your current data to see the expected format
4. Contact support if issues persist

## Security & Privacy

- All imports are validated server-side
- Data is associated with your user account only
- Exports only include your own data
- CSV files are processed securely
- No data is stored permanently in temporary files

## API Endpoints

### Import CSV
- **POST** `/api/tools/import-csv`
- **Body**: `{ userId: string, csvData: string }`
- **Response**: `{ success: boolean, importedCount: number, message: string }`

### Export CSV
- **POST** `/api/tools/export-csv`
- **Body**: `{ userId: string, metrics: string[], days: number }`
- **Response**: CSV file download

## Future Enhancements

- File upload support (drag & drop)
- Batch import scheduling
- Import templates for common formats
- Advanced filtering for exports
- Integration with external health apps
- Automated data validation rules
