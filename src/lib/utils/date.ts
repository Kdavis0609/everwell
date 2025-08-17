/**
 * Format date consistently for server and client rendering
 * Prevents hydration mismatches by using a consistent format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  
  // Use a consistent format that doesn't depend on locale
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${month}/${day}/${year}`;
}

/**
 * Format date for display with relative time (e.g., "2 days ago")
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    return 'Today';
  } else if (diffDays === 2) {
    return 'Yesterday';
  } else if (diffDays <= 7) {
    return `${diffDays - 1} days ago`;
  } else {
    return formatDate(dateString);
  }
}

/**
 * Format numbers consistently for server and client rendering
 * Prevents hydration mismatches by using a consistent format
 */
export function formatNumber(num: number): string {
  // Use a simple comma-separated format that doesn't depend on locale
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
