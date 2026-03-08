'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand?: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
      };
    };
  }
}

export function TelegramInitializer() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    try {
      webApp.ready();
      if (webApp.expand) {
        webApp.expand();
      }
      if (webApp.setBackgroundColor) {
        webApp.setBackgroundColor('#020617');
      }
      if (webApp.setHeaderColor) {
        webApp.setHeaderColor('#020617');
      }
    } catch {
      // Ignore Telegram WebApp errors to avoid breaking the app outside Telegram
    }
  }, []);

  return null;
}

