'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useUntypedTranslations } from '../../../i18n/useUntypedTranslations';
import { useTheme } from '../../../contexts/ThemeContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { EmptyState } from '../../../components/EmptyState';
import {
  getArchiveSummary,
  runAutoArchive,
  getArchivedConversations,
  getArchivedTenants,
  getArchivedContracts,
  getArchivedInvoices,
  getArchivedPayments,
  restoreArchivedConversation,
  unarchiveTenant,
  unarchiveContract,
  unarchiveInvoice,
  deleteArchivedTenant,
  deleteArchivedContract,
  deleteArchivedInvoice,
  cleanupOldArchives,
  ArchiveSummary,
  ArchivedConversation,
  ArchivedTenant,
  ArchivedContract,
  ArchivedInvoice,
  ArchivedPayment,
} from '../../../lib/archiveApi';
import DaritalLoader from '../../../components/DaritalLoader';

export default function ArchiveManagementPage() {
  const { user, loading, hasPermission } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();
  const [summary, setSummary] = useState<ArchiveSummary | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [unarchiving, setUnarchiving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [archivedConversations, setArchivedConversations] = useState<ArchivedConversation[]>([]);
  const [archivedTenants, setArchivedTenants] = useState<ArchivedTenant[]>([]);
  const [archivedContracts, setArchivedContracts] = useState<ArchivedContract[]>([]);
  const [archivedInvoices, setArchivedInvoices] = useState<ArchivedInvoice[]>([]);
  const [archivedPayments, setArchivedPayments] = useState<ArchivedPayment[]>([]);
  const [activeTab, setActiveTab] = useState<'tenants' | 'contracts' | 'invoices' | 'payments' | 'conversations'>('tenants');

  useEffect(() => {
    if (!loading) {
      if (!user || !hasPermission('admin.users.read')) {
        setPageLoading(false);
        return;
      }
      loadData();
    }
  }, [loading, user, hasPermission]);

  const loadData = async () => {
    try {
      const [
        summaryData,
        conversationsData,
        tenantsData,
        contractsData,
        invoicesData,
        paymentsData,
      ] = await Promise.all([
        getArchiveSummary(),
        getArchivedConversations(1, 20),
        getArchivedTenants(),
        getArchivedContracts(),
        getArchivedInvoices(),
        getArchivedPayments(),
      ]);
      setSummary(summaryData);
      setArchivedConversations(conversationsData.data);
      setArchivedTenants(tenantsData);
      setArchivedContracts(contractsData);
      setArchivedInvoices(invoicesData);
      setArchivedPayments(paymentsData);
    } catch (err) {
      console.error('Failed to load archive data:', err);
      setError(t.failedToLoadArchiveData);
    } finally {
      setPageLoading(false);
    }
  };

  const handleRunAutoArchive = async () => {
    setArchiving(true);
    setError(null);
    try {
      const result = await runAutoArchive();
      setSuccess(`Archive completed: ${result.conversationsArchived} conversations, ${result.messagesArchived} messages archived`);
      await loadData(); // Refresh data
    } catch (err) {
      console.error('Failed to run auto archive:', err);
      setError(t.failedToRunAutoArchive);
    } finally {
      setArchiving(false);
    }
  };

  const handleRestoreConversation = async (archivedId: string) => {
    setRestoring(archivedId);
    setError(null);
    try {
      await restoreArchivedConversation(archivedId);
      setSuccess(t.conversationRestoredSuccessfully);
      await loadData(); // Refresh data
    } catch (err) {
      console.error('Failed to restore conversation:', err);
      setError(t.failedToRestoreConversation);
    } finally {
      setRestoring(null);
    }
  };

  const handleUnarchiveTenant = async (tenantId: string) => {
    setUnarchiving(tenantId);
    setError(null);
    try {
      await unarchiveTenant(tenantId);
      setSuccess(t.tenantUnarchivedSuccessfully);
      // Remove from archived list
      setArchivedTenants(prev => prev.filter(t => t.id !== tenantId));
    } catch (err) {
      console.error('Failed to unarchive tenant:', err);
      setError(t.failedToUnarchiveTenant);
    } finally {
      setUnarchiving(null);
    }
  };

  const handleUnarchiveContract = async (contractId: string) => {
    setUnarchiving(contractId);
    setError(null);
    try {
      await unarchiveContract(contractId);
      setSuccess(t.contractUnarchivedSuccessfully);
      setArchivedContracts(prev => prev.filter(c => c.id !== contractId));
    } catch (err) {
      console.error('Failed to unarchive contract:', err);
      setError(t.failedToUnarchiveContract);
    } finally {
      setUnarchiving(null);
    }
  };

  const handleUnarchiveInvoice = async (invoiceId: string) => {
    setUnarchiving(invoiceId);
    setError(null);
    try {
      await unarchiveInvoice(invoiceId);
      setSuccess(t.invoiceUnarchivedSuccessfully);
      setArchivedInvoices(prev => prev.filter(i => i.id !== invoiceId));
    } catch (err) {
      console.error('Failed to unarchive invoice:', err);
      setError(t.failedToUnarchiveInvoice);
    } finally {
      setUnarchiving(null);
    }
  };

  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Bu ijara oluvchini butunlay o'chirmoqchimisiz?\n\n"${tenantName}"\n\nBu amalni qaytarib bo'lmaydi!`)) {
      return;
    }
    
    setDeleting(tenantId);
    setError(null);
    try {
      await deleteArchivedTenant(tenantId);
      setSuccess('Ijara oluvchi muvaffaqiyatli o\'chirildi');
      setArchivedTenants(prev => prev.filter(t => t.id !== tenantId));
    } catch (err: any) {
      console.error('Failed to delete tenant:', err);
      setError(err?.message || 'Ijara oluvchini o\'chirishda xato');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteContract = async (contractId: string, contractInfo: string) => {
    if (!confirm(`Bu shartnomani butunlay o'chirmoqchimisiz?\n\n"${contractInfo}"\n\nBarcha tegishli hisob-fakturalar va to'lovlar ham o'chiriladi!\n\nBu amalni qaytarib bo'lmaydi!`)) {
      return;
    }
    
    setDeleting(contractId);
    setError(null);
    try {
      await deleteArchivedContract(contractId);
      setSuccess('Shartnoma muvaffaqiyatli o\'chirildi');
      setArchivedContracts(prev => prev.filter(c => c.id !== contractId));
    } catch (err: any) {
      console.error('Failed to delete contract:', err);
      setError(err?.message || 'Shartnomani o\'chirishda xato');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm(`Bu hisob-fakturani butunlay o'chirmoqchimisiz?\n\nBu amalni qaytarib bo'lmaydi!`)) {
      return;
    }
    
    setDeleting(invoiceId);
    setError(null);
    try {
      await deleteArchivedInvoice(invoiceId);
      setSuccess('Hisob-faktura muvaffaqiyatli o\'chirildi');
      setArchivedInvoices(prev => prev.filter(i => i.id !== invoiceId));
    } catch (err: any) {
      console.error('Failed to delete invoice:', err);
      setError(err?.message || 'Hisob-fakturani o\'chirishda xato');
    } finally {
      setDeleting(null);
    }
  };

  const handleCleanupOldArchives = async () => {
    const days = prompt('Enter number of days (minimum 30):', '365');
    if (!days || parseInt(days) < 30) return;

    setCleaning(true);
    setError(null);
    try {
      const result = await cleanupOldArchives(parseInt(days));
      setSuccess(`Cleanup completed: ${result.conversationsDeleted} conversations, ${result.messagesDeleted} messages deleted`);
      await loadData(); // Refresh data
    } catch (err) {
      console.error('Failed to cleanup archives:', err);
      setError('Failed to cleanup archives');
    } finally {
      setCleaning(false);
    }
  };

  const formatBytes = (mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return t.never || 'Hech qachon';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  if (loading || pageLoading) {
    return <DaritalLoader darkMode={darkMode} />;
  }

  if (!user || !hasPermission('admin.users.read')) {
    return <NoAccess />;
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        darkMode ? 'bg-black' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: t.dashboard || 'Bosh sahifa', href: '/dashboard' },
            { label: 'Archive Management' },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            📦 Archive Management
          </h1>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            Manage archived data and automatic cleanup processes
          </p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Archive Summary */}
        {summary && (
          <div className={`rounded-xl border p-6 mb-8 ${
            darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Archive Summary
              </h2>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Last archive: {formatDate(summary.lastArchiveDate)}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="text-sm text-gray-600 dark:text-gray-400">Tenants</div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-semibold">{summary.stats.tenants.active}</span>
                  <span className="text-xs text-gray-500">active</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-600 font-semibold">{summary.stats.tenants.archived}</span>
                  <span className="text-xs text-gray-500">archived</span>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="text-sm text-gray-600 dark:text-gray-400">Contracts</div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-semibold">{summary.stats.contracts.active}</span>
                  <span className="text-xs text-gray-500">active</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-600 font-semibold">{summary.stats.contracts.archived}</span>
                  <span className="text-xs text-gray-500">archived</span>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="text-sm text-gray-600 dark:text-gray-400">Conversations</div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-semibold">{summary.stats.conversations.active}</span>
                  <span className="text-xs text-gray-500">active</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-600 font-semibold">{summary.stats.conversations.archived}</span>
                  <span className="text-xs text-gray-500">archived</span>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="text-sm text-gray-600 dark:text-gray-400">Storage</div>
                <div className="text-lg font-semibold text-blue-600">
                  {formatBytes(summary.totalArchivedSize)}
                </div>
                <div className="text-xs text-gray-500">archived data</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleRunAutoArchive}
                disabled={archiving}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  archiving
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {archiving ? 'Archiving...' : 'Run Auto Archive'}
              </button>

              <button
                onClick={handleCleanupOldArchives}
                disabled={cleaning}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  cleaning
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {cleaning ? 'Cleaning...' : 'Cleanup Old Archives'}
              </button>
            </div>
          </div>
        )}

        {/* Archive Content */}
        <div className={`rounded-xl border p-6 ${
          darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('tenants')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'tenants'
                  ? 'bg-blue-600 text-white'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tenants ({archivedTenants.length})
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'contracts'
                  ? 'bg-blue-600 text-white'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Contracts ({archivedContracts.length})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'invoices'
                  ? 'bg-blue-600 text-white'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hisob-fakturalar ({archivedInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'payments'
                  ? 'bg-blue-600 text-white'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Payments ({archivedPayments.length})
            </button>
            <button
              onClick={() => setActiveTab('conversations')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'conversations'
                  ? 'bg-blue-600 text-white'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Conversations ({archivedConversations.length})
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'tenants' && (
            <div>
              <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Archived Tenants ({archivedTenants.length})
              </h2>
              {archivedTenants.length === 0 ? (
                <EmptyState
                  icon={<span className="text-4xl">👥</span>}
                  title={t.noArchivedTenants}
                  description={t.archivedTenantsDesc}
                />
              ) : (
                <div className="space-y-3">
                  {archivedTenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      className={`p-4 rounded-lg border transition-all ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {tenant.fullName}
                          </h3>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {tenant.phone} • Archived: {formatDate(tenant.archivedAt)}
                          </div>
                          {tenant.archiveReason && (
                            <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              Reason: {tenant.archiveReason}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUnarchiveTenant(tenant.id)}
                            disabled={unarchiving === tenant.id || deleting === tenant.id}
                            className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                              unarchiving === tenant.id
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {unarchiving === tenant.id ? t.unarchiving : t.unarchive}
                          </button>
                          <button
                            onClick={() => handleDeleteTenant(tenant.id, tenant.fullName)}
                            disabled={unarchiving === tenant.id || deleting === tenant.id}
                            className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                              deleting === tenant.id
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            {deleting === tenant.id ? 'O\'chirilmoqda...' : 'O\'chirish'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'contracts' && (
            <div>
              <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Archived Contracts ({archivedContracts.length})
              </h2>
              {archivedContracts.length === 0 ? (
                <EmptyState
                  icon={<span className="text-4xl">📄</span>}
                  title={t.noArchivedContracts}
                  description={t.archivedContractsDesc}
                />
              ) : (
                <div className="space-y-3">
                  {archivedContracts.map((contract) => (
                    <div
                      key={contract.id}
                      className={`p-4 rounded-lg border transition-all ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {contract.tenant.fullName} - {contract.unit.name}
                          </h3>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {new Date(contract.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} - {new Date(contract.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} •
                            ${contract.amount} • {contract.status} • Archived: {formatDate(contract.archivedAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUnarchiveContract(contract.id)}
                            disabled={unarchiving === contract.id || deleting === contract.id}
                            className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                              unarchiving === contract.id
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {unarchiving === contract.id ? t.unarchiving : t.unarchive}
                          </button>
                          <button
                            onClick={() => handleDeleteContract(contract.id, `${contract.tenant.fullName} - ${contract.unit.name}`)}
                            disabled={unarchiving === contract.id || deleting === contract.id}
                            className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                              deleting === contract.id
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            {deleting === contract.id ? 'O\'chirilmoqda...' : 'O\'chirish'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div>
              <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Arxivlangan Hisob-fakturalar ({archivedInvoices.length})
              </h2>
              {archivedInvoices.length === 0 ? (
                <EmptyState
                  icon={<span className="text-4xl">🧾</span>}
                  title={t.noArchivedInvoices || 'Arxivlangan hisob-fakturalar yo\'q'}
                  description={t.archivedInvoicesDesc || 'Shartnoma arxivlanganda, unga tegishli hisob-fakturalar ham arxivlanadi'}
                />
              ) : (
                <div className="space-y-3">
                  {archivedInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className={`p-4 rounded-lg border transition-all ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {invoice.contract?.tenant?.fullName || (t.unknownUser || 'Noma\'lum')}
                          </h3>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {invoice.contract?.unit?.name && <span className="mr-2">{t.unit || 'Ofis'}: {invoice.contract.unit.name}</span>}
                            {invoice.contract?.tenant?.phone && <span className="mr-2">• {invoice.contract.tenant.phone}</span>}
                          </div>
                          <div className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            To'lov muddati: {new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} •
                            {' '}{Number(invoice.amount).toLocaleString()} UZS • {invoice.status === 'PENDING' ? 'Kutilmoqda' : invoice.status === 'PAID' ? 'To\'langan' : invoice.status === 'OVERDUE' ? 'Muddati o\'tgan' : invoice.status}
                          </div>
                          <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Arxivlangan: {formatDate(invoice.archivedAt)}
                            {invoice.archiveReason && <span> • Sabab: {invoice.archiveReason}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUnarchiveInvoice(invoice.id)}
                            disabled={unarchiving === invoice.id || deleting === invoice.id}
                            className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                              unarchiving === invoice.id
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {unarchiving === invoice.id ? 'Tiklanmoqda...' : 'Tiklash'}
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            disabled={unarchiving === invoice.id || deleting === invoice.id}
                            className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                              deleting === invoice.id
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            {deleting === invoice.id ? 'O\'chirilmoqda...' : 'O\'chirish'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div>
              <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Archived Payments ({archivedPayments.length})
              </h2>
              {archivedPayments.length === 0 ? (
                <EmptyState
                  icon={<span className="text-4xl">💰</span>}
                  title={t.noArchivedPayments}
                  description={t.archivedPaymentsDesc}
                />
              ) : (
                <div className="space-y-3">
                  {archivedPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`p-4 rounded-lg border transition-all ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Payment #{payment.id.slice(-8)}
                          </h3>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            ${payment.amount} • {payment.provider} • {payment.status} •
                            Archived: {formatDate(payment.archivedAt)}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded text-sm font-medium ${
                          payment.status === 'CONFIRMED'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'conversations' && (
            <div>
              <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Archived Conversations ({archivedConversations.length})
              </h2>
              {archivedConversations.length === 0 ? (
                <EmptyState
                  icon={<span className="text-4xl">📦</span>}
                  title={t.noArchivedConversations}
                  description={t.archivedConversationsDesc}
                />
              ) : (
                <div className="space-y-3">
                  {archivedConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-4 rounded-lg border transition-all ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {conversation.topic || (t.untitledConversation || 'Mavzusiz suhbat')}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              conversation.status === 'CLOSED'
                                ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                              {conversation.status}
                            </span>
                          </div>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Tenant ID: {conversation.tenantId} •
                            {conversation._count.messages} messages •
                            Archived: {formatDate(conversation.archivedAt)}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRestoreConversation(conversation.id)}
                          disabled={restoring === conversation.id}
                          className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                            restoring === conversation.id
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {restoring === conversation.id ? 'Restoring...' : 'Restore'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}