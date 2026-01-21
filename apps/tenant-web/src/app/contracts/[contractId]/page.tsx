'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getContractById } from '../../../lib/tenantApi';
import { ApiError } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';

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
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  const { darkMode } = useTheme();
  
  const contractId = params?.contractId as string;

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
    <div className={`w-full h-screen flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
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
              {new Date(contract.startDate).toLocaleDateString('en-GB')} - {new Date(contract.endDate).toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>
        
        <a
          href={contract.pdfUrl}
          download
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 ${
            darkMode
              ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </a>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 relative">
        <iframe
          src={contract.pdfUrl}
          className="w-full h-full border-none"
          title={`Contract ${contract.id}`}
        />
      </div>
    </div>
  );
};

export default ContractPdfPage;

