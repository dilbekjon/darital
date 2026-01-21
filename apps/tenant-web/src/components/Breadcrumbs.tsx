'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '../contexts/ThemeContext';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const { darkMode } = useTheme();

  return (
    <nav className="flex items-center space-x-2 text-sm mb-6">
      <Link
        href="/tenant"
        className={`flex items-center gap-1 hover:underline ${
          darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
        }`}
      >
        🏠
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <span className={darkMode ? 'text-gray-600' : 'text-gray-400'}>/</span>
          {item.href ? (
            <Link
              href={item.href}
              className={`hover:underline ${
                darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {item.label}
            </Link>
          ) : (
            <span className={darkMode ? 'text-white' : 'text-gray-800'}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
