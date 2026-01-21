'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTenantContracts } from '../../lib/tenantApi';
import { ApiError } from '../../lib/api';
import { useUntypedTranslations } from '../../i18n/useUntypedTranslations';
import { useTheme } from '../../contexts/ThemeContext';
// Removed local Navbar; using global header

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

const ContractsPage = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();

  useEffect(() => {
    const loadContracts = async () => {
      try {
        const data = await getTenantContracts();
        setContracts(data);
      } catch (err) {
        console.error(err);
        if (typeof window !== 'undefined' && err instanceof ApiError && err.status === 401) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    loadContracts();
  }, [router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700';
      case 'ACTIVE':
        return darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700';
      case 'COMPLETED':
        return darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700';
      case 'CANCELLED':
        return darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700';
      default:
        return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return t.draft;
      case 'ACTIVE':
        return t.active;
      case 'COMPLETED':
        return t.completed;
      case 'CANCELLED':
        return t.cancelled;
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}>
        <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${
          darkMode ? 'border-yellow-500' : 'border-blue-500'
        }`}></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      {/* Header provided globally by GlobalHeader */}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          
          <h1 className={`text-4xl md:text-5xl font-bold mb-3 ${
            darkMode
              ? 'text-white drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]'
              : 'bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent'
          }`}
          style={darkMode ? {
            textShadow: '0 0 20px rgba(234, 179, 8, 0.3), 0 0 40px rgba(234, 179, 8, 0.2)',
            WebkitTextStroke: '1px rgba(234, 179, 8, 0.3)'
          } : {}}>
            {t.contractsList}
          </h1>
          <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
            {t.viewContract}
          </p>
        </div>

        {/* Contracts Table */}
        <div className={`rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ${
          darkMode
            ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-black border-2 border-yellow-500/40'
            : 'bg-white border border-blue-100'
        }`}>
          {contracts.length === 0 ? (
            <div className="p-12 text-center">
              <svg
                className={`mx-auto h-16 w-16 mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t.noContracts}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${
                      darkMode ? 'text-yellow-400' : 'text-gray-700'
                    }`}>
                      {t.unitName}
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${
                      darkMode ? 'text-yellow-400' : 'text-gray-700'
                    }`}>
                      {t.startDate}
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${
                      darkMode ? 'text-yellow-400' : 'text-gray-700'
                    }`}>
                      {t.endDate}
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${
                      darkMode ? 'text-yellow-400' : 'text-gray-700'
                    }`}>
                      {t.status}
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${
                      darkMode ? 'text-yellow-400' : 'text-gray-700'
                    }`}>
                      {t.amount}
                    </th>
                    <th className={`px-6 py-4 text-right text-sm font-semibold ${
                      darkMode ? 'text-yellow-400' : 'text-gray-700'
                    }`}>
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                  {contracts.map((contract) => (
                    <tr
                      key={contract.id}
                      className={`transition-colors ${
                        darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className={`px-6 py-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {contract.unit?.name || 'N/A'}
                      </td>
                      <td className={`px-6 py-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatDate(contract.startDate)}
                      </td>
                      <td className={`px-6 py-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatDate(contract.endDate)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(contract.status)}`}>
                          {getStatusLabel(contract.status)}
                        </span>
                      </td>
                      <td className={`px-6 py-4 font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        UZS {contract.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => router.push(`/tenant/contracts/${contract.id}`)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                            darkMode
                              ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {t.viewPDF}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}} />
    </div>
  );
};

export default ContractsPage;

