import type { PdfBrandAssets } from '@/lib/generated/mobileProfitLossReport';

type PdfOrientation = 'portrait' | 'landscape';

interface Html2PdfWorker {
  from: (element: HTMLElement) => Html2PdfWorker;
  set: (options: unknown) => Html2PdfWorker;
  save: () => Promise<void>;
}

type Html2PdfFactory = () => Html2PdfWorker;

const assetCache = new Map<string, Promise<string>>();

const assetToBase64 = (url: string): Promise<string> => {
  const cached = assetCache.get(url);
  if (cached) return cached;

  const request = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load PDF asset: ${url}`);
      return response.blob();
    })
    .then((blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(reader.error || new Error(`Unable to read PDF asset: ${url}`));
      reader.readAsDataURL(blob);
    }));

  assetCache.set(url, request);
  return request;
};

export const loadMobilePdfBrandAssets = async (orientation: PdfOrientation): Promise<PdfBrandAssets> => {
  const background = orientation === 'landscape'
    ? '/pdf/shrimply-pdf-background.png'
    : '/pdf/shrimply-pdf-background-portrait.png';
  const [backgroundBase64, logoBase64] = await Promise.all([
    assetToBase64(background),
    assetToBase64('/pdf/shrimply-logo.png'),
  ]);
  return { backgroundBase64, logoBase64 };
};

export const downloadMobilePdf = async ({
  html,
  filename,
  orientation,
}: {
  html: string;
  filename: string;
  orientation: PdfOrientation;
}) => {
  const html2pdf = ((await import('html2pdf.js')) as { default: Html2PdfFactory }).default;
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const element = document.createElement('div');
  element.className = 'mobile-pdf-document';
  element.style.width = orientation === 'landscape' ? '792px' : '612px';
  element.style.height = orientation === 'landscape' ? '612px' : '792px';
  parsed.head.querySelectorAll('style').forEach((sourceStyle) => {
    const style = document.createElement('style');
    style.textContent = (sourceStyle.textContent || '')
      .replace(/\bhtml\s*,\s*body\b/g, '.mobile-pdf-document')
      .replace(/\bbody\b(?=\s*\{)/g, '.mobile-pdf-document')
      .replace(/\bhtml\b(?=\s*\{)/g, '.mobile-pdf-document');
    element.appendChild(style);
  });
  element.insertAdjacentHTML('beforeend', parsed.body.innerHTML);
  document.body.appendChild(element);

  try {
    await html2pdf().from(element).set({
      margin: [0, 0, 0, 0],
      filename,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: null },
      jsPDF: {
        unit: 'pt',
        format: orientation === 'landscape' ? [792, 612] : [612, 792],
        orientation,
      },
      pagebreak: { mode: ['css', 'legacy'] },
    }).save();
  } finally {
    element.remove();
  }
};
