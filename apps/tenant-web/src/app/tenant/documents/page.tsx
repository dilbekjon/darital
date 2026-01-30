'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUntypedTranslations } from '../../../i18n/useUntypedTranslations';
import { useTheme } from '../../../contexts/ThemeContext';
import TenantNavbar from '../../../components/TenantNavbar';
import Breadcrumbs from '../../../components/Breadcrumbs';
import DaritalLoader from '../../../components/DaritalLoader';
import { fetchTenantApi, ApiError } from '../../../lib/api';
import ReceiptDownload from '../../../components/ReceiptDownload';

interface Document {
  id: string;
  type: string;
  name: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
}

const documentTypeLabels: Record<string, { label: string; icon: string; color: string }> = {
  LEASE_AGREEMENT: { label: 'Ijara shartnomasi', icon: '📄', color: 'blue' },
  ID_COPY: { label: 'ID nusxasi', icon: '🪪', color: 'purple' },
  PASSPORT: { label: 'Pasport', icon: '📕', color: 'red' },
  PAYMENT_RECEIPT: { label: 'To\'lov kvitansiyasi', icon: '🧾', color: 'green' },
  CONTRACT_ATTACHMENT: { label: 'Shartnoma ilovasi', icon: '📎', color: 'yellow' },
  OTHER: { label: 'Boshqa', icon: '📁', color: 'gray' },
};

const DocumentsPage = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [receiptData, setReceiptData] = useState<any>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);
  const router = useRouter();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          router.push('/login');
          return;
        }
        
        // Get documents directly from tenant portal endpoint
        const docs = await fetchTenantApi<Document[]>('/tenant/documents');
        setDocuments(docs);
      } catch (err) {
        console.error(err);
        if (err instanceof ApiError && err.status === 401) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    loadDocuments();
  }, [router]);

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const filteredDocuments = filter === 'ALL' 
    ? documents 
    : documents.filter(d => d.type === filter);

  const getTypeInfo = (type: string) => {
    return documentTypeLabels[type] || documentTypeLabels.OTHER;
  };

  if (loading) {
    return <DaritalLoader darkMode={darkMode} />;
  }

  return (
    <>
      <TenantNavbar />
      <div className={`min-h-screen transition-colors duration-500 ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900' 
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[{ label: t.documents || 'Documents' }]} />

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${
                darkMode
                  ? 'text-white'
                  : 'bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent'
              }`}>
                📁 {t.myDocuments || 'My Documents'}
              </h1>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {t.documentsDescription || 'View and download your lease agreements, receipts, and other documents'}
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : darkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Barchasi ({documents.length})
            </button>
            {Object.entries(documentTypeLabels).map(([type, info]) => {
              const count = documents.filter(d => d.type === type).length;
              if (count === 0) return null;
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    filter === type
                      ? 'bg-blue-600 text-white'
                      : darkMode
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {info.icon} {info.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Documents Grid */}
          {filteredDocuments.length === 0 ? (
            <div className={`text-center py-16 rounded-2xl border ${
              darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'
            }`}>
              <div className="text-6xl mb-4">📂</div>
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {t.noDocuments || 'No Documents'}
              </h3>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {t.noDocumentsYet || 'Your documents will appear here once uploaded'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDocuments.map((doc) => {
                const typeInfo = getTypeInfo(doc.type);
                return (
                  <div
                    key={doc.id}
                    className={`p-5 rounded-xl border transition-all hover:shadow-lg ${
                      darkMode 
                        ? 'bg-gray-900/50 border-gray-800 hover:border-blue-500/50' 
                        : 'bg-white border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {/* Type badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                        darkMode 
                          ? `bg-${typeInfo.color}-500/20 text-${typeInfo.color}-400`
                          : `bg-${typeInfo.color}-100 text-${typeInfo.color}-700`
                      }`}>
                        <span>{typeInfo.icon}</span>
                        <span>{typeInfo.label}</span>
                      </div>
                    </div>

                    {/* Document info */}
                    <h3 className={`font-bold mb-2 truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {doc.name}
                    </h3>
                    
                    <div className={`text-sm space-y-1 mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <p>📅 {formatDate(doc.createdAt)}</p>
                      <p>💾 {formatFileSize(doc.fileSize)}</p>
                    </div>

                    {/* Download button */}
                    {doc.type === 'PAYMENT_RECEIPT' ? (
                      <button
                        onClick={async () => {
                          setLoadingReceipt(doc.id);
                          try {
                            // Extract payment ID from fileUrl (format: /api/receipts/payment/{paymentId})
                            const paymentId = doc.fileUrl.split('/').pop();
                            if (!paymentId) {
                              throw new Error('Payment ID not found');
                            }
                            
                            // Fetch receipt data using tenant API
                            const data = await fetchTenantApi(`/tenant/receipts/payment/${paymentId}`);
                            setReceiptData(data);
                          } catch (err) {
                            console.error('Failed to load receipt:', err);
                            alert(t.receiptError || 'Kvitansiyani yuklab bo\'lmadi');
                          } finally {
                            setLoadingReceipt(null);
                          }
                        }}
                        disabled={loadingReceipt === doc.id}
                        className={`w-full py-2 px-4 rounded-lg font-medium text-center flex items-center justify-center gap-2 transition-all ${
                          loadingReceipt === doc.id
                            ? 'bg-gray-400 cursor-not-allowed'
                            : darkMode
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {loadingReceipt === doc.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            {t.loading || 'Yuklanmoqda...'}
                          </>
                        ) : (
                          <>📥 {t.download || 'Yuklab olish'}</>
                        )}
                      </button>
                    ) : (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full py-2 px-4 rounded-lg font-medium text-center flex items-center justify-center gap-2 transition-all ${
                          darkMode
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        📥 {t.download || 'Yuklab olish'}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Stats */}
          {documents.length > 0 && (
            <div className={`mt-8 p-6 rounded-xl border ${
              darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'
            }`}>
              <h3 className={`font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                📊 {t.documentSummary || 'Document Summary'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.totalDocuments || 'Total Documents'}
                  </p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {documents.length}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.totalSize || 'Total Size'}
                  </p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {formatFileSize(documents.reduce((sum, d) => sum + (d.fileSize || 0), 0))}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.receipts || 'Receipts'}
                  </p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {documents.filter(d => d.type === 'PAYMENT_RECEIPT').length}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.contracts || 'Contracts'}
                  </p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {documents.filter(d => d.type === 'LEASE_AGREEMENT' || d.type === 'CONTRACT_ATTACHMENT').length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Receipt Download Modal */}
      {receiptData && (
        <ReceiptDownload
          receiptData={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}
    </>
  );
};

export default DocumentsPage;
