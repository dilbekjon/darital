'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useUntypedTranslations } from '../../../i18n/useUntypedTranslations';
import { Language } from '../../../lib/i18n';
import { useTheme } from '../../../contexts/ThemeContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { EmptyState } from '../../../components/EmptyState';
import { fetchApi } from '../../../lib/api';
import DaritalLoader from '../../../components/DaritalLoader';

interface TemplateVariable {
  key: string;
  description: string;
  example: string;
}

interface EmailTemplate {
  id: string;
  code: string;
  name: string;
  description: string | null;
  subjectUz: string;
  subjectRu: string;
  subjectEn: string;
  bodyUz: string;
  bodyRu: string;
  bodyEn: string;
  variables: TemplateVariable[];
  isActive: boolean;
  updatedAt: string;
}

interface PreviewResult {
  subject: string;
  body: string;
  variables: TemplateVariable[];
}

export default function EmailTemplatesPage() {
  const { user, loading, hasPermission } = useAuth();
  const { language } = useLanguage();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editData, setEditData] = useState<Partial<EmailTemplate>>({});
  const [previewLang, setPreviewLang] = useState<Language>(language);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [sampleData, setSampleData] = useState<Record<string, string>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await fetchApi<EmailTemplate[]>('/email-templates');
      setTemplates(data);
      if (data.length === 0) {
        // Seed defaults if no templates
        await fetchApi('/email-templates/seed', { method: 'POST' });
        const newData = await fetchApi<EmailTemplate[]>('/email-templates');
        setTemplates(newData);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setPageLoading(false);
    }
  };

  const selectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditData({
      name: template.name,
      description: template.description || '',
      subjectUz: template.subjectUz,
      subjectRu: template.subjectRu,
      subjectEn: template.subjectEn,
      bodyUz: template.bodyUz,
      bodyRu: template.bodyRu,
      bodyEn: template.bodyEn,
      isActive: template.isActive,
    });
    setPreview(null);
    setShowPreview(false);

    // Initialize sample data with examples
    const samples: Record<string, string> = {};
    template.variables?.forEach((v) => {
      samples[v.key] = v.example;
    });
    setSampleData(samples);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      await fetchApi(`/email-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        body: JSON.stringify(editData),
      });
      await loadTemplates();
      alert(t.templateSaved || 'Template saved successfully!');
    } catch (err) {
      console.error('Failed to save template:', err);
      alert(t.saveError || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedTemplate) return;
    try {
      const result = await fetchApi<PreviewResult>(`/email-templates/${selectedTemplate.id}/preview`, {
        method: 'POST',
        body: JSON.stringify({ language: previewLang, sampleData }),
      });
      setPreview(result);
      setShowPreview(true);
    } catch (err) {
      console.error('Preview failed:', err);
    }
  };

  const handleReset = async () => {
    if (!selectedTemplate) return;
    if (!confirm(t.confirmReset || 'Are you sure you want to reset this template to default?')) return;
    
    try {
      await fetchApi(`/email-templates/${selectedTemplate.id}/reset`, { method: 'POST' });
      await loadTemplates();
      setSelectedTemplate(null);
      alert(t.templateReset || 'Template reset to default');
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  if (loading || pageLoading) {
    return <DaritalLoader darkMode={darkMode} />;
  }

  if (!user || !hasPermission('notifications.manage')) {
    return <NoAccess />;
  }

  const getSubjectKey = (lang: Language) => `subject${lang.charAt(0).toUpperCase() + lang.slice(1)}` as keyof typeof editData;
  const getBodyKey = (lang: Language) => `body${lang.charAt(0).toUpperCase() + lang.slice(1)}` as keyof typeof editData;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: t.dashboard, href: '/dashboard' },
            { label: t.emailTemplates || 'Email Templates' },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            📧 {t.emailTemplates || 'Email Templates'}
          </h1>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            {t.emailTemplatesDesc || 'Customize email notifications sent to tenants'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates List */}
          <div className={`rounded-2xl border p-4 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h2 className={`font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {t.templates || 'Templates'}
            </h2>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedTemplate?.id === template.id
                      ? darkMode
                        ? 'bg-blue-600/20 border-blue-500'
                        : 'bg-blue-50 border-blue-300'
                      : darkMode
                      ? 'hover:bg-gray-800 border-gray-700'
                      : 'hover:bg-gray-50 border-gray-200'
                  } border`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {template.name}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        template.isActive ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {template.description || template.code}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className={`lg:col-span-2 rounded-2xl border p-6 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
            {selectedTemplate ? (
              <div className="space-y-6">
                {/* Template Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedTemplate.name}
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Code: {selectedTemplate.code}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      {t.active || 'Active'}
                    </span>
                    <button
                      onClick={() => setEditData({ ...editData, isActive: !editData.isActive })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        editData.isActive ? 'bg-green-500' : darkMode ? 'bg-gray-700' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          editData.isActive ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                </div>

                {/* Variables Info */}
                {selectedTemplate.variables?.length > 0 && (
                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-blue-50'}`}>
                    <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                      📌 {t.availableVariables || 'Available Variables'}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables.map((v) => (
                        <code
                          key={v.key}
                          className={`px-2 py-1 rounded text-xs ${
                            darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-white text-blue-600'
                          }`}
                          title={v.description}
                        >
                          {`{${v.key}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                )}

                {/* Language Tabs */}
                <div className="flex gap-2 border-b border-gray-700">
                  {(['uz', 'ru', 'en'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setPreviewLang(lang)}
                      className={`px-4 py-2 font-medium transition-colors ${
                        previewLang === lang
                          ? darkMode
                            ? 'text-blue-400 border-b-2 border-blue-400'
                            : 'text-blue-600 border-b-2 border-blue-600'
                          : darkMode
                          ? 'text-gray-400 hover:text-gray-300'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      {lang === 'uz' ? "🇺🇿 O'zbek" : lang === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English'}
                    </button>
                  ))}
                </div>

                {/* Subject */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t.subject || 'Subject'}
                  </label>
                  <input
                    type="text"
                    value={(editData[getSubjectKey(previewLang)] as string) || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, [getSubjectKey(previewLang)]: e.target.value })
                    }
                    className={`w-full px-4 py-3 rounded-xl border ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-800'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                {/* Body */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t.body || 'Body'}
                  </label>
                  <textarea
                    value={(editData[getBodyKey(previewLang)] as string) || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, [getBodyKey(previewLang)]: e.target.value })
                    }
                    rows={10}
                    className={`w-full px-4 py-3 rounded-xl border font-mono text-sm ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-800'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                {/* Sample Data for Preview */}
                {selectedTemplate.variables?.length > 0 && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {t.sampleData || 'Sample Data for Preview'}
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedTemplate.variables.map((v) => (
                        <div key={v.key}>
                          <label className={`block text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {v.key}
                          </label>
                          <input
                            type="text"
                            value={sampleData[v.key] || ''}
                            onChange={(e) => setSampleData({ ...sampleData, [v.key]: e.target.value })}
                            placeholder={v.example}
                            className={`w-full px-3 py-2 rounded-lg border text-sm ${
                              darkMode
                                ? 'bg-gray-800 border-gray-700 text-white'
                                : 'bg-white border-gray-300 text-gray-800'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    {saving ? t.saving || 'Saving...' : t.saveChanges || 'Save Changes'}
                  </button>
                  <button
                    onClick={handlePreview}
                    className={`px-6 py-3 font-medium rounded-xl transition-colors ${
                      darkMode
                        ? 'bg-gray-800 hover:bg-gray-700 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    }`}
                  >
                    👁️ {t.preview || 'Preview'}
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 text-red-500 hover:text-red-400 font-medium transition-colors"
                  >
                    ↩️ {t.resetToDefault || 'Reset to Default'}
                  </button>
                </div>

                {/* Preview Modal */}
                {showPreview && preview && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div
                      className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 ${
                        darkMode ? 'bg-gray-900' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          📧 {t.emailPreview || 'Email Preview'}
                        </h3>
                        <button
                          onClick={() => setShowPreview(false)}
                          className={`p-2 rounded-lg ${
                            darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                          }`}
                        >
                          ✕
                        </button>
                      </div>
                      
                      <div className={`p-4 rounded-xl mb-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <p className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {t.subject || 'Subject'}:
                        </p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {preview.subject}
                        </p>
                      </div>

                      <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {t.body || 'Body'}:
                        </p>
                        <pre
                          className={`whitespace-pre-wrap font-sans ${
                            darkMode ? 'text-gray-200' : 'text-gray-700'
                          }`}
                        >
                          {preview.body}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={<span className="text-6xl">📧</span>}
                title={t.selectTemplate || 'Select a Template'}
                description={t.selectTemplateDesc || 'Choose a template from the list to edit'}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
