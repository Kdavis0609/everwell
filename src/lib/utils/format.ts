/**
 * Format value with unit for tooltip display
 * Handles different unit types with appropriate precision
 */
export function formatValue(value: number | string, unit?: string): string {
  if (typeof value === 'string') {
    return unit ? `${value} ${unit}` : value;
  }

  if (typeof value === 'number') {
    // Determine decimal places based on unit type
    let decimalPlaces = 1;
    
    if (unit) {
      const unitLower = unit.toLowerCase();
      if (unitLower === 'lbs' || unitLower === 'kg') {
        decimalPlaces = 1; // Weight: 1 decimal place
      } else if (unitLower === 'h' || unitLower === 'hours') {
        decimalPlaces = 1; // Time: 1 decimal place
      } else if (unitLower === 'oz' || unitLower === 'ml') {
        decimalPlaces = 0; // Volume: whole numbers
      } else if (unitLower === 'steps') {
        decimalPlaces = 0; // Steps: whole numbers
      } else if (unitLower === 'kcal') {
        decimalPlaces = 0; // Calories: whole numbers
      } else if (unitLower === 'g' || unitLower === 'mg') {
        decimalPlaces = 1; // Weight (small): 1 decimal place
      } else {
        decimalPlaces = 1; // Default: 1 decimal place
      }
    }

    const formattedValue = value.toFixed(decimalPlaces);
    return unit ? `${formattedValue} ${unit}` : formattedValue;
  }

  return 'No data';
}

/**
 * Format date for tooltip display (EEE, MMM d format)
 * Example: "Mon, Jan 15"
 */
export function formatTooltipDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Calculate and format delta (change) between two values
 * Returns formatted string with sign and color indication
 */
export function formatDelta(current: number, target: number | null, unit?: string): {
  value: string;
  isPositive: boolean;
  isNegative: boolean;
} | null {
  if (target === null || target === undefined) {
    return null;
  }

  const delta = current - target;
  const absDelta = Math.abs(delta);
  
  // Determine decimal places based on unit
  let decimalPlaces = 1;
  if (unit) {
    const unitLower = unit.toLowerCase();
    if (unitLower === 'lbs' || unitLower === 'kg' || unitLower === 'h' || unitLower === 'hours') {
      decimalPlaces = 1;
    } else {
      decimalPlaces = 0;
    }
  }

  const formattedDelta = absDelta.toFixed(decimalPlaces);
  const sign = delta >= 0 ? '+' : '−'; // Using en dash for minus
  
  return {
    value: `${sign}${formattedDelta}${unit ? ` ${unit}` : ''}`,
    isPositive: delta > 0,
    isNegative: delta < 0
  };
}
