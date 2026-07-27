/**
 * Strips HTML tags from a string and returns plain text.
 * Used to display rich-text descriptions as plain text previews in tables.
 */
export function stripHtml(html: string): string {
  if (!html) return ''
  // Remove all HTML tags
  return html
    .replace(/<[^>]*>/g, ' ')   // replace tags with space
    .replace(/&nbsp;/g, ' ')    // replace &nbsp;
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')       // collapse multiple spaces
    .trim()
}

/**
 * Strips HTML and truncates to a given length with ellipsis.
 */
export function truncateHtml(html: string, maxLength = 80): string {
  const plain = stripHtml(html)
  if (plain.length <= maxLength) return plain
  return plain.substring(0, maxLength).trim() + '...'
}
