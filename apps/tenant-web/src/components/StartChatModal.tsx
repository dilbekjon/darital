'use client';

import { useState, KeyboardEvent } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface StartChatModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (topic: string) => void;
}

export function StartChatModal({ open, onClose, onSubmit }: StartChatModalProps) {
  const { t } = useLanguage();
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmedTopic = topic.trim();
    
    if (trimmedTopic.length < 3) {
      setError(t.topicMinLength);
      return;
    }
    
    setError('');
    onSubmit(trimmedTopic);
    setTopic(''); // Reset for next time
    onClose();
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClose = () => {
    setTopic('');
    setError('');
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t.startConversation}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t.enterTopic}
            </p>
          </div>

          {/* Input */}
          <div className="mb-4">
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.topic} *
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder={t.topicPlaceholder}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t.topicMinLength}
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSubmit}
              disabled={topic.trim().length < 3}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {t.chat}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

