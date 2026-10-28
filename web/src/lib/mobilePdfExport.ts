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
    }))
    .catch((error) => {
      // A dropped connection must not poison every later export in this tab.
      assetCache.delete(url);
      throw error;
    });

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
  compress = true,
  preserveTemplateScale = false,
}: {
  html: string;
  filename: string;
  orientation: PdfOrientation;
  compress?: boolean;
  preserveTemplateScale?: boolean;
}) => {
  const html2pdf = ((await import('html2pdf.js')) as { default: Html2PdfFactory }).default;
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const physicalWidth = orientation === 'landscape' ? 792 : 612;
  const pageWidth = preserveTemplateScale ? physicalWidth * 4 / 3 : physicalWidth;
  const physicalHeight = orientation === 'landscape' ? 612 : 792;
  const pageHeight = preserveTemplateScale ? physicalHeight * 4 / 3 : physicalHeight;
  const element = document.createElement('div');
  element.className = 'mobile-pdf-document';
  element.style.width = `${pageWidth}px`;
  element.style.height = 'auto';
  element.style.overflow = 'visible';
  parsed.head.querySelectorAll('style').forEach((sourceStyle) => {
    const style = document.createElement('style');
    style.textContent = (sourceStyle.textContent || '')
      .replace(/\bhtml\s*,\s*body\b/g, '.mobile-pdf-document')
      .replace(/\bbody\b(?=\s*\{)/g, '.mobile-pdf-document')
      .replace(/\bhtml\b(?=\s*\{)/g, '.mobile-pdf-document');
    element.appendChild(style);
  });
  const pageDimensions = document.createElement('style');
  pageDimensions.textContent = `
    .mobile-pdf-document {
      width: ${pageWidth}px !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
    }
    .mobile-pdf-document .pdf-page {
      width: ${pageWidth}px !important;
      height: ${pageHeight}px !important;
      min-height: ${pageHeight}px !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
  `;
  element.appendChild(pageDimensions);
  element.insertAdjacentHTML('beforeend', parsed.body.innerHTML);
  document.body.appendChild(element);

  try {
    await html2pdf().from(element).set({
      margin: [0, 0, 0, 0],
      filename,
      image: { type: 'png' },
      html2canvas: {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        width: pageWidth,
        windowWidth: pageWidth,
      },
      jsPDF: {
        compress,
        unit: 'pt',
        format: orientation === 'landscape' ? [792, 612] : [612, 792],
        orientation,
      },
      pagebreak: { mode: [] },
    }).save();
  } finally {
    element.remove();
  }
};
