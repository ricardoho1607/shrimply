import { httpsCallable, type Functions } from 'firebase/functions';

export const requestVerificationEmail = async (functions: Functions, locale: string): Promise<void> => {
  const send = httpsCallable<{ locale: string }, { sent: boolean }>(functions, 'sendVerificationEmail');
  const result = await send({ locale });
  if (result.data?.sent !== true) throw new Error('Could not send a verification email. Please try again.');
};
