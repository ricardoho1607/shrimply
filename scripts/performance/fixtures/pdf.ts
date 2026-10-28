// Capture report generation in the browser without sending data or downloading files.
export const loadMobilePdfBrandAssets=async()=>({backgroundBase64:'',logoBase64:''});
export const downloadMobilePdf=async(options:{html:string;filename:string})=>{
  (window as unknown as {__exportedReport:unknown}).__exportedReport={filename:options.filename,htmlBytes:options.html.length,hasNaN:/\bNaN\b/.test(options.html),hasCompany:options.html.includes('Performance Test Farm')};
};
