// app/services/pondReportExportService.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import {
  formatPdfDate,
  formatPdfNumber,
  localizePdfHtml,
  localizePdfText,
  type PdfLanguage,
} from '../../shared/pdfReportI18n';

interface PondReportData {
  companyName: string;
  reportDate: string;
  totalPonds: number;
  totalArea: number;
  totalBiomass: number;
  avgSR: number;
  ponds: Array<{
    name: string;
    area: number;
    density: number;
    doc: number;
    population: number;
    biomass: number;
    sr: string;
    fcr: string;
    waterQuality: {
      doMorning: string;
      doEvening: string;
      phMorning: string;
      phEvening: string;
      transparency: string;
      salinity: string;
    };
  }>;
}

const generatePondReportHTML = (data: PondReportData, language: PdfLanguage): string => {
  const number = (value: number, maximumFractionDigits = 0) =>
    formatPdfNumber(value, language, { maximumFractionDigits });

  return localizePdfHtml(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Comprehensive Pond Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
          padding: 40px; 
          color: #1B262C; 
          background: #ffffff; 
          font-size: 12px; 
          line-height: 1.4; 
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          margin-bottom: 30px; 
          border-bottom: 2px solid #315f57; 
          padding-bottom: 15px;
        }
        .header-left { flex: 1; }
        .header-right { text-align: right; }
        .title { 
          font-size: 24px; 
          font-weight: 800; 
          color: #0d2137; 
          margin-bottom: 5px; 
          text-transform: uppercase;
        }
        .company-name { font-size: 16px; font-weight: 600; color: #315f57; }
        .report-info { color: #4A5568; margin-top: 5px; }

        .stats-grid { 
          display: grid; 
          grid-template-columns: repeat(4, 1fr); 
          gap: 15px; 
          margin-bottom: 30px; 
        }
        .stat-card { 
          background: #F8FAFC; 
          padding: 15px; 
          border-radius: 8px; 
          border: 1px solid #dbe7df; 
          text-align: center;
        }
        .stat-value { font-size: 18px; font-weight: 700; color: #0d2137; margin-bottom: 4px; }
        .stat-label { font-size: 10px; color: #315f57; text-transform: uppercase; font-weight: 600; }

        .section-title { 
          font-size: 14px; 
          font-weight: 700; 
          color: #1B262C; 
          margin-bottom: 12px; 
          padding-left: 5px; 
          border-left: 4px solid #315f57;
        }

        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 30px; 
          border-radius: 8px; 
          overflow: hidden;
          border: 1px solid #dbe7df;
        }
        th { 
          background-color: #dbe7df; 
          color: #0d2137; 
          font-weight: 700; 
          text-align: left; 
          padding: 12px 10px; 
          font-size: 10px;
          text-transform: uppercase;
        }
        td { 
          padding: 10px; 
          border-bottom: 1px solid #F0F4F8; 
          color: #1B262C;
        }
        tr:nth-child(even) { background-color: #F8FAFC; }
        tr:last-child td { border-bottom: none; }
        
        .numeric { text-align: right; font-variant-numeric: tabular-nums; }
        
        .footer { 
          margin-top: 50px; 
          padding-top: 20px; 
          border-top: 1px solid #ECF0F1; 
          font-size: 10px; 
          color: #4A5568; 
          text-align: center; 
        }
        .shrimply-brand { font-weight: 700; color: #315f57; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <div class="title">Comprehensive Pond Report</div>
          <div class="company-name">${data.companyName}</div>
          <div class="report-info">Summary of Aquaculture Operations</div>
        </div>
        <div class="header-right">
          <div class="report-info">Generated on:</div>
          <div style="font-weight: 600;">${formatPdfDate(data.reportDate, language, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${data.totalPonds}</div>
          <div class="stat-label">Total Ponds</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${number(data.totalArea)} m²</div>
          <div class="stat-label">Total Farm Area</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.totalBiomass.toFixed(1)} kg</div>
          <div class="stat-label">Total Est. Biomass</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.avgSR.toFixed(1)}%</div>
          <div class="stat-label">Avg. Survival Rate</div>
        </div>
      </div>

      <div class="section-title">Pond Performance Summary</div>
      <table>
        <thead>
          <tr>
            <th>Pond Name</th>
            <th class="numeric">Area (m²)</th>
            <th class="numeric">Density</th>
            <th class="numeric">DOC</th>
            <th class="numeric">Population</th>
            <th class="numeric">Biomass (kg)</th>
            <th class="numeric">SR (%)</th>
            <th class="numeric">FCR</th>
          </tr>
        </thead>
        <tbody>
          ${data.ponds.map(pond => `
            <tr>
              <td style="font-weight: 600;">${pond.name}</td>
              <td class="numeric">${number(pond.area)}</td>
              <td class="numeric">${pond.density}</td>
              <td class="numeric">${pond.doc}</td>
              <td class="numeric">${number(pond.population)}</td>
              <td class="numeric">${pond.biomass.toFixed(1)}</td>
              <td class="numeric">${pond.sr}%</td>
              <td class="numeric">${pond.fcr}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="section-title">Latest Water Quality Snapshot</div>
      <table>
        <thead>
          <tr>
            <th>Pond Name</th>
            <th class="numeric">DO (AM)</th>
            <th class="numeric">DO (PM)</th>
            <th class="numeric">pH (AM)</th>
            <th class="numeric">pH (PM)</th>
            <th class="numeric">Transp (cm)</th>
            <th class="numeric">Sal (ppt)</th>
          </tr>
        </thead>
        <tbody>
          ${data.ponds.map(pond => `
            <tr>
              <td style="font-weight: 600;">${pond.name}</td>
              <td class="numeric">${pond.waterQuality.doMorning || '-'}</td>
              <td class="numeric">${pond.waterQuality.doEvening || '-'}</td>
              <td class="numeric">${pond.waterQuality.phMorning || '-'}</td>
              <td class="numeric">${pond.waterQuality.phEvening || '-'}</td>
              <td class="numeric">${pond.waterQuality.transparency || '-'}</td>
              <td class="numeric">${pond.waterQuality.salinity || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        This report was generated by <span class="shrimply-brand">Shrimply Aquaculture Management System</span>. 
        <br/>
        All calculations are based on the latest sampling data and harvest records provided in the application.
        <br/><br/>
        © ${new Date().getFullYear()} Shrimply Tech. All rights reserved.
      </div>
    </body>
    </html>
  `, language);
};

export const exportPondReportPDF = async (data: PondReportData, language: PdfLanguage = 'en') => {
  try {
    const html = generatePondReportHTML(data, language);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    const safeCompanyName = data.companyName.replace(/[^a-zA-Z0-9]/g, '');
    const timestamp = new Date().getTime();
    const filename = `PondReport_${safeCompanyName}_${timestamp}.pdf`;
    
    const newUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.copyAsync({
      from: uri,
      to: newUri
    });
    
    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: localizePdfText('Share Comprehensive Pond Report', language),
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert(
        localizePdfText('Report Generated', language),
        localizePdfText(`Your pond report has been saved to: ${newUri}`, language),
        [{ text: localizePdfText('OK', language) }]
      );
    }
    
    return newUri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    Alert.alert(localizePdfText('Error', language), localizePdfText('Failed to generate PDF report', language));
    throw error;
  }
};
