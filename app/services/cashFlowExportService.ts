// services/cashFlowExportService.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
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
  currencyCode?: string;
  currencySymbol?: string;
}

const formatCurrency = (amount: number, currencyCode: string = 'IDR', currencySymbol: string = 'Rp'): string => {
  const localeMap: Record<string, string> = {
    'USD': 'en-US',
    'IDR': 'id-ID',
    'THB': 'th-TH',
    'VND': 'vi-VN',
    'CNY': 'zh-CN'
  };
  
  const locale = localeMap[currencyCode] || 'id-ID';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  return `${currencySymbol} ${formatted}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const calculateCashFlowTotals = (data: CashFlowData) => {
  const { openingBalance, operatingActivities, investingActivities, financingActivities } = data;
  const totalInflows =
    operatingActivities.cashFromSales +
    operatingActivities.cashFromCustomers +
    Math.max(operatingActivities.otherOperatingCash, 0) +
    investingActivities.saleOfAssets +
    investingActivities.saleOfInvestments +
    financingActivities.loansReceived +
    financingActivities.capitalContributed;

  const totalOutflows =
    operatingActivities.paymentToSuppliers +
    operatingActivities.paymentForExpenses +
    Math.max(-operatingActivities.otherOperatingCash, 0) +
    investingActivities.purchaseOfAssets +
    investingActivities.purchaseOfInvestments +
    financingActivities.loanRepayments +
    financingActivities.dividendsPaid +
    financingActivities.ownerWithdrawals;

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

  return {
    totalInflows,
    totalOutflows,
    netOperatingCash,
    netInvestingCash,
    netFinancingCash,
    netCashChange,
    closingBalance,
  };
};

const getCashFlowAnalysis = (data: CashFlowData) => {
  const {
    openingBalance,
    operatingActivities,
    investingActivities,
    financingActivities,
  } = data;
  const {
    totalInflows,
    totalOutflows,
    netOperatingCash,
    netInvestingCash,
    netFinancingCash,
    netCashChange,
    closingBalance,
  } = calculateCashFlowTotals(data);

  const operatingOutflows = operatingActivities.paymentToSuppliers + operatingActivities.paymentForExpenses + Math.max(-operatingActivities.otherOperatingCash, 0);
  const ownerFunding = financingActivities.capitalContributed + financingActivities.loansReceived;
  const ownerFundingShare = totalInflows > 0 ? (ownerFunding / totalInflows) * 100 : 0;
  const liquidityStatus = closingBalance < 0
    ? 'negative'
    : closingBalance < Math.max(totalOutflows * 0.1, 1)
      ? 'tight'
      : 'stable';

  const mainDriver = [
    { label: 'operating activities', amount: Math.abs(netOperatingCash), value: netOperatingCash },
    { label: 'investing activities', amount: Math.abs(netInvestingCash), value: netInvestingCash },
    { label: 'financing activities', amount: Math.abs(netFinancingCash), value: netFinancingCash },
  ].sort((a, b) => b.amount - a.amount)[0];

  const executiveSummary = [
    `Opening cash was ${formatCurrency(openingBalance)}. Cash inflows totaled ${formatCurrency(totalInflows)}, cash outflows totaled ${formatCurrency(totalOutflows)}, and net cash movement was ${netCashChange >= 0 ? formatCurrency(netCashChange) : `(${formatCurrency(Math.abs(netCashChange))})`}.`,
    `Closing cash was ${closingBalance >= 0 ? formatCurrency(closingBalance) : `(${formatCurrency(Math.abs(closingBalance))})`}. Liquidity status is ${liquidityStatus}, based on the ending cash position and recorded outflows for the period.`,
    `The largest cash movement driver was ${mainDriver.label}, which ${mainDriver.value >= 0 ? 'increased' : 'reduced'} cash by ${formatCurrency(Math.abs(mainDriver.value))}.`,
  ];

  const riskAssessment = [
    netOperatingCash < 0
      ? 'Operating activities consumed cash this period. Supplier payments, operating expenses, and other operating payments should be reviewed before the next operating cycle.'
      : 'Operating activities generated positive cash flow for the selected period.',
    closingBalance < 0
      ? 'Closing cash is negative, indicating immediate liquidity pressure if the recorded balances are complete.'
      : liquidityStatus === 'tight'
        ? 'Closing cash appears tight relative to recorded outflows. A minimum cash buffer should be maintained before new commitments are made.'
        : 'Closing cash appears adequate against the selected period outflow profile.',
    ownerFundingShare > 40
      ? `Owner funding or loan proceeds represented ${ownerFundingShare.toFixed(2)}% of recorded inflows. The farm may be dependent on external funding rather than operating receipts.`
      : 'No high dependency on owner funding or loans was detected from the recorded inflow mix.',
  ];

  if (operatingOutflows > 0 && totalInflows > 0 && operatingOutflows / totalInflows > 0.7) {
    riskAssessment.push('Operating outflows are high relative to inflows. Review payment timing and upcoming production-cycle cash needs.');
  }

  if (investingActivities.purchaseOfAssets + investingActivities.purchaseOfInvestments > 0) {
    riskAssessment.push('Investing cash outflows were recorded. Confirm that asset or investment purchases do not reduce the cash buffer needed for pond operations.');
  }

  return { executiveSummary, riskAssessment };
};

const generateCashFlowHTML = (data: CashFlowData): string => {
  const { 
    startDate, 
    endDate, 
    companyName, 
    openingBalance,
    operatingActivities,
    investingActivities,
    financingActivities
  } = data;

  const {
    netOperatingCash,
    netInvestingCash,
    netFinancingCash,
    netCashChange,
    closingBalance,
  } = calculateCashFlowTotals(data);
  const reportAnalysis = getCashFlowAnalysis(data);

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
        .analysis-section {
          page-break-before: always;
          break-before: page;
          page-break-inside: avoid;
          break-inside: avoid;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 0;
        }
        .analysis-box {
          page-break-inside: avoid;
          break-inside: avoid;
          min-height: 180px;
          padding: 16px;
          background: #F8FAFB;
          border: 1px solid #DDEAF3;
          border-left: 4px solid #27AE60;
          border-radius: 6px;
        }
        .analysis-box.risk {
          background: #FFFBEA;
          border-color: #F5D08A;
          border-left-color: #F39C12;
        }
        .analysis-title {
          font-size: 15px;
          font-weight: 700;
          color: #27AE60;
          margin-bottom: 8px;
        }
        .analysis-box.risk .analysis-title {
          color: #B45309;
        }
        .analysis-list {
          margin-left: 18px;
          font-size: 12px;
          color: #2C3E50;
          line-height: 1.45;
        }
        .analysis-list li {
          margin-bottom: 8px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Statement of Cash Flows</div>
        <div class="company-name">${companyName}</div>
        <div class="subtitle">Cash Flow Statement (Direct Method)</div>
        <div class="date-range">For the period ${formatDate(startDate)} - ${formatDate(endDate)}</div>
      </div>
      
      <div class="divider"></div>
      
      <!-- OPENING BALANCE -->
      <div class="section">
        <div class="line-item balance">
          <span>Cash at Beginning of Period</span>
          <div>
            <span class="amount neutral">${formatCurrency(openingBalance)}</span>
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
          <span class="amount positive">${formatCurrency(operatingActivities.cashFromSales)}</span>
        </div>` : ''}
        
        ${operatingActivities.cashFromCustomers > 0 ? `
        <div class="line-item main">
          <span>Cash Received from Customers</span>
          <span class="amount positive">${formatCurrency(operatingActivities.cashFromCustomers)}</span>
        </div>` : ''}
        
        ${operatingActivities.paymentToSuppliers > 0 ? `
        <div class="line-item main">
          <span>Cash Paid to Suppliers</span>
          <span class="amount negative">(${formatCurrency(operatingActivities.paymentToSuppliers)})</span>
        </div>` : ''}
        
        ${operatingActivities.paymentForExpenses > 0 ? `
        <div class="line-item main">
          <span>Cash Paid for Operating Expenses</span>
          <span class="amount negative">(${formatCurrency(operatingActivities.paymentForExpenses)})</span>
        </div>` : ''}
        
        ${operatingActivities.otherOperatingCash !== 0 ? `
        <div class="line-item main">
          <span>Other Operating Cash ${operatingActivities.otherOperatingCash > 0 ? 'Receipts' : 'Payments'}</span>
          <span class="amount ${operatingActivities.otherOperatingCash > 0 ? 'positive' : 'negative'}">
            ${operatingActivities.otherOperatingCash > 0 ? formatCurrency(operatingActivities.otherOperatingCash) : `(${formatCurrency(Math.abs(operatingActivities.otherOperatingCash))})`}
          </span>
        </div>` : ''}
        
        <div class="line-item subtotal">
          <span>Net Cash from Operating Activities</span>
          <div>
            <span class="amount ${netOperatingCash >= 0 ? 'positive' : 'negative'}">
              ${netOperatingCash >= 0 ? formatCurrency(netOperatingCash) : `(${formatCurrency(Math.abs(netOperatingCash))})`}
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
          <span class="amount positive">${formatCurrency(investingActivities.saleOfAssets)}</span>
        </div>` : ''}
        
        ${investingActivities.saleOfInvestments > 0 ? `
        <div class="line-item main">
          <span>Proceeds from Sale of Investments</span>
          <span class="amount positive">${formatCurrency(investingActivities.saleOfInvestments)}</span>
        </div>` : ''}
        
        ${investingActivities.purchaseOfAssets > 0 ? `
        <div class="line-item main">
          <span>Purchase of Property & Equipment</span>
          <span class="amount negative">(${formatCurrency(investingActivities.purchaseOfAssets)})</span>
        </div>` : ''}
        
        ${investingActivities.purchaseOfInvestments > 0 ? `
        <div class="line-item main">
          <span>Purchase of Investments</span>
          <span class="amount negative">(${formatCurrency(investingActivities.purchaseOfInvestments)})</span>
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
              ${netInvestingCash >= 0 ? formatCurrency(netInvestingCash) : `(${formatCurrency(Math.abs(netInvestingCash))})`}
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
          <span class="amount positive">${formatCurrency(financingActivities.loansReceived)}</span>
        </div>` : ''}
        
        ${financingActivities.capitalContributed > 0 ? `
        <div class="line-item main">
          <span>Capital Contributed by Owners</span>
          <span class="amount positive">${formatCurrency(financingActivities.capitalContributed)}</span>
        </div>` : ''}
        
        ${financingActivities.loanRepayments > 0 ? `
        <div class="line-item main">
          <span>Repayment of Loans</span>
          <span class="amount negative">(${formatCurrency(financingActivities.loanRepayments)})</span>
        </div>` : ''}
        
        ${financingActivities.dividendsPaid > 0 ? `
        <div class="line-item main">
          <span>Dividends Paid</span>
          <span class="amount negative">(${formatCurrency(financingActivities.dividendsPaid)})</span>
        </div>` : ''}
        
        ${financingActivities.ownerWithdrawals > 0 ? `
        <div class="line-item main">
          <span>Owner Withdrawals</span>
          <span class="amount negative">(${formatCurrency(financingActivities.ownerWithdrawals)})</span>
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
              ${netFinancingCash >= 0 ? formatCurrency(netFinancingCash) : `(${formatCurrency(Math.abs(netFinancingCash))})`}
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
              ${netCashChange >= 0 ? formatCurrency(netCashChange) : `(${formatCurrency(Math.abs(netCashChange))})`}
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
            <span class="amount ${closingBalance >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(closingBalance))}</span>
            <span class="currency">IDR</span>
          </div>
        </div>
      </div>
      
      <!-- SUMMARY BOX -->
      <div class="summary-box">
        <div class="summary-item">
          <span>Operating Activities:</span>
          <span class="amount ${netOperatingCash >= 0 ? 'positive' : 'negative'}">${netOperatingCash >= 0 ? formatCurrency(netOperatingCash) : `(${formatCurrency(Math.abs(netOperatingCash))})`}</span>
        </div>
        <div class="summary-item">
          <span>Investing Activities:</span>
          <span class="amount ${netInvestingCash >= 0 ? 'positive' : 'negative'}">${netInvestingCash >= 0 ? formatCurrency(netInvestingCash) : `(${formatCurrency(Math.abs(netInvestingCash))})`}</span>
        </div>
        <div class="summary-item">
          <span>Financing Activities:</span>
          <span class="amount ${netFinancingCash >= 0 ? 'positive' : 'negative'}">${netFinancingCash >= 0 ? formatCurrency(netFinancingCash) : `(${formatCurrency(Math.abs(netFinancingCash))})`}</span>
        </div>
        <div class="summary-item highlight">
          <span>Net Change in Cash:</span>
          <span class="amount ${netCashChange >= 0 ? 'positive' : 'negative'}">${netCashChange >= 0 ? formatCurrency(netCashChange) : `(${formatCurrency(Math.abs(netCashChange))})`}</span>
        </div>
      </div>
      
      <div class="note">
        <strong>Note:</strong> This statement focuses on cash movement and liquidity. It should not be interpreted as a Profit and Loss report.
      </div>

      <div class="analysis-section">
        <div class="analysis-box">
          <div class="analysis-title">Executive Summary</div>
          <ul class="analysis-list">
            ${reportAnalysis.executiveSummary.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
        <div class="analysis-box risk">
          <div class="analysis-title">Risk Assessment</div>
          <ul class="analysis-list">
            ${reportAnalysis.riskAssessment.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
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
    
    // Create Custom Filename
    const cleanDate = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '');
    const safeCompanyName = data.companyName.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `CashFlow_${safeCompanyName}_${cleanDate}.pdf`;
    
    const newUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.copyAsync({
      from: uri,
      to: newUri
    });
    
    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Cash Flow Statement',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert(
        'PDF Generated',
        `Your cash flow statement has been saved to: ${newUri}`,
        [{ text: 'OK' }]
      );
    }
    
    return newUri;
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
