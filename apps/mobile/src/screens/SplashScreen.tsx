import React, { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { DaritalLoader } from '../components/DaritalLoader';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const { darkMode } = useTheme();

  useEffect(() => {
    const timer = setTimeout(onFinish, 1500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return <DaritalLoader fullScreen darkMode={darkMode} />;
}

