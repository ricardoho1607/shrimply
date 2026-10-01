import { useState } from 'react';
import { createSaveOperation } from './saveOperation';

export const useSaveOperation = () => {
  const [busy, setBusy] = useState(false);
  const [save] = useState(() => createSaveOperation(setBusy));
  return { save, busy };
};
