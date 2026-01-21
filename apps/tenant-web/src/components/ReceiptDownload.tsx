'use client';

import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUntypedTranslations } from '../i18n/useUntypedTranslations';

interface ReceiptData {
  receipt: {
    number: string;
    date: string;
    generatedAt: string;
  };
  payment: {
    id: string;
    amount: number;
    method: string;
    provider: string;
    transactionId: string;
    paidAt: string;
  };
  invoice: {
    id: string;
    dueDate: string;
    amount: number;
    period: string;
  };
  tenant: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
  };
  property: {
    unitName: string;
    building: string;
    address: string;
    floor: number | null;
  };
  contract: {
    id: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
  };
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

interface ReceiptDownloadProps {
  receiptData: ReceiptData;
  onClose: () => void;
}

const ReceiptDownload: React.FC<ReceiptDownloadProps> = ({ receiptData, onClose }) => {
  const { darkMode } = useTheme();
  const t = useUntypedTranslations();
  const [downloading, setDownloading] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('uz-UZ').format(value) + ' UZS';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDownload = () => {
    setDownloading(true);
    
    // Create printable receipt HTML
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${receiptData.receipt.number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            padding: 40px; 
            max-width: 800px; 
            margin: 0 auto;
            color: #333;
          }
          .header { 
            text-align: center; 
            border-bottom: 3px solid #2563eb; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
          }
          .header h1 { color: #2563eb; font-size: 28px; margin-bottom: 5px; }
          .header p { color: #666; }
          .receipt-number { 
            background: #f0f9ff; 
            border: 2px solid #2563eb;
            padding: 15px 30px; 
            display: inline-block; 
            border-radius: 8px;
            margin: 20px 0;
          }
          .receipt-number span { color: #2563eb; font-weight: bold; font-size: 20px; }
          .section { margin-bottom: 25px; }
          .section-title { 
            font-weight: bold; 
            color: #2563eb; 
            margin-bottom: 10px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .details { 
            background: #f8fafc; 
            padding: 20px; 
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .row:last-child { border-bottom: none; }
          .row .label { color: #666; }
          .row .value { font-weight: 600; }
          .amount-box { 
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: white; 
            padding: 25px; 
            border-radius: 12px;
            text-align: center;
            margin: 30px 0;
          }
          .amount-box .label { font-size: 14px; opacity: 0.9; }
          .amount-box .amount { font-size: 32px; font-weight: bold; margin-top: 5px; }
          .status { 
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: bold;
            margin-top: 10px;
          }
          .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .footer p { margin: 5px 0; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏠 ${receiptData.company.name}</h1>
          <p>${receiptData.company.address}</p>
          <p>${receiptData.company.phone} | ${receiptData.company.email}</p>
        </div>

        <div style="text-align: center;">
          <div class="receipt-number">
            Receipt #<span>${receiptData.receipt.number}</span>
          </div>
        </div>

        <div class="amount-box">
          <div class="label">Amount Paid</div>
          <div class="amount">${formatCurrency(receiptData.payment.amount)}</div>
          <div class="status">✓ PAID</div>
        </div>

        <div class="section">
          <div class="section-title">Payment Details</div>
          <div class="details">
            <div class="row">
              <span class="label">Payment Date</span>
              <span class="value">${formatDate(receiptData.payment.paidAt || receiptData.receipt.date)}</span>
            </div>
            <div class="row">
              <span class="label">Payment Method</span>
              <span class="value">${receiptData.payment.method}</span>
            </div>
            <div class="row">
              <span class="label">Provider</span>
              <span class="value">${receiptData.payment.provider || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Transaction ID</span>
              <span class="value">${receiptData.payment.transactionId}</span>
            </div>
            <div class="row">
              <span class="label">Invoice Period</span>
              <span class="value">${receiptData.invoice.period}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Tenant Information</div>
          <div class="details">
            <div class="row">
              <span class="label">Name</span>
              <span class="value">${receiptData.tenant.fullName}</span>
            </div>
            <div class="row">
              <span class="label">Phone</span>
              <span class="value">${receiptData.tenant.phone}</span>
            </div>
            ${receiptData.tenant.email ? `
            <div class="row">
              <span class="label">Email</span>
              <span class="value">${receiptData.tenant.email}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Property Information</div>
          <div class="details">
            <div class="row">
              <span class="label">Unit</span>
              <span class="value">${receiptData.property.unitName}</span>
            </div>
            <div class="row">
              <span class="label">Building</span>
              <span class="value">${receiptData.property.building}</span>
            </div>
            ${receiptData.property.floor ? `
            <div class="row">
              <span class="label">Floor</span>
              <span class="value">${receiptData.property.floor}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="footer">
          <p>This is an official receipt for your payment.</p>
          <p>Generated on ${formatDate(receiptData.receipt.generatedAt)}</p>
          <p>Thank you for your payment!</p>
        </div>
      </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        setDownloading(false);
      }, 250);
    } else {
      setDownloading(false);
      alert('Please allow popups to download the receipt');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl ${
        darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              🧾 {t.receipt || 'Receipt'}
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-800 text-gray-400' : ''}`}
            >
              ✕
            </button>
          </div>
          <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            #{receiptData.receipt.number}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Amount */}
          <div className={`p-4 rounded-xl text-center ${
            darkMode ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50'
          }`}>
            <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
              {t.amountPaid || 'Amount Paid'}
            </p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              {formatCurrency(receiptData.payment.amount)}
            </p>
            <span className="inline-block mt-2 px-3 py-1 text-xs font-bold bg-green-500 text-white rounded-full">
              ✓ {t.confirmed || 'CONFIRMED'}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{t.date || 'Date'}</span>
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {formatDate(receiptData.payment.paidAt || receiptData.receipt.date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{t.period || 'Period'}</span>
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {receiptData.invoice.period}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{t.unit || 'Unit'}</span>
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {receiptData.property.unitName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{t.method || 'Method'}</span>
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {receiptData.payment.method} {receiptData.payment.provider !== 'NONE' && `(${receiptData.payment.provider})`}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`w-full py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              downloading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {downloading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {t.generating || 'Generating...'}
              </>
            ) : (
              <>
                📥 {t.downloadReceipt || 'Download / Print Receipt'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptDownload;
