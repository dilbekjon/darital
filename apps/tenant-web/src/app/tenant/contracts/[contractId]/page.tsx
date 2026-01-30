'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getContractById } from '../../../../lib/tenantApi';
import { ApiError } from '../../../../lib/api';
import { useUntypedTranslations } from '../../../../i18n/useUntypedTranslations';
import { useTheme } from '../../../../contexts/ThemeContext';
import TenantNavbar from '../../../../components/TenantNavbar';

interface Contract {
  id: string;
  unitId: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  pdfUrl: string;
  unit?: {
    name: string;
  };
}

const ContractPdfPage = () => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const router = useRouter();
  const params = useParams();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();
  
  const contractId = params?.contractId as string;

  const handleDownload = () => {
    if (!contract?.pdfUrl) return;
    
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = contract.pdfUrl;
    link.download = `contract-${contract.id}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const loadContract = async () => {
      if (!contractId) {
        setError('Contract ID not found');
        setLoading(false);
        return;
      }

      try {
        const data = await getContractById(contractId);
        setContract(data);
      } catch (err) {
        console.error(err);
        if (typeof window !== 'undefined' && err instanceof ApiError && err.status === 401) {
          router.push('/login');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load contract');
        }
      } finally {
        setLoading(false);
      }
    };
    loadContract();
  }, [contractId, router]);

  if (loading) {
    return (
      <div className={`w-full h-screen flex flex-col items-center justify-center ${
        darkMode ? 'bg-gray-900' : 'bg-gray-100'
      }`}>
        <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 mb-4 ${
          darkMode ? 'border-yellow-500' : 'border-blue-500'
        }`}></div>
        <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
          {t.loading}
        </p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className={`w-full h-screen flex flex-col items-center justify-center ${
        darkMode ? 'bg-gray-900' : 'bg-gray-100'
      }`}>
        <svg
          className={`h-16 w-16 mb-4 ${darkMode ? 'text-red-400' : 'text-red-500'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className={`text-lg mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {error || t.error}
        </p>
        <button
          onClick={() => router.push('/tenant/contracts')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            darkMode
              ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {t.contracts}
        </button>
      </div>
    );
  }

  return (
    <>
      <TenantNavbar />
      <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 shadow-lg ${
          darkMode ? 'bg-gray-800 border-b-2 border-yellow-500/40' : 'bg-white border-b border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/tenant/contracts')}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-700 text-yellow-400' 
                  : 'hover:bg-gray-100 text-blue-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {contract.unit?.name || t.contractDetails}
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {new Date(contract.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} - {new Date(contract.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}
              </p>
            </div>
          </div>
          
          {contract.pdfUrl && (
            <button
              onClick={handleDownload}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 ${
                darkMode
                  ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t.download || 'Download'}
            </button>
          )}
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 relative min-h-[600px]">
          {contract.pdfUrl ? (
            <>
              <iframe
                key={contract.pdfUrl}
                src={`${contract.pdfUrl}#toolbar=1`}
                className="w-full h-full border-none"
                title={`Contract ${contract.id}`}
                allow="fullscreen"
                style={{ minHeight: '600px' }}
                onError={() => {
                  console.error('PDF iframe error');
                  setPdfError(true);
                }}
                onLoad={() => {
                  // Reset error on successful load
                  setPdfError(false);
                }}
              />
              {/* Direct link button - always visible */}
              <div className="absolute bottom-4 right-4 z-10">
                <a
                  href={contract.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg ${
                    darkMode
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Yangi oynada ochish
                </a>
              </div>
              {/* Fallback if iframe fails */}
              <div className={`absolute inset-0 flex flex-col items-center justify-center ${
                darkMode ? 'bg-gray-900' : 'bg-gray-100'
              } ${pdfError ? '' : 'hidden'}`}>
                <svg
                  className={`h-16 w-16 mb-4 ${darkMode ? 'text-yellow-400' : 'text-blue-500'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className={`text-lg mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  PDF yuklanmadi
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handleDownload}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      darkMode
                        ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {t.download || 'Yuklab olish'}
                  </button>
                  <a
                    href={contract.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      darkMode
                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Yangi oynada ochish
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div className={`flex flex-col items-center justify-center h-full ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <svg
                className="h-16 w-16 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p>Bu shartnoma uchun PDF mavjud emas</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ContractPdfPage;

