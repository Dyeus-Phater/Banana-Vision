
import React from 'react';
import FileInput from './FileInput';
import { Theme } from '../types';

interface ToolbarProps {
  onExportJson: () => void;
  onImportJson: (files: FileList) => void; // Changed to FileList
  onExportPng: () => void;
  onToggleTheme: () => void;
  currentTheme: Theme;
  onSaveScript: () => void;
}

const ToolbarButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
  <button
    {...props}
    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                bg-yellow-500 hover:bg-yellow-600 text-white
                dark:bg-yellow-600 dark:hover:bg-yellow-700 dark:text-gray-900
                disabled:opacity-50 disabled:cursor-not-allowed ${props.className || ''}`}
  >
    {children}
  </button>
);

const Toolbar: React.FC<ToolbarProps> = ({ 
  onExportJson, 
  onImportJson, 
  onExportPng, 
  onToggleTheme, 
  currentTheme,
  onSaveScript 
}) => {
  const handleFileChange = (files: FileList | null) => { // Changed to FileList
    if (files && files.length > 0) {
      onImportJson(files);
    }
  };
  
  const getThemeIcon = () => {
    if (currentTheme === 'light') return '☀️'; 
    if (currentTheme === 'dark') return '🌙'; 
    return '🍌'; 
  };

  return (
    <div className="flex items-center space-x-2">
      <FileInput 
        onChange={handleFileChange} 
        accept=".json"
        buttonLabel="Import JSON"
        buttonClassName="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700 dark:text-gray-900"
        multiple={false} // Settings import is typically single file
      />
      <ToolbarButton onClick={onExportJson}>Export JSON</ToolbarButton>
      <ToolbarButton onClick={onSaveScript} className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700">
        Save Script
      </ToolbarButton>
      <ToolbarButton onClick={onExportPng}>Export PNG</ToolbarButton>
      <ToolbarButton onClick={onToggleTheme} title={`Switch to ${currentTheme === 'light' ? 'Dark' : currentTheme === 'dark' ? 'Banana' : 'Light'} Mode`}>
        {getThemeIcon()}
      </ToolbarButton>
    </div>
  );
};

export default Toolbar;