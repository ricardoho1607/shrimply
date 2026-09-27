type LinkedMessage = { id: string; operationIds?: string[] };
type StoredOperation = { id: string; state: string };

export function describeSaveStatus(operation: {
  state: string;
  receipts: { status: string; message: string }[];
}): string {
  const saved = operation.receipts.filter((receipt) => receipt.status === 'saved');
  const failed = operation.receipts.filter((receipt) => receipt.status === 'failed');
  const savedMessage = saved.map((receipt) => receipt.message).filter(Boolean).join(' ');
  const failedMessage = failed.map((receipt) => receipt.message).filter(Boolean).join(' ');
  if (operation.state === 'draft') return 'Still a draft. Nothing has been saved.';
  if (operation.state === 'discarded') {
    return saved.length
      ? `Draft discarded. Previously saved records remain saved. ${savedMessage}`
      : 'Draft discarded. Nothing was saved.';
  }
  if (operation.state === 'partial') {
    return `Some entries saved. ${savedMessage}${failedMessage ? ` Not saved: ${failedMessage}` : ''}`.trim();
  }
  if (savedMessage) return `Save confirmed: ${savedMessage}`;
  return 'Save status checked. No saved entries were found.';
}

/** Keep each farm operation attached to the reply that prepared it. */
export function linkOperationToReply<T extends LinkedMessage>(
  messages: T[],
  reply: T,
  operationId: string,
): T[] {
  const existing = messages.find((message) => message.id === reply.id);
  const operationIds = [...new Set([...(existing?.operationIds || []), operationId])];
  const linked = { ...(existing || reply), operationIds } as T;
  return existing
    ? messages.map((message) => message.id === reply.id ? linked : message)
    : [...messages, linked];
}

/** Streaming and final text replace one reply while keeping its farm cards. */
export function upsertReplyWithOperations<T extends LinkedMessage>(
  messages: T[],
  reply: T,
): T[] {
  const existing = messages.find((message) => message.id === reply.id);
  const merged = existing?.operationIds?.length
    ? { ...reply, operationIds: existing.operationIds }
    : reply;
  return existing
    ? messages.map((message) => message.id === reply.id ? merged : message)
    : [...messages, reply];
}

/** An unlinked unsaved draft remains reachable after a chat reset. */
export function unlinkedDraftOperationIds(
  messages: LinkedMessage[],
  operations: StoredOperation[],
): string[] {
  const linked = new Set(messages.flatMap((message) => message.operationIds || []));
  return operations
    .filter((operation) => operation.state === 'draft' && !linked.has(operation.id))
    .map((operation) => operation.id);
}
