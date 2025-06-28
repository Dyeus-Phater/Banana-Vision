
import React, { useState, useRef, useEffect } from 'react';
import FileInput from './FileInput';
import { MainViewMode, ThemeKey } from '../types';

interface ToolbarProps {
  onExportJson: () => void;
  onImportJson: (files: FileList) => void; 
  onExportPng: () => void;
  onToggleLegacyTheme: () => void;
  currentActiveThemeKey: ThemeKey;
  currentMainView: MainViewMode;
  onToggleMainView: () => void;
  onSaveScript: () => void;
  onSaveAllChangedScripts: () => void;
  onShowTutorial: () => void;
}

const ToolbarButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                  bg-[var(--bv-toolbar-button-background,var(--bv-accent-primary))] 
                  text-[var(--bv-toolbar-button-text,var(--bv-accent-primary-content))]
                  hover:bg-[var(--bv-toolbar-button-hover-background,var(--bv-accent-primary))] hover:opacity-80
                  disabled:opacity-50 disabled:cursor-not-allowed ${props.className || ''}`}
    >
      {children}
    </button>
  )
);
ToolbarButton.displayName = 'ToolbarButton';

const Toolbar: React.FC<ToolbarProps> = (props) => {
  const { 
    onExportJson, onImportJson, onExportPng, onToggleLegacyTheme, 
    currentActiveThemeKey, currentMainView, onToggleMainView,
    onSaveScript, onSaveAllChangedScripts, onShowTutorial
  } = props;

  const [isJsonMenuOpen, setIsJsonMenuOpen] = useState(false);
  const [isScriptMenuOpen, setIsScriptMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  const jsonMenuRef = useRef<HTMLDivElement>(null);
  const scriptMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (jsonMenuRef.current && !jsonMenuRef.current.contains(event.target as Node)) {
        setIsJsonMenuOpen(false);
      }
      if (scriptMenuRef.current && !scriptMenuRef.current.contains(event.target as Node)) {
        setIsScriptMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleJsonFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      onImportJson(files);
      setIsJsonMenuOpen(false);
      setIsMobileMenuOpen(false);
    }
  };
  
  const getThemeIcon = () => {
    if (currentActiveThemeKey === 'light') return '☀️'; 
    if (currentActiveThemeKey === 'dark') return '🌙'; 
    if (currentActiveThemeKey === 'custom') return '🎨';
    return '🍌';
  };

  const menuButtonSharedClass = `bg-[var(--bv-toolbar-button-background,var(--bv-element-background))] 
                               hover:bg-[var(--bv-toolbar-button-hover-background,var(--bv-element-background-secondary))]`;
  const menuButtonTextClass = `text-[var(--bv-toolbar-text,var(--bv-text-primary))]`;
  const menuDropdownBgClass = `bg-[var(--bv-modal-background,var(--bv-element-background))]`;
  const menuDropdownBorderClass = `border-[var(--bv-border-color)]`;
  const menuItemHoverStyle = `hover:!bg-[var(--bv-accent-primary)] hover:!text-[var(--bv-accent-primary-content)]`;

  const renderMenuItems = (isMobile: boolean) => {
    const commonButtonClasses = isMobile 
      ? `w-full text-left !bg-transparent !rounded-none !px-4 !py-2 ${menuButtonTextClass} ${menuItemHoverStyle}` 
      : `${menuButtonSharedClass} ${menuButtonTextClass}`;
    
    return (
      <>
        {/* Gallery / Editor */}
        <ToolbarButton 
          onClick={() => { onToggleMainView(); setIsMobileMenuOpen(false); }}
          className={isMobile ? commonButtonClasses : "!bg-[var(--bv-accent-secondary)] !text-[var(--bv-accent-secondary-content)]"}
          title={currentMainView === 'editor' ? "Open Profiles Gallery" : "Back to Script Editor"}
        >
          {currentMainView === 'editor' ? '🖼️ Gallery' : '✏️ Editor'}
        </ToolbarButton>
        
        {/* JSON Import */}
         <FileInput 
            onChange={handleJsonFileChange} 
            accept=".json"
            buttonLabel="Import JSON"
            buttonClassName={`w-full text-left font-medium transition-colors
                           ${isMobile ? `px-4 py-2 text-sm ${menuButtonTextClass} ${menuItemHoverStyle}` : `px-4 py-2 text-sm rounded-md ${commonButtonClasses}`}
                           block disabled:opacity-50 disabled:cursor-not-allowed`}
            multiple={false} 
          />
        
        {/* JSON Export */}
        <ToolbarButton 
            onClick={() => { onExportJson(); setIsJsonMenuOpen(false); setIsMobileMenuOpen(false); }}
            className={isMobile ? commonButtonClasses : `${commonButtonClasses} !rounded-none`}
        >
            Export JSON
        </ToolbarButton>

        {/* Save Script */}
        <ToolbarButton 
            onClick={() => { onSaveScript(); setIsScriptMenuOpen(false); setIsMobileMenuOpen(false); }}
            className={isMobile ? commonButtonClasses : `${commonButtonClasses} !rounded-none`}
        >
            Save Active Script
        </ToolbarButton>

        {/* Save All Changed */}
        <ToolbarButton 
            onClick={() => { onSaveAllChangedScripts(); setIsScriptMenuOpen(false); setIsMobileMenuOpen(false); }}
            className={isMobile ? commonButtonClasses : `${commonButtonClasses} !rounded-none`}
        >
            Save All Changed
        </ToolbarButton>

        {/* Export PNG */}
        <ToolbarButton onClick={() => { onExportPng(); setIsMobileMenuOpen(false); }} className={isMobile ? commonButtonClasses : undefined}>Export PNG</ToolbarButton>
        
        {/* Theme Toggle */}
        <ToolbarButton 
            onClick={() => { onToggleLegacyTheme(); setIsMobileMenuOpen(false); }} 
            title={`Cycle Theme (Current: ${currentActiveThemeKey})`}
            className={isMobile ? commonButtonClasses : undefined}
        >
            {getThemeIcon()} Cycle Theme
        </ToolbarButton>
        
        {/* Tutorial */}
        <ToolbarButton 
            onClick={() => { onShowTutorial(); setIsMobileMenuOpen(false); }} 
            title="Show Tutorial"
            className={isMobile ? `flex items-center gap-2 ${commonButtonClasses}` : '!p-2.5'}
            aria-label="Show tutorial"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4 0 .863-.27 1.66-.744 2.26l-2.432 2.432c-.34.341-.742.614-1.17.793V16m0-6V8m0 2c-.933 0-1.75.253-2.432.678A5.964 5.964 0 005 14c0 .995.297 1.916.805 2.678m11.39-4.856A5.962 5.962 0 0119 14c0 .178-.01.355-.028.53A5.964 5.964 0 0019 14c0-1.807-.98-3.374-2.432-4.178M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {isMobile && <span>Show Tutorial</span>}
        </ToolbarButton>
      </>
    );
  };

  if (isPortrait) {
    return (
      <div ref={mobileMenuRef} className="relative">
        <ToolbarButton
          onClick={() => setIsMobileMenuOpen(prev => !prev)}
          aria-haspopup="true"
          aria-expanded={isMobileMenuOpen}
          aria-label="Open Menu"
          className="!p-2.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-16 6h16" />
          </svg>
        </ToolbarButton>
        {isMobileMenuOpen && (
          <div className={`absolute top-full right-0 mt-2 w-56 rounded-md shadow-lg ${menuDropdownBgClass} ring-1 ring-black ring-opacity-5 z-50 border ${menuDropdownBorderClass}`}>
            <div className="py-1" role="menu" aria-orientation="vertical">
              {renderMenuItems(true)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 flex-wrap gap-2">
      <ToolbarButton 
        onClick={onToggleMainView}
        className="!bg-[var(--bv-accent-secondary)] !text-[var(--bv-accent-secondary-content)]"
        title={currentMainView === 'editor' ? "Open Profiles Gallery" : "Back to Script Editor"}
      >
        {currentMainView === 'editor' ? '🖼️ Gallery' : '✏️ Editor'}
      </ToolbarButton>

      <div ref={jsonMenuRef} className="relative">
        <ToolbarButton onClick={() => setIsJsonMenuOpen(p => !p)} className={`${menuButtonSharedClass} ${menuButtonTextClass}`} aria-haspopup="true" aria-expanded={isJsonMenuOpen}>
          JSON Menu ▾
        </ToolbarButton>
        {isJsonMenuOpen && (
          <div className={`absolute top-full left-0 mt-2 w-full min-w-max rounded-md shadow-lg ${menuDropdownBgClass} ring-1 ring-black ring-opacity-5 z-50 border ${menuDropdownBorderClass}`}>
            <div className="py-1" role="menu" aria-orientation="vertical">
              {renderMenuItems(true).props.children.slice(1,3)}
            </div>
          </div>
        )}
      </div>

      <div ref={scriptMenuRef} className="relative">
        <ToolbarButton onClick={() => setIsScriptMenuOpen(p => !p)} className={`${menuButtonSharedClass} ${menuButtonTextClass}`} aria-haspopup="true" aria-expanded={isScriptMenuOpen}>
          Script Menu ▾
        </ToolbarButton>
        {isScriptMenuOpen && (
          <div className={`absolute top-full left-0 mt-2 w-full min-w-max rounded-md shadow-lg ${menuDropdownBgClass} ring-1 ring-black ring-opacity-5 z-50 border ${menuDropdownBorderClass}`}>
            <div className="py-1" role="menu" aria-orientation="vertical">
              {renderMenuItems(true).props.children.slice(3,5)}
            </div>
          </div>
        )}
      </div>
      
      {/* Standalone buttons for non-mobile */}
      {renderMenuItems(false).props.children.slice(5)}
    </div>
  );
};

export default Toolbar;
