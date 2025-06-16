
import React, { useState, useRef, useLayoutEffect } from 'react';
import FileInput from './FileInput';
import { MainViewMode, ThemeKey } from '../types'; // Updated Theme type

interface ToolbarProps {
  onExportJson: () => void;
  onImportJson: (files: FileList) => void; 
  onExportPng: () => void;
  onToggleLegacyTheme: () => void; // Renamed from onToggleTheme
  currentActiveThemeKey: ThemeKey; // Updated from currentTheme
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


const Toolbar: React.FC<ToolbarProps> = ({ 
  onExportJson, 
  onImportJson, 
  onExportPng, 
  onToggleLegacyTheme, 
  currentActiveThemeKey,
  currentMainView,
  onToggleMainView,
  onSaveScript,
  onSaveAllChangedScripts,
  onShowTutorial
}) => {
  const [isJsonMenuOpen, setIsJsonMenuOpen] = useState(false);
  const jsonMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [jsonDropdownWidth, setJsonDropdownWidth] = useState<number | null>(null);

  const [isScriptMenuOpen, setIsScriptMenuOpen] = useState(false);
  const scriptMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [scriptMenuDropdownWidth, setScriptMenuDropdownWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (isJsonMenuOpen && jsonMenuButtonRef.current) {
      setJsonDropdownWidth(jsonMenuButtonRef.current.offsetWidth);
    }
  }, [isJsonMenuOpen]);

  useLayoutEffect(() => {
    if (isScriptMenuOpen && scriptMenuButtonRef.current) {
      setScriptMenuDropdownWidth(scriptMenuButtonRef.current.offsetWidth);
    }
  }, [isScriptMenuOpen]);

  const handleJsonFileChange = (files: FileList | null) => { 
    if (files && files.length > 0) {
      onImportJson(files);
      setIsJsonMenuOpen(false);
    }
  };
  
  const getThemeIcon = () => {
    // This icon can represent the current active theme, including 'custom'
    if (currentActiveThemeKey === 'light') return '☀️'; 
    if (currentActiveThemeKey === 'dark') return '🌙'; 
    if (currentActiveThemeKey === 'custom') return '🎨'; // Icon for custom theme
    return '🍌'; // Default for banana or others
  };

  const menuButtonSharedClass = `bg-[var(--bv-toolbar-button-background,var(--bv-element-background))] 
                               hover:bg-[var(--bv-toolbar-button-hover-background,var(--bv-element-background-secondary))]`;
  const menuButtonTextClass = `text-[var(--bv-toolbar-text,var(--bv-text-primary))]`;
  const menuDropdownBgClass = `bg-[var(--bv-modal-background,var(--bv-element-background))]`;
  const menuDropdownBorderClass = `border-[var(--bv-border-color)]`;
  const menuItemHoverStyle = `hover:!bg-[var(--bv-accent-primary)] hover:!text-[var(--bv-accent-primary-content)]`;


  return (
    <div className="flex items-center space-x-2 flex-wrap gap-2">
      <ToolbarButton 
        onClick={onToggleMainView}
        className="!bg-[var(--bv-accent-secondary)] !text-[var(--bv-accent-secondary-content)]"
        title={currentMainView === 'editor' ? "Open Profiles Gallery" : "Back to Script Editor"}
      >
        {currentMainView === 'editor' ? '🖼️ Gallery' : '✏️ Editor'}
      </ToolbarButton>

      <div 
        className="relative"
        onMouseEnter={() => setIsJsonMenuOpen(true)}
        onMouseLeave={() => setIsJsonMenuOpen(false)}
      >
        <ToolbarButton 
            ref={jsonMenuButtonRef}
            className={`${menuButtonSharedClass} ${menuButtonTextClass}`}
            aria-haspopup="true"
            aria-expanded={isJsonMenuOpen}
        >
          JSON Menu ▾
        </ToolbarButton>
        {isJsonMenuOpen && (
          <div 
            className={`absolute top-full left-0 rounded-md shadow-lg ${menuDropdownBgClass} ring-1 ring-black ring-opacity-5 z-50 border ${menuDropdownBorderClass}`}
            style={{ width: jsonDropdownWidth ? `${jsonDropdownWidth}px` : 'auto' }}
          >
            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="json-menu-button">
              <FileInput 
                onChange={handleJsonFileChange} 
                accept=".json"
                buttonLabel="Import JSON"
                buttonClassName={`w-full text-left px-4 py-2 text-sm font-medium transition-colors 
                                ${menuButtonTextClass} ${menuItemHoverStyle}
                                block disabled:opacity-50 disabled:cursor-not-allowed`}
                multiple={false} 
              />
              <ToolbarButton 
                onClick={() => { onExportJson(); setIsJsonMenuOpen(false); }}
                className={`w-full text-left block !rounded-none
                            !px-4 !py-2 !text-sm !font-medium !transition-colors
                            !bg-transparent ${menuButtonTextClass} ${menuItemHoverStyle}`}
                role="menuitem"
              >
                Export JSON
              </ToolbarButton>
            </div>
          </div>
        )}
      </div>

      <div 
        className="relative"
        onMouseEnter={() => setIsScriptMenuOpen(true)}
        onMouseLeave={() => setIsScriptMenuOpen(false)}
      >
        <ToolbarButton 
            ref={scriptMenuButtonRef}
            className={`${menuButtonSharedClass} ${menuButtonTextClass}`}
            aria-haspopup="true"
            aria-expanded={isScriptMenuOpen}
        >
          Script Menu ▾
        </ToolbarButton>
        {isScriptMenuOpen && (
          <div 
            className={`absolute top-full left-0 rounded-md shadow-lg ${menuDropdownBgClass} ring-1 ring-black ring-opacity-5 z-50 border ${menuDropdownBorderClass}`}
            style={{ width: scriptMenuDropdownWidth ? `${scriptMenuDropdownWidth}px` : 'auto' }}
          >
            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="script-menu-button">
              <ToolbarButton 
                onClick={() => { onSaveScript(); setIsScriptMenuOpen(false); }}
                className={`w-full text-left block !rounded-none
                            !px-4 !py-2 !text-sm !font-medium !transition-colors
                            !bg-transparent ${menuButtonTextClass} ${menuItemHoverStyle}`}
                role="menuitem"
              >
                Save Active Script
              </ToolbarButton>
              <ToolbarButton 
                onClick={() => { onSaveAllChangedScripts(); setIsScriptMenuOpen(false); }}
                className={`w-full text-left block !rounded-none
                            !px-4 !py-2 !text-sm !font-medium !transition-colors
                            !bg-transparent ${menuButtonTextClass} ${menuItemHoverStyle}`}
                role="menuitem"
              >
                Save All Changed
              </ToolbarButton>
            </div>
          </div>
        )}
      </div>
      
      <ToolbarButton onClick={onExportPng}>Export PNG</ToolbarButton>
      <ToolbarButton 
        onClick={onToggleLegacyTheme} 
        title={`Cycle Theme (Current: ${currentActiveThemeKey.charAt(0).toUpperCase() + currentActiveThemeKey.slice(1)})`}
      >
        {getThemeIcon()}
      </ToolbarButton>
      <ToolbarButton 
        onClick={onShowTutorial} 
        title="Show Tutorial"
        className="!p-2.5" // Adjust padding for icon button
        aria-label="Show tutorial"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4 0 .863-.27 1.66-.744 2.26l-2.432 2.432c-.34.341-.742.614-1.17.793V16m0-6V8m0 2c-.933 0-1.75.253-2.432.678A5.964 5.964 0 005 14c0 .995.297 1.916.805 2.678m11.39-4.856A5.962 5.962 0 0119 14c0 .178-.01.355-.028.53A5.964 5.964 0 0019 14c0-1.807-.98-3.374-2.432-4.178M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </ToolbarButton>
    </div>
  );
};

export default Toolbar;
