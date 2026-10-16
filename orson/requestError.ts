export const friendlyOrsonRequestError = (error: unknown, fallback: string, question = ''): string => {
  const message = error instanceof Error ? error.message : '';
  if (/Orson context budget exceeded/i.test(message)) {
    return /\b(?:kolam|tambak|pakan|berapa|tampilkan|bagaimana|kemarin)\b/i.test(question)
      ? 'Data untuk pertanyaan ini terlalu banyak. Pilih satu kolam dan rentang tanggal yang lebih singkat agar saya bisa memeriksanya.'
      : 'There is too much data for this question. Please name one pond and a shorter date range so I can check it.';
  }
  // Raw provider, database, and parser errors belong in the diagnostic log.
  return fallback;
};
