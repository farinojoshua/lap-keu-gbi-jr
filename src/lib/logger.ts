export function logError(context: string, error: unknown) {
  console.error(`[API Error] ${context}:`, error);
}
