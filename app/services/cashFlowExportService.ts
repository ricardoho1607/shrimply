// services/cashFlowExportService.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

interface CashFlowData {
  period: string;
  startDate: string;
  endDate: string;
  companyName: string;
  openingBalance: number;
  
  // Operating Activities
  operatingActivities: {
    cashFromSales: number;
    cashFromCustomers: number;
    paymentToSuppliers: number;
    paymentForExpenses: number;
    otherOperatingCash: number;
  };
  
  // Investing Activities
  investingActivities: {
    purchaseOfAssets: number;
    saleOfAssets: number;
    purchaseOfInvestments: number;
    saleOfInvestments: number;
  };
  
  // Financing Activities
  financingActivities: {
    loansReceived: number;
    loanRepayments: number;
    capitalContributed: number;
    dividendsPaid: number;
    ownerWithdrawals: number;
  };
}

const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const generateCashFlowHTML = (data: CashFlowData): string => {
  const { 
    period, 
    startDate, 
    endDate, 
    companyName, 
    openingBalance,
    operatingActivities,
    investingActivities,
    financingActivities
  } = data;

  // Calculate totals for each section
  const netOperatingCash = 
    operatingActivities.cashFromSales +
    operatingActivities.cashFromCustomers -
    operatingActivities.paymentToSuppliers -
    operatingActivities.paymentForExpenses +
    operatingActivities.otherOperatingCash;

  const netInvestingCash = 
    investingActivities.saleOfAssets +
    investingActivities.saleOfInvestments -
    investingActivities.purchaseOfAssets -
    investingActivities.purchaseOfInvestments;

  const netFinancingCash = 
    financingActivities.loansReceived +
    financingActivities.capitalContributed -
    financingActivities.loanRepayments -
    financingActivities.dividendsPaid -
    financingActivities.ownerWithdrawals;

  const netCashChange = netOperatingCash + netInvestingCash + netFinancingCash;
  const closingBalance = openingBalance + netCashChange;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Statement of Cash Flows</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #2C3E50; background: #ffffff; font-size: 14px; line-height: 1.6; }
        .header { margin-bottom: 30px; }
        .title { font-size: 32px; font-weight: 700; color: #27AE60; margin-bottom: 8px; }
        .company-name { font-size: 15px; color: #2C3E50; margin-bottom: 4px; }
        .subtitle { font-size: 14px; color: #2C3E50; }
        .date-range { font-size: 14px; color: #2C3E50; margin-bottom: 30px; }
        .divider { height: 3px; background: linear-gradient(to right, #27AE60, #2ECC71); margin: 20px 0; border-radius: 2px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 15px; font-weight: 700; color: #2C3E50; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; background: #F0F9F4; padding: 10px 12px; border-left: 4px solid #27AE60; border-radius: 4px; }
        .line-item { display: flex; justify-content: space-between; padding: 8px 0 8px 20px; border-bottom: 1px solid #ECF0F1; }
        .line-item.main { padding-left: 0; font-weight: 600; color: #34495E; }
        .line-item.indent { padding-left: 30px; color: #7F8C8D; font-size: 13px; }
        .line-item.subtotal { font-weight: 700; font-size: 15px; border-bottom: 2px solid #34495E; padding: 12px 0; margin-top: 8px; color: #2C3E50; background: #F8FAFB; padding-left: 12px; padding-right: 12px; border-radius: 4px; }
        .line-item.total { font-weight: 700; font-size: 16px; border-bottom: 3px solid #34495E; padding: 15px 12px; margin-top: 12px; color: #2C3E50; background: #F0F9F4; border-radius: 4px; }
        .line-item.balance { font-weight: 700; font-size: 16px; padding: 12px; background: #EBF5FB; border-radius: 4px; border: 2px solid #3498DB; }
        .line-item.closing { font-weight: 700; font-size: 17px; color: #27AE60; border-bottom: 3px double #27AE60; padding: 15px 12px; margin-top: 15px; background: #F0F9F4; border-radius: 4px; }
        .line-item.closing.negative { color: #C0392B; border-bottom: 3px double #C0392B; background: #FADBD8; }
        .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .amount.positive { color: #2D7A4F; }
        .amount.negative { color: #C0392B; }
        .amount.neutral { color: #2C3E50; }
        .currency { font-size: 12px; color: #2C3E50; display: block; text-align: right; margin-top: 2px; }
        .summary-box { background: #F8FAFB; border-left: 4px solid #27AE60; padding: 15px; margin-top: 30px; border-radius: 4px; }
        .summary-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .summary-item.highlight { font-weight: 700; font-size: 16px; color: #2C3E50; border-top: 2px solid #BDC3C7; margin-top: 10px; padding-top: 12px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ECF0F1; font-size: 12px; color: #2C3E50; text-align: center; }
        .note { background: #FFF9E6; border-left: 4px solid #F39C12; padding: 12px; margin-top: 20px; border-radius: 4px; font-size: 12px; color: #856404; }
        .activity-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-left: 8px; }
        .badge-operating { background: #D5F4E6; color: #27AE60; }
        .badge-investing { background: #FFF3CD; color: #F39C12; }
        .badge-financing { background: #D6EAF8; color: #3498DB; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Statement of Cash Flows</div>
        <div class="company-name">${companyName}</div>
        <div class="subtitle">Cash Flow Statement (Indirect Method)</div>
        <div class="date-range">For the period ${formatDate(startDate)} - ${formatDate(endDate)}</div>
      </div>
      
      <div class="divider"></div>
      
      <!-- OPENING BALANCE -->
      <div class="section">
        <div class="line-item balance">
          <span>Cash at Beginning of Period</span>
          <div>
            <span class="amount neutral">${formatRupiah(openingBalance)}</span>
            <span class="currency">IDR</span>
          </div>
        </div>
      </div>
      
      <!-- OPERATING ACTIVITIES -->
      <div class="section">
        <div class="section-title">
          Cash Flows from Operating Activities
          <span class="activity-badge badge-operating">Operations</span>
        </div>
        
        ${operatingActivities.cashFromSales > 0 ? `
        <div class="line-item main">
          <span>Cash Received from Sales</span>
          <span class="amount positive">${formatRupiah(operatingActivities.cashFromSales)}</span>
        </div>` : ''}
        
        ${operatingActivities.cashFromCustomers > 0 ? `
        <div class="line-item main">
          <span>Cash Received from Customers</span>
          <span class="amount positive">${formatRupiah(operatingActivities.cashFromCustomers)}</span>
        </div>` : ''}
        
        ${operatingActivities.paymentToSuppliers > 0 ? `
        <div class="line-item main">
          <span>Cash Paid to Suppliers</span>
          <span class="amount negative">(${formatRupiah(operatingActivities.paymentToSuppliers)})</span>
        </div>` : ''}
        
        ${operatingActivities.paymentForExpenses > 0 ? `
        <div class="line-item main">
          <span>Cash Paid for Operating Expenses</span>
          <span class="amount negative">(${formatRupiah(operatingActivities.paymentForExpenses)})</span>
        </div>` : ''}
        
        ${operatingActivities.otherOperatingCash !== 0 ? `
        <div class="line-item main">
          <span>Other Operating Cash ${operatingActivities.otherOperatingCash > 0 ? 'Receipts' : 'Payments'}</span>
          <span class="amount ${operatingActivities.otherOperatingCash > 0 ? 'positive' : 'negative'}">
            ${operatingActivities.otherOperatingCash > 0 ? formatRupiah(operatingActivities.otherOperatingCash) : `(${formatRupiah(Math.abs(operatingActivities.otherOperatingCash))})`}
          </span>
        </div>` : ''}
        
        <div class="line-item subtotal">
          <span>Net Cash from Operating Activities</span>
          <div>
            <span class="amount ${netOperatingCash >= 0 ? 'positive' : 'negative'}">
              ${netOperatingCash >= 0 ? formatRupiah(netOperatingCash) : `(${formatRupiah(Math.abs(netOperatingCash))})`}
            </span>
            <span class="currency">IDR</span>
          </div>
        </div>
      </div>
      
      <!-- INVESTING ACTIVITIES -->
      <div class="section">
        <div class="section-title">
          Cash Flows from Investing Activities
          <span class="activity-badge badge-investing">Investments</span>
        </div>
        
        ${investingActivities.saleOfAssets > 0 ? `
        <div class="line-item main">
          <span>Proceeds from Sale of Assets</span>
          <span class="amount positive">${formatRupiah(investingActivities.saleOfAssets)}</span>
        </div>` : ''}
        
        ${investingActivities.saleOfInvestments > 0 ? `
        <div class="line-item main">
          <span>Proceeds from Sale of Investments</span>
          <span class="amount positive">${formatRupiah(investingActivities.saleOfInvestments)}</span>
        </div>` : ''}
        
        ${investingActivities.purchaseOfAssets > 0 ? `
        <div class="line-item main">
          <span>Purchase of Property & Equipment</span>
          <span class="amount negative">(${formatRupiah(investingActivities.purchaseOfAssets)})</span>
        </div>` : ''}
        
        ${investingActivities.purchaseOfInvestments > 0 ? `
        <div class="line-item main">
          <span>Purchase of Investments</span>
          <span class="amount negative">(${formatRupiah(investingActivities.purchaseOfInvestments)})</span>
        </div>` : ''}
        
        ${netInvestingCash === 0 ? `
        <div class="line-item main">
          <span>No Investing Activities</span>
          <span class="amount neutral">-</span>
        </div>` : ''}
        
        <div class="line-item subtotal">
          <span>Net Cash from Investing Activities</span>
          <div>
            <span class="amount ${netInvestingCash >= 0 ? 'positive' : 'negative'}">
              ${netInvestingCash >= 0 ? formatRupiah(netInvestingCash) : `(${formatRupiah(Math.abs(netInvestingCash))})`}
            </span>
            <span class="currency">IDR</span>
          </div>
        </div>
      </div>
      
      <!-- FINANCING ACTIVITIES -->
      <div class="section">
        <div class="section-title">
          Cash Flows from Financing Activities
          <span class="activity-badge badge-financing">Financing</span>
        </div>
        
        ${financingActivities.loansReceived > 0 ? `
        <div class="line-item main">
          <span>Proceeds from Loans</span>
          <span class="amount positive">${formatRupiah(financingActivities.loansReceived)}</span>
        </div>` : ''}
        
        ${financingActivities.capitalContributed > 0 ? `
        <div class="line-item main">
          <span>Capital Contributed by Owners</span>
          <span class="amount positive">${formatRupiah(financingActivities.capitalContributed)}</span>
        </div>` : ''}
        
        ${financingActivities.loanRepayments > 0 ? `
        <div class="line-item main">
          <span>Repayment of Loans</span>
          <span class="amount negative">(${formatRupiah(financingActivities.loanRepayments)})</span>
        </div>` : ''}
        
        ${financingActivities.dividendsPaid > 0 ? `
        <div class="line-item main">
          <span>Dividends Paid</span>
          <span class="amount negative">(${formatRupiah(financingActivities.dividendsPaid)})</span>
        </div>` : ''}
        
        ${financingActivities.ownerWithdrawals > 0 ? `
        <div class="line-item main">
          <span>Owner Withdrawals</span>
          <span class="amount negative">(${formatRupiah(financingActivities.ownerWithdrawals)})</span>
        </div>` : ''}
        
        ${netFinancingCash === 0 ? `
        <div class="line-item main">
          <span>No Financing Activities</span>
          <span class="amount neutral">-</span>
        </div>` : ''}
        
        <div class="line-item subtotal">
          <span>Net Cash from Financing Activities</span>
          <div>
            <span class="amount ${netFinancingCash >= 0 ? 'positive' : 'negative'}">
              ${netFinancingCash >= 0 ? formatRupiah(netFinancingCash) : `(${formatRupiah(Math.abs(netFinancingCash))})`}
            </span>
            <span class="currency">IDR</span>
          </div>
        </div>
      </div>
      
      <!-- NET CHANGE -->
      <div class="section">
        <div class="line-item total">
          <span>Net Increase/(Decrease) in Cash</span>
          <div>
            <span class="amount ${netCashChange >= 0 ? 'positive' : 'negative'}">
              ${netCashChange >= 0 ? formatRupiah(netCashChange) : `(${formatRupiah(Math.abs(netCashChange))})`}
            </span>
            <span class="currency">IDR</span>
          </div>
        </div>
      </div>
      
      <!-- CLOSING BALANCE -->
      <div class="section">
        <div class="line-item closing ${closingBalance < 0 ? 'negative' : ''}">
          <span>Cash at End of Period</span>
          <div>
            <span class="amount ${closingBalance >= 0 ? 'positive' : 'negative'}">${formatRupiah(Math.abs(closingBalance))}</span>
            <span class="currency">IDR</span>
          </div>
        </div>
      </div>
      
      <!-- SUMMARY BOX -->
      <div class="summary-box">
        <div class="summary-item">
          <span>Operating Activities:</span>
          <span class="amount ${netOperatingCash >= 0 ? 'positive' : 'negative'}">Rp ${netOperatingCash >= 0 ? formatRupiah(netOperatingCash) : `(${formatRupiah(Math.abs(netOperatingCash))})`}</span>
        </div>
        <div class="summary-item">
          <span>Investing Activities:</span>
          <span class="amount ${netInvestingCash >= 0 ? 'positive' : 'negative'}">Rp ${netInvestingCash >= 0 ? formatRupiah(netInvestingCash) : `(${formatRupiah(Math.abs(netInvestingCash))})`}</span>
        </div>
        <div class="summary-item">
          <span>Financing Activities:</span>
          <span class="amount ${netFinancingCash >= 0 ? 'positive' : 'negative'}">Rp ${netFinancingCash >= 0 ? formatRupiah(netFinancingCash) : `(${formatRupiah(Math.abs(netFinancingCash))})`}</span>
        </div>
        <div class="summary-item highlight">
          <span>Net Change in Cash:</span>
          <span class="amount ${netCashChange >= 0 ? 'positive' : 'negative'}">Rp ${netCashChange >= 0 ? formatRupiah(netCashChange) : `(${formatRupiah(Math.abs(netCashChange))})`}</span>
        </div>
      </div>
      
      <div class="note">
        <strong>Note:</strong> This statement shows the cash inflows and outflows categorized by operating, investing, and financing activities in accordance with accounting standards.
      </div>
      
      <div class="footer">
        Generated by Shrimply Aquaculture Management on ${new Date().toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        })} - ${companyName}
      </div>
    </body>
    </html>
  `;
};

export const exportCashFlowPDF = async (data: CashFlowData) => {
  try {
    const html = generateCashFlowHTML(data);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Cash Flow Statement',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert(
        'PDF Generated',
        `Your cash flow statement has been saved to: ${uri}`,
        [{ text: 'OK' }]
      );
    }
    
    return uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    Alert.alert('Error', 'Failed to generate PDF report');
    throw error;
  }
};

export const prepareCashFlowData = (
  period: string,
  startDate: string,
  endDate: string,
  companyName: string,
  openingBalance: number,
  operatingActivities: CashFlowData['operatingActivities'],
  investingActivities: CashFlowData['investingActivities'],
  financingActivities: CashFlowData['financingActivities']
): CashFlowData => {
  return {
    period,
    startDate,
    endDate,
    companyName,
    openingBalance,
    operatingActivities,
    investingActivities,
    financingActivities,
  };
};