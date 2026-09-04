export const orsonIdentityKey = (uid?: string | null, companyId?: string | null): string | null => (
  uid && companyId ? `${encodeURIComponent(uid)}:${encodeURIComponent(companyId)}` : null
);

export class OrsonSessionChangedError extends Error {
  constructor() { super('The Orson session changed.'); }
}

export class OrsonRequestSession {
  private controller = new AbortController();
  constructor(readonly identity: string | null) {}
  get signal() { return this.controller.signal; }
  assertCurrent() {
    if (!this.identity || this.signal.aborted) throw new OrsonSessionChangedError();
  }
  cancel() { this.controller.abort(); }
  storageKey(kind: 'messages' | 'cache', suffix = '') {
    this.assertCurrent();
    return `orson_${kind}_v3:${this.identity}:${suffix}`;
  }
}
