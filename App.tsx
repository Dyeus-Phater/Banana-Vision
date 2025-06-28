
import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import JSZip from 'jszip';
import { Octokit } from '@octokit/rest';
import { 
  AppSettings, Block, NestedAppSettingsObjectKeys, ScriptFile, GitHubSettings, Profile, MainViewMode,
  ThemeKey, CustomThemeColors, AppThemeSettings, BlockMetrics, LineMetricDetail, CharacterByteMapEntry, LineMetrics,
  GlossaryTerm, GlossaryCategory
} from './types';
import { DEFAULT_SETTINGS, DEFAULT_GITHUB_SETTINGS, ALL_THEME_DEFINITIONS, DEFAULT_CUSTOM_THEME_TEMPLATE, DEFAULT_GLOSSARY_TERMS } from './constants';
import { ControlsPanel, Button } from './components/ControlsPanel'; // Import Button
import PreviewArea, { PreviewAreaProps } from './components/PreviewArea';
import Toolbar from './components/Toolbar';
import ProfilesGalleryPage from './components/ProfilesGalleryPage';
import SpecialSettingsMenu from './components/SpecialSettingsMenu';
import TutorialModal from './components/TutorialModal';
import { exportSettingsAsJson, importSettingsFromJson } from './services/fileService';
import { exportToPng } from './services/exportService';
import * as profileService from './services/profileService';
import * as themeService from './services/themeService';
import * as textMetricsService from './services/textMetricsService';


interface LoadedCustomFontInfo {
  name: string;
  styleElement: HTMLStyleElement;
}

type ViewMode = 'single' | 'all';
export type FindScope = 'currentBlock' | 'activeScript' | 'allScripts';

interface FoundMatch {
  scriptId: string;
  blockIndex: number; 
  charStartIndex: number; 
  charEndIndex: number; 
}

export interface FindResultSummaryItem {
  id: string; 
  name: string; 
  count: number;
  type: 'script' | 'block';
  scriptId: string;
  blockOriginalIndex?: number; 
}


type BitmapCharCache = Map<string, { canvas: HTMLCanvasElement | null; dataURL?: string }>;


const ESTIMATED_BLOCK_CELL_HEIGHT_PX = 350;
const OBSERVER_MARGIN_ITEM_COUNT = 2;
const TUTORIAL_COMPLETED_KEY = 'bananaVision_tutorialCompleted_v1';


interface BlockCellProps {
  block: Block;
  activeThemeKey: ThemeKey; 
  appSettings: AppSettings;
  isFullyVisible: boolean;
  placeholderHeight: number;
  placeholderWidth: number;
  onBlockContentChange: (blockOriginalIndex: number, newContent: string) => void;
  onBlockOverflowChange: (blockOriginalIndex: number, isOverflowing: boolean) => void;
  onNestedSettingsChange: PreviewAreaProps['onNestedSettingsChange'];
  comparisonOriginalContent: string | null;
  comparisonSecondaryOriginalContent: string | null; // New prop for second original
  overflowSettingsPanelOpen: boolean;
  simplifiedRender: boolean;
  onVisibilityChange: (blockOriginalIndex: number, isVisible: boolean) => void;
  scrollRootElement: HTMLDivElement | null;
  observerRootMarginValue: number;
  globalBitmapCharCache: BitmapCharCache | null; 
  globalBitmapCacheId: number; 
  // Byte counting related props
  parsedCustomByteMap: CharacterByteMapEntry[];
  defaultCharacterByteValue: number;
  enableByteRestrictionInComparisonMode: boolean;
  activeComparisonMode: boolean; // To know if comparison mode is globally active
}

const BlockCell: React.FC<BlockCellProps> = ({
  block,
  activeThemeKey,
  appSettings,
  isFullyVisible,
  placeholderHeight,
  placeholderWidth,
  onBlockContentChange,
  onBlockOverflowChange,
  onNestedSettingsChange,
  comparisonOriginalContent,
  comparisonSecondaryOriginalContent, // Destructure new prop
  overflowSettingsPanelOpen,
  simplifiedRender,
  onVisibilityChange,
  scrollRootElement,
  observerRootMarginValue,
  globalBitmapCharCache, 
  globalBitmapCacheId,
  // Byte counting props
  parsedCustomByteMap,
  defaultCharacterByteValue,
  enableByteRestrictionInComparisonMode,
  activeComparisonMode,
}) => {
  const cellRef = useRef<HTMLDivElement>(null);
  const blockOriginalIndex = block.index;

  const previewComponentRef = useRef<HTMLDivElement>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const [selectedTextLengthCell, setSelectedTextLengthCell] = useState<number>(0);
  const [blockCellMetrics, setBlockCellMetrics] = useState<BlockMetrics | null>(null);
  const [lineMetricDetailsForDisplay, setLineMetricDetailsForDisplay] = useState<LineMetricDetail[]>([]);
  const [activeLineIndexCell, setActiveLineIndexCell] = useState<number | null>(null);


  const handleCellTextAreaActivity = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    setSelectedTextLengthCell(textarea.selectionEnd - textarea.selectionStart);

    if (textarea.selectionStart === textarea.selectionEnd) {
      const currentLine = textarea.value.substring(0, textarea.selectionStart).split('\n').length - 1;
      setActiveLineIndexCell(currentLine);
    } else {
      setActiveLineIndexCell(null);
    }
  };


  useEffect(() => {
    if (!scrollRootElement || !cellRef.current) {
      if (cellRef.current) {
         onVisibilityChange(block.index, false);
      }
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        onVisibilityChange(block.index, entry.isIntersecting);
      },
      {
        root: scrollRootElement,
        rootMargin: `${observerRootMarginValue}px 0px`,
        threshold: 0.01,
      }
    );

    const currentCellNode = cellRef.current;
    observer.observe(currentCellNode);

    return () => {
      observer.unobserve(currentCellNode);
      observer.disconnect();
      onVisibilityChange(block.index, false);
    };
  }, [block.index, onVisibilityChange, scrollRootElement, observerRootMarginValue, cellRef]);

  useLayoutEffect(() => {
    if (previewWrapperRef.current) {
      if (isFullyVisible && previewComponentRef.current) {
        const scaledHeight = previewComponentRef.current.getBoundingClientRect().height;
        previewWrapperRef.current.style.height = `${scaledHeight}px`;
        previewWrapperRef.current.style.minHeight = `${scaledHeight}px`;
      } else if (!isFullyVisible) {
        previewWrapperRef.current.style.height = `${placeholderHeight}px`;
        previewWrapperRef.current.style.minHeight = `${placeholderHeight}px`;
      } else {
        previewWrapperRef.current.style.height = 'auto';
        previewWrapperRef.current.style.minHeight = 'auto';
      }
    }
  }, [isFullyVisible, appSettings, block.content, placeholderHeight, previewComponentRef, previewWrapperRef]);

  useEffect(() => {
    const metrics = textMetricsService.calculateBlockMetrics(block.content, parsedCustomByteMap, defaultCharacterByteValue);
    setBlockCellMetrics(metrics);

    if (activeComparisonMode && enableByteRestrictionInComparisonMode && comparisonOriginalContent !== null) {
      const originalMetrics = textMetricsService.calculateBlockMetrics(comparisonOriginalContent, parsedCustomByteMap, defaultCharacterByteValue);
      const details: LineMetricDetail[] = metrics.lineDetails.map((currentLine, index) => {
        const originalLine = originalMetrics.lineDetails[index];
        return {
          currentChars: currentLine.chars,
          currentBytes: currentLine.bytes,
          originalChars: originalLine?.chars,
          originalBytes: originalLine?.bytes,
          isOverLimit: originalLine ? currentLine.bytes > originalLine.bytes : false,
        };
      });
      // Handle cases where current block has more lines than original (though input should be restricted)
      if (metrics.lineDetails.length > originalMetrics.lineDetails.length) {
        for (let i = originalMetrics.lineDetails.length; i < metrics.lineDetails.length; i++) {
          details[i] = { ...details[i], originalBytes: 0, isOverLimit: true };
        }
      }
      setLineMetricDetailsForDisplay(details);
    } else {
      setLineMetricDetailsForDisplay(metrics.lineDetails.map(ld => ({
        currentChars: ld.chars, currentBytes: ld.bytes, isOverLimit: false
      })));
    }
  }, [block.content, parsedCustomByteMap, defaultCharacterByteValue, activeComparisonMode, enableByteRestrictionInComparisonMode, comparisonOriginalContent]);

  const lineMetricsForActiveIndexCell = useMemo(() => {
    if (activeLineIndexCell !== null && blockCellMetrics?.lineDetails && blockCellMetrics.lineDetails[activeLineIndexCell]) {
      return blockCellMetrics.lineDetails[activeLineIndexCell];
    }
    return null;
  }, [activeLineIndexCell, blockCellMetrics]);


  return (
    <div
      ref={cellRef}
      className="block-cell p-4 rounded-lg shadow-md border bg-[var(--bv-element-background-secondary)] border-[var(--bv-border-color)]"
    >
      <h3 className="text-md font-semibold mb-2 flex justify-between items-center text-[var(--bv-text-primary)]">
        <span className="truncate flex-grow mr-2" title={`Block ${block.index + 1}`}>
           Block {block.index + 1}
        </span>
        {block.isOverflowing && (
          <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">Overflow!</span>
        )}
      </h3>
      <div
        ref={previewWrapperRef}
        className="preview-area-for-cell mb-3 flex items-center justify-center"
      >
        {isFullyVisible ? (
         <PreviewArea
          ref={previewComponentRef}
          key={`preview-cell-${block.index}-${globalBitmapCacheId}`} 
          baseSettings={appSettings}
          textOverride={block.content}
          simplifiedRender={simplifiedRender}
          setIsOverflowing={(isOverflowing) => onBlockOverflowChange(blockOriginalIndex, isOverflowing)}
          onNestedSettingsChange={onNestedSettingsChange}
          showPixelMarginGuides={appSettings.pixelOverflowMargins.enabled && overflowSettingsPanelOpen}
          isReadOnlyPreview={false}
          activeThemeKey={activeThemeKey}
          bitmapCharCache={globalBitmapCharCache} 
          bitmapCacheId={globalBitmapCacheId}     
        />
        ) : (
          <div
            className="flex items-center justify-center border border-dashed border-[var(--bv-border-color-light)] bg-[var(--bv-element-background)] text-[var(--bv-text-secondary)] text-sm italic"
            style={{
              height: `${placeholderHeight}px`,
              width: `${placeholderWidth}px`,
              minHeight: '50px',
              minWidth: '100px',
            }}
            aria-label={`Preview placeholder for block ${block.index + 1}`}
          >
            Scroll to view preview
          </div>
        )}
      </div>
      <textarea
        aria-label={`Content for block ${block.index + 1}`}
        value={block.content}
        onChange={(e) => onBlockContentChange(blockOriginalIndex, e.target.value)}
        onSelect={handleCellTextAreaActivity}
        onFocus={handleCellTextAreaActivity}
        onBlur={() => setActiveLineIndexCell(null)}
        onKeyUp={handleCellTextAreaActivity} 
        onClick={handleCellTextAreaActivity}
        className="w-full p-2 border rounded-md shadow-sm sm:text-sm resize-y min-h-[120px] mb-0.5
                   bg-[var(--bv-input-background)] border-[var(--bv-input-border)] text-[var(--bv-input-text)]
                   focus:ring-[var(--bv-input-focus-ring)] focus:border-[var(--bv-input-focus-ring)]"
      />
      <div className="text-xs text-[var(--bv-text-secondary)] mt-0 mb-1.5 h-auto flex flex-col items-start">
        <span>Selected: {selectedTextLengthCell} char(s)</span>
        {activeLineIndexCell !== null && lineMetricsForActiveIndexCell ? (
          <span>Line {activeLineIndexCell + 1}: {lineMetricsForActiveIndexCell.chars} chars, {lineMetricsForActiveIndexCell.bytes} bytes, {lineMetricsForActiveIndexCell.bytes * 8} bits</span>
        ) : blockCellMetrics ? (
          <span>Total: {blockCellMetrics.totalChars} chars, {blockCellMetrics.totalBytes} bytes, {blockCellMetrics.totalBits} bits</span>
        ) : (
          <span>Total: 0 chars, 0 bytes, 0 bits</span>
        )}
      </div>
       {activeComparisonMode && enableByteRestrictionInComparisonMode && lineMetricDetailsForDisplay.length > 0 && (
        <div className="mt-1 text-xs text-[var(--bv-text-secondary)] max-h-20 overflow-y-auto border border-[var(--bv-border-color-light)] p-1 rounded">
          <p className="font-semibold text-[var(--bv-text-primary)]">Line Byte Limits (Current/Original 1):</p>
          {lineMetricDetailsForDisplay.map((line, idx) => (
            <div key={idx} className={`${line.isOverLimit ? 'text-red-500 font-bold' : ''}`}>
              Line {idx + 1}: {line.currentBytes} / {line.originalBytes !== undefined ? line.originalBytes : '-'} bytes
            </div>
          ))}
        </div>
      )}
      {appSettings.comparisonModeEnabled && comparisonOriginalContent !== null && (
        <div className="mt-2">
          <h4 className="text-sm font-medium mb-1 text-[var(--bv-text-secondary)] truncate" title={`Original Text 1 (Block ${block.index + 1})`}>Original Text 1 (Block ${block.index + 1})</h4>
          <textarea
            aria-label={`Original content 1 for block ${block.index + 1}`}
            readOnly
            value={comparisonOriginalContent}
            className="w-full p-2 border rounded-md shadow-sm sm:text-sm resize-y min-h-[100px]
                       bg-[var(--bv-accent-secondary)] border-[var(--bv-border-color)] text-[var(--bv-accent-secondary-content)]
                       cursor-not-allowed"
          />
        </div>
      )}
      {appSettings.comparisonModeEnabled && comparisonSecondaryOriginalContent !== null && (
        <div className="mt-2">
          <h4 className="text-sm font-medium mb-1 text-[var(--bv-text-secondary)] truncate" title={`Original Text 2 (Block ${block.index + 1})`}>Original Text 2 (Block ${block.index + 1})</h4>
          <textarea
            aria-label={`Original content 2 for block ${block.index + 1}`}
            readOnly
            value={comparisonSecondaryOriginalContent}
            className="w-full p-2 border rounded-md shadow-sm sm:text-sm resize-y min-h-[100px]
                       bg-indigo-300 dark:bg-indigo-700 border-[var(--bv-border-color)] text-indigo-900 dark:text-indigo-100
                       cursor-not-allowed"
          />
        </div>
      )}
    </div>
  );
};

const MemoizedBlockCell = React.memo(BlockCell);


const utf8ToBase64 = (str: string): string => {
  try {
    const utf8Bytes = new TextEncoder().encode(str);
    let binaryString = "";
    utf8Bytes.forEach((byte) => {
      binaryString += String.fromCharCode(byte);
    });
    return btoa(binaryString);
  } catch (e) {
    console.error("Error in utf8ToBase64 for string:", str.substring(0,100) , e);
    throw new Error(`Failed to encode to Base64. Input starts with: ${str.substring(0,30)}`);
  }
};

const base64ToUtf8 = (base64Str: string): string => {
  try {
    const binaryString = atob(base64Str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (e) {
    console.error("Error in base64ToUtf8 for base64 string:", base64Str.substring(0,100), e);
    throw new Error(`Failed to decode from Base64. Input starts with: ${base64Str.substring(0,30)}`);
  }
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Helper class to mimic FileList for GitHub file loading
class FileListLike implements FileList {
  readonly length: number;
  private _filesInternal: File[];

  // Index signature for TypeScript to know that numeric keys return File
  [index: number]: File;

  constructor(filesArray: { name: string, content: string }[]) {
    this._filesInternal = filesArray.map(f => new File([f.content], f.name, { type: "text/plain" }));
    this.length = this._filesInternal.length;

    for (let i = 0; i < this._filesInternal.length; i++) {
      Object.defineProperty(this, i, {
        value: this._filesInternal[i],
        writable: false, // Match FileList behavior (readonly items)
        enumerable: true, // Match FileList behavior (items are enumerable)
        configurable: false, // Match FileList behavior (items are not configurable)
      });
    }
  }

  item(index: number): File | null {
    if (index >= 0 && index < this.length) {
      return this._filesInternal[index];
    }
    return null;
  }

  [Symbol.iterator](): IterableIterator<File> {
    let iteratorIndex = 0;
    const filesSnapshot = [...this._filesInternal]; 

    return {
      next: (): IteratorResult<File, undefined> => {
        if (iteratorIndex < filesSnapshot.length) {
          return { value: filesSnapshot[iteratorIndex++], done: false };
        }
        return { value: undefined, done: true };
      },
      [Symbol.iterator](): IterableIterator<File> {
        // The iterator itself must be iterable
        return this;
      }
    };
  }
}

const getFontFormatAndMime = (fileName: string): { format: string; mime: string } => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'ttf': return { format: 'truetype', mime: 'font/ttf' };
    case 'otf': return { format: 'opentype', mime: 'font/otf' };
    case 'woff': return { format: 'woff', mime: 'font/woff' };
    case 'woff2': return { format: 'woff2', mime: 'font/woff2' };
    default: return { format: 'truetype', mime: 'application/octet-stream' }; // Fallback
  }
};

const deriveCssNameFromFile = (fileName: string | undefined, defaultName: string = "Imported Custom Font"): string => {
    if (!fileName) return defaultName;
    let fileNamePart = fileName.split('.').slice(0, -1).join('.');
    if (!fileNamePart && fileName.startsWith('.')) { 
        fileNamePart = fileName.substring(1).split('.').slice(0, -1).join('.');
    }
    if (!fileNamePart) { fileNamePart = defaultName; }
    let cssName = fileNamePart.replace(/[^a-zA-Z0-9\s_-]/g, '').trim().replace(/\s+/g, '-').replace(/_+/g, '_');
    if (!/^[a-zA-Z]/.test(cssName)) { cssName = "Custom-" + cssName; }
    if (!cssName || cssName === "Custom-") { cssName = `My-${defaultName.replace(/\s+/g, '-')}`; }
    return cssName;
};


const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const mainTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const originalTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const secondaryOriginalTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedTextLengthMain, setSelectedTextLengthMain] = useState<number>(0);
  const [selectedTextLengthOriginal, setSelectedTextLengthOriginal] = useState<number>(0);
  const [selectedTextLengthSecondaryOriginal, setSelectedTextLengthSecondaryOriginal] = useState<number>(0);


  const [appThemeSettings, setAppThemeSettings] = useState<AppThemeSettings>(themeService.loadThemeSettings());
  const [isSpecialSettingsMenuOpen, setIsSpecialSettingsMenuOpen] = useState<boolean>(false);

  const [mainScripts, setMainScripts] = useState<ScriptFile[]>([]);
  const [activeMainScriptId, setActiveMainScriptId] = useState<string | null>(null);
  
  const [originalScripts, setOriginalScripts] = useState<ScriptFile[]>([]); // First original scripts
  const [secondaryOriginalScripts, setSecondaryOriginalScripts] = useState<ScriptFile[]>([]); // Second original scripts

  const [currentBlockIndex, setCurrentBlockIndex] = useState<number | null>(0);
  const [showOnlyOverflowingBlocks, setShowOnlyOverflowingBlocks] = useState<boolean>(false);

  const [loadedCustomFontInfo, setLoadedCustomFontInfo] = useState<LoadedCustomFontInfo | null>(null);
  const [overflowSettingsPanelOpen, setOverflowSettingsPanelOpen] = useState(true);

  const [matchedOriginalScript, setMatchedOriginalScript] = useState<ScriptFile | null>(null);
  const [matchedSecondaryOriginalScript, setMatchedSecondaryOriginalScript] = useState<ScriptFile | null>(null);


  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [currentMainView, setCurrentMainView] = useState<MainViewMode>('editor');

  const [isControlsPanelCollapsed, setIsControlsPanelCollapsed] = useState<boolean>(false);

  const [fullyVisibleBlockOriginalIndices, setFullyVisibleBlockOriginalIndices] = useState<Set<number>>(new Set());
  const [scrollRootElement, setScrollRootElement] = useState<HTMLDivElement | null>(null);

  const [findText, setFindText] = useState<string>("");
  const [replaceText, setReplaceText] = useState<string>("");
  const [findIsCaseSensitive, setFindIsCaseSensitive] = useState<boolean>(false);
  const [findMatchWholeWord, setFindMatchWholeWord] = useState<boolean>(false);
  const [findScope, setFindScope] = useState<FindScope>('activeScript');
  const [findResultsMessage, setFindResultsMessage] = useState<string>("");
  const [currentFindMatch, setCurrentFindMatch] = useState<FoundMatch | null>(null);
  const [lastSearchIterationDetails, setLastSearchIterationDetails] = useState<{
    scriptId: string | null;
    blockOriginalIndex: number;
    searchStartIndexInBlock: number;
  } | null>(null);
  const [findResultSummary, setFindResultSummary] = useState<FindResultSummaryItem[]>([]);

  const [gitHubSettings, setGitHubSettings] = useState<GitHubSettings>(DEFAULT_GITHUB_SETTINGS);
  const [isGitHubLoading, setIsGitHubLoading] = useState<boolean>(false);
  const [gitHubStatusMessage, setGitHubStatusMessage] = useState<string>("");

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [currentTutorialStep, setCurrentTutorialStep] = useState<number>(0);

  
  const [globalBitmapCharCache, setGlobalBitmapCharCache] = useState<BitmapCharCache | null>(null);
  const [globalBitmapCacheId, setGlobalBitmapCacheId] = useState<number>(0);

  const [mainEditorMetrics, setMainEditorMetrics] = useState<BlockMetrics | null>(null);
  const [mainEditorLineMetricDetails, setMainEditorLineMetricDetails] = useState<LineMetricDetail[]>([]);
  const [originalBlockMetrics, setOriginalBlockMetrics] = useState<BlockMetrics | null>(null);
  const [secondaryOriginalBlockMetrics, setSecondaryOriginalBlockMetrics] = useState<BlockMetrics | null>(null);
  const [byteRestrictionWarning, setByteRestrictionWarning] = useState<string | null>(null);
  const [activeLineIndexMain, setActiveLineIndexMain] = useState<number | null>(null);

  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>(DEFAULT_GLOSSARY_TERMS);

  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useLayoutEffect(() => {
    const targetHeader = headerRef.current; 
    if (targetHeader) {
      const updateHeaderHeight = () => {
        const newHeight = targetHeader.offsetHeight;
        setHeaderHeight(currentStoredHeight => {
          if (newHeight !== currentStoredHeight) {
            return newHeight;
          }
          return currentStoredHeight;
        });
      };
      
      updateHeaderHeight(); // Initial measurement

      const resizeObserver = new ResizeObserver(updateHeaderHeight);
      resizeObserver.observe(targetHeader);

      return () => {
        if (targetHeader) { // Check if targetHeader still exists
            resizeObserver.unobserve(targetHeader);
        }
        resizeObserver.disconnect();
      };
    }
  }, []); // Empty dependency array ensures this setup runs once.


  const parsedCustomByteMap = useMemo(() => {
    return textMetricsService.parseCustomByteMapString(settings.customByteMapString);
  }, [settings.customByteMapString]);


  const handleMainTextAreaActivity = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    setSelectedTextLengthMain(textarea.selectionEnd - textarea.selectionStart);

    if (textarea.selectionStart === textarea.selectionEnd) { // Cursor, not a range selection
      const currentLine = textarea.value.substring(0, textarea.selectionStart).split('\n').length - 1;
      setActiveLineIndexMain(currentLine);
    } else { // Range selection
      setActiveLineIndexMain(null);
    }
  };

  const handleTextSelectOriginal = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    setSelectedTextLengthOriginal(textarea.selectionEnd - textarea.selectionStart);
  };
  
  const handleTextSelectSecondaryOriginal = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    setSelectedTextLengthSecondaryOriginal(textarea.selectionEnd - textarea.selectionStart);
  };

  useEffect(() => {
    const tutorialCompleted = localStorage.getItem(TUTORIAL_COMPLETED_KEY);
    if (tutorialCompleted !== 'true') {
      setShowTutorial(true);
      setCurrentTutorialStep(0);
    }
  }, []);

  
  useEffect(() => {
    let isCancelled = false;
    
    if (settings.currentFontType === 'bitmap' && settings.bitmapFont.enabled && settings.bitmapFont.imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = settings.bitmapFont.imageUrl;
      img.onload = () => {
        if (isCancelled) return;
        const newCache: BitmapCharCache = new Map();
        const {
          charWidth, charHeight, charMap,
          colorToRemove, enableColorRemoval, colorRemovalTolerance,
          enablePixelScanning, spaceWidthOverride,
          // enableTintColor, color: globalTintColor, // Global tint removed from cache generation
          separationX, separationY 
        } = settings.bitmapFont;

        if (charWidth <= 0 || charHeight <= 0) {
          console.error("Global Bitmap Cache: charWidth or charHeight is zero or negative.");
          setGlobalBitmapCharCache(new Map()); 
          setGlobalBitmapCacheId(id => id + 1);
          return;
        }

        const effectiveTileWidth = charWidth + separationX;
        const effectiveTileHeight = charHeight + separationY;
        
        const charsPerRow = (effectiveTileWidth > 0) ? Math.floor((img.width + separationX) / effectiveTileWidth) : 1;
        const targetRgb = enableColorRemoval ? hexToRgb(colorToRemove) : null;

        for (let i = 0; i < charMap.length; i++) {
          const char = charMap[i];
          let effectiveCharWidthForRender = charWidth; 
          let charSpecificCanvas: HTMLCanvasElement | null = document.createElement('canvas');

          if (char === ' ') {
            if (spaceWidthOverride > 0) {
              effectiveCharWidthForRender = spaceWidthOverride;
            } else {
              effectiveCharWidthForRender = enablePixelScanning
                ? Math.max(1, Math.floor(charWidth / 4)) 
                : charWidth; 
            }
            if (charSpecificCanvas) {
              charSpecificCanvas.width = effectiveCharWidthForRender;
              charSpecificCanvas.height = charHeight; 
            }
            newCache.set(char, { canvas: charSpecificCanvas, dataURL: charSpecificCanvas?.toDataURL() });
            continue;
          }

          if (!charSpecificCanvas) {
            newCache.set(char, { canvas: null });
            continue;
          }

          charSpecificCanvas.width = charWidth; 
          charSpecificCanvas.height = charHeight;
          const ctx = charSpecificCanvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            newCache.set(char, { canvas: null });
            continue;
          }

          const sx = (i % charsPerRow) * effectiveTileWidth;
          const sy = Math.floor(i / charsPerRow) * effectiveTileHeight;
          
          ctx.drawImage(img, sx, sy, charWidth, charHeight, 0, 0, charWidth, charHeight);

          if (enableColorRemoval && targetRgb) {
            const imageData = ctx.getImageData(0, 0, charWidth, charHeight);
            const data = imageData.data;
            for (let p = 0; p < data.length; p += 4) {
              const r = data[p]; const g = data[p + 1]; const b = data[p + 2];
              if (Math.abs(r - targetRgb.r) <= colorRemovalTolerance &&
                  Math.abs(g - targetRgb.g) <= colorRemovalTolerance &&
                  Math.abs(b - targetRgb.b) <= colorRemovalTolerance) {
                data[p + 3] = 0; 
              }
            }
            ctx.putImageData(imageData, 0, 0);
          }

          if (enablePixelScanning) {
            const imageData = ctx.getImageData(0, 0, charWidth, charHeight);
            const data = imageData.data;
            let rightmostPixel = -1;
            for (let yPx = 0; yPx < charHeight; yPx++) {
              for (let xPx = 0; xPx < charWidth; xPx++) {
                const alphaIndex = (yPx * charWidth + xPx) * 4 + 3;
                if (data[alphaIndex] > 10) { 
                  if (xPx > rightmostPixel) rightmostPixel = xPx;
                }
              }
            }
            effectiveCharWidthForRender = (rightmostPixel === -1) ? 0 : rightmostPixel + 1;

            if (effectiveCharWidthForRender === 0 && char !== ' ') { 
              newCache.set(char, { canvas: null }); 
              continue;
            } else if (effectiveCharWidthForRender < charWidth) {
              const scannedCanvas = document.createElement('canvas');
              scannedCanvas.width = effectiveCharWidthForRender;
              scannedCanvas.height = charHeight;
              const scannedCtx = scannedCanvas.getContext('2d');
              if (scannedCtx) {
                scannedCtx.drawImage(charSpecificCanvas, 0, 0, effectiveCharWidthForRender, charHeight, 0, 0, effectiveCharWidthForRender, charHeight);
                charSpecificCanvas = scannedCanvas; 
              }
            } else {
                 effectiveCharWidthForRender = charWidth; 
            }
          } else {
             effectiveCharWidthForRender = charWidth; 
          }
          
          if (charSpecificCanvas && charSpecificCanvas.width !== effectiveCharWidthForRender) {
              if (effectiveCharWidthForRender === 0 && char !== ' ') { 
                  newCache.set(char, { canvas: null });
                  continue;
              }
              const finalWidthCanvas = document.createElement('canvas');
              finalWidthCanvas.width = effectiveCharWidthForRender;
              finalWidthCanvas.height = charHeight;
              const finalCtx = finalWidthCanvas.getContext('2d');
              if (finalCtx) {
                  finalCtx.drawImage(charSpecificCanvas, 0, 0, effectiveCharWidthForRender, charHeight, 0,0, effectiveCharWidthForRender, charHeight);
                  charSpecificCanvas = finalWidthCanvas;
              }
          }
          
          // Store the canvas (after potential scanning/resizing and color removal)
          // and its dataURL. Global tint is NOT applied here anymore.
          newCache.set(char, { 
            canvas: charSpecificCanvas, 
            dataURL: charSpecificCanvas?.toDataURL() 
          });
        }
        setGlobalBitmapCharCache(newCache);
        setGlobalBitmapCacheId(id => id + 1);
      };
      img.onerror = () => {
        if (isCancelled) return;
        console.error("Global Bitmap Cache: Failed to load bitmap font image.");
        setGlobalBitmapCharCache(new Map());
        setGlobalBitmapCacheId(id => id + 1);
      }
    } else {
      setGlobalBitmapCharCache(null); 
      setGlobalBitmapCacheId(id => id + 1);
    }

    return () => {
      isCancelled = true;
    };
  }, [
    settings.bitmapFont.imageUrl, settings.bitmapFont.charWidth, settings.bitmapFont.charHeight,
    settings.bitmapFont.charMap, settings.bitmapFont.enableColorRemoval, settings.bitmapFont.colorToRemove,
    settings.bitmapFont.colorRemovalTolerance, settings.bitmapFont.enablePixelScanning,
    settings.bitmapFont.spaceWidthOverride, 
    // settings.bitmapFont.enableTintColor, settings.bitmapFont.color, // Removed global tint from deps
    settings.bitmapFont.separationX, settings.bitmapFont.separationY,
    settings.currentFontType, settings.bitmapFont.enabled
  ]);


  const handleStartTutorial = () => {
    setCurrentTutorialStep(0);
    setShowTutorial(true);
  };

  const handleCloseTutorial = (markAsCompleted: boolean) => {
    setShowTutorial(false);
    if (markAsCompleted) {
      localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
    }
  };


  useEffect(() => {
    const styleTagId = 'dynamic-scrollbar-styles';
    let styleTag = document.getElementById(styleTagId) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleTagId;
      document.head.appendChild(styleTag);
    }
  }, []);

  useEffect(() => {
    const resolvedColors = themeService.getResolvedThemeColors(appThemeSettings.activeThemeKey, appThemeSettings.customColors);
    const root = document.documentElement;
    
    Object.entries(resolvedColors).forEach(([key, value]) => {
      if (value) { 
        const cssVarName = `--bv-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        root.style.setProperty(cssVarName, value);
      }
    });
    
    const { scrollbarTrack, scrollbarThumb, scrollbarThumbHover } = resolvedColors;
    const scrollbarStyleTag = document.getElementById('dynamic-scrollbar-styles') as HTMLStyleElement | null;
    
    if (scrollbarStyleTag) {
      let scrollbarCss = `
        ::-webkit-scrollbar { width: 8px; height: 8px; }
      `;
      if (scrollbarTrack) {
        scrollbarCss += `::-webkit-scrollbar-track { background: ${scrollbarTrack}; border-radius: 10px; }\n`;
      } else {
        scrollbarCss += `::-webkit-scrollbar-track { background: var(--bv-scrollbar-track-fallback, #f1f1f1); border-radius: 10px; }\n`; 
      }
      if (scrollbarThumb) {
        scrollbarCss += `::-webkit-scrollbar-thumb { background: ${scrollbarThumb}; border-radius: 10px; }\n`;
      } else {
        scrollbarCss += `::-webkit-scrollbar-thumb { background: var(--bv-scrollbar-thumb-fallback, #888); border-radius: 10px; }\n`;
      }
      if (scrollbarThumbHover) {
        scrollbarCss += `::-webkit-scrollbar-thumb:hover { background: ${scrollbarThumbHover}; }\n`;
      } else {
        scrollbarCss += `::-webkit-scrollbar-thumb:hover { background: var(--bv-scrollbar-thumb-hover-fallback, #555); }\n`;
      }
      scrollbarStyleTag.textContent = scrollbarCss;
    }

    document.body.style.backgroundColor = resolvedColors.pageBackground;
    document.body.style.color = resolvedColors.textPrimary;
    document.body.className = 'font-sans'; 
    
  }, [appThemeSettings]);

  const handleThemeSettingsChange = useCallback((newSettings: Partial<AppThemeSettings>) => {
    setAppThemeSettings(prev => {
      const updatedSettings = { ...prev, ...newSettings };
      if (newSettings.customColors) {
        updatedSettings.customColors = { ...prev.customColors, ...newSettings.customColors };
      }
      themeService.saveThemeSettings(updatedSettings);
      return updatedSettings;
    });
  }, []);

  const handleCustomColorChange = useCallback((colorName: keyof CustomThemeColors, value: string) => {
    setAppThemeSettings(prev => {
      const newCustomColors = { ...prev.customColors, [colorName]: value };
      const updatedSettings = { ...prev, customColors: newCustomColors };
      if (prev.activeThemeKey === 'custom') {
        themeService.saveThemeSettings(updatedSettings);
      }
      return updatedSettings;
    });
  }, []);

  const saveCustomTheme = useCallback(() => {
    themeService.saveThemeSettings(appThemeSettings); 
    alert("Custom theme settings saved!");
  }, [appThemeSettings]);

  const resetCustomTheme = useCallback(() => {
    handleThemeSettingsChange({ customColors: { ...DEFAULT_CUSTOM_THEME_TEMPLATE } });
    if (appThemeSettings.activeThemeKey === 'custom') {
        themeService.saveThemeSettings({ ...appThemeSettings, customColors: { ...DEFAULT_CUSTOM_THEME_TEMPLATE } });
    }
  }, [appThemeSettings, handleThemeSettingsChange]);

  const toggleSpecialSettingsMenu = () => setIsSpecialSettingsMenuOpen(prev => !prev);

  const allBlocksScrollContainerRefCallback = useCallback((node: HTMLDivElement | null) => {
    setScrollRootElement(node);
  }, []);

  const observerRootMarginValue = useMemo(() => OBSERVER_MARGIN_ITEM_COUNT * ESTIMATED_BLOCK_CELL_HEIGHT_PX, []);

  const activeMainScript = useMemo(() => {
    if (!activeMainScriptId) return null;
    return mainScripts.find(script => script.id === activeMainScriptId) || null;
  }, [mainScripts, activeMainScriptId]);

  const activeScriptBlocks = useMemo(() => activeMainScript?.blocks || [], [activeMainScript]);

  const parseTextToBlocksInternal = useCallback((
    rawText: string, 
    useCustomSep: boolean, 
    customSeps: string[],
    treatLineAsBlock: boolean,
    useEmptyLinesSep: boolean // New parameter
  ): { blocks: Block[], parsedWithCustom: boolean, parsedWithLine: boolean, parsedWithEmptyLinesSeparator: boolean } => {
    let parsedBlocksContent: { content: string, originalContent: string }[] = [];
    let finalParsedWithCustom = false;
    let finalParsedWithLine = false;
    let finalParsedWithEmptyLines = false;

    if (treatLineAsBlock) {
        parsedBlocksContent = rawText.split('\n').map(line => {
            const cleanLine = line.endsWith('\r') ? line.slice(0, -1) : line;
            return { content: cleanLine, originalContent: cleanLine };
        });
        finalParsedWithLine = true;
    } else if (useEmptyLinesSep) {
        parsedBlocksContent = rawText.split(/\n(?:\s*\n)+/) // Split by one or more empty/whitespace lines
            .map(b => b.trim()) // Trim whitespace from resulting blocks
            .filter(b => b.length > 0) // Remove actually empty blocks after trim
            .map(b => ({ content: b, originalContent: b }));
        finalParsedWithEmptyLines = true;
    } else if (useCustomSep && customSeps.length > 0 && customSeps.some(s => s.trim().length > 0)) {
        const validSeparators = customSeps.filter(s => s.trim().length > 0);
        const mainSeparatorRegex = new RegExp(
            '(' + validSeparators
                .map(s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
                .join('|') +
            ')'
        );

        const segments = rawText.split(mainSeparatorRegex).filter(s => s !== undefined);
        let blockBuilder = "";
        for (const segment of segments) {
            if (validSeparators.includes(segment)) {
                blockBuilder += segment; 
                if (blockBuilder.length > 0) { 
                   parsedBlocksContent.push({ content: blockBuilder, originalContent: blockBuilder });
                }
                blockBuilder = ""; 
            } else {
                blockBuilder += segment;
            }
        }
        if (blockBuilder.length > 0 ) { 
            parsedBlocksContent.push({ content: blockBuilder, originalContent: blockBuilder });
        }
        parsedBlocksContent = parsedBlocksContent.filter(b => b.content.length > 0);
        finalParsedWithCustom = true;
    } else { // Default parsing
        parsedBlocksContent = rawText.split(/\n\s*\n/)
            .map(b => b.trim())
            .filter(b => b.length > 0)
            .map(b => ({ content: b, originalContent: b }));
    }

    return {
      blocks: parsedBlocksContent.map((blockData, index) => ({
        content: blockData.content,
        originalContent: blockData.originalContent,
        index,
        isOverflowing: false,
      })),
      parsedWithCustom: finalParsedWithCustom,
      parsedWithLine: finalParsedWithLine,
      parsedWithEmptyLinesSeparator: finalParsedWithEmptyLines
    };
  }, []);


  useEffect(() => {
    setProfiles(profileService.getProfiles());
  }, []);


  const handleSettingsChange = useCallback(<K extends keyof AppSettings, V extends AppSettings[K]>(
    key: K,
    value: V
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetAppStateForNewSettings = useCallback(() => {
    setMainScripts([]);
    setActiveMainScriptId(null);
    setOriginalScripts([]);
    setSecondaryOriginalScripts([]); // Reset second original scripts
    setMatchedOriginalScript(null);
    setMatchedSecondaryOriginalScript(null); // Reset matched second original script
    setCurrentBlockIndex(null);
    setFullyVisibleBlockOriginalIndices(new Set());
    setFindText("");
    setReplaceText("");
    setFindResultsMessage("");
    setCurrentFindMatch(null);
    setLastSearchIterationDetails(null);
    setFindResultSummary([]);
    // Glossary terms are preserved across settings loads unless explicitly cleared or imported over

    if (loadedCustomFontInfo?.styleElement) {
      document.head.removeChild(loadedCustomFontInfo.styleElement);
      setLoadedCustomFontInfo(null);
    }
  }, [loadedCustomFontInfo]);

  const handleApplyNewSettings = useCallback((
    newAppSettings: AppSettings, 
    newGitHubSettings: GitHubSettings,
    newGlossaryTerms: GlossaryTerm[],
    scriptNamePrefix: string
  ) => {
    setSettings(newAppSettings); // This will trigger the useEffect for customFontBase64 if present
    setGitHubSettings(newGitHubSettings);
    setGlossaryTerms(newGlossaryTerms);
    resetAppStateForNewSettings();

    if (newAppSettings.text && newAppSettings.text !== DEFAULT_SETTINGS.text) {
      const { blocks, parsedWithCustom, parsedWithLine, parsedWithEmptyLinesSeparator } = parseTextToBlocksInternal(
        newAppSettings.text, 
        newAppSettings.useCustomBlockSeparator, 
        newAppSettings.blockSeparators,
        newAppSettings.treatEachLineAsBlock,
        newAppSettings.useEmptyLinesAsSeparator
      );
      const defaultScript: ScriptFile = {
        id: `${scriptNamePrefix}-${Date.now()}`,
        name: `${scriptNamePrefix} Script`,
        blocks,
        rawText: newAppSettings.text,
        parsedWithCustomSeparators: parsedWithCustom,
        parsedWithLineAsBlock: parsedWithLine,
        parsedWithEmptyLinesSeparator: parsedWithEmptyLinesSeparator,
      };
      setMainScripts([defaultScript]);
      setActiveMainScriptId(defaultScript.id);
      setCurrentBlockIndex(blocks.length > 0 ? 0 : null);
    } else {
      if (viewMode === 'single') {
        handleSettingsChange('text', DEFAULT_SETTINGS.text);
      }
      setCurrentBlockIndex(null);
    }
  }, [resetAppStateForNewSettings, parseTextToBlocksInternal, viewMode, handleSettingsChange]);

  const handleSaveProfile = useCallback((profileName: string, _settingsToSaveIgnored: AppSettings) => {
    if (!profileName.trim()) {
      alert("Please enter a name for the profile.");
      return;
    }
    try {
      // Always use the App's current 'settings' state to ensure latest data,
      // especially for complex nested objects like custom font data.
      const updatedProfiles = profileService.saveProfile(profileName, settings, gitHubSettings);
      setProfiles(updatedProfiles);
      alert(`Profile "${profileName}" saved successfully!`);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(`Failed to save profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [settings, gitHubSettings]); // Depend on 'settings' to use the latest state.

  const handleLoadProfile = useCallback((profileId: string) => {
    const profileToLoad = profileService.getProfileById(profileId);
    if (profileToLoad) {
      // Profiles don't store glossary. Glossary is global or part of main JSON.
      handleApplyNewSettings(profileToLoad.settings, profileToLoad.gitHubSettings, glossaryTerms, `Profile-${profileToLoad.name}`);
      setCurrentMainView('editor'); 
      alert(`Profile "${profileToLoad.name}" loaded successfully!`);
    } else {
      alert("Profile not found.");
    }
  }, [handleApplyNewSettings, glossaryTerms]);

  const handleDeleteProfile = useCallback((profileId: string) => {
    if (window.confirm("Are you sure you want to delete this profile? This action cannot be undone.")) {
      try {
        const updatedProfiles = profileService.deleteProfile(profileId);
        setProfiles(updatedProfiles);
        alert("Profile deleted successfully.");
      } catch (error) {
        console.error("Error deleting profile:", error);
        alert(`Failed to delete profile: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }, []);


  useEffect(() => {
    if (activeMainScript && settings.comparisonModeEnabled) {
      let match1: ScriptFile | null = null;
      match1 = originalScripts.find(os => os.name === activeMainScript.name) || null;
      if (!match1) {
        const activeMainIndex = mainScripts.findIndex(ms => ms.id === activeMainScript.id);
        if (activeMainIndex !== -1 && originalScripts[activeMainIndex]) {
          match1 = originalScripts[activeMainIndex];
        }
      }
      setMatchedOriginalScript(match1);

      let match2: ScriptFile | null = null;
      match2 = secondaryOriginalScripts.find(sos => sos.name === activeMainScript.name) || null;
      if (!match2) {
          const activeMainIndex = mainScripts.findIndex(ms => ms.id === activeMainScript.id);
          if (activeMainIndex !== -1 && secondaryOriginalScripts[activeMainIndex]) {
              match2 = secondaryOriginalScripts[activeMainIndex];
          }
      }
      setMatchedSecondaryOriginalScript(match2);

    } else {
      setMatchedOriginalScript(null);
      setMatchedSecondaryOriginalScript(null);
    }
  }, [activeMainScript, originalScripts, secondaryOriginalScripts, settings.comparisonModeEnabled, mainScripts]);


  const handleBlockVisibilityChange = useCallback((blockOriginalIndex: number, isVisible: boolean) => {
    setFullyVisibleBlockOriginalIndices(prevIndices => {
      const newIndices = new Set(prevIndices);
      if (isVisible) {
        newIndices.add(blockOriginalIndex);
      } else {
        newIndices.delete(blockOriginalIndex);
      }
      if (newIndices.size === prevIndices.size && [...newIndices].every(value => prevIndices.has(value))) {
        return prevIndices;
      }
      return newIndices;
    });
  }, []);


  useEffect(() => {
    if (viewMode === 'single') {
      if (activeScriptBlocks.length > 0 && currentBlockIndex !== null && activeScriptBlocks[currentBlockIndex]) {
        if (settings.text !== activeScriptBlocks[currentBlockIndex].content) {
          handleSettingsChange('text', activeScriptBlocks[currentBlockIndex].content);
        }
      } else if (activeScriptBlocks.length > 0 && currentBlockIndex === null) {
        setCurrentBlockIndex(0);
      } else if (activeScriptBlocks.length === 0) {
        if (settings.text !== DEFAULT_SETTINGS.text) {
          handleSettingsChange('text', DEFAULT_SETTINGS.text);
        }
      }
    }
  }, [currentBlockIndex, activeScriptBlocks, settings.text, viewMode, handleSettingsChange]);

  // Update metrics for main editor when relevant settings or text change
  useEffect(() => {
    if (viewMode === 'single') {
        const metrics = textMetricsService.calculateBlockMetrics(settings.text, parsedCustomByteMap, settings.defaultCharacterByteValue);
        setMainEditorMetrics(metrics);

        if (settings.comparisonModeEnabled && settings.enableByteRestrictionInComparisonMode && matchedOriginalScript && currentBlockIndex !== null && matchedOriginalScript.blocks[currentBlockIndex]) {
            const originalBlockContent = matchedOriginalScript.blocks[currentBlockIndex].content;
            const originalMetrics = textMetricsService.calculateBlockMetrics(originalBlockContent, parsedCustomByteMap, settings.defaultCharacterByteValue);
            
            const details: LineMetricDetail[] = metrics.lineDetails.map((currentLine, index) => {
                const originalLine = originalMetrics.lineDetails[index];
                return {
                    currentChars: currentLine.chars,
                    currentBytes: currentLine.bytes,
                    originalChars: originalLine?.chars,
                    originalBytes: originalLine?.bytes,
                    isOverLimit: originalLine ? currentLine.bytes > originalLine.bytes : false,
                };
            });
            // Handle cases where current block has more lines than original
            if (metrics.lineDetails.length > originalMetrics.lineDetails.length) {
                for (let i = originalMetrics.lineDetails.length; i < metrics.lineDetails.length; i++) {
                    details[i] = { ...metrics.lineDetails[i], currentChars: metrics.lineDetails[i].chars, currentBytes: metrics.lineDetails[i].bytes, originalBytes: 0, isOverLimit: metrics.lineDetails[i].bytes > 0 };
                }
            }
            setMainEditorLineMetricDetails(details);
        } else {
            setMainEditorLineMetricDetails(metrics.lineDetails.map(ld => ({
                currentChars: ld.chars, currentBytes: ld.bytes, isOverLimit: false
            })));
        }
    }
  }, [settings.text, parsedCustomByteMap, settings.defaultCharacterByteValue, viewMode, settings.comparisonModeEnabled, settings.enableByteRestrictionInComparisonMode, matchedOriginalScript, currentBlockIndex]);

  // Update metrics for the original block in comparison view
  const currentEditableBlockForSingleView = (currentMainView === 'editor' && viewMode === 'single' && activeMainScript && currentBlockIndex !== null && activeScriptBlocks[currentBlockIndex])
    ? activeScriptBlocks[currentBlockIndex]
    : null;

  let originalBlockForSingleViewComparison: Block | null = null;
  if (currentMainView === 'editor' && viewMode === 'single' && settings.comparisonModeEnabled && currentEditableBlockForSingleView && matchedOriginalScript) {
    if (matchedOriginalScript.blocks[currentEditableBlockForSingleView.index]) {
        originalBlockForSingleViewComparison = matchedOriginalScript.blocks[currentEditableBlockForSingleView.index];
    }
  } else if (currentMainView === 'editor' && viewMode === 'single' && settings.comparisonModeEnabled && currentEditableBlockForSingleView) {
      originalBlockForSingleViewComparison = {
          ...currentEditableBlockForSingleView,
          content: currentEditableBlockForSingleView.originalContent,
      };
  }
  
  let secondaryOriginalBlockForSingleViewComparison: Block | null = null;
    if (currentMainView === 'editor' && viewMode === 'single' && settings.comparisonModeEnabled && currentEditableBlockForSingleView && matchedSecondaryOriginalScript) {
        if (matchedSecondaryOriginalScript.blocks[currentEditableBlockForSingleView.index]) {
            secondaryOriginalBlockForSingleViewComparison = matchedSecondaryOriginalScript.blocks[currentEditableBlockForSingleView.index];
        }
    }

  useEffect(() => {
    if (viewMode === 'single' && settings.comparisonModeEnabled && originalBlockForSingleViewComparison) {
      const metrics = textMetricsService.calculateBlockMetrics(originalBlockForSingleViewComparison.content, parsedCustomByteMap, settings.defaultCharacterByteValue);
      setOriginalBlockMetrics(metrics);
    } else {
      setOriginalBlockMetrics(null);
    }

    if (viewMode === 'single' && settings.comparisonModeEnabled && secondaryOriginalBlockForSingleViewComparison) {
        const metrics = textMetricsService.calculateBlockMetrics(secondaryOriginalBlockForSingleViewComparison.content, parsedCustomByteMap, settings.defaultCharacterByteValue);
        setSecondaryOriginalBlockMetrics(metrics);
    } else {
        setSecondaryOriginalBlockMetrics(null);
    }
  }, [originalBlockForSingleViewComparison, secondaryOriginalBlockForSingleViewComparison, parsedCustomByteMap, settings.defaultCharacterByteValue, viewMode, settings.comparisonModeEnabled]);


  useLayoutEffect(() => {
    if (currentMainView !== 'editor' || viewMode !== 'single') {
        return;
    }

    const textareas = [
        mainTextAreaRef.current,
        originalTextAreaRef.current,
        secondaryOriginalTextAreaRef.current
    ].filter(Boolean) as HTMLTextAreaElement[];

    if (textareas.length < 1) {
        return;
    }

    // Reset heights to auto to get the natural scrollHeight
    textareas.forEach(ta => {
        ta.style.height = 'auto';
    });
    
    // Defer measurement to allow browser to re-render with 'auto' height
    requestAnimationFrame(() => {
        if(textareas.some(ta => !ta.isConnected)) return; // Ensure elements are still in DOM

        // Find the max scrollHeight
        const maxHeight = Math.max(...textareas.map(ta => ta.scrollHeight));
        const finalHeight = Math.max(100, maxHeight); // Enforce min height

        // Apply the max height to all textareas
        textareas.forEach(ta => {
            ta.style.height = `${finalHeight}px`;
        });
    });

  }, [
    settings.text, // Content of main textarea
    originalBlockForSingleViewComparison?.content,
    secondaryOriginalBlockForSingleViewComparison?.content,
    viewMode,
    currentMainView,
    settings.comparisonModeEnabled,
    isControlsPanelCollapsed // Re-run when sidebar collapses/expands
  ]);


  const handleNestedSettingsChange = useCallback(<
    ParentK extends NestedAppSettingsObjectKeys,
    ChildK extends keyof AppSettings[ParentK],
    V extends AppSettings[ParentK][ChildK]
  >(
    parentKey: ParentK,
    childKey: ChildK,
    value: V
  ) => {
    setSettings(prev => ({
      ...prev,
      [parentKey]: {
        ...prev[parentKey],
        [childKey]: value,
      },
    }));
  }, []);

  const handleExportJson = useCallback(() => {
    exportSettingsAsJson(settings, gitHubSettings, glossaryTerms, 'banana-vision-settings.json');
  }, [settings, gitHubSettings, glossaryTerms]);

  const handleImportJson = useCallback(async (files: FileList) => { 
    if (!files || files.length === 0) return;
    const file = files[0]; 
    try {
      const { 
        appSettings: newAppSettings, 
        gitHubSettings: newGitHubSettings,
        glossaryTerms: newGlossaryTerms 
      } = await importSettingsFromJson(file);
      handleApplyNewSettings(newAppSettings, newGitHubSettings, newGlossaryTerms, "Imported-JSON");
    } catch (error) {
      console.error("Failed to import JSON:", error);
      alert("Error importing settings. Make sure it's a valid JSON file.");
    }
  }, [handleApplyNewSettings]);

  const handleExportPng = useCallback(() => {
    const targetElement = currentMainView === 'editor' && viewMode === 'single' ? previewRef.current : null;
    if (targetElement) {
      exportToPng(targetElement, `banana-vision-preview-${Date.now()}.png`);
    } else {
        alert("PNG export is available for the 'Single Block View' in the editor.");
    }
  }, [previewRef, currentMainView, viewMode]);

  const handleSaveScript = useCallback(() => {
    if (!activeMainScript) {
      alert("No active script selected to save.");
      return;
    }

    let scriptContent = "";
    if (activeMainScript.blocks.length === 0) {
        scriptContent = ""; 
    } else if (activeMainScript.parsedWithLineAsBlock) {
        scriptContent = activeMainScript.blocks.map(block => block.content).join('\n');
    } else if (activeMainScript.parsedWithCustomSeparators) {
      scriptContent = activeMainScript.blocks.map(block => block.content).join('');
    } else if (activeMainScript.parsedWithEmptyLinesSeparator) {
      scriptContent = activeMainScript.blocks.map(block => block.content).join('\n\n');
    } else { // Default parsing
      scriptContent = activeMainScript.blocks.map(block => block.content).join('\n\n');
    }

    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeMainScript.name || 'edited_script.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeMainScript]);

  const handleSaveAllChangedScripts = useCallback(async () => {
    const zip = new JSZip();
    const changedScriptsData: { name: string, content: string }[] = [];
    const usedNamesInZip = new Set<string>();

    mainScripts.forEach(script => {
      let currentSerializedContent = "";
      if (script.blocks.length === 0) {
        currentSerializedContent = "";
      } else if (script.parsedWithLineAsBlock) {
        currentSerializedContent = script.blocks.map(block => block.content).join('\n');
      } else if (script.parsedWithCustomSeparators) {
        currentSerializedContent = script.blocks.map(block => block.content).join('');
      } else if (script.parsedWithEmptyLinesSeparator) {
        currentSerializedContent = script.blocks.map(block => block.content).join('\n\n');
      } else { // Default parsing
        currentSerializedContent = script.blocks.map(block => block.content).join('\n\n');
      }

      if (currentSerializedContent !== script.rawText) {
        changedScriptsData.push({
          name: script.name || `script-${script.id}.txt`,
          content: currentSerializedContent
        });
      }
    });

    if (changedScriptsData.length === 0) {
      alert("No scripts have been modified.");
      return;
    }

    changedScriptsData.forEach(sData => {
      let baseName = (sData.name || 'untitled_script').replace(/[<>:"/\\|?*]+/g, '_').replace(/^\.+$/, '_');
      let extension = '';
      const dotIndex = baseName.lastIndexOf('.');
      if (dotIndex > 0 && dotIndex < baseName.length -1) { 
        extension = baseName.substring(dotIndex); 
        baseName = baseName.substring(0, dotIndex);
      }
      
      let finalName = baseName + extension;
      if (!extension && finalName) { 
          finalName += ".txt"; 
      } else if (!finalName) { 
          finalName = `script-${Date.now()}.txt`
      }

      if (usedNamesInZip.has(finalName)) {
        let count = 1;
        const nameWithoutExt = baseName;
        do {
          finalName = `${nameWithoutExt}_${count}${extension || '.txt'}`;
          count++;
        } while (usedNamesInZip.has(finalName));
      }
      usedNamesInZip.add(finalName);
      zip.file(finalName, sData.content);
    });

    try {
      const zipContent = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipContent);
      const a = document.createElement('a');
      a.href = url;
      a.download = `banana-vision-changed-scripts-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating zip file:", err);
      alert(`Error generating zip file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [mainScripts]);

  const toggleLegacyTheme = () => { 
    const currentKey = appThemeSettings.activeThemeKey;
    let nextKey: ThemeKey;
    if (currentKey === 'light') nextKey = 'dark';
    else if (currentKey === 'dark') nextKey = 'banana';
    else if (currentKey === 'banana') nextKey = 'custom'; 
    else nextKey = 'light'; 

    if (nextKey === 'custom' && JSON.stringify(appThemeSettings.customColors) === JSON.stringify(ALL_THEME_DEFINITIONS.banana)) {
      nextKey = 'light';
    }
    
    handleThemeSettingsChange({ activeThemeKey: nextKey });
  };


  const readFileAsText = (fileToRead: File, encoding: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(fileToRead, encoding);
    });
  };

  const processAndAddFiles = async (
    files: FileList, 
    scriptSetTarget: 'main' | 'original1' | 'original2',
    sourceNamePrefix: string = ""
  ): Promise<void> => {
    const currentUseCustomSep = settings.useCustomBlockSeparator;
    const currentTreatLineAsBlock = settings.treatEachLineAsBlock;
    const currentUseEmptyLinesSep = settings.useEmptyLinesAsSeparator;
    const currentBlockSeps = [...settings.blockSeparators];

    const scriptFilePromises = Array.from(files).map(async (file, i) => {
      try {
        let rawText = await readFileAsText(file, 'UTF-8');
        if (rawText.includes('\uFFFD')) { 
          rawText = await readFileAsText(file, 'Windows-1252'); 
        }
        const { blocks, parsedWithCustom, parsedWithLine, parsedWithEmptyLinesSeparator } = parseTextToBlocksInternal(
            rawText, 
            currentUseCustomSep, 
            currentBlockSeps,
            currentTreatLineAsBlock,
            currentUseEmptyLinesSep
        );
        return {
          id: `${sourceNamePrefix}${file.name}-${Date.now()}-${i}`,
          name: `${sourceNamePrefix}${file.name}`,
          blocks,
          rawText,
          parsedWithCustomSeparators: parsedWithCustom,
          parsedWithLineAsBlock: parsedWithLine,
          parsedWithEmptyLinesSeparator: parsedWithEmptyLinesSeparator,
        } as ScriptFile; 
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        alert(`Error processing file ${file.name}. It will be skipped.`);
        return null; 
      }
    });

    const results = await Promise.all(scriptFilePromises);
    const newScriptFiles = results.filter(script => script !== null) as ScriptFile[];

    if (newScriptFiles.length > 0) {
      if (scriptSetTarget === 'main') {
        setMainScripts(prev => [...prev, ...newScriptFiles]);
        if (!activeMainScriptId && newScriptFiles.length > 0) {
          setActiveMainScriptId(newScriptFiles[0].id);
          setCurrentBlockIndex(newScriptFiles[0].blocks.length > 0 ? 0 : null);
        }
      } else if (scriptSetTarget === 'original1') {
        setOriginalScripts(prev => [...prev, ...newScriptFiles]);
      } else if (scriptSetTarget === 'original2') {
        setSecondaryOriginalScripts(prev => [...prev, ...newScriptFiles]);
      }
      setFullyVisibleBlockOriginalIndices(new Set()); 
    }
  };


  const handleTextFileUpload = useCallback(async (files: FileList | null) => { 
    if (!files) return;
    await processAndAddFiles(files, 'main');
  }, [settings.useCustomBlockSeparator, settings.treatEachLineAsBlock, settings.useEmptyLinesAsSeparator, settings.blockSeparators, activeMainScriptId, parseTextToBlocksInternal]); 

  const handleOriginalScriptUpload = useCallback(async (files: FileList | null) => { 
    if (!files) return;
    await processAndAddFiles(files, 'original1');
  }, [settings.useCustomBlockSeparator, settings.treatEachLineAsBlock, settings.useEmptyLinesAsSeparator, settings.blockSeparators, parseTextToBlocksInternal]);

  const handleSecondaryOriginalScriptUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;
    await processAndAddFiles(files, 'original2');
  }, [settings.useCustomBlockSeparator, settings.treatEachLineAsBlock, settings.useEmptyLinesAsSeparator, settings.blockSeparators, parseTextToBlocksInternal]);


  const handleClearMainScripts = useCallback(() => {
    setMainScripts([]);
    setActiveMainScriptId(null);
    setCurrentBlockIndex(null);
    handleSettingsChange('text', DEFAULT_SETTINGS.text); 
    setFindResultsMessage("");
    setCurrentFindMatch(null);
    setLastSearchIterationDetails(null);
    setFindResultSummary([]);
    setByteRestrictionWarning(null);
  }, [handleSettingsChange]);

  const handleClearOriginalScripts = useCallback(() => {
    setOriginalScripts([]);
    setMatchedOriginalScript(null);
    setByteRestrictionWarning(null);
  }, []);
  
  const handleClearSecondaryOriginalScripts = useCallback(() => {
    setSecondaryOriginalScripts([]);
    setMatchedSecondaryOriginalScript(null);
  }, []);


  const handleSetActiveMainScriptId = useCallback((id: string | null) => {
    setActiveMainScriptId(id);
    if (id) {
        const newActiveScript = mainScripts.find(s => s.id === id);
        setCurrentBlockIndex(newActiveScript && newActiveScript.blocks.length > 0 ? 0 : null);
    } else {
        setCurrentBlockIndex(null);
        handleSettingsChange('text', DEFAULT_SETTINGS.text);
    }
    setFullyVisibleBlockOriginalIndices(new Set());
    setFindResultsMessage("");
    setCurrentFindMatch(null);
    setLastSearchIterationDetails(null);
    setByteRestrictionWarning(null);
  }, [mainScripts, handleSettingsChange]);

const handleCurrentBlockContentChangeInSingleView = useCallback((newContent: string) => {
    if (!activeMainScript || currentBlockIndex === null) {
        handleSettingsChange('text', newContent); // Allow typing if no active block context
        setByteRestrictionWarning(null);
        return;
    }

    // Byte restriction logic
    if (settings.comparisonModeEnabled && settings.enableByteRestrictionInComparisonMode && matchedOriginalScript && matchedOriginalScript.blocks[currentBlockIndex]) {
        const originalBlock = matchedOriginalScript.blocks[currentBlockIndex];
        const newContentLines = newContent.split('\n');
        const originalContentLines = originalBlock.content.split('\n');

        // Check line count
        if (newContentLines.length > originalContentLines.length) {
            setByteRestrictionWarning(`Line count cannot exceed original (${originalContentLines.length} lines). Change prevented.`);
            // Do not update settings.text or mainScripts, effectively reverting the input
            return; 
        }

        // Check byte count per line
        for (let i = 0; i < newContentLines.length; i++) {
            const currentLineBytes = textMetricsService.calculateLineMetrics(newContentLines[i], parsedCustomByteMap, settings.defaultCharacterByteValue).bytes;
            const originalLineBytes = textMetricsService.calculateLineMetrics(originalContentLines[i] || "", parsedCustomByteMap, settings.defaultCharacterByteValue).bytes;

            if (currentLineBytes > originalLineBytes) {
                setByteRestrictionWarning(`Line ${i + 1} exceeds original byte limit (${currentLineBytes} > ${originalLineBytes} bytes). Change prevented.`);
                return; 
            }
        }
    }
    setByteRestrictionWarning(null); // Clear warning if all checks pass

    handleSettingsChange('text', newContent); 

    setMainScripts(prevScripts =>
      prevScripts.map(script => {
        if (script.id === activeMainScript.id) {
          return {
            ...script,
            blocks: script.blocks.map((block, index) =>
              index === currentBlockIndex ? { ...block, content: newContent, isOverflowing: false, lineMetricDetails: undefined } : block // Reset overflow and metrics
            ),
          };
        }
        return script;
      })
    );
    setCurrentFindMatch(null);
    setFindResultsMessage("");
  }, [activeMainScript, currentBlockIndex, handleSettingsChange, settings.comparisonModeEnabled, settings.enableByteRestrictionInComparisonMode, matchedOriginalScript, parsedCustomByteMap, settings.defaultCharacterByteValue]);


  const displayedBlocksForView = useMemo(() => {
    const blocks = activeMainScript?.blocks || [];
    return showOnlyOverflowingBlocks ? blocks.filter(b => b.isOverflowing) : blocks;
  }, [activeMainScript, showOnlyOverflowingBlocks]);


  const handleBlockContentChangeForCell = useCallback((blockOriginalIndexInActiveScript: number, newContent: string) => {
    if (!activeMainScript) return;
    
    // Byte restriction logic for BlockCell
    if (settings.comparisonModeEnabled && settings.enableByteRestrictionInComparisonMode && matchedOriginalScript) {
        const originalBlock = matchedOriginalScript.blocks.find(b => b.index === blockOriginalIndexInActiveScript);
        if (originalBlock) {
            const newContentLines = newContent.split('\n');
            const originalContentLines = originalBlock.content.split('\n');

            if (newContentLines.length > originalContentLines.length) {
                alert(`Error for Block ${blockOriginalIndexInActiveScript + 1}: Line count cannot exceed original (${originalContentLines.length} lines). Change not applied.`);
                return; 
            }

            for (let i = 0; i < newContentLines.length; i++) {
                const currentLineBytes = textMetricsService.calculateLineMetrics(newContentLines[i], parsedCustomByteMap, settings.defaultCharacterByteValue).bytes;
                const originalLineBytes = textMetricsService.calculateLineMetrics(originalContentLines[i] || "", parsedCustomByteMap, settings.defaultCharacterByteValue).bytes;

                if (currentLineBytes > originalLineBytes) {
                    alert(`Error for Block ${blockOriginalIndexInActiveScript + 1}, Line ${i + 1}: Exceeds original byte limit (${currentLineBytes} > ${originalLineBytes} bytes). Change not applied.`);
                    return; 
                }
            }
        }
    }


    setMainScripts(prevScripts =>
      prevScripts.map(script => {
        if (script.id === activeMainScript.id) {
          return {
            ...script,
            blocks: script.blocks.map(b =>
              b.index === blockOriginalIndexInActiveScript ? { ...b, content: newContent, isOverflowing: false, lineMetricDetails: undefined } : b
            )
          };
        }
        return script;
      })
    );
    if (activeMainScript.id === activeMainScriptId && blockOriginalIndexInActiveScript === currentBlockIndex && viewMode === 'single') {
      handleSettingsChange('text', newContent);
    }
    setCurrentFindMatch(null);
    setFindResultsMessage("");
  }, [activeMainScript, activeMainScriptId, currentBlockIndex, viewMode, handleSettingsChange, settings.comparisonModeEnabled, settings.enableByteRestrictionInComparisonMode, matchedOriginalScript, parsedCustomByteMap, settings.defaultCharacterByteValue]);


  const handleSetCurrentBlockIndex = useCallback((indexInActiveScript: number | null) => {
      if (activeMainScript) {
        if (indexInActiveScript !== null && indexInActiveScript >= 0 && indexInActiveScript < activeMainScript.blocks.length) {
          setCurrentBlockIndex(indexInActiveScript);
          if (viewMode === 'single') {
            handleSettingsChange('text', activeMainScript.blocks[indexInActiveScript].content);
          }
        } else if (indexInActiveScript === null) {
          setCurrentBlockIndex(null);
          if (viewMode === 'single' && activeMainScript.blocks.length === 0) {
            handleSettingsChange('text', DEFAULT_SETTINGS.text);
          }
        }
      } else {
        setCurrentBlockIndex(null);
         if (viewMode === 'single') {
            handleSettingsChange('text', DEFAULT_SETTINGS.text);
         }
      }
      setFindResultsMessage(""); 
      setCurrentFindMatch(null);
      setLastSearchIterationDetails(null); 
      setByteRestrictionWarning(null);
  }, [activeMainScript, viewMode, handleSettingsChange]);

  const handleMainPreviewOverflowStatusChange = useCallback((isCurrentlyOverflowing: boolean) => {
    if (!activeMainScript || currentBlockIndex === null) return;
    const currentBlock = activeMainScript.blocks[currentBlockIndex];
    if (currentBlock && currentBlock.isOverflowing === isCurrentlyOverflowing) return;

    setMainScripts(prevScripts =>
      prevScripts.map(script => {
        if (script.id === activeMainScript.id) {
          return {
            ...script,
            blocks: script.blocks.map((b, idx) =>
              idx === currentBlockIndex ? { ...b, isOverflowing: isCurrentlyOverflowing } : b
            ),
          };
        }
        return script;
      })
    );
  }, [activeMainScript, currentBlockIndex]);

  const handleBlockCellOverflowChange = useCallback((blockOriginalIdx: number, isOverflowing: boolean) => {
    if (!activeMainScript) return;
     setMainScripts(prevScripts =>
      prevScripts.map(script => {
        if (script.id === activeMainScript.id) {
          const targetBlock = script.blocks.find(b => b.index === blockOriginalIdx);
          if (targetBlock && targetBlock.isOverflowing === isOverflowing) {
             return script;
          }
          return {
            ...script,
            blocks: script.blocks.map(b =>
              b.index === blockOriginalIdx ? { ...b, isOverflowing } : b
            ),
          };
        }
        return script;
      })
    );
  }, [activeMainScript]);

  const getRegexForFind = useCallback(() => {
    if (!findText) return null;
    const flags = findIsCaseSensitive ? 'g' : 'gi'; 
    const pattern = findMatchWholeWord
      ? `\\b${findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`
      : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      return new RegExp(pattern, flags);
    } catch (e) {
      setFindResultsMessage(`Error: Invalid RegEx pattern in Find term.`);
      setFindResultSummary([]);
      return null;
    }
  }, [findText, findIsCaseSensitive, findMatchWholeWord]);

  const updateFindResultSummary = useCallback(() => {
    if (!findText || findScope === 'currentBlock') { 
      setFindResultSummary([]);
      if (!findText) setFindResultsMessage("");
      return;
    }
    const regex = getRegexForFind();
    if (!regex) {
      setFindResultSummary([]);
      return;
    }
  
    const summary: FindResultSummaryItem[] = [];
    let totalMatchesOverall = 0;
  
    if (findScope === 'activeScript' && activeMainScript) {
      activeMainScript.blocks.forEach(block => {
        const blockRegex = new RegExp(regex); 
        
        let match;
        let countInBlock = 0;
        while ((match = blockRegex.exec(block.content)) !== null) {
          countInBlock++;
        }
        if (countInBlock > 0) {
          summary.push({
            id: `${activeMainScript.id}-${block.index}`, 
            name: `Block ${block.index + 1}`,
            count: countInBlock,
            type: 'block',
            scriptId: activeMainScript.id,
            blockOriginalIndex: block.index,
          });
          totalMatchesOverall += countInBlock;
        }
      });
    } else if (findScope === 'allScripts') {
      mainScripts.forEach(script => {
        let countInScript = 0;
        script.blocks.forEach(block => {
          const blockRegex = new RegExp(regex); 
          
          let match;
          while ((match = blockRegex.exec(block.content)) !== null) {
            countInScript++;
          }
        });
        if (countInScript > 0) {
          summary.push({
            id: script.id,
            name: script.name,
            count: countInScript,
            type: 'script',
            scriptId: script.id,
          });
          totalMatchesOverall += countInScript;
        }
      });
    }
  
    setFindResultSummary(summary);
    if (findText) {
      if (totalMatchesOverall > 0) {
        setFindResultsMessage(`Found ${totalMatchesOverall} total match(es).`);
      } else {
        setFindResultsMessage("No matches found in the selected scope.");
      }
    }
  
  }, [findText, getRegexForFind, findScope, activeMainScript, mainScripts]);


  useEffect(() => {
    if (mainScripts.length > 0) { 
        updateFindResultSummary();
    } else {
        setFindResultSummary([]);
        setFindResultsMessage(findText ? "Load a script to perform find." : "");
    }
  }, [findText, findIsCaseSensitive, findMatchWholeWord, findScope, mainScripts, updateFindResultSummary]);


  const handleFindNext = useCallback(() => {
    if (!findText) {
      setFindResultsMessage("Find text is empty.");
      setCurrentFindMatch(null);
      return;
    }
    const regex = getRegexForFind();
    if (!regex) return;

    let scriptsToSearch: ScriptFile[] = [];
    if (findScope === 'allScripts') {
      scriptsToSearch = mainScripts;
    } else if (activeMainScript) { 
      scriptsToSearch = [activeMainScript];
    }

    if (scriptsToSearch.length === 0) {
      setFindResultsMessage("No scripts to search.");
      return;
    }

    let startScriptIdx = 0;
    let startBlockOriginalIdx = 0;
    let startCharIdxInBlock = 0;

    if (lastSearchIterationDetails && lastSearchIterationDetails.scriptId) {
      const lastScriptIndex = scriptsToSearch.findIndex(s => s.id === lastSearchIterationDetails.scriptId);
      if (lastScriptIndex !== -1) {
        startScriptIdx = lastScriptIndex;
        startBlockOriginalIdx = lastSearchIterationDetails.blockOriginalIndex;
        startCharIdxInBlock = lastSearchIterationDetails.searchStartIndexInBlock;
      }
    }
    
    if (findScope === 'currentBlock' && viewMode === 'single' && activeMainScript && currentBlockIndex !== null) {
        const currentBlockContent = settings.text; 
        regex.lastIndex = lastSearchIterationDetails?.searchStartIndexInBlock || 0;
        const match = regex.exec(currentBlockContent);

        if (match) {
            const matchDetails: FoundMatch = {
                scriptId: activeMainScript.id,
                blockIndex: currentBlockIndex, 
                charStartIndex: match.index,
                charEndIndex: regex.lastIndex,
            };
            setCurrentFindMatch(matchDetails);
            setLastSearchIterationDetails({
                scriptId: activeMainScript.id,
                blockOriginalIndex: currentBlockIndex,
                searchStartIndexInBlock: regex.lastIndex,
            });
            setFindResultsMessage(`Found in current block at position ${match.index + 1}.`);
            if (mainTextAreaRef.current) {
                mainTextAreaRef.current.focus();
                mainTextAreaRef.current.setSelectionRange(match.index, regex.lastIndex);
            }
            return;
        } else {
            if (lastSearchIterationDetails?.searchStartIndexInBlock !== 0) {
                setLastSearchIterationDetails({ 
                    scriptId: activeMainScript.id,
                    blockOriginalIndex: currentBlockIndex,
                    searchStartIndexInBlock: 0,
                });
                setFindResultsMessage("No more matches in current block. Click 'Find Next' to search from beginning of block.");
            } else {
                setFindResultsMessage("No matches found in current block.");
            }
            setCurrentFindMatch(null);
            return;
        }
    }


    for (let i = startScriptIdx; i < scriptsToSearch.length; i++) {
      const script = scriptsToSearch[i];
      const blocksInScript = script.blocks;
      
      let currentBlockArrIdx = 0;
      if (i === startScriptIdx && lastSearchIterationDetails) {
         const foundBIdx = blocksInScript.findIndex(b => b.index === startBlockOriginalIdx);
         if (foundBIdx !== -1) currentBlockArrIdx = foundBIdx;
         else startCharIdxInBlock = 0; 
      } else {
         startCharIdxInBlock = 0; 
      }

      for (let j = currentBlockArrIdx; j < blocksInScript.length; j++) {
        const block = blocksInScript[j];
        regex.lastIndex = (i === startScriptIdx && block.index === startBlockOriginalIdx) ? startCharIdxInBlock : 0;
        
        const match = regex.exec(block.content);
        if (match) {
          const matchDetails: FoundMatch = {
            scriptId: script.id,
            blockIndex: block.index,
            charStartIndex: match.index,
            charEndIndex: regex.lastIndex,
          };
          setCurrentFindMatch(matchDetails);
          setLastSearchIterationDetails({
            scriptId: script.id,
            blockOriginalIndex: block.index,
            searchStartIndexInBlock: regex.lastIndex,
          });

          if (viewMode === 'single') {
            if (script.id !== activeMainScriptId) { 
                handleSetActiveMainScriptId(script.id);
            }
            if (block.index !== currentBlockIndex || script.id !== activeMainScriptId) {
              handleSetCurrentBlockIndex(block.index); 
              setFindResultsMessage(`Found in Script: ${script.name}, Block: ${block.index + 1}. Switched to block.`);
            } else { 
               setFindResultsMessage(`Found in Script: ${script.name}, Block: ${block.index + 1} at pos ${match.index + 1}.`);
               if (mainTextAreaRef.current) { 
                  mainTextAreaRef.current.focus();
                  mainTextAreaRef.current.setSelectionRange(match.index, regex.lastIndex);
                }
            }
          } else { 
             setFindResultsMessage(`Found in Script: ${script.name}, Block: ${block.index + 1}. Scroll to view.`);
          }
          return;
        }
        if (i === startScriptIdx && block.index === startBlockOriginalIdx) {
            startCharIdxInBlock = 0; 
        }
      }
    }

    if (lastSearchIterationDetails) { 
      setFindResultsMessage("No more matches. Click 'Find Next' to search from the beginning.");
      setLastSearchIterationDetails(null); 
      setCurrentFindMatch(null);
    } else {
      setFindResultsMessage("No matches found.");
      setCurrentFindMatch(null);
    }
  }, [findText, getRegexForFind, mainScripts, activeMainScript, activeMainScriptId, lastSearchIterationDetails, findScope, viewMode, currentBlockIndex, settings.text, handleSetCurrentBlockIndex, handleSetActiveMainScriptId]);

  useEffect(() => {
    if (viewMode === 'single' && currentFindMatch && mainTextAreaRef.current &&
        activeMainScriptId === currentFindMatch.scriptId &&
        currentBlockIndex === currentFindMatch.blockIndex) {
      
      const targetBlock = activeScriptBlocks.find(b => b.index === currentBlockIndex);
      if (targetBlock && settings.text === targetBlock.content) { 
          mainTextAreaRef.current.focus();
          mainTextAreaRef.current.setSelectionRange(currentFindMatch.charStartIndex, currentFindMatch.charEndIndex);
      }
    }
  }, [currentFindMatch, viewMode, activeMainScriptId, currentBlockIndex, settings.text, activeScriptBlocks]);


  const handleReplace = useCallback(() => {
    if (!currentFindMatch || !findText) {
      setFindResultsMessage("No active match to replace, or Find text is empty. Click 'Find Next'.");
      if (!currentFindMatch && findText) handleFindNext();
      return;
    }
    if (replaceText === undefined) {
        setFindResultsMessage("Replace text is not set.");
        return;
    }

    const { scriptId, blockIndex, charStartIndex, charEndIndex } = currentFindMatch;
    let success = false;
    let searchStartIndexAfterReplace = 0;
    const oldContentForReplacementCheck = scriptId === activeMainScript?.id && blockIndex === currentBlockIndex && viewMode === 'single'
      ? settings.text
      : mainScripts.find(s => s.id === scriptId)?.blocks.find(b => b.index === blockIndex)?.content;
      
    if (!oldContentForReplacementCheck) {
        setFindResultsMessage("Failed to replace. Original content for match not found.");
        setCurrentFindMatch(null);
        return;
    }
    
    // Verify the match is still valid before replacing
    const regexForVerify = getRegexForFind();
    if (!regexForVerify) {
         setFindResultsMessage("Failed to replace. Invalid find pattern.");
         return;
    }
    regexForVerify.lastIndex = charStartIndex; // Start search from the original match position
    const verifyMatch = regexForVerify.exec(oldContentForReplacementCheck);
    if (!verifyMatch || verifyMatch.index !== charStartIndex || regexForVerify.lastIndex !== charEndIndex) {
        setFindResultsMessage("Match is stale, content may have changed. Please Find Next and try again.");
        setCurrentFindMatch(null); 
        return;
    }


    if (findScope === 'currentBlock' && viewMode === 'single' && activeMainScript && scriptId === activeMainScript.id && blockIndex === currentBlockIndex) {
        const currentBlockContent = settings.text;
        const newText = currentBlockContent.substring(0, charStartIndex) + replaceText + currentBlockContent.substring(charEndIndex);
        searchStartIndexAfterReplace = charStartIndex + replaceText.length;
        handleCurrentBlockContentChangeInSingleView(newText); 
        success = true;
    } else {
        setMainScripts(prevScripts => {
            return prevScripts.map(script => {
                if (script.id === scriptId) {
                const newBlocks = script.blocks.map(block => {
                    if (block.index === blockIndex) {
                        const newContent = block.content.substring(0, charStartIndex) + replaceText + block.content.substring(charEndIndex);
                        searchStartIndexAfterReplace = charStartIndex + replaceText.length;
                        success = true;
                        if (script.id === activeMainScriptId && block.index === currentBlockIndex && viewMode === 'single') {
                            handleSettingsChange('text', newContent);
                        }
                        return { ...block, content: newContent, isOverflowing: false, lineMetricDetails: undefined };
                    }
                    return block;
                });
                return { ...script, blocks: newBlocks };
                }
                return script;
            });
        });
    }
    
    if (success) {
        setCurrentFindMatch(null); 
        setLastSearchIterationDetails({ 
            scriptId: scriptId,
            blockOriginalIndex: blockIndex,
            searchStartIndexInBlock: searchStartIndexAfterReplace,
        });
        setFindResultsMessage("Replaced. Finding next...");
        updateFindResultSummary(); 
        setTimeout(() => handleFindNext(), 50); 
    } else {
        setFindResultsMessage("Failed to replace. Match might be stale or content was not found.");
        setCurrentFindMatch(null); 
    }

  }, [currentFindMatch, findText, replaceText, mainScripts, activeMainScript, currentBlockIndex, viewMode, settings.text, handleFindNext, handleSettingsChange, handleCurrentBlockContentChangeInSingleView, findScope, activeMainScriptId, updateFindResultSummary, getRegexForFind]);

  const handleReplaceAll = useCallback(() => {
    if (!findText) {
      setFindResultsMessage("Find text is empty.");
      return;
    }
     if (replaceText === undefined) {
        setFindResultsMessage("Replace text is not set.");
        return;
    }
    const regex = getRegexForFind(); 
    if (!regex) return;

    let scriptsToUpdate: ScriptFile[] = [];
    if (findScope === 'allScripts') {
      scriptsToUpdate = mainScripts;
    } else if (findScope === 'activeScript' && activeMainScript) {
      scriptsToUpdate = [activeMainScript];
    } else if (findScope === 'currentBlock' && viewMode === 'single' && activeMainScript && currentBlockIndex !== null) {
        const currentTextAreaContent = settings.text;
        const freshRegex = getRegexForFind(); 
        if (freshRegex && currentTextAreaContent.match(freshRegex)) {
            const newText = currentTextAreaContent.replace(freshRegex, replaceText);
            let replacements = 0;
            currentTextAreaContent.replace(freshRegex, () => { replacements++; return ''; });
            handleCurrentBlockContentChangeInSingleView(newText);
            setFindResultsMessage(`Replaced ${replacements} occurrence(s) in the current block.`);
        } else {
            setFindResultsMessage("No occurrences found in the current block to replace.");
        }
        setCurrentFindMatch(null);
        setLastSearchIterationDetails(null);
        updateFindResultSummary(); 
        return;
    } else {
        setFindResultsMessage("Invalid scope for Replace All or no active script/block.");
        return;
    }

    if (scriptsToUpdate.length === 0) {
      setFindResultsMessage("No scripts to search for Replace All.");
      return;
    }

    let totalReplacements = 0;
    let blocksAffected = 0;

    const updatedScripts = scriptsToUpdate.map(script => {
      let scriptHadChanges = false;
      const newBlocks = script.blocks.map(block => {
        const freshRegexForBlock = getRegexForFind(); 
        if (freshRegexForBlock && block.content.match(freshRegexForBlock)) {
          let blockReplacements = 0;
          block.content.replace(freshRegexForBlock, () => { blockReplacements++; return ""; });
          
          if (blockReplacements > 0) {
            const newContent = block.content.replace(freshRegexForBlock, replaceText);
            totalReplacements += blockReplacements;
            blocksAffected++;
            scriptHadChanges = true;
            if (script.id === activeMainScriptId && block.index === currentBlockIndex && viewMode === 'single') {
              handleSettingsChange('text', newContent);
            }
            return { ...block, content: newContent, isOverflowing: false, lineMetricDetails: undefined };
          }
        }
        return block;
      });
      return scriptHadChanges ? { ...script, blocks: newBlocks } : script;
    });

    setMainScripts(prevMainScripts => 
        prevMainScripts.map(ms => {
            const updatedVersion = updatedScripts.find(us => us.id === ms.id);
            return updatedVersion || ms;
        })
    );
    
    if (totalReplacements > 0) {
      setFindResultsMessage(`Replaced ${totalReplacements} occurrence(s) across ${blocksAffected} block(s).`);
    } else {
      setFindResultsMessage("No occurrences found to replace.");
    }
    setCurrentFindMatch(null);
    setLastSearchIterationDetails(null);
    updateFindResultSummary(); 
  }, [findText, replaceText, getRegexForFind, mainScripts, activeMainScript, activeMainScriptId, findScope, viewMode, currentBlockIndex, settings.text, handleSettingsChange, handleCurrentBlockContentChangeInSingleView, updateFindResultSummary]);

  const onFindTextChange = (text: string) => { setFindText(text); setCurrentFindMatch(null); setLastSearchIterationDetails(null); };
  const onReplaceTextChange = (text: string) => setReplaceText(text);
  const onFindIsCaseSensitiveChange = (value: boolean) => { setFindIsCaseSensitive(value); setCurrentFindMatch(null); setLastSearchIterationDetails(null);};
  const onFindMatchWholeWordChange = (value: boolean) => { setFindMatchWholeWord(value); setCurrentFindMatch(null); setLastSearchIterationDetails(null);};
  const onFindScopeChange = (scope: FindScope) => { setFindScope(scope); setCurrentFindMatch(null); setLastSearchIterationDetails(null);};

  const handleNavigateToFindResult = useCallback(async (item: FindResultSummaryItem) => {
    setCurrentFindMatch(null); 
    setLastSearchIterationDetails(null);
  
    if (item.scriptId !== activeMainScriptId) {
      handleSetActiveMainScriptId(item.scriptId);
      await new Promise(resolve => setTimeout(resolve, 0)); 
    }
  
    if (item.type === 'block' && item.blockOriginalIndex !== undefined) {
      if (viewMode !== 'single') {
        setViewMode('single');
        await new Promise(resolve => setTimeout(resolve, 0)); 
      }
      handleSetCurrentBlockIndex(item.blockOriginalIndex);
      await new Promise(resolve => setTimeout(resolve, 0)); 
  
      setTimeout(() => {
        const currentActiveScript = mainScripts.find(s => s.id === item.scriptId);
        const targetBlock = currentActiveScript?.blocks.find(b => b.index === item.blockOriginalIndex);

        if (!targetBlock || !mainTextAreaRef.current) {
             setFindResultsMessage(`Error navigating to ${item.name}. Block not found or text area unavailable.`);
             return;
        }
        const regex = getRegexForFind();
        if (!regex) return;
        
        regex.lastIndex = 0; 
        const match = regex.exec(targetBlock.content); 
  
        if (match) {
          const matchDetails: FoundMatch = {
            scriptId: item.scriptId,
            blockIndex: item.blockOriginalIndex || 0,
            charStartIndex: match.index,
            charEndIndex: regex.lastIndex,
          };
          setCurrentFindMatch(matchDetails); 
          setLastSearchIterationDetails({
            scriptId: item.scriptId,
            blockOriginalIndex: item.blockOriginalIndex || 0,
            searchStartIndexInBlock: regex.lastIndex,
          });
          setFindResultsMessage(`Navigated to ${item.name}. Match highlighted.`);
        } else {
           setFindResultsMessage(`No matches found in ${item.name} upon navigation (content might have changed).`);
        }
      }, 100); 
  
    } else if (item.type === 'script') {
      const scriptToSearch = mainScripts.find(s => s.id === item.scriptId);
      if (!scriptToSearch) return;
  
      const regex = getRegexForFind();
      if (!regex) return;
  
      let firstMatchInScript: FoundMatch | null = null;
      for (const block of scriptToSearch.blocks) {
        const blockRegex = new RegExp(regex); 
        const match = blockRegex.exec(block.content);
        if (match) {
          firstMatchInScript = {
            scriptId: scriptToSearch.id,
            blockIndex: block.index,
            charStartIndex: match.index,
            charEndIndex: blockRegex.lastIndex,
          };
          break;
        }
      }
  
      if (firstMatchInScript) {
        if (viewMode !== 'single') {
          setViewMode('single');
          await new Promise(resolve => setTimeout(resolve, 0)); 
        }
        handleSetCurrentBlockIndex(firstMatchInScript.blockIndex);
        await new Promise(resolve => setTimeout(resolve, 0)); 

        setCurrentFindMatch(firstMatchInScript); 
        setLastSearchIterationDetails({ 
          scriptId: firstMatchInScript.scriptId,
          blockOriginalIndex: firstMatchInScript.blockIndex,
          searchStartIndexInBlock: firstMatchInScript.charEndIndex,
        });
        setFindResultsMessage(`Navigated to script ${scriptToSearch.name}, first match in Block ${firstMatchInScript.blockIndex + 1} highlighted.`);
      } else {
        setFindResultsMessage(`No matches found in script ${scriptToSearch.name} upon navigation (content might have changed).`);
        if (scriptToSearch.blocks.length > 0) {
          handleSetCurrentBlockIndex(0);
        } else {
          handleSetCurrentBlockIndex(null);
        }
      }
    }
  }, [activeMainScriptId, handleSetActiveMainScriptId, viewMode, setViewMode, handleSetCurrentBlockIndex, mainScripts, getRegexForFind]);

  const handleGitHubSettingsChange = useCallback(<K extends keyof GitHubSettings>(key: K, value: GitHubSettings[K]) => {
    setGitHubSettings(prev => ({ ...prev, [key]: value }));
    setGitHubStatusMessage("");
  }, []);

  const handleLoadFileFromGitHubInternal = useCallback(async (scriptSet: 'main' | 'original1' | 'original2') => {
    let currentPath = "";
    if (scriptSet === 'main') currentPath = gitHubSettings.filePath;
    else if (scriptSet === 'original1') currentPath = gitHubSettings.originalFilePath;
    else if (scriptSet === 'original2') currentPath = gitHubSettings.secondaryOriginalFilePath;
    
    if (!gitHubSettings.pat || !gitHubSettings.repoFullName || !currentPath) {
      setGitHubStatusMessage(`Error: PAT, Repository, and File Path for ${scriptSet} are required.`);
      return;
    }
    setIsGitHubLoading(true);
    setGitHubStatusMessage(`Loading ${scriptSet} file from GitHub...`);

    const [owner, repo] = gitHubSettings.repoFullName.split('/');
    if (!owner || !repo) {
      setGitHubStatusMessage("Error: Repository format must be 'owner/repo-name'.");
      setIsGitHubLoading(false);
      return;
    }

    try {
      const octokit = new Octokit({ auth: gitHubSettings.pat });
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path: currentPath,
        ref: gitHubSettings.branch || undefined,
      });

      if (response.data && 'content' in response.data && response.data.encoding === 'base64') {
        const rawText = base64ToUtf8(response.data.content);
        
        await processAndAddFiles(
          new FileListLike([{ name: currentPath.split('/').pop() || currentPath, content: rawText }]),
          scriptSet,
          `GitHub: (${owner}/${repo}) `
        );

        setGitHubStatusMessage(`Successfully loaded ${scriptSet} file: ${currentPath.split('/').pop()}.`);
      } else {
        setGitHubStatusMessage("Error: Could not decode file content from GitHub or content not found.");
      }
    } catch (error: any) {
      console.error(`Error loading ${scriptSet} file from GitHub:`, error);
      setGitHubStatusMessage(`Error: ${error.message || `Failed to load ${scriptSet} file from GitHub.`}`);
    } finally {
      setIsGitHubLoading(false);
    }
  }, [gitHubSettings, processAndAddFiles]);

  const handleLoadFileFromGitHub = useCallback(() => handleLoadFileFromGitHubInternal('main'), [handleLoadFileFromGitHubInternal]);
  const handleLoadFileFromGitHubForOriginal = useCallback(() => handleLoadFileFromGitHubInternal('original1'), [handleLoadFileFromGitHubInternal]);
  const handleLoadFileFromGitHubForSecondaryOriginal = useCallback(() => handleLoadFileFromGitHubInternal('original2'), [handleLoadFileFromGitHubInternal]);


  const handleLoadAllFromGitHubFolderInternal = useCallback(async (scriptSet: 'main' | 'original1' | 'original2') => {
    let currentPath = "";
    if (scriptSet === 'main') currentPath = gitHubSettings.filePath;
    else if (scriptSet === 'original1') currentPath = gitHubSettings.originalFilePath;
    else if (scriptSet === 'original2') currentPath = gitHubSettings.secondaryOriginalFilePath;

    if (!gitHubSettings.pat || !gitHubSettings.repoFullName || !currentPath) {
      setGitHubStatusMessage(`Error: PAT, Repository, and Folder Path for ${scriptSet} are required.`);
      return;
    }
    setIsGitHubLoading(true);
    setGitHubStatusMessage(`Loading ${scriptSet} scripts from GitHub folder...`);
    let loadedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const statusMessages: string[] = [];

    const [owner, repo] = gitHubSettings.repoFullName.split('/');
    if (!owner || !repo) {
      setGitHubStatusMessage("Error: Repository format must be 'owner/repo-name'.");
      setIsGitHubLoading(false);
      return;
    }

    const filesToProcess: { name: string, content: string }[] = [];

    try {
      const octokit = new Octokit({ auth: gitHubSettings.pat });
      const { data: folderContents } = await octokit.repos.getContent({
        owner,
        repo,
        path: currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath,
        ref: gitHubSettings.branch || undefined,
      });

      if (Array.isArray(folderContents)) {
        for (const item of folderContents) {
          if (item.type === 'file') {
            try {
              const { data: fileContentResponse } = await octokit.repos.getContent({
                owner,
                repo,
                path: item.path,
                ref: gitHubSettings.branch || undefined,
              });
              
              if (fileContentResponse && 'content' in fileContentResponse && fileContentResponse.encoding === 'base64') {
                let rawText = "";
                try {
                  rawText = base64ToUtf8(fileContentResponse.content);
                } catch (decodeError) {
                  console.warn(`Skipped ${item.name} due to Base64 decoding error:`, decodeError);
                  statusMessages.push(`Skipped ${item.name} (decoding error).`);
                  skippedCount++;
                  continue;
                }

                if (rawText.includes('\uFFFD') && !rawText.startsWith('\uFEFF')) { 
                    statusMessages.push(`Skipped ${item.name} (likely binary or wrong encoding).`);
                    skippedCount++;
                    continue;
                }
                filesToProcess.push({ name: item.name, content: rawText });
                loadedCount++;
                statusMessages.push(`Prepared ${item.name} for processing.`);
              } else {
                statusMessages.push(`Skipped ${item.name} (not base64 encoded or no content).`);
                skippedCount++;
              }
            } catch (fileError: any) {
              console.error(`Error loading file ${item.name} from GitHub:`, fileError);
              statusMessages.push(`Error loading ${item.name}: ${fileError.message || 'Unknown error'}`);
              errorCount++;
            }
          }
        }
        
        if (filesToProcess.length > 0) {
            await processAndAddFiles(new FileListLike(filesToProcess), scriptSet, `GitHub: (${owner}/${repo}${currentPath ? '/' + currentPath : ''}) `);
        }
        setGitHubStatusMessage(`Folder load complete for ${scriptSet}. Loaded: ${loadedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}. Details: ${statusMessages.slice(0,3).join(' ')}${statusMessages.length > 3 ? '...' : ''}`);

      } else {
        setGitHubStatusMessage("Error: The specified path is not a folder or is empty.");
      }
    } catch (error: any) { 
      console.error(`Error loading from GitHub folder (for ${scriptSet}):`, error);
      setGitHubStatusMessage(`Error: ${error.message || `Failed to load from GitHub folder.`}`);
    } finally {
      setIsGitHubLoading(false);
    }
  }, [gitHubSettings, processAndAddFiles]);

  const handleLoadAllFromGitHubFolder = useCallback(() => handleLoadAllFromGitHubFolderInternal('main'), [handleLoadAllFromGitHubFolderInternal]);
  const handleLoadAllFromGitHubFolderForOriginal = useCallback(() => handleLoadAllFromGitHubFolderInternal('original1'), [handleLoadAllFromGitHubFolderInternal]);
  const handleLoadAllFromGitHubFolderForSecondaryOriginal = useCallback(() => handleLoadAllFromGitHubFolderInternal('original2'), [handleLoadAllFromGitHubFolderInternal]);


  const sanitizeFilename = (name: string): string => {
    let sName = name.replace(/[<>:"/\\|?*]+/g, '_'); 
    sName = sName.replace(/\s+/g, '_'); 
    if (sName.startsWith('.')) {
      sName = '_' + sName.substring(1); 
    }
    if (!/\.(txt|scp|text|md|json|xml|yaml|yml|csv|tsv|ini|cfg|log|srt|vtt|html|htm|js|css)$/i.test(sName)) {
      sName += '.txt';
    }
    return sName.substring(0, 250); 
  };
  
  const handleSaveFileToGitHub = useCallback(async () => {
    if (!gitHubSettings.pat || !gitHubSettings.repoFullName || !gitHubSettings.filePath) {
      setGitHubStatusMessage("Error: PAT, Repository, and Main Script File Path are required for single file save.");
      return;
    }
    if (!activeMainScript) {
      setGitHubStatusMessage("Error: No active script selected to save.");
      return;
    }
    setIsGitHubLoading(true);
    setGitHubStatusMessage("Saving active file to GitHub...");

    const [owner, repo] = gitHubSettings.repoFullName.split('/');
    if (!owner || !repo) {
      setGitHubStatusMessage("Error: Repository format must be 'owner/repo-name'.");
      setIsGitHubLoading(false);
      return;
    }

    let scriptContent = "";
    if (activeMainScript.blocks.length === 0) {
        scriptContent = ""; 
    } else if (activeMainScript.parsedWithLineAsBlock) {
        scriptContent = activeMainScript.blocks.map(block => block.content).join('\n');
    } else if (activeMainScript.parsedWithCustomSeparators) {
      scriptContent = activeMainScript.blocks.map(block => block.content).join('');
    } else if (activeMainScript.parsedWithEmptyLinesSeparator) {
      scriptContent = activeMainScript.blocks.map(block => block.content).join('\n\n');
    } else { // Default parsing
      scriptContent = activeMainScript.blocks.map(block => block.content).join('\n\n');
    }
    
    try {
      const octokit = new Octokit({ auth: gitHubSettings.pat });
      let existingSha: string | undefined = undefined;
      try {
        const { data: fileDataResponse } = await octokit.repos.getContent({
          owner,
          repo,
          path: gitHubSettings.filePath, // Use main script path
          ref: gitHubSettings.branch || undefined,
        });
        if (fileDataResponse && 'sha' in fileDataResponse) {
            existingSha = fileDataResponse.sha;
        }
      } catch (e: any) {
        if (e.status !== 404) throw e;
         setGitHubStatusMessage("File not found on GitHub, creating new file...");
      }

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: gitHubSettings.filePath, // Use main script path
        message: `Update ${gitHubSettings.filePath} via Banana Vision`,
        content: utf8ToBase64(scriptContent), 
        sha: existingSha,
        branch: gitHubSettings.branch || undefined,
      });
       setMainScripts(prevScripts => prevScripts.map(s => s.id === activeMainScript.id ? {...s, rawText: scriptContent } : s));
      setGitHubStatusMessage(`Successfully saved ${activeMainScript.name} to GitHub path: ${gitHubSettings.filePath}.`);
    } catch (error: any) {
      console.error("Error saving to GitHub:", error);
      setGitHubStatusMessage(`Error: ${error.message || 'Failed to save to GitHub.'}`);
    } finally {
      setIsGitHubLoading(false);
    }
  }, [gitHubSettings, activeMainScript]);


const handleSaveAllToGitHubFolder = useCallback(async () => {
    if (!gitHubSettings.pat || !gitHubSettings.repoFullName || !gitHubSettings.filePath) {
      setGitHubStatusMessage("Error: PAT, Repository, and Main Script Folder Path are required.");
      return;
    }
    if (mainScripts.length === 0) {
      setGitHubStatusMessage("No scripts loaded to save.");
      return;
    }

    setIsGitHubLoading(true);
    setGitHubStatusMessage("Saving all modified main scripts to GitHub folder...");
    let savedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;
    const statusMessages: string[] = [];

    const [owner, repo] = gitHubSettings.repoFullName.split('/');
    if (!owner || !repo) {
      setGitHubStatusMessage("Error: Repository format must be 'owner/repo-name'.");
      setIsGitHubLoading(false);
      return;
    }
    const targetFolder = gitHubSettings.filePath.endsWith('/') ? gitHubSettings.filePath : `${gitHubSettings.filePath}/`; // Use main script path

    try {
      const octokit = new Octokit({ auth: gitHubSettings.pat });

      for (const script of mainScripts) {
        let currentScriptContent = "";
        if (script.blocks.length === 0) {
            currentScriptContent = "";
        } else if (script.parsedWithLineAsBlock) {
          currentScriptContent = script.blocks.map(block => block.content).join('\n');
        } else if (script.parsedWithCustomSeparators) {
          currentScriptContent = script.blocks.map(block => block.content).join('');
        } else if (script.parsedWithEmptyLinesSeparator) {
          currentScriptContent = script.blocks.map(block => block.content).join('\n\n');
        } else { // Default parsing
          currentScriptContent = script.blocks.map(block => block.content).join('\n\n');
        }

        if (currentScriptContent === script.rawText) {
          unchangedCount++;
          statusMessages.push(`Script ${script.name} unchanged.`);
          continue;
        }
        
        const fileName = sanitizeFilename(script.name);
        const fullPath = `${targetFolder}${fileName}`;

        try {
          let existingSha: string | undefined = undefined;
          try {
            const { data: fileDataResponse } = await octokit.repos.getContent({
              owner,
              repo,
              path: fullPath,
              ref: gitHubSettings.branch || undefined,
            });
            if (fileDataResponse && 'sha' in fileDataResponse) {
                 existingSha = fileDataResponse.sha;
            }
          } catch (e: any) {
            if (e.status !== 404) throw e; 
          }

          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: fullPath,
            message: `Update ${fileName} via Banana Vision`,
            content: utf8ToBase64(currentScriptContent),
            sha: existingSha,
            branch: gitHubSettings.branch || undefined,
          });
          
          setMainScripts(prevScripts => prevScripts.map(s => s.id === script.id ? {...s, rawText: currentScriptContent } : s));
          savedCount++;
          statusMessages.push(`Saved ${fileName}.`);
        } catch (fileError: any) {
          console.error(`Error saving script ${script.name} to ${fullPath}:`, fileError);
          statusMessages.push(`Error saving ${fileName}: ${fileError.message || 'Unknown error'}`);
          errorCount++;
        }
      }
      setGitHubStatusMessage(`Folder save complete. Saved: ${savedCount}, Unchanged: ${unchangedCount}, Errors: ${errorCount}. Details: ${statusMessages.slice(0,2).join(' ')}${statusMessages.length > 2 ? '...' : ''}`);

    } catch (error: any) { 
      console.error("Error during 'Save All to Folder' operation:", error);
      setGitHubStatusMessage(`Error: ${error.message || 'Failed to save all scripts to GitHub folder.'}`);
    } finally {
      setIsGitHubLoading(false);
    }
  }, [gitHubSettings, mainScripts]);


  const handleLoadCustomFont = useCallback((file: File, desiredCssName: string) => {
    if (!desiredCssName.trim()) {
      alert("Please provide a CSS name for the font.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64FontData = dataUrl.split(',')[1];
      const safeCssName = desiredCssName.trim();
      
      // Update settings with Base64 data and filename
      // This will trigger the useEffect to apply the font
      handleNestedSettingsChange('systemFont', 'customFontBase64', base64FontData);
      handleNestedSettingsChange('systemFont', 'customFontFileName', file.name);
      handleNestedSettingsChange('systemFont', 'fontFamily', safeCssName); // Set fontFamily immediately
    };
    reader.onerror = (error) => {
      console.error("Error reading font file:", error);
      alert("Failed to read font file.");
    };
    reader.readAsDataURL(file);
  }, [handleNestedSettingsChange]);


  useEffect(() => {
    const { customFontBase64, customFontFileName } = settings.systemFont;

    if (settings.currentFontType === 'system' && customFontBase64 && customFontFileName) {
      const { format, mime } = getFontFormatAndMime(customFontFileName);
      const cssFontName = deriveCssNameFromFile(customFontFileName); 
      const dataUrl = `data:${mime};base64,${customFontBase64}`;

      if (loadedCustomFontInfo && loadedCustomFontInfo.name !== cssFontName && loadedCustomFontInfo.styleElement) {
        document.head.removeChild(loadedCustomFontInfo.styleElement);
        setLoadedCustomFontInfo(null);
      }
      
      if (!loadedCustomFontInfo || loadedCustomFontInfo.name !== cssFontName) {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
          @font-face {
            font-family: "${cssFontName}";
            src: url(${dataUrl}) format('${format}');
          }
        `;
        document.head.appendChild(styleElement);
        setLoadedCustomFontInfo({ name: cssFontName, styleElement });
      }

      if (settings.systemFont.fontFamily !== cssFontName) {
         handleNestedSettingsChange('systemFont', 'fontFamily', cssFontName);
      }
    } else if (loadedCustomFontInfo?.styleElement) {
      // Clean up if custom font is no longer active (e.g., switched to bitmap, or cleared custom font)
      // And also if settings.systemFont.fontFamily is not the loaded custom font.
      const isStillUsingThisCustomFont = settings.currentFontType === 'system' && 
                                          settings.systemFont.fontFamily === loadedCustomFontInfo.name &&
                                          customFontBase64 && customFontFileName;

      if (!isStillUsingThisCustomFont) {
          document.head.removeChild(loadedCustomFontInfo.styleElement);
          setLoadedCustomFontInfo(null);
          // If the font family was set to the custom font's name but the base64/filename is gone,
          // it might be good to revert to a default system font, or handle this state.
          // For now, removing the style is the main action. The select dropdown will show the name
          // but it won't be backed by a @font-face rule.
      }
    }
  }, [settings.systemFont.customFontBase64, settings.systemFont.customFontFileName, settings.currentFontType, loadedCustomFontInfo, settings.systemFont.fontFamily, handleNestedSettingsChange]);

  const toggleControlsPanel = () => {
    setIsControlsPanelCollapsed(!isControlsPanelCollapsed);
  };


  const handleAddGlossaryTerm = useCallback((term: string, translation: string, category: GlossaryCategory) => {
    setGlossaryTerms(prev => [...prev, { id: `glossary-${Date.now()}-${Math.random().toString(36).substring(2,7)}`, term, translation, category }]);
  }, []);

  const handleUpdateGlossaryTerm = useCallback((id: string, term: string, translation: string, category: GlossaryCategory) => {
    setGlossaryTerms(prev => prev.map(item => item.id === id ? { ...item, term, translation, category } : item));
  }, []);

  const handleDeleteGlossaryTerm = useCallback((id: string) => {
    if (window.confirm("Are you sure you want to delete this glossary item?")) {
        setGlossaryTerms(prev => prev.filter(item => item.id !== id));
    }
  }, []);

  const lineMetricsForActiveIndexMain = useMemo(() => {
    if (activeLineIndexMain !== null && mainEditorMetrics?.lineDetails && mainEditorMetrics.lineDetails[activeLineIndexMain]) {
      return mainEditorMetrics.lineDetails[activeLineIndexMain];
    }
    return null;
  }, [activeLineIndexMain, mainEditorMetrics]);
  
  const handlePrevBlock = () => {
    if (currentBlockIndex !== null && currentBlockIndex > 0) {
      handleSetCurrentBlockIndex(currentBlockIndex - 1);
    }
  };

  const handleNextBlock = () => {
    if (currentBlockIndex !== null && currentBlockIndex < activeScriptBlocks.length - 1) {
      handleSetCurrentBlockIndex(currentBlockIndex + 1);
    }
  };

  const zoomMargin = useMemo(() => {
    if (viewMode !== 'single' || settings.previewHeight <= 0 || settings.previewZoom <= 1) {
        return 0;
    }
    return (settings.previewHeight * (settings.previewZoom - 1)) / 2;
  }, [viewMode, settings.previewHeight, settings.previewZoom]);

  const baseMargin = 16;
  const dynamicTopMargin = `${baseMargin + zoomMargin}px`;
  const dynamicBottomMargin = `${baseMargin + zoomMargin}px`;

  return (
    <>
      <div className={`app-container flex flex-col h-screen overflow-hidden ${isSpecialSettingsMenuOpen || showTutorial ? 'blur-sm' : ''} font-sans`} style={{paddingTop: `${headerHeight}px`}}>
        <header ref={headerRef} className="fixed top-0 left-0 right-0 z-40 bg-[var(--bv-toolbar-background)] text-[var(--bv-toolbar-text)] p-3 shadow-md flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">🍌 Banana Vision</h1>
              <button 
                  onClick={toggleSpecialSettingsMenu} 
                  className="p-2 rounded-full hover:bg-[var(--bv-element-background-secondary)]" 
                  aria-label="Open Special Settings"
                  title="Open Special Settings"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
              </button>
          </div>
          <Toolbar
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            onExportPng={handleExportPng}
            onToggleLegacyTheme={toggleLegacyTheme}
            currentActiveThemeKey={appThemeSettings.activeThemeKey}
            currentMainView={currentMainView}
            onToggleMainView={() => setCurrentMainView(prev => prev === 'editor' ? 'profilesGallery' : 'editor')}
            onSaveScript={handleSaveScript}
            onSaveAllChangedScripts={handleSaveAllChangedScripts}
            onShowTutorial={handleStartTutorial}
          />
        </header>
        
        {currentMainView === 'profilesGallery' ? (
          <div className="flex-grow overflow-auto">
              <ProfilesGalleryPage
                profiles={profiles}
                onLoadProfile={handleLoadProfile}
                onDeleteProfile={handleDeleteProfile}
                activeThemeKey={appThemeSettings.activeThemeKey}
                currentEditorSettings={settings}
                onSaveCurrentSettingsAsProfile={handleSaveProfile}
              />
          </div>
        ) : (
          <main className="flex-grow flex overflow-hidden">
            <div className={`transition-all duration-300 ease-in-out ${isControlsPanelCollapsed ? 'w-12 hover:w-16' : 'w-1/3 min-w-[380px] max-w-[500px]'} relative bg-[var(--bv-element-background)] border-r border-[var(--bv-border-color)] shadow-lg`}>
              <button 
                onClick={toggleControlsPanel} 
                className="absolute top-1/2 -right-3.5 z-30 p-1.5 bg-[var(--bv-accent-primary)] text-[var(--bv-accent-primary-content)] rounded-full shadow-md hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[var(--bv-input-focus-ring)]"
                style={{transform: 'translateY(-50%)'}}
                aria-label={isControlsPanelCollapsed ? "Expand controls panel" : "Collapse controls panel"}
                title={isControlsPanelCollapsed ? "Expand controls panel" : "Collapse controls panel"}
              >
                {isControlsPanelCollapsed ? '▶' : '◀'}
              </button>
              {!isControlsPanelCollapsed && (
                <ControlsPanel
                  settings={settings}
                  onSettingsChange={handleSettingsChange}
                  onNestedSettingsChange={handleNestedSettingsChange}
                  onTextFileUpload={handleTextFileUpload}
                  mainScripts={mainScripts}
                  activeMainScriptId={activeMainScriptId}
                  onSetActiveMainScriptId={handleSetActiveMainScriptId}
                  onClearMainScripts={handleClearMainScripts}
                  activeScriptBlocks={activeScriptBlocks}
                  currentBlockIndex={currentBlockIndex}
                  onSetCurrentBlockIndex={handleSetCurrentBlockIndex}
                  showOnlyOverflowingBlocks={showOnlyOverflowingBlocks}
                  onShowOnlyOverflowingBlocksChange={setShowOnlyOverflowingBlocks}
                  displayedBlocksForView={displayedBlocksForView}
                  onLoadCustomFont={handleLoadCustomFont}
                  loadedCustomFontName={loadedCustomFontInfo?.name || null}
                  overflowSettingsPanelOpen={overflowSettingsPanelOpen}
                  onToggleOverflowSettingsPanel={() => setOverflowSettingsPanelOpen(prev => !prev)}
                  // Original Script 1 Props
                  originalScripts={originalScripts}
                  onOriginalScriptUpload={handleOriginalScriptUpload}
                  matchedOriginalScriptName={matchedOriginalScript?.name || null}
                  onClearOriginalScripts={handleClearOriginalScripts}
                  onLoadFileFromGitHubForOriginal={handleLoadFileFromGitHubForOriginal}
                  onLoadAllFromGitHubFolderForOriginal={handleLoadAllFromGitHubFolderForOriginal}
                  // Original Script 2 Props
                  secondaryOriginalScripts={secondaryOriginalScripts}
                  onSecondaryOriginalScriptUpload={handleSecondaryOriginalScriptUpload}
                  matchedSecondaryOriginalScriptName={matchedSecondaryOriginalScript?.name || null}
                  onClearSecondaryOriginalScripts={handleClearSecondaryOriginalScripts}
                  onLoadFileFromGitHubForSecondaryOriginal={handleLoadFileFromGitHubForSecondaryOriginal}
                  onLoadAllFromGitHubFolderForSecondaryOriginal={handleLoadAllFromGitHubFolderForSecondaryOriginal}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  findText={findText} onFindTextChange={onFindTextChange}
                  replaceText={replaceText} onReplaceTextChange={onReplaceTextChange}
                  findIsCaseSensitive={findIsCaseSensitive} onFindIsCaseSensitiveChange={onFindIsCaseSensitiveChange}
                  findMatchWholeWord={findMatchWholeWord} onFindMatchWholeWordChange={onFindMatchWholeWordChange}
                  findScope={findScope} onFindScopeChange={onFindScopeChange}
                  onFindNext={handleFindNext} onReplace={handleReplace} onReplaceAll={handleReplaceAll}
                  findResultsMessage={findResultsMessage}
                  isFindCurrentBlockDisabled={viewMode !== 'single' || !activeMainScript || currentBlockIndex === null}
                  findResultSummary={findResultSummary}
                  onNavigateToFindResult={handleNavigateToFindResult}
                  gitHubSettings={gitHubSettings}
                  onGitHubSettingsChange={handleGitHubSettingsChange}
                  onLoadFileFromGitHub={handleLoadFileFromGitHub}
                  onSaveFileToGitHub={handleSaveFileToGitHub}
                  onLoadAllFromGitHubFolder={handleLoadAllFromGitHubFolder}
                  onSaveAllToGitHubFolder={handleSaveAllToGitHubFolder}
                  isGitHubLoading={isGitHubLoading}
                  gitHubStatusMessage={gitHubStatusMessage}
                  activeThemeKey={appThemeSettings.activeThemeKey}
                  // Glossary Props
                  glossaryTerms={glossaryTerms}
                  onAddGlossaryTerm={handleAddGlossaryTerm}
                  onUpdateGlossaryTerm={handleUpdateGlossaryTerm}
                  onDeleteGlossaryTerm={handleDeleteGlossaryTerm}
                />
              )}
              {isControlsPanelCollapsed && (
                 <div className="flex items-center justify-center h-full">
                    <span className="transform -rotate-90 whitespace-nowrap text-sm text-[var(--bv-text-secondary)]">Controls</span>
                  </div>
              )}
            </div>
            <div ref={previewContainerRef} className="flex-grow p-4 overflow-auto bg-[var(--bv-page-background)] flex flex-col items-center">
              {viewMode === 'single' ? (
                <div className="w-full h-full flex flex-col">
                  <div className="flex-grow w-full flex flex-row items-stretch justify-center gap-4">
                    
                    {/* --- Card 1: Editable --- */}
                    <div className="bg-[var(--bv-element-background)] p-4 rounded-lg shadow-md border border-[var(--bv-border-color)] flex flex-col gap-3 flex-1 min-w-[320px]">
                      <h3 className="text-center font-semibold text-[var(--bv-text-primary)] truncate" title={activeMainScript ? `Current Block Content (Editable)(Block ${currentBlockIndex !== null ? currentBlockIndex + 1 : '-'} of Script: ${activeMainScript.name})` : 'Current Block Content (Editable)'}>
                          Current Block Content (Editable)
                      </h3>

                      <div className="relative flex justify-center">
                        <div className="preview-component-wrapper flex justify-center items-center" 
                            style={{ 
                                    width: settings.previewWidth > 0 ? `${settings.previewWidth}px` : 'auto', 
                                    height: settings.previewHeight > 0 ? `${settings.previewHeight}px` : 'auto',
                                    minWidth: settings.previewWidth === 0 ? '150px' : undefined,
                                    minHeight: settings.previewHeight === 0 ? '100px' : undefined,
                                    marginTop: dynamicTopMargin,
                                    marginBottom: dynamicBottomMargin,
                            }}
                        >
                          <PreviewArea
                              ref={previewRef}
                              key={`preview-main-${globalBitmapCacheId}`} 
                              baseSettings={settings}
                              textOverride={settings.text}
                              setIsOverflowing={handleMainPreviewOverflowStatusChange}
                              onNestedSettingsChange={handleNestedSettingsChange}
                              showPixelMarginGuides={settings.pixelOverflowMargins.enabled && overflowSettingsPanelOpen}
                              isReadOnlyPreview={false}
                              activeThemeKey={appThemeSettings.activeThemeKey}
                              bitmapCharCache={globalBitmapCharCache} 
                              bitmapCacheId={globalBitmapCacheId}   
                          />
                        </div>
                        {activeMainScript && activeMainScript.blocks[currentBlockIndex || 0]?.isOverflowing && (
                          <div className="absolute top-1 right-1 bg-red-600 text-white rounded-sm w-5 h-5 flex items-center justify-center font-bold text-sm shadow-lg" title="Overflowing Content!">
                            !
                          </div>
                        )}
                      </div>
                      
                      <div className="w-full flex flex-col">
                          <label htmlFor="main-text-area" className="block text-sm font-medium text-[var(--bv-text-primary)] mb-1 truncate" title={activeMainScript && currentBlockIndex !== null ? `Block ${currentBlockIndex + 1} of Script: ${activeMainScript.name}` : "Block Content"}>
                            {activeMainScript && currentBlockIndex !== null ? `Block ${currentBlockIndex + 1} of Script: ${activeMainScript.name}` : "Block Content"}
                          </label>
                          <div className="relative w-full">
                            <textarea
                              id="main-text-area"
                              ref={mainTextAreaRef}
                              aria-label="Current block content editor"
                              value={settings.text}
                              onChange={(e) => handleCurrentBlockContentChangeInSingleView(e.target.value)}
                              onSelect={handleMainTextAreaActivity}
                              onFocus={handleMainTextAreaActivity}
                              onBlur={() => setActiveLineIndexMain(null)}
                              onKeyUp={handleMainTextAreaActivity}
                              onClick={handleMainTextAreaActivity}
                              className="w-full p-2 border rounded-md shadow-sm sm:text-sm resize-y
                                          bg-[var(--bv-input-background)] border-[var(--bv-input-border)] text-[var(--bv-input-text)]
                                          focus:ring-[var(--bv-input-focus-ring)] focus:border-[var(--bv-input-focus-ring)] pr-8"
                              disabled={!activeMainScript || currentBlockIndex === null}
                            />
                            {currentEditableBlockForSingleView && (
                              <div className="absolute bottom-2 right-2 text-blue-500" title="Content is saved">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-[var(--bv-text-secondary)] mt-1 mb-1 h-auto flex flex-col items-start">
                              <span>Selected: {selectedTextLengthMain} char(s)</span>
                              {activeLineIndexMain !== null && lineMetricsForActiveIndexMain ? (
                                <span>Line {activeLineIndexMain + 1}: {lineMetricsForActiveIndexMain.chars} chars, {lineMetricsForActiveIndexMain.bytes} bytes, {lineMetricsForActiveIndexMain.bytes * 8} bits</span>
                              ) : mainEditorMetrics ? (
                                <span>Total: {mainEditorMetrics.totalChars} chars, {mainEditorMetrics.totalBytes} bytes, {mainEditorMetrics.totalBits} bits</span>
                              ) : (
                                <span>Total: 0 chars, 0 bytes, 0 bits</span>
                              )}
                          </div>
                          {byteRestrictionWarning && (
                            <span className="my-1 text-red-500 text-xs self-start font-semibold">{byteRestrictionWarning}</span>
                          )}
                          {settings.comparisonModeEnabled && settings.enableByteRestrictionInComparisonMode && mainEditorLineMetricDetails.length > 0 && (
                              <div className="mt-0 text-xs text-[var(--bv-text-secondary)] max-h-20 overflow-y-auto border border-[var(--bv-border-color-light)] p-1 rounded">
                                <p className="font-semibold text-[var(--bv-text-primary)]">Line Byte Limits (Current/Original 1):</p>
                                {mainEditorLineMetricDetails.map((line, idx) => (
                                  <div key={idx} className={`${line.isOverLimit ? 'text-red-500 font-bold' : ''}`}>
                                    Line {idx + 1}: {line.currentBytes} / {line.originalBytes !== undefined ? line.originalBytes : '-'} bytes
                                  </div>
                                ))}
                              </div>
                            )}
                      </div>
                    </div>

                    {/* --- Card 2: Original 1 --- */}
                    {settings.comparisonModeEnabled && originalBlockForSingleViewComparison && (
                      <div className="bg-[var(--bv-element-background)] p-4 rounded-lg shadow-md border border-[var(--bv-border-color)] flex flex-col gap-3 flex-1 min-w-[320px]">
                        <h3 className="text-center font-semibold text-[var(--bv-text-primary)]" title={matchedOriginalScript ? `Original (Initial Load of Active Script) (Block ${originalBlockForSingleViewComparison.index + 1} of Script: ${matchedOriginalScript.name})` : `Original (Initial Load of Active Script)`}>
                            Original (Initial Load of Active Script)
                        </h3>
                        <div className="flex justify-center">
                            <div className="preview-component-wrapper flex justify-center items-center"
                                style={{ 
                                        width: settings.previewWidth > 0 ? `${settings.previewWidth}px` : 'auto', 
                                        height: settings.previewHeight > 0 ? `${settings.previewHeight}px` : 'auto',
                                        minWidth: settings.previewWidth === 0 ? '150px' : undefined,
                                        minHeight: settings.previewHeight === 0 ? '100px' : undefined,
                                        marginTop: dynamicTopMargin,
                                        marginBottom: dynamicBottomMargin,
                                }}
                            >
                                <PreviewArea
                                    key={`preview-orig1-${globalBitmapCacheId}`}
                                    baseSettings={settings}
                                    textOverride={originalBlockForSingleViewComparison.content}
                                    setIsOverflowing={() => {}}
                                    onNestedSettingsChange={handleNestedSettingsChange}
                                    showPixelMarginGuides={false}
                                    isReadOnlyPreview={true}
                                    activeThemeKey={appThemeSettings.activeThemeKey}
                                    bitmapCharCache={globalBitmapCharCache}
                                    bitmapCacheId={globalBitmapCacheId}
                                />
                            </div>
                        </div>
                        <div className="w-full flex flex-col">
                          <label htmlFor="original-text-area" className="block text-sm font-medium text-[var(--bv-text-secondary)] mb-1 truncate" title={`Original Text 1 (Block ${originalBlockForSingleViewComparison.index + 1})`}>
                            Original Text 1 (Block {originalBlockForSingleViewComparison.index + 1})
                          </label>
                          <textarea
                            id="original-text-area"
                            ref={originalTextAreaRef}
                            aria-label={`Original content 1 for block ${originalBlockForSingleViewComparison.index + 1}`}
                            readOnly
                            value={originalBlockForSingleViewComparison.content}
                            onSelect={handleTextSelectOriginal}
                            className="w-full p-2 border rounded-md shadow-sm sm:text-sm resize-y bg-[var(--bv-element-background-secondary)] border-[var(--bv-border-color)] text-[var(--bv-text-secondary)] cursor-not-allowed"
                          />
                          <div className="text-xs text-[var(--bv-text-secondary)] mt-1">
                              Selected: {selectedTextLengthOriginal} char(s). 
                              {originalBlockMetrics && (
                                  <> Total: {originalBlockMetrics.totalChars} chars, {originalBlockMetrics.totalBytes} bytes.</>
                              )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* --- Card 3: Original 2 --- */}
                    {settings.comparisonModeEnabled && secondaryOriginalBlockForSingleViewComparison && (
                      <div className="bg-[var(--bv-element-background)] p-4 rounded-lg shadow-md border border-[var(--bv-border-color)] flex flex-col gap-3 flex-1 min-w-[320px]">
                        <h3 className="text-center font-semibold text-[var(--bv-text-primary)]" title={matchedSecondaryOriginalScript ? `Original 2 (Block ${secondaryOriginalBlockForSingleViewComparison.index + 1} of Script: ${matchedSecondaryOriginalScript.name})` : `Original 2`}>
                          Original 2
                        </h3>
                        <div className="flex justify-center">
                            <div className="preview-component-wrapper flex justify-center items-center"
                                style={{ 
                                        width: settings.previewWidth > 0 ? `${settings.previewWidth}px` : 'auto', 
                                        height: settings.previewHeight > 0 ? `${settings.previewHeight}px` : 'auto',
                                        minWidth: settings.previewWidth === 0 ? '150px' : undefined,
                                        minHeight: settings.previewHeight === 0 ? '100px' : undefined,
                                        marginTop: dynamicTopMargin,
                                        marginBottom: dynamicBottomMargin,
                                }}
                            >
                                <PreviewArea
                                    key={`preview-orig2-${globalBitmapCacheId}`}
                                    baseSettings={settings}
                                    textOverride={secondaryOriginalBlockForSingleViewComparison.content}
                                    setIsOverflowing={() => {}}
                                    onNestedSettingsChange={handleNestedSettingsChange}
                                    showPixelMarginGuides={false}
                                    isReadOnlyPreview={true}
                                    activeThemeKey={appThemeSettings.activeThemeKey}
                                    bitmapCharCache={globalBitmapCharCache}
                                    bitmapCacheId={globalBitmapCacheId}
                                />
                            </div>
                        </div>
                        <div className="w-full flex flex-col">
                          <label htmlFor="secondary-original-text-area" className="block text-sm font-medium text-[var(--bv-text-secondary)] mb-1 truncate" title={`Original Text 2 (Block ${secondaryOriginalBlockForSingleViewComparison.index + 1})`}>
                              Original Text 2 (Block {secondaryOriginalBlockForSingleViewComparison.index + 1})
                          </label>
                          <textarea
                              id="secondary-original-text-area"
                              ref={secondaryOriginalTextAreaRef}
                              aria-label={`Original content 2 for block ${secondaryOriginalBlockForSingleViewComparison.index + 1}`}
                              readOnly
                              value={secondaryOriginalBlockForSingleViewComparison.content}
                              onSelect={handleTextSelectSecondaryOriginal}
                              className="w-full p-2 border rounded-md shadow-sm sm:text-sm resize-y bg-[var(--bv-element-background-secondary)] border-[var(--bv-border-color)] text-[var(--bv-text-secondary)] cursor-not-allowed"
                          />
                          <div className="text-xs text-[var(--bv-text-secondary)] mt-1">
                              Selected: {selectedTextLengthSecondaryOriginal} char(s).
                              {secondaryOriginalBlockMetrics && (
                                  <> Total: {secondaryOriginalBlockMetrics.totalChars} chars, {secondaryOriginalBlockMetrics.totalBytes} bytes.</>
                              )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                   <div className="w-full flex items-center justify-center gap-4 mt-6 flex-shrink-0">
                      <Button 
                        onClick={handlePrevBlock} 
                        disabled={currentBlockIndex === null || currentBlockIndex <= 0}
                        className="!px-6 !py-2"
                      >
                        &larr; Previous
                      </Button>
                      <span className="font-semibold text-[var(--bv-text-primary)]">
                          Block {currentBlockIndex !== null ? currentBlockIndex + 1 : '-'} / {activeScriptBlocks.length}
                      </span>
                      <Button 
                        onClick={handleNextBlock} 
                        disabled={currentBlockIndex === null || currentBlockIndex >= activeScriptBlocks.length - 1}
                        className="!px-6 !py-2"
                      >
                        Next &rarr;
                      </Button>
                  </div>
                </div>
              ) : ( // All Blocks View
                <div ref={allBlocksScrollContainerRefCallback} className="w-full h-full overflow-y-auto pr-2 pb-4 space-y-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeScriptBlocks.length > 0 ? (
                    activeScriptBlocks.map(block => {
                      const originalBlockContentForCell = settings.comparisonModeEnabled && matchedOriginalScript?.blocks[block.index]
                          ? matchedOriginalScript.blocks[block.index].content
                          : settings.comparisonModeEnabled ? block.originalContent : null;

                      const secondaryOriginalBlockContentForCell = settings.comparisonModeEnabled && matchedSecondaryOriginalScript?.blocks[block.index]
                          ? matchedSecondaryOriginalScript.blocks[block.index].content
                          : null; 
                      
                      const isSimplifiedRenderForCell = !fullyVisibleBlockOriginalIndices.has(block.index);

                      return (
                          <MemoizedBlockCell
                              key={`${activeMainScriptId}-${block.index}`}
                              block={block}
                              activeThemeKey={appThemeSettings.activeThemeKey}
                              appSettings={settings}
                              isFullyVisible={fullyVisibleBlockOriginalIndices.has(block.index)}
                              placeholderHeight={ESTIMATED_BLOCK_CELL_HEIGHT_PX}
                              placeholderWidth={Math.max(150, (settings.previewWidth > 0 ? settings.previewWidth * settings.previewZoom : 200) * 0.8)}
                              onBlockContentChange={handleBlockContentChangeForCell}
                              onBlockOverflowChange={handleBlockCellOverflowChange}
                              onNestedSettingsChange={handleNestedSettingsChange}
                              comparisonOriginalContent={originalBlockContentForCell}
                              comparisonSecondaryOriginalContent={secondaryOriginalBlockContentForCell}
                              overflowSettingsPanelOpen={overflowSettingsPanelOpen}
                              simplifiedRender={isSimplifiedRenderForCell}
                              onVisibilityChange={handleBlockVisibilityChange}
                              scrollRootElement={scrollRootElement}
                              observerRootMarginValue={observerRootMarginValue}
                              globalBitmapCharCache={globalBitmapCharCache} 
                              globalBitmapCacheId={globalBitmapCacheId} 
                              parsedCustomByteMap={parsedCustomByteMap}
                              defaultCharacterByteValue={settings.defaultCharacterByteValue}
                              enableByteRestrictionInComparisonMode={settings.enableByteRestrictionInComparisonMode}
                              activeComparisonMode={settings.comparisonModeEnabled}
                        />
                      );
                    })
                  ) : (
                    <div className="col-span-full text-center text-lg text-[var(--bv-text-secondary)] mt-10">
                      <p>No blocks to display. Load a script or check your block separator settings.</p>
                       <Button onClick={() => setViewMode('single')} className="mt-4">Switch to Single Block View</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        )}
      </div>
      <SpecialSettingsMenu 
        isOpen={isSpecialSettingsMenuOpen}
        onClose={toggleSpecialSettingsMenu}
        appThemeSettings={appThemeSettings}
        onThemeSettingsChange={handleThemeSettingsChange}
        onCustomColorChange={handleCustomColorChange}
        onSaveCustomTheme={saveCustomTheme}
        onResetCustomTheme={resetCustomTheme}
        allThemeDefinitions={ALL_THEME_DEFINITIONS}
      />
      <TutorialModal 
        isOpen={showTutorial}
        currentStep={currentTutorialStep}
        onClose={handleCloseTutorial}
        onSetStep={setCurrentTutorialStep}
      />
    </>
  );
};

export default App;
