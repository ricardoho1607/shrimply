import { runTransaction, type DocumentData, type DocumentReference, type Firestore, type UpdateData } from 'firebase/firestore';
import { uploadBytesResumable, type StorageReference, type UploadMetadata } from 'firebase/storage';
import { removeUndefinedFields } from './firestoreData';

/** Validate plain input data while preserving Firestore timestamps and transforms. */
export const prepareSaveData = <T>(data: T): T => {
  const cleaned = removeUndefinedFields(data);
  const validate = (value: unknown) => {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Enter valid numbers before saving.');
    if (Array.isArray(value)) value.forEach(validate);
    else if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) Object.values(value).forEach(validate);
  };
  validate(cleaned);
  return cleaned;
};

/** Use a transaction so an offline save rejects instead of waiting in a write queue. */
export const createRecordOnce = async (db: Firestore, reference: DocumentReference, data: DocumentData) => {
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(reference);
    if (snapshot.exists()) return;
    transaction.set(reference, prepareSaveData(data));
  });
};

export const updateRecordOnline = async (db: Firestore, reference: DocumentReference, data: UpdateData<DocumentData>) => {
  await runTransaction(db, async transaction => {
    if (!(await transaction.get(reference)).exists()) throw new Error('This record no longer exists. Refresh before saving.');
    transaction.update(reference, prepareSaveData(data));
  });
};

/** Cancel the actual upload on timeout; never leave a hidden upload writing later. */
export const uploadSaveFile = async (reference: StorageReference, data: Blob | Uint8Array | ArrayBuffer, metadata?: UploadMetadata, timeoutMs = 120000) => {
  const upload = uploadBytesResumable(reference, data, metadata);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      upload,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => { upload.cancel(); reject(new Error('Upload timed out. Check your connection and retry.')); }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};
