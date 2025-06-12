
import React, {useState, useEffect, useCallback} from 'react';
import { AppSettings, Block, NestedAppSettingsObjectKeys, ScriptFile } from '../types';
import { FindScope, FindResultSummaryItem } from '../App';
import { AVAILABLE_FONTS } from '../constants';
import FileInput from './FileInput';
import InputWithSlider from './InputWithSlider';
import FindReplacePanel from './FindReplacePanel';

type ViewMode = 'single' | 'all';

interface ControlsPanelProps {
  settings: AppSettings;
  onSettingsChange: <K extends keyof AppSettings, V extends AppSettings[K]>(key: K, value: V) => void;
  onNestedSettingsChange: <
    ParentK extends NestedAppSettingsObjectKeys,
    ChildK extends keyof AppSettings[ParentK],
    V extends AppSettings[ParentK][ChildK]
  >(
    parentKey: ParentK,
    childKey: ChildK,
    value: V
  ) => void;
  onTextFileUpload: (files: FileList) => void;
  mainScripts: ScriptFile[];
  activeMainScriptId: string | null;
  onSetActiveMainScriptId: (id: string | null) => void;
  onClearMainScripts: () => void;
  activeScriptBlocks: Block[];
  currentBlockIndex: number | null;
  onSetCurrentBlockIndex: (index: number | null) => void;
  showOnlyOverflowingBlocks: boolean;
  onShowOnlyOverflowingBlocksChange: (show: boolean) => void;
  displayedBlocksForView: Block[];
  onLoadCustomFont: (file: File, desiredCssName: string) => void;
  loadedCustomFontName: string | null;
  overflowSettingsPanelOpen: boolean;
  onToggleOverflowSettingsPanel: () => void;
  originalScripts: ScriptFile[];
  onOriginalScriptUpload: (files: FileList) => void;
  matchedOriginalScriptName: string | null;
  onClearOriginalScripts: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  findText: string;
  onFindTextChange: (text: string) => void;
  replaceText: string;
  onReplaceTextChange: (text: string) => void;
  findIsCaseSensitive: boolean;
  onFindIsCaseSensitiveChange: (value: boolean) => void;
  findMatchWholeWord: boolean;
  onFindMatchWholeWordChange: (value: boolean) => void;
  findScope: FindScope;
  onFindScopeChange: (scope: FindScope) => void;
  onFindNext: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  findResultsMessage: string;
  isFindCurrentBlockDisabled: boolean;
  findResultSummary: FindResultSummaryItem[];
  onNavigateToFindResult: (item: FindResultSummaryItem) => void;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  id?: string;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

const DraggableSectionWrapper: React.FC<React.PropsWithChildren<{
  draggable: boolean;
  onDragStart?: React.DragEventHandler<HTMLDivElement>;
  onDragEnter?: React.DragEventHandler<HTMLDivElement>;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
  onDragLeave?: React.DragEventHandler<HTMLDivElement>;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
  onDragEnd?: React.DragEventHandler<HTMLDivElement>;
  isDragging?: boolean;
  isDragOver?: boolean;
}>> = ({ children, draggable, isDragging, isDragOver, ...dragProps }) => {
  return (
    <div
      draggable={draggable}
      onDragStart={dragProps.onDragStart}
      onDragEnter={dragProps.onDragEnter}
      onDragOver={dragProps.onDragOver}
      onDragLeave={dragProps.onDragLeave}
      onDrop={dragProps.onDrop}
      onDragEnd={dragProps.onDragEnd}
      className={`
        draggable-section-wrapper
        transition-all duration-150 ease-in-out
        ${isDragging ? 'opacity-50 scale-98 shadow-2xl' : 'opacity-100 scale-100'}
        ${isDragOver ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-yellow-100 dark:ring-offset-gray-800' : ''}
        my-1 rounded-lg
      `}
    >
      {children}
    </div>
  );
};

export const Section: React.FC<SectionProps> = ({ title, children, isOpen, onToggle, id, dragHandleProps }) => {
  return (
    <div className="mb-4 p-3 border border-yellow-400 dark:border-yellow-600 rounded-lg bg-yellow-50 dark:bg-gray-800 shadow-sm" id={id}>
      <div className="flex justify-between items-center mb-2">
        <button
          className="text-lg font-semibold text-yellow-700 dark:text-yellow-300 w-full text-left flex items-center"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={id ? `${id}-content` : undefined}
        >
          <span {...dragHandleProps} className="cursor-grab mr-2 text-yellow-500 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-200" title="Drag to reorder section">☰</span>
          {title}
        </button>
        <button
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={id ? `${id}-content` : undefined}
          className="text-yellow-700 dark:text-yellow-300"
        >
          <span>{isOpen ? '▲' : '▼'}</span>
        </button>
      </div>
      {isOpen && <div id={id ? `${id}-content` : undefined} className="space-y-1 mt-1">{children}</div>}
    </div>
  );
};


export const LabelInputContainer: React.FC<{ label: string; htmlFor?: string; children: React.ReactNode; inline?: boolean; subText?: string; disabled?: boolean; }> = ({ label, htmlFor, children, inline, subText, disabled }) => (
  <div className={`flex ${inline ? 'items-center justify-between' : 'flex-col'} gap-1 py-1 ${disabled ? 'opacity-50' : ''}`}>
    <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 dark:text-gray-300 ${disabled ? 'cursor-not-allowed' : ''}`}>
      {label}
    </label>
    {children}
    {subText && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subText}</p>}
  </div>
);

export const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`mt-1 block w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm dark:bg-gray-700 dark:text-gray-200 ${props.disabled ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''} ${props.className || ''}`}
  />
);

export const TextAreaInput: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    className={`mt-1 block w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm dark:bg-gray-700 dark:text-gray-200 resize-y ${props.className || ''}`}
  />
);


export const SelectInput: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
   <select
    {...props}
    className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-gray-200 ${props.className || ''}`}
  />
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
    <button
        {...props}
        className={`px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 dark:bg-yellow-600 dark:hover:bg-yellow-700 dark:text-gray-900 ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${props.className || ''}`}
    >
        {children}
    </button>
);


interface PanelSectionItem {
  id: string;
  title: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
}

const ControlsPanel: React.FC<ControlsPanelProps> = (props) => {
  const {
    settings, onSettingsChange, onNestedSettingsChange,
    onTextFileUpload,
    mainScripts, activeMainScriptId, onSetActiveMainScriptId, onClearMainScripts,
    activeScriptBlocks, currentBlockIndex, onSetCurrentBlockIndex,
    showOnlyOverflowingBlocks, onShowOnlyOverflowingBlocksChange,
    displayedBlocksForView,
    onLoadCustomFont, loadedCustomFontName,
    overflowSettingsPanelOpen, onToggleOverflowSettingsPanel,
    originalScripts, onOriginalScriptUpload, matchedOriginalScriptName, onClearOriginalScripts,
    viewMode, onViewModeChange,
    findText, onFindTextChange, replaceText, onReplaceTextChange,
    findIsCaseSensitive, onFindIsCaseSensitiveChange, findMatchWholeWord, onFindMatchWholeWordChange,
    findScope, onFindScopeChange, onFindNext, onReplace, onReplaceAll, findResultsMessage,
    isFindCurrentBlockDisabled, findResultSummary, onNavigateToFindResult
  } = props;

  const [customFontFile, setCustomFontFile] = useState<File | null>(null);
  const [customFontCssNameInput, setCustomFontCssNameInput] = useState<string>("");

  useEffect(() => {
    if (loadedCustomFontName && settings.systemFont.fontFamily === loadedCustomFontName) {
      setCustomFontCssNameInput(loadedCustomFontName);
    } else if (settings.systemFont.fontFamily === "Custom...") {
        if (!customFontFile) setCustomFontCssNameInput("");
    }
  }, [settings.systemFont.fontFamily, loadedCustomFontName, customFontFile]);

  const handlePrimaryBgImageUpload = (files: FileList) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => onSettingsChange('backgroundImageUrl', reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSecondaryBgImageUpload = (files: FileList) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => onSettingsChange('secondaryBackgroundImageUrl', reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleBitmapFontImageUpload = (files: FileList) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => onNestedSettingsChange('bitmapFont', 'imageUrl', reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleBlockSeparatorsChange = (value: string) => {
    onSettingsChange('blockSeparators', value.split(',').map(s => s.trim()).filter(s => s.length > 0));
  };

  const handleTagPatternsChange = (value: string) => {
    onSettingsChange('tagPatternsToHide', value.split('\n').map(s => s.trim()).filter(s => s.length > 0));
  };

  const handleFontFileSelected = (files: FileList) => {
    if (files && files.length > 0) {
      const file = files[0];
      setCustomFontFile(file);
      if (!customFontCssNameInput.trim()) {
        const fileNameWithoutExtension = file.name.split('.').slice(0, -1).join('.');
        setCustomFontCssNameInput(fileNameWithoutExtension || "My Custom Font");
      }
    }
  };

  const handleLoadCustomFontClick = () => {
    if (customFontFile && customFontCssNameInput.trim()) {
      onLoadCustomFont(customFontFile, customFontCssNameInput.trim());
    } else {
      alert("Please select a font file and provide a CSS name.");
    }
  };

  const showCustomFontLoadUI = settings.currentFontType === 'system' &&
                               (settings.systemFont.fontFamily === "Custom..." ||
                               (loadedCustomFontName && settings.systemFont.fontFamily === loadedCustomFontName));
  
  const activeMainScriptName = mainScripts.find(s => s.id === activeMainScriptId)?.name || null;
  const isFindReplaceDisabled = mainScripts.length === 0;

  const getPanelSectionsConfig = useCallback((currentProps: ControlsPanelProps): PanelSectionItem[] => {
    const { settings, onSettingsChange, onNestedSettingsChange, ...restOfProps } = currentProps; // Destructure to avoid stale closures

    return [
      {
        id: 'script-management-section', title: 'Script Management', defaultOpen: true, content: (
          <>
            <LabelInputContainer label="Upload Main Script(s) (.txt, .scp, etc.)">
              <FileInput accept=".txt,.scp,.text,text/plain" onChange={restOfProps.onTextFileUpload} buttonLabel="Load Main Script(s)" multiple />
            </LabelInputContainer>
            {restOfProps.mainScripts.length > 0 && (
              <Button onClick={restOfProps.onClearMainScripts} className="text-xs mt-1 !py-1 !px-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 w-full">
                Clear All Main Scripts ({restOfProps.mainScripts.length} loaded)
              </Button>
            )}
            <div className="mt-3 pt-3 border-t border-yellow-300 dark:border-gray-600">
              <LabelInputContainer label="Upload Original Script(s) (for Comparison)">
                <FileInput accept=".txt,.scp,.text,text/plain" onChange={restOfProps.onOriginalScriptUpload} buttonLabel="Load Original Script(s)" multiple />
              </LabelInputContainer>
              {restOfProps.originalScripts.length > 0 && (
                <Button onClick={restOfProps.onClearOriginalScripts} className="text-xs mt-1 !py-1 !px-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 w-full">
                  Clear All Original Scripts ({restOfProps.originalScripts.length} loaded)
                </Button>
              )}
              {restOfProps.matchedOriginalScriptName && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Comparing with: <span className="font-semibold">{restOfProps.matchedOriginalScriptName}</span>
                </p>
              )}
            </div>
            <LabelInputContainer label="Use Custom Block Separators (for new uploads)" htmlFor="useCustomBlockSeparator" inline>
              <input type="checkbox" id="useCustomBlockSeparator" checked={settings.useCustomBlockSeparator} onChange={(e) => onSettingsChange('useCustomBlockSeparator', e.target.checked)} className="h-5 w-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400" />
            </LabelInputContainer>
            {settings.useCustomBlockSeparator && (
              <LabelInputContainer label="Block Separators (comma-separated)" htmlFor="blockSeparators">
                <TextInput id="blockSeparators" value={settings.blockSeparators.join(',')} onChange={(e) => handleBlockSeparatorsChange(e.target.value)} placeholder="e.g. <PAGE>,[END]" />
              </LabelInputContainer>
            )}
            <LabelInputContainer label="Enable Comparison Mode" htmlFor="comparisonModeEnabled" inline disabled={restOfProps.mainScripts.length === 0 || restOfProps.originalScripts.length === 0} subText={(restOfProps.mainScripts.length === 0 || restOfProps.originalScripts.length === 0) ? "Load at least one main and one original script." : "View original and edited text side-by-side."}>
              <input type="checkbox" id="comparisonModeEnabled" checked={settings.comparisonModeEnabled} onChange={(e) => onSettingsChange('comparisonModeEnabled', e.target.checked)} className="h-5 w-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400" disabled={restOfProps.mainScripts.length === 0 || restOfProps.originalScripts.length === 0} />
            </LabelInputContainer>
            <div className="mt-3 pt-3 border-t border-yellow-300 dark:border-gray-600">
              <LabelInputContainer label="View Mode" htmlFor="viewModeDropdown" disabled={restOfProps.mainScripts.length === 0} subText={restOfProps.mainScripts.length === 0 ? "Load a script to change view mode." : "Choose how to display blocks for the active script."}>
                <SelectInput id="viewModeDropdown" value={restOfProps.viewMode} onChange={(e) => restOfProps.onViewModeChange(e.target.value as ViewMode)} disabled={restOfProps.mainScripts.length === 0} className={restOfProps.mainScripts.length === 0 ? 'cursor-not-allowed' : ''}>
                  <option value="single">Single Block View</option>
                  <option value="all">All Blocks View</option>
                </SelectInput>
              </LabelInputContainer>
            </div>
          </>
        )
      },
      {
        id: 'loaded-main-scripts-section', title: 'Loaded Main Scripts', defaultOpen: true, content: (
          <>
            {mainScripts.length === 0 ? <p className="text-xs text-gray-500 dark:text-gray-400">No main scripts loaded.</p> :
            (<>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Active Script: <span className="font-semibold">{activeMainScriptName || "None Selected"}</span>
              </p>
              <div className="max-h-48 overflow-y-auto border dark:border-gray-700 rounded p-1 space-y-1 mt-1">
                  {mainScripts.map((script) => (
                      <button key={script.id} onClick={() => onSetActiveMainScriptId(script.id)}
                          className={`block w-full text-left p-1.5 rounded text-sm transition-colors duration-150 truncate ${activeMainScriptId === script.id ? 'bg-yellow-400 text-yellow-950 dark:bg-yellow-500 dark:text-yellow-50 font-semibold' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-yellow-200 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-100'}`}
                          title={script.name} >
                          {script.name} ({script.blocks.length} blocks)
                      </button>
                  ))}
              </div>
            </>)}
          </>
        )
      },
      {
        id: 'block-navigation-section', title: 'Block Navigation (Active Script)', defaultOpen: true, content: (
          <>
            {!(activeMainScriptId && activeScriptBlocks.length > 0 && viewMode === 'single') ? <p className="text-xs text-gray-500 dark:text-gray-400">Block navigation is available in "Single Block View" with an active script and blocks.</p> :
            (<>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-700 dark:text-gray-300"> Block: {currentBlockIndex !== null ? currentBlockIndex + 1 : '-'} / {activeScriptBlocks.length} {showOnlyOverflowingBlocks && ` (Showing ${displayedBlocksForView.length} overflowing)`}</span>
                <div className="space-x-1">
                  <button onClick={() => { if (currentBlockIndex === null) return; const currentDisplayedIdx = displayedBlocksForView.findIndex(b => b.index === currentBlockIndex); if (currentDisplayedIdx > 0) { onSetCurrentBlockIndex(displayedBlocksForView[currentDisplayedIdx - 1].index); } else if (currentDisplayedIdx === -1 && currentBlockIndex > 0) { let prevActualIdx = currentBlockIndex - 1; while(prevActualIdx >= 0 && showOnlyOverflowingBlocks && !activeScriptBlocks[prevActualIdx].isOverflowing) { prevActualIdx--; } if(prevActualIdx >=0) onSetCurrentBlockIndex(prevActualIdx); } }} disabled={currentBlockIndex === null || (showOnlyOverflowingBlocks ? displayedBlocksForView.findIndex(b => b.index === currentBlockIndex) <= 0 : currentBlockIndex <=0)} className="px-2 py-1 text-xs rounded bg-yellow-400 hover:bg-yellow-500 text-yellow-950 disabled:opacity-50" >Prev</button>
                  <button onClick={() => { if (currentBlockIndex === null) return; const currentDisplayedIdx = displayedBlocksForView.findIndex(b => b.index === currentBlockIndex); if (currentDisplayedIdx !== -1 && currentDisplayedIdx < displayedBlocksForView.length - 1) { onSetCurrentBlockIndex(displayedBlocksForView[currentDisplayedIdx + 1].index); } else if (currentDisplayedIdx === -1 && currentBlockIndex < activeScriptBlocks.length -1) { let nextActualIdx = currentBlockIndex + 1; while(nextActualIdx < activeScriptBlocks.length && showOnlyOverflowingBlocks && !activeScriptBlocks[nextActualIdx].isOverflowing) { nextActualIdx++; } if(nextActualIdx < activeScriptBlocks.length) onSetCurrentBlockIndex(nextActualIdx); } }} disabled={currentBlockIndex === null || (showOnlyOverflowingBlocks ? displayedBlocksForView.findIndex(b => b.index === currentBlockIndex) >= displayedBlocksForView.length -1 : currentBlockIndex >= activeScriptBlocks.length -1)} className="px-2 py-1 text-xs rounded bg-yellow-400 hover:bg-yellow-500 text-yellow-950 disabled:opacity-50" >Next</button>
                </div>
              </div>
              <LabelInputContainer label="Show Only Overflowing Blocks" htmlFor="showOnlyOverflow" inline><input type="checkbox" id="showOnlyOverflow" checked={showOnlyOverflowingBlocks} onChange={(e) => onShowOnlyOverflowingBlocksChange(e.target.checked)} className="h-5 w-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400" /></LabelInputContainer>
              <div className="max-h-60 overflow-y-auto border dark:border-gray-700 rounded p-1 space-y-1 mt-2">
                {displayedBlocksForView.map((block) => (<button key={block.index} onClick={() => onSetCurrentBlockIndex(block.index)} className={`block w-full text-left p-1.5 rounded text-sm transition-colors duration-150 truncate ${currentBlockIndex === block.index ? 'bg-yellow-400 text-yellow-950 dark:bg-yellow-500 dark:text-yellow-50 font-semibold' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-yellow-200 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-100'} ${block.isOverflowing ? 'border-l-4 border-red-500 pl-2' : 'pl-3'}`} title={block.content.substring(0,100) + (block.content.length > 100 ? '...' : '')} > Block {block.index + 1}{block.isOverflowing ? ' (Overflow!)' : ''} </button> ))}
                {displayedBlocksForView.length === 0 && activeScriptBlocks.length > 0 && (<p className="text-center text-xs text-gray-500 dark:text-gray-400 p-2">No blocks match filter.</p>)}
              </div>
            </>)}
          </>
        )
      },
      {
        id: 'find-replace-section', title: 'Find and Replace', defaultOpen: false, content: (
          <FindReplacePanel
            findText={findText} onFindTextChange={onFindTextChange}
            replaceText={replaceText} onReplaceTextChange={onReplaceTextChange}
            isCaseSensitive={findIsCaseSensitive} onIsCaseSensitiveChange={onFindIsCaseSensitiveChange}
            matchWholeWord={findMatchWholeWord} onMatchWholeWordChange={onFindMatchWholeWordChange}
            scope={findScope} onScopeChange={onFindScopeChange}
            onFindNext={onFindNext} onReplace={onReplace} onReplaceAll={onReplaceAll}
            resultsMessage={findResultsMessage} isCurrentBlockScopeDisabled={isFindCurrentBlockDisabled}
            isFindReplaceDisabled={isFindReplaceDisabled} findResultSummary={findResultSummary}
            onNavigateToFindResult={onNavigateToFindResult}
          />
        )
      },
      {
        id: 'preview-area-settings-section', title: 'Preview Area', defaultOpen: false, content: (
          <>
            <InputWithSlider label="Width" unit="px" id="previewWidth" value={settings.previewWidth} onChange={(val) => onSettingsChange('previewWidth', val)} min={0} max={1280} step={10} subText={settings.previewWidth === 0 ? "Width auto (overflow based on content)" : undefined} />
            <InputWithSlider label="Height" unit="px" id="previewHeight" value={settings.previewHeight} onChange={(val) => onSettingsChange('previewHeight', val)} min={0} max={1024} step={10} subText={settings.previewHeight === 0 ? "Height auto (overflow based on content or Max Content Height)" : undefined} />
            <InputWithSlider label="Preview Zoom" unit="x" id="previewZoom" value={settings.previewZoom} onChange={(val) => onSettingsChange('previewZoom', val)} min={0.25} max={4} step={0.05} subText="Visually scales the entire preview area." />
            <LabelInputContainer label="Background Color" htmlFor="bgColor"><TextInput type="color" id="bgColor" value={settings.backgroundColor} onChange={(e) => onSettingsChange('backgroundColor', e.target.value)} className="h-10 w-full" /></LabelInputContainer>
            <LabelInputContainer label="Primary Background Image"><FileInput accept="image/*" onChange={handlePrimaryBgImageUpload} />{settings.backgroundImageUrl && (<button onClick={() => onSettingsChange('backgroundImageUrl', null)} className="mt-1 text-xs text-red-500 hover:text-red-700">Remove Primary Image</button>)}</LabelInputContainer>
            <LabelInputContainer label="Secondary Background Image"><FileInput accept="image/*" onChange={handleSecondaryBgImageUpload} />{settings.secondaryBackgroundImageUrl && (<button onClick={() => onSettingsChange('secondaryBackgroundImageUrl', null)} className="mt-1 text-xs text-red-500 hover:text-red-700">Remove Secondary Image</button>)}</LabelInputContainer>
            <LabelInputContainer label="Show Secondary Background" htmlFor="showSecondaryBg" inline disabled={!settings.secondaryBackgroundImageUrl} subText={!settings.secondaryBackgroundImageUrl ? "Load a secondary image first." : ""}><input type="checkbox" id="showSecondaryBg" checked={settings.showSecondaryBackgroundImage} onChange={(e) => onSettingsChange('showSecondaryBackgroundImage', e.target.checked)} className="h-5 w-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400" disabled={!settings.secondaryBackgroundImageUrl} /></LabelInputContainer>
          </>
        )
      },
      {
        id: 'overflow-settings-section', title: 'Overflow Settings', defaultOpen: currentProps.overflowSettingsPanelOpen, content: ( // Use prop for defaultOpen here
          <>
            <LabelInputContainer label="Overflow Detection Method" htmlFor="overflowDetectionMode">
              <SelectInput id="overflowDetectionMode" value={settings.overflowDetectionMode} onChange={(e) => onSettingsChange('overflowDetectionMode', e.target.value as 'pixel' | 'character')}>
                <option value="pixel">Pixel Based</option>
                <option value="character">Character Based</option>
              </SelectInput>
            </LabelInputContainer>
            {settings.overflowDetectionMode === 'pixel' && (
              <>
                <LabelInputContainer label="Use Margin-Based Overflow" htmlFor="enablePixelMargins" inline><input type="checkbox" id="enablePixelMargins" checked={settings.pixelOverflowMargins.enabled} onChange={(e) => onNestedSettingsChange('pixelOverflowMargins', 'enabled', e.target.checked)} className="h-5 w-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400" /></LabelInputContainer>
                <InputWithSlider label="Max Content Height (for Auto Preview)" unit="px" id="maxPixelHeight" value={settings.maxPixelHeight} onChange={(val) => onSettingsChange('maxPixelHeight', val)} min={0} max={2048} step={1} subText={settings.pixelOverflowMargins.enabled ? "Disabled when Margin-Based Overflow is active." : "Used if 'Preview Height' is 0 (auto) and Margin-Based is off."} disabled={settings.pixelOverflowMargins.enabled} />
                {settings.pixelOverflowMargins.enabled && (
                  <div className="mt-2 pt-2 border-t border-yellow-300 dark:border-gray-600">
                    <InputWithSlider label="Top Margin" unit="px" id="pixelMarginTop" value={settings.pixelOverflowMargins.top} onChange={(val) => onNestedSettingsChange('pixelOverflowMargins', 'top', val)} min={0} max={512} step={1} subText={settings.previewHeight === 0 ? "Preview Height is auto, Top Margin ignored." : "From top edge of Preview Area."} disabled={settings.previewHeight === 0} />
                    <InputWithSlider label="Right Margin" unit="px" id="pixelMarginRight" value={settings.pixelOverflowMargins.right} onChange={(val) => onNestedSettingsChange('pixelOverflowMargins', 'right', val)} min={0} max={512} step={1} subText={settings.previewWidth === 0 ? "Preview Width is auto, Right Margin ignored." : "From right edge of Preview Area."} disabled={settings.previewWidth === 0} />
                    <InputWithSlider label="Bottom Margin" unit="px" id="pixelMarginBottom" value={settings.pixelOverflowMargins.bottom} onChange={(val) => onNestedSettingsChange('pixelOverflowMargins', 'bottom', val)} min={0} max={512} step={1} subText={settings.previewHeight === 0 ? "Preview Height is auto, Bottom Margin ignored." : "From bottom edge of Preview Area."} disabled={settings.previewHeight === 0} />
                    <InputWithSlider label="Left Margin" unit="px" id="pixelMarginLeft" value={settings.pixelOverflowMargins.left} onChange={(val) => onNestedSettingsChange('pixelOverflowMargins', 'left', val)} min={0} max={512} step={1} subText={settings.previewWidth === 0 ? "Preview Width is auto, Left Margin ignored." : "From left edge of Preview Area."} disabled={settings.previewWidth === 0} />
                  </div>
                )}
              </>
            )}
            {settings.overflowDetectionMode === 'character' && (
              <InputWithSlider label="Max Characters Per Line" unit="chars" id="maxCharacters" value={settings.maxCharacters} onChange={(val) => onSettingsChange('maxCharacters', val)} min={0} max={10000} step={1} subText={settings.maxCharacters === 0 ? "No character limit." : "Applies to the longest line. Tags & block separators are not counted."} />
            )}
          </>
        )
      },
      {
        id: 'tag-handling-section', title: 'Tag Handling', defaultOpen: false, content: (
          <>
            <LabelInputContainer label="Hide Tags in Preview" htmlFor="hideTagsInPreview" inline><input type="checkbox" id="hideTagsInPreview" checked={settings.hideTagsInPreview} onChange={(e) => onSettingsChange('hideTagsInPreview', e.target.checked)} className="h-5 w-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400" /></LabelInputContainer>
            <LabelInputContainer label="Tag Patterns to Hide:" htmlFor="tagPatternsToHide" subText="Enter RegEx patterns, one per line. Applied if 'Hide Tags' is enabled.">
              <TextAreaInput id="tagPatternsToHide" value={settings.tagPatternsToHide.join('\n')} onChange={(e) => handleTagPatternsChange(e.target.value)} rows={3} placeholder="e.g. <[^>]*>\n\\[[^\\]]*\\]" />
            </LabelInputContainer>
          </>
        )
      },
      {
        id: 'text-position-scale-section', title: 'Text Position & Scale', defaultOpen: true, content: (
          <>
            <InputWithSlider label="Text X Position" unit="px" id="textPositionX" value={settings.transform.positionX} onChange={(val) => onNestedSettingsChange('transform', 'positionX', val)} min={-500} max={500} step={1} />
            <InputWithSlider label="Text Y Position" unit="px" id="textPositionY" value={settings.transform.positionY} onChange={(val) => onNestedSettingsChange('transform', 'positionY', val)} min={-500} max={500} step={1} />
            <InputWithSlider label="Scale X" unit="x" id="textScaleX" value={settings.transform.scaleX} onChange={(val) => onNestedSettingsChange('transform', 'scaleX', val)} min={0.1} max={10} step={0.05} />
            <InputWithSlider label="Scale Y" unit="x" id="textScaleY" value={settings.transform.scaleY} onChange={(val) => onNestedSettingsChange('transform', 'scaleY', val)} min={0.1} max={10} step={0.05} />
            <LabelInputContainer label="Horizontal Align" htmlFor="textAlignHorizontal">
              <SelectInput id="textAlignHorizontal" value={settings.systemFont.textAlignHorizontal} onChange={(e) => onNestedSettingsChange('systemFont', 'textAlignHorizontal', e.target.value as 'left' | 'center' | 'right')}>
                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
              </SelectInput>
            </LabelInputContainer>
            <LabelInputContainer label="Vertical Align" htmlFor="textAlignVertical">
              <SelectInput id="textAlignVertical" value={settings.systemFont.textAlignVertical} onChange={(e) => onNestedSettingsChange('systemFont', 'textAlignVertical', e.target.value as 'top' | 'middle' | 'bottom')}>
                <option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option>
              </SelectInput>
            </LabelInputContainer>
            <InputWithSlider label="Line Height Factor" unit="factor" id="globalLineHeightFactor" value={settings.globalLineHeightFactor} onChange={(val) => onSettingsChange('globalLineHeightFactor', val)} min={0.5} max={4} step={0.1} subText="Adjusts line spacing for all font types. For bitmap, it's a factor of character height." />
          </>
        )
      },
      {
        id: 'font-type-styling-section', title: 'Font Type & Styling', defaultOpen: true, content: (
          <>
            <LabelInputContainer label="Type" htmlFor="fontType">
              <SelectInput id="fontType" value={settings.currentFontType} onChange={(e) => onSettingsChange('currentFontType', e.target.value as 'system' | 'bitmap')}>
                <option value="system">System Font</option><option value="bitmap">Bitmap Font</option>
              </SelectInput>
            </LabelInputContainer>
            {settings.currentFontType === 'system' && (
              <div className="mt-3 pt-3 border-t border-yellow-300 dark:border-gray-600">
                <h4 className="text-md font-semibold mb-1 text-yellow-600 dark:text-yellow-400">System Font Specifics</h4>
                <LabelInputContainer label="Font Family" htmlFor="fontFamily">
                  <SelectInput id="fontFamily" value={settings.systemFont.fontFamily} onChange={(e) => { const newFontFamily = e.target.value; onNestedSettingsChange('systemFont', 'fontFamily', newFontFamily); if (newFontFamily !== "Custom..." && newFontFamily !== loadedCustomFontName) { setCustomFontFile(null); } else if (newFontFamily === "Custom...") { setCustomFontFile(null); setCustomFontCssNameInput(""); } }}>
                    {AVAILABLE_FONTS.map(font => <option key={font} value={font}>{font.split(',')[0]}</option>)}
                    {loadedCustomFontName && !AVAILABLE_FONTS.includes(loadedCustomFontName) && loadedCustomFontName !== "Custom..." && (<option value={loadedCustomFontName}>{loadedCustomFontName}</option>)}
                    <option value="Custom...">Custom (Load from file)...</option>
                  </SelectInput>
                </LabelInputContainer>
                {showCustomFontLoadUI && (
                  <div className="mt-2 p-2 border border-yellow-300 dark:border-gray-600 rounded-md space-y-2">
                    <LabelInputContainer label="Font File (.ttf, .otf, .woff, .woff2)" htmlFor="customFontFile"><FileInput accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" onChange={handleFontFileSelected} buttonLabel={customFontFile ? `Selected: ${customFontFile.name}` : "Choose Font File"} /></LabelInputContainer>
                    <LabelInputContainer label="Desired CSS Font Name" htmlFor="customFontCssName"><TextInput id="customFontCssName" type="text" placeholder="e.g., My Awesome Font" value={customFontCssNameInput} onChange={(e) => setCustomFontCssNameInput(e.target.value)} /></LabelInputContainer>
                    <Button onClick={handleLoadCustomFontClick} disabled={!customFontFile || !customFontCssNameInput.trim()}>Load Font from File</Button>
                    {customFontFile && <p className="text-xs text-gray-500 dark:text-gray-400">Selected file: {customFontFile.name}</p>}
                  </div>
                )}
                <InputWithSlider label="Font Size" unit="px" id="fontSize" value={settings.systemFont.fontSize} onChange={(val) => onNestedSettingsChange('systemFont', 'fontSize', val)} min={6} max={120} step={1} />
                <LabelInputContainer label="Font Color" htmlFor="fontColor"><TextInput type="color" id="fontColor" value={settings.systemFont.color} onChange={(e) => onNestedSettingsChange('systemFont', 'color', e.target.value)} className="h-10 w-full" /></LabelInputContainer>
                <InputWithSlider label="Letter Spacing" unit="px" id="letterSpacing" value={settings.systemFont.letterSpacing} onChange={(val) => onNestedSettingsChange('systemFont', 'letterSpacing', val)} min={-10} max={30} step={1} />
                <LabelInputContainer label="Bold" htmlFor="fontWeight" inline><input type="checkbox" id="fontWeight" checked={settings.systemFont.fontWeight === 'bold'} onChange={(e) => onNestedSettingsChange('systemFont', 'fontWeight', e.target.checked ? 'bold' : 'normal')} className="h-5 w-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400" /></LabelInputContainer>
              </div>
            )}
            {settings.currentFontType === 'bitmap' && (
              <div className="mt-3 pt-3 border-t border-yellow-300 dark:border-gray-600">
                <h4 className="text-md font-semibold mb-1 text-yellow-600 dark:text-yellow-400">Bitmap Font Specifics</h4>
                <LabelInputContainer label="Font Image"><FileInput accept="image/*" onChange={handleBitmapFontImageUpload} />{settings.bitmapFont.imageUrl && (<button onClick={() => onNestedSettingsChange('bitmapFont', 'imageUrl', null)} className="mt-1 text-xs text-red-500 hover:text-red-700">Remove Image</button>)}</LabelInputContainer>
                <InputWithSlider label="Character Width" unit="px" id="charWidth" value={settings.bitmapFont.charWidth} onChange={(val) => onNestedSettingsChange('bitmapFont', 'charWidth', val)} min={1} max={128} step={1} />
                <InputWithSlider label="Character Height" unit="px" id="charHeight" value={settings.bitmapFont.charHeight} onChange={(val) => onNestedSettingsChange('bitmapFont', 'charHeight', val)} min={1} max={128} step={1} />
                <LabelInputContainer label="Character Map" htmlFor="charMap"><TextInput type="text" id="charMap" value={settings.bitmapFont.charMap} onChange={(e) => onNestedSettingsChange('bitmapFont', 'charMap', e.target.value)} /></LabelInputContainer>
                <InputWithSlider label="Spacing" unit="px" id="bitmapSpacing" value={settings.bitmapFont.spacing} onChange={(val) => onNestedSettingsChange('bitmapFont', 'spacing', val)} min={-10} max={50} step={1} />
                <InputWithSlider label="Zoom" unit="x" id="bitmapZoom" value={settings.bitmapFont.zoom} onChange={(val) => onNestedSettingsChange('bitmapFont', 'zoom', val)} min={0.1} max={16} step={0.1} />
                <InputWithSlider label="Space Width Override" unit="px" id="bitmapSpaceWidthOverride" value={settings.bitmapFont.spaceWidthOverride} onChange={(val) => onNestedSettingsChange('bitmapFont', 'spaceWidthOverride', val)} min={0} max={Math.max(32, settings.bitmapFont.charWidth * 2)} step={1} subText="Custom width for space char. 0 for auto (pixel scan: ~charWidth/4, normal: full charWidth)." disabled={!(settings.currentFontType === 'bitmap' && settings.bitmapFont.enabled)} />
                <LabelInputContainer label="Enable Pixel Scanning" htmlFor="bitmapEnablePixelScanning" inline><input type="checkbox" id="bitmapEnablePixelScanning" checked={settings.bitmapFont.enablePixelScanning} onChange={(e) => onNestedSettingsChange('bitmapFont', 'enablePixelScanning', e.target.checked)} className="h-5 w-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400" /></LabelInputContainer>
                {settings.bitmapFont.enablePixelScanning && (<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Adjusts character width based on content. Space characters use approx. 1/4 of Character Width unless overridden.</p>)}
                <LabelInputContainer label="Enable Color Removal" htmlFor="bitmapEnableColorRemoval" inline><input type="checkbox" id="bitmapEnableColorRemoval" checked={settings.bitmapFont.enableColorRemoval} onChange={(e) => onNestedSettingsChange('bitmapFont', 'enableColorRemoval', e.target.checked)} className="h-5 w-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400" /></LabelInputContainer>
                {settings.bitmapFont.enableColorRemoval && (<><LabelInputContainer label="Color to Remove" htmlFor="bitmapColorToRemove"><TextInput type="color" id="bitmapColorToRemove" value={settings.bitmapFont.colorToRemove} onChange={(e) => onNestedSettingsChange('bitmapFont', 'colorToRemove', e.target.value)} className="h-10 w-full" /></LabelInputContainer><InputWithSlider label="Removal Tolerance" id="bitmapColorRemovalTolerance" value={settings.bitmapFont.colorRemovalTolerance} onChange={(val) => onNestedSettingsChange('bitmapFont', 'colorRemovalTolerance', val)} min={0} max={75} step={1} unit="level" /></>)}
                <LabelInputContainer label="Enable Tint Color" htmlFor="bitmapEnableTintColor" inline><input type="checkbox" id="bitmapEnableTintColor" checked={settings.bitmapFont.enableTintColor} onChange={(e) => onNestedSettingsChange('bitmapFont', 'enableTintColor', e.target.checked)} className="h-5 w-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400" /></LabelInputContainer>
                {settings.bitmapFont.enableTintColor && (<LabelInputContainer label="Tint Color" htmlFor="bitmapColor"><TextInput type="color" id="bitmapColor" value={settings.bitmapFont.color} onChange={(e) => onNestedSettingsChange('bitmapFont', 'color', e.target.value)} className="h-10 w-full" /></LabelInputContainer>)}
                <LabelInputContainer label="Enabled" htmlFor="bitmapEnabled" inline><input type="checkbox" id="bitmapEnabled" checked={settings.bitmapFont.enabled} onChange={(e) => onNestedSettingsChange('bitmapFont', 'enabled', e.target.checked)} className="h-5 w-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400" /></LabelInputContainer>
              </div>
            )}
          </>
        )
      },
      {
        id: 'effects-section', title: 'Effects', defaultOpen: false, content: (
          <>
            <LabelInputContainer label="Shadow Enabled" htmlFor="shadowEnabled" inline><input type="checkbox" id="shadowEnabled" checked={settings.shadowEffect.enabled} onChange={(e) => onNestedSettingsChange('shadowEffect', 'enabled', e.target.checked)} className="h-5 w-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400" /></LabelInputContainer>
            {settings.shadowEffect.enabled && (<><InputWithSlider label="Shadow Offset X" unit="px" id="shadowOffsetX" value={settings.shadowEffect.offsetX} onChange={(val) => onNestedSettingsChange('shadowEffect', 'offsetX', val)} min={-50} max={50} step={1} /><InputWithSlider label="Shadow Offset Y" unit="px" id="shadowOffsetY" value={settings.shadowEffect.offsetY} onChange={(val) => onNestedSettingsChange('shadowEffect', 'offsetY', val)} min={-50} max={50} step={1} /><InputWithSlider label="Shadow Blur" unit="px" id="shadowBlur" value={settings.shadowEffect.blur} onChange={(val) => onNestedSettingsChange('shadowEffect', 'blur', val)} min={0} max={100} step={1} /><LabelInputContainer label="Shadow Color" htmlFor="shadowColor"><TextInput type="color" id="shadowColor" value={settings.shadowEffect.color} onChange={(e) => onNestedSettingsChange('shadowEffect', 'color', e.target.value)} className="h-10 w-full" /></LabelInputContainer></>)}
            <LabelInputContainer label="Outline Enabled" htmlFor="outlineEnabled" inline><input type="checkbox" id="outlineEnabled" checked={settings.outlineEffect.enabled} onChange={(e) => onNestedSettingsChange('outlineEffect', 'enabled', e.target.checked)} className="h-5 w-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400" /></LabelInputContainer>
            {settings.outlineEffect.enabled && (<><InputWithSlider label="Outline Width" unit="px" id="outlineWidth" value={settings.outlineEffect.width} onChange={(val) => onNestedSettingsChange('outlineEffect', 'width', val)} min={0} max={30} step={1} /><LabelInputContainer label="Outline Color" htmlFor="outlineColor"><TextInput type="color" id="outlineColor" value={settings.outlineEffect.color} onChange={(e) => onNestedSettingsChange('outlineEffect', 'color', e.target.value)} className="h-10 w-full"/></LabelInputContainer></>)}
          </>
        )
      }
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings, onSettingsChange, onNestedSettingsChange,
    onTextFileUpload, mainScripts, activeMainScriptId, onSetActiveMainScriptId, onClearMainScripts,
    activeScriptBlocks, currentBlockIndex, onSetCurrentBlockIndex,
    showOnlyOverflowingBlocks, onShowOnlyOverflowingBlocksChange, displayedBlocksForView,
    onLoadCustomFont, loadedCustomFontName, customFontFile, customFontCssNameInput, // Added customFontFile & cssName
    overflowSettingsPanelOpen, // Prop for overflow panel open state
    originalScripts, onOriginalScriptUpload, matchedOriginalScriptName, onClearOriginalScripts,
    viewMode, onViewModeChange,
    findText, onFindTextChange, replaceText, onReplaceTextChange,
    findIsCaseSensitive, onFindIsCaseSensitiveChange, findMatchWholeWord, onFindMatchWholeWordChange,
    findScope, onFindScopeChange, onFindNext, onReplace, onReplaceAll, findResultsMessage,
    isFindCurrentBlockDisabled, findResultSummary, onNavigateToFindResult,
    activeMainScriptName, isFindReplaceDisabled, showCustomFontLoadUI // Re-calculate based on props
  ]);


  const [panelSections, setPanelSections] = useState<PanelSectionItem[]>(() => getPanelSectionsConfig(props));
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [draggingItemIndex, setDraggingItemIndex] = useState<number | null>(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);
  
  // Update panelSections when props change
  useEffect(() => {
    setPanelSections(getPanelSectionsConfig(props));
  }, [props, getPanelSectionsConfig]);


  useEffect(() => {
    const initialOpenState: Record<string, boolean> = {};
    panelSections.forEach(section => {
      // For 'Overflow Settings', its open state is controlled by `overflowSettingsPanelOpen` prop.
      if (section.id === 'overflow-settings-section') {
        initialOpenState[section.id] = overflowSettingsPanelOpen;
      } else {
        initialOpenState[section.id] = section.defaultOpen !== undefined ? section.defaultOpen : true;
      }
    });
    setOpenSections(initialOpenState);
  }, [panelSections, overflowSettingsPanelOpen]); // Depend on panelSections and the external prop for overflow

  const toggleSectionOpen = (sectionId: string) => {
    if (sectionId === 'overflow-settings-section') {
      onToggleOverflowSettingsPanel(); // Use the callback prop for this specific section
    } else {
      setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    // e.dataTransfer.setData('text/plain', index.toString()); // Not strictly necessary for this impl
    setDraggingItemIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (draggingItemIndex === null || draggingItemIndex === index) return;
    setDragOverItemIndex(index);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Basic leave, could be improved if nested draggables were an issue
     if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
    }
    setDragOverItemIndex(null);
  };

  const handleDrop = (targetIndex: number) => {
    if (draggingItemIndex === null || draggingItemIndex === targetIndex) {
      setDraggingItemIndex(null);
      setDragOverItemIndex(null);
      return;
    }

    const newSections = [...panelSections];
    const [draggedItem] = newSections.splice(draggingItemIndex, 1);
    newSections.splice(targetIndex, 0, draggedItem);

    setPanelSections(newSections);
    setDraggingItemIndex(null);
    setDragOverItemIndex(null);
  };

  const handleDragEnd = () => {
    setDraggingItemIndex(null);
    setDragOverItemIndex(null);
  };
  
  const dragHandleRef = React.useRef<HTMLButtonElement>(null);


  return (
    <div className="space-y-0"> {/* Reduced space-y for tighter packing of draggable items */}
      {panelSections.map((section, index) => (
         <DraggableSectionWrapper
            key={section.id}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
            isDragging={draggingItemIndex === index}
            isDragOver={dragOverItemIndex === index && draggingItemIndex !== null && draggingItemIndex !== index}
        >
          <Section
            title={section.title}
            isOpen={openSections[section.id] === undefined ? true : openSections[section.id]}
            onToggle={() => toggleSectionOpen(section.id)}
            id={section.id}
            dragHandleProps={{
              // This makes the icon the drag handle.
              // Draggability is on the DraggableSectionWrapper.
              // The handle is mostly for visual cue and ARIA.
              role: 'button',
              'aria-roledescription': 'drag handle',
              tabIndex: 0, // Make it focusable
               // To prevent drag start when clicking the handle to toggle, if Section itself is not draggable
              // However, since the wrapper is draggable, this is fine.
            }}
          >
            {section.content}
          </Section>
        </DraggableSectionWrapper>
      ))}
    </div>
  );
};

export default ControlsPanel;
