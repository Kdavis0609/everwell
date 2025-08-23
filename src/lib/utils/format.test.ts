import { formatValue, formatTooltipDate, formatDelta } from './format';

// Simple test cases for format utilities
describe('format utilities', () => {
  describe('formatValue', () => {
    it('formats weight with 1 decimal place', () => {
      expect(formatValue(175.5, 'lbs')).toBe('175.5 lbs');
    });

    it('formats steps as whole numbers', () => {
      expect(formatValue(8500, 'steps')).toBe('8500 steps');
    });

    it('formats time with 1 decimal place', () => {
      expect(formatValue(7.5, 'h')).toBe('7.5 h');
    });

    it('formats volume as whole numbers', () => {
      expect(formatValue(64, 'oz')).toBe('64 oz');
    });

    it('formats calories as whole numbers', () => {
      expect(formatValue(2500, 'kcal')).toBe('2500 kcal');
    });

    it('formats small weights with 1 decimal place', () => {
      expect(formatValue(25.3, 'g')).toBe('25.3 g');
    });
  });

  describe('formatTooltipDate', () => {
    it('formats date as EEE, MMM d', () => {
      const date = new Date('2024-01-15');
      expect(formatTooltipDate(date)).toBe('Mon, Jan 15');
    });

    it('handles string dates', () => {
      expect(formatTooltipDate('2024-01-15')).toBe('Mon, Jan 15');
    });
  });

  describe('formatDelta', () => {
    it('formats positive delta', () => {
      const result = formatDelta(175.5, 170, 'lbs');
      expect(result?.value).toBe('+5.5 lbs');
      expect(result?.isPositive).toBe(true);
      expect(result?.isNegative).toBe(false);
    });

    it('formats negative delta', () => {
      const result = formatDelta(165.5, 170, 'lbs');
      expect(result?.value).toBe('−4.5 lbs');
      expect(result?.isPositive).toBe(false);
      expect(result?.isNegative).toBe(true);
    });

    it('returns null for null target', () => {
      expect(formatDelta(175.5, null, 'lbs')).toBe(null);
    });
  });
});
