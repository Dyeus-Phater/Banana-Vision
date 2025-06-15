
import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import JSZip from 'jszip';
import { Octokit } from '@octokit/rest';
import { 
  AppSettings, Block, NestedAppSettingsObjectKeys, ScriptFile, GitHubSettings, Profile, MainViewMode,
  ThemeKey, CustomThemeColors, AppThemeSettings
} from './types';
import { DEFAULT_SETTINGS, DEFAULT_GITHUB_SETTINGS, ALL_THEME_DEFINITIONS, DEFAULT_CUSTOM_THEME_TEMPLATE } from './constants';
import ControlsPanel from './components/ControlsPanel';
import PreviewArea, { PreviewAreaProps } from './components/PreviewArea';
import Toolbar from './components/Toolbar';
import ProfilesGalleryPage from './components/ProfilesGalleryPage';
import SpecialSettingsMenu from './components/SpecialSettingsMenu';
import TutorialModal from './components/TutorialModal';
import { exportSettingsAsJson, importSettingsFromJson } from './services/fileService';
import { exportToPng } from './services/exportService';
import * as profileService from './services/profileService';
import * as themeService from './services/themeService';


interface LoadedCustomFontInfo {
  name: string;
  styleElement: HTMLStyleElement;
}

type ViewMode = 'single' | 'all';
export type FindScope = 'currentBlock' | 'activeScript' | 'allScripts';

interface FoundMatch {
  scriptId: string;
  blockIndex: number; // original index of the block in its script
  charStartIndex: number; // character start index within block.content
  charEndIndex: number; // character end index within block.content
}

export interface FindResultSummaryItem {
  id: string; // script.id or `${script.id}-${block.originalIndex}`
  name: string; // script.name or `Block ${block.originalIndex + 1}`
  count: number;
  type: 'script' | 'block';
  scriptId: string;
  blockOriginalIndex?: number; // original index
}

// For global bitmap cache
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
  overflowSettingsPanelOpen: boolean;
  simplifiedRender: boolean;
  onVisibilityChange: (blockOriginalIndex: number, isVisible: boolean) => void;
  scrollRootElement: HTMLDivElement | null;
  observerRootMarginValue: number;
  globalBitmapCharCache: BitmapCharCache | null; // Added for shared cache
  globalBitmapCacheId: number; // Added for cache refresh
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
  overflowSettingsPanelOpen,
  simplifiedRender,
  onVisibilityChange,
  scrollRootElement,
  observerRootMarginValue,
  globalBitmapCharCache, // Destructure new prop
  globalBitmapCacheId   // Destructure new prop
}) => {
  const cellRef = useRef<HTMLDivElement>(null);
  const blockOriginalIndex = block.index;

  const previewComponentRef = useRef<HTMLDivElement>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={cellRef}
      className="block-cell p-4 rounded-lg shadow-md border bg-[var(--bv-element-background-secondary)] border-[var(--bv-border-color)]"
    >
      <h3 className="text-md font-semibold mb-2 flex justify-between items-center text-[var(--bv-text-primary)]">
        Block {block.index + 1}
        {block.isOverflowing && (
          <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">Overflow!</span>
        )}
      </h3>
      <div
        ref={previewWrapperRef}
        className="preview-area-for-cell mb-3 flex items-center justify-center"
      >
        {isFullyVisible ? (
         <PreviewArea
          ref={previewComponentRef}
          key={`preview-cell-${block.index}-${globalBitmapCacheId}`} // Add cache ID to key if it matters
          baseSettings={appSettings}
          textOverride={block.content}
          simplifiedRender={simplifiedRender}
          setIsOverflowing={(isOverflowing) => onBlockOverflowChange(blockOriginalIndex, isOverflowing)}
          onNestedSettingsChange={onNestedSettingsChange}
          showPixelMarginGuides={appSettings.pixelOverflowMargins.enabled && overflowSettingsPanelOpen}
          isReadOnlyPreview={false}
          activeThemeKey={activeThemeKey}
          bitmapCharCache={globalBitmapCharCache} // Pass down shared cache
          bitmapCacheId={globalBitmapCacheId}     // Pass down cache ID
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
        className="w-full p-2 border rounded-md shadow-sm sm:text-sm resize-y min-h-[120px] mb-2
                   bg-[var(--bv-input-background)] border-[var(--bv-input-border)] text-[var(--bv-input-text)]
                   focus:ring-[var(--bv-input-focus-ring)] focus:border-[var(--bv-input-focus-ring)]"
      />
      {appSettings.comparisonModeEnabled && comparisonOriginalContent !== null && (
        <div>
          <h4 className="text-sm font-medium mt-2 mb-1 text-[var(--bv-text-secondary)]">Original Text (Block {block.index + 1})</h4>
          <textarea
            aria-label={`Original content for block ${block.index + 1}`}
            readOnly
            value={comparisonOriginalContent}
            className="w-full p-2 border rounded-md shadow-sm sm:text-sm resize-y min-h-[100px]
                       bg-[var(--bv-accent-secondary)] border-[var(--bv-border-color)] text-[var(--bv-accent-secondary-content)]
                       cursor-not-allowed"
          />
        </div>
      )}
    </div>
  );
};

const MemoizedBlockCell = React.memo(BlockCell);

// Helper functions for UTF-8 to Base64 and vice-versa
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


const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const mainTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const [appThemeSettings, setAppThemeSettings] = useState<AppThemeSettings>(themeService.loadThemeSettings());
  const [isSpecialSettingsMenuOpen, setIsSpecialSettingsMenuOpen] = useState<boolean>(false);

  const [mainScripts, setMainScripts] = useState<ScriptFile[]>([]);
  const [activeMainScriptId, setActiveMainScriptId] = useState<string | null>(null);
  const [originalScripts, setOriginalScripts] = useState<ScriptFile[]>([]);

  const [currentBlockIndex, setCurrentBlockIndex] = useState<number | null>(0);
  const [showOnlyOverflowingBlocks, setShowOnlyOverflowingBlocks] = useState<boolean>(false);

  const [loadedCustomFontInfo, setLoadedCustomFontInfo] = useState<LoadedCustomFontInfo | null>(null);
  const [overflowSettingsPanelOpen, setOverflowSettingsPanelOpen] = useState(true);

  const [matchedOriginalScript, setMatchedOriginalScript] = useState<ScriptFile | null>(null);

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

  // Global Bitmap Font Cache
  const [globalBitmapCharCache, setGlobalBitmapCharCache] = useState<BitmapCharCache | null>(null);
  const [globalBitmapCacheId, setGlobalBitmapCacheId] = useState<number>(0);

  useEffect(() => {
    const tutorialCompleted = localStorage.getItem(TUTORIAL_COMPLETED_KEY);
    if (tutorialCompleted !== 'true') {
      setShowTutorial(true);
      setCurrentTutorialStep(0);
    }
  }, []);

  // Effect to generate global bitmap character cache
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
          enableTintColor, color: globalTintColor
        } = settings.bitmapFont;

        if (charWidth <= 0 || charHeight <= 0) {
          console.error("Global Bitmap Cache: charWidth or charHeight is zero or negative.");
          setGlobalBitmapCharCache(new Map()); // Set to empty map
          setGlobalBitmapCacheId(id => id + 1);
          return;
        }

        const charsPerRow = Math.floor(img.width / charWidth);
        const targetRgb = enableColorRemoval ? hexToRgb(colorToRemove) : null;

        for (let i = 0; i < charMap.length; i++) {
          const char = charMap[i];
          let effectiveCharWidth = charWidth;
          let charSpecificCanvas: HTMLCanvasElement | null = document.createElement('canvas');

          if (char === ' ') {
            if (spaceWidthOverride > 0) {
              effectiveCharWidth = spaceWidthOverride;
            } else {
              effectiveCharWidth = enablePixelScanning
                ? Math.max(1, Math.floor(charWidth / 4))
                : charWidth;
            }
            if (charSpecificCanvas) {
              charSpecificCanvas.width = effectiveCharWidth;
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
          ctx.drawImage(img, (i % charsPerRow) * charWidth, Math.floor(i / charsPerRow) * charHeight, charWidth, charHeight, 0, 0, charWidth, charHeight);

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
            effectiveCharWidth = (rightmostPixel === -1) ? 0 : rightmostPixel + 1;

            if (effectiveCharWidth === 0) {
              newCache.set(char, { canvas: null });
              continue;
            } else if (effectiveCharWidth < charWidth) {
              const scannedCanvas = document.createElement('canvas');
              scannedCanvas.width = effectiveCharWidth;
              scannedCanvas.height = charHeight;
              const scannedCtx = scannedCanvas.getContext('2d');
              if (scannedCtx) {
                scannedCtx.drawImage(charSpecificCanvas, 0, 0, effectiveCharWidth, charHeight, 0, 0, effectiveCharWidth, charHeight);
                charSpecificCanvas = scannedCanvas;
              }
            }
          }

          let finalCanvasForCache = charSpecificCanvas;
          if (enableTintColor && globalTintColor && finalCanvasForCache) {
            const tintedVersionCanvas = document.createElement('canvas');
            tintedVersionCanvas.width = finalCanvasForCache.width;
            tintedVersionCanvas.height = finalCanvasForCache.height;
            const tintedCtx = tintedVersionCanvas.getContext('2d');
            if (tintedCtx) {
              tintedCtx.drawImage(finalCanvasForCache, 0, 0);
              tintedCtx.globalCompositeOperation = 'source-in';
              tintedCtx.fillStyle = globalTintColor;
              tintedCtx.fillRect(0, 0, tintedVersionCanvas.width, tintedVersionCanvas.height);
              finalCanvasForCache = tintedVersionCanvas;
            }
          }
          newCache.set(char, { canvas: finalCanvasForCache, dataURL: finalCanvasForCache?.toDataURL() });
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
      setGlobalBitmapCharCache(null); // Clear cache if not bitmap or not enabled
      setGlobalBitmapCacheId(id => id + 1);
    }

    return () => {
      isCancelled = true;
    };
  }, [
    settings.bitmapFont.imageUrl, settings.bitmapFont.charWidth, settings.bitmapFont.charHeight,
    settings.bitmapFont.charMap, settings.bitmapFont.enableColorRemoval, settings.bitmapFont.colorToRemove,
    settings.bitmapFont.colorRemovalTolerance, settings.bitmapFont.enablePixelScanning,
    settings.bitmapFont.spaceWidthOverride, settings.bitmapFont.enableTintColor, settings.bitmapFont.color,
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

  const parseTextToBlocksInternal = useCallback((rawText: string, useCustomSep: boolean, separators: string[]): Block[] => {
    let parsedBlocksContent: { content: string, originalContent: string }[] = [];
    if (useCustomSep && separators.length > 0 && separators.some(s => s.trim().length > 0)) {
        const validSeparators = separators.filter(s => s.trim().length > 0);
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
                if (blockBuilder.trim() !== "") {
                   parsedBlocksContent.push({ content: blockBuilder, originalContent: blockBuilder });
                }
                blockBuilder = "";
            } else {
                blockBuilder += segment;
            }
        }
        if (blockBuilder.trim() !== "" || (segments.length === 1 && blockBuilder !== "")) {
            parsedBlocksContent.push({ content: blockBuilder, originalContent: blockBuilder });
        }
        parsedBlocksContent = parsedBlocksContent.filter(b => b.content.trim().length > 0);

    } else {
        parsedBlocksContent = rawText.split(/\n\s*\n/).map(b => b.trim()).filter(b => b.length > 0)
            .map(b => ({ content: b, originalContent: b }));
    }

    return parsedBlocksContent.map((blockData, index) => ({
        content: blockData.content,
        originalContent: blockData.originalContent,
        index,
        isOverflowing: false,
    }));
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
    setMatchedOriginalScript(null);
    setCurrentBlockIndex(null);
    setFullyVisibleBlockOriginalIndices(new Set());
    setFindText("");
    setReplaceText("");
    setFindResultsMessage("");
    setCurrentFindMatch(null);
    setLastSearchIterationDetails(null);
    setFindResultSummary([]);

    if (loadedCustomFontInfo?.styleElement) {
      document.head.removeChild(loadedCustomFontInfo.styleElement);
      setLoadedCustomFontInfo(null);
    }
  }, [loadedCustomFontInfo]);

  const handleApplyNewSettings = useCallback((newSettings: AppSettings, scriptNamePrefix: string) => {
    setSettings(newSettings);
    resetAppStateForNewSettings();

    if (newSettings.text && newSettings.text !== DEFAULT_SETTINGS.text) {
      const initialBlocks = parseTextToBlocksInternal(newSettings.text, newSettings.useCustomBlockSeparator, newSettings.blockSeparators);
      const defaultScript: ScriptFile = {
        id: `${scriptNamePrefix}-${Date.now()}`,
        name: `${scriptNamePrefix} Script`,
        blocks: initialBlocks,
        rawText: newSettings.text,
        parsedWithCustomSeparators: newSettings.useCustomBlockSeparator,
      };
      setMainScripts([defaultScript]);
      setActiveMainScriptId(defaultScript.id);
      setCurrentBlockIndex(initialBlocks.length > 0 ? 0 : null);
    } else {
      if (viewMode === 'single') {
        handleSettingsChange('text', DEFAULT_SETTINGS.text);
      }
      setCurrentBlockIndex(null);
    }
  }, [resetAppStateForNewSettings, parseTextToBlocksInternal, viewMode, handleSettingsChange]);

  const handleSaveProfile = useCallback((profileName: string, settingsToSave: AppSettings) => {
    if (!profileName.trim()) {
      alert("Please enter a name for the profile.");
      return;
    }
    try {
      const updatedProfiles = profileService.saveProfile(profileName, settingsToSave, gitHubSettings);
      setProfiles(updatedProfiles);
      alert(`Profile "${profileName}" saved successfully!`);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(`Failed to save profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [gitHubSettings]);

  const handleLoadProfile = useCallback((profileId: string) => {
    const profileToLoad = profileService.getProfileById(profileId);
    if (profileToLoad) {
      handleApplyNewSettings(profileToLoad.settings, `Profile-${profileToLoad.name}`);
      if (profileToLoad.gitHubSettings) {
        setGitHubSettings(profileToLoad.gitHubSettings);
      } else {
        setGitHubSettings(DEFAULT_GITHUB_SETTINGS); 
      }
      setCurrentMainView('editor'); 
      alert(`Profile "${profileToLoad.name}" loaded successfully!`);
    } else {
      alert("Profile not found.");
    }
  }, [handleApplyNewSettings]);

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
      let match: ScriptFile | null = null;
      match = originalScripts.find(os => os.name === activeMainScript.name) || null;
      if (!match) {
        const activeMainIndex = mainScripts.findIndex(ms => ms.id === activeMainScript.id);
        if (activeMainIndex !== -1 && originalScripts[activeMainIndex]) {
          match = originalScripts[activeMainIndex];
        }
      }
      setMatchedOriginalScript(match);
    } else {
      setMatchedOriginalScript(null);
    }
  }, [activeMainScript, originalScripts, settings.comparisonModeEnabled, mainScripts]);


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
    exportSettingsAsJson(settings, gitHubSettings, 'banana-vision-settings.json');
  }, [settings, gitHubSettings]);

  const handleImportJson = useCallback(async (files: FileList) => { 
    if (!files || files.length === 0) return;
    const file = files[0]; 
    try {
      const { appSettings: newAppSettings, gitHubSettings: newGitHubSettings } = await importSettingsFromJson(file);
      handleApplyNewSettings(newAppSettings, "Imported-JSON");
      setGitHubSettings(newGitHubSettings);
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
    } else if (activeMainScript.parsedWithCustomSeparators) {
      scriptContent = activeMainScript.blocks.map(block => block.content).join('');
    } else {
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
      } else if (script.parsedWithCustomSeparators) {
        currentSerializedContent = script.blocks.map(block => block.content).join('');
      } else {
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
    isMainScript: boolean,
    sourceNamePrefix: string = ""
  ): Promise<void> => {
    const currentUseCustomSep = settings.useCustomBlockSeparator;
    const currentBlockSeps = [...settings.blockSeparators];

    const scriptFilePromises = Array.from(files).map(async (file, i) => {
      try {
        let rawText = await readFileAsText(file, 'UTF-8');
        if (rawText.includes('\uFFFD')) { 
          rawText = await readFileAsText(file, 'Windows-1252'); 
        }
        const blocks = parseTextToBlocksInternal(rawText, currentUseCustomSep, currentBlockSeps);
        return {
          id: `${sourceNamePrefix}${file.name}-${Date.now()}-${i}`,
          name: `${sourceNamePrefix}${file.name}`,
          blocks,
          rawText,
          parsedWithCustomSeparators: currentUseCustomSep,
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
      if (isMainScript) {
        setMainScripts(prev => [...prev, ...newScriptFiles]);
        if (!activeMainScriptId && newScriptFiles.length > 0) {
          setActiveMainScriptId(newScriptFiles[0].id);
          setCurrentBlockIndex(newScriptFiles[0].blocks.length > 0 ? 0 : null);
        }
      } else {
        setOriginalScripts(prev => [...prev, ...newScriptFiles]);
      }
      setFullyVisibleBlockOriginalIndices(new Set()); 
    }
  };


  const handleTextFileUpload = useCallback(async (files: FileList) => {
    await processAndAddFiles(files, true);
  }, [settings.useCustomBlockSeparator, settings.blockSeparators, activeMainScriptId, parseTextToBlocksInternal]); 

  const handleOriginalScriptUpload = useCallback(async (files: FileList) => {
    await processAndAddFiles(files, false);
  }, [settings.useCustomBlockSeparator, settings.blockSeparators, parseTextToBlocksInternal]);


  const handleClearMainScripts = useCallback(() => {
    setMainScripts([]);
    setActiveMainScriptId(null);
    setCurrentBlockIndex(null);
    handleSettingsChange('text', DEFAULT_SETTINGS.text); 
    setFindResultsMessage("");
    setCurrentFindMatch(null);
    setLastSearchIterationDetails(null);
    setFindResultSummary([]);
  }, [handleSettingsChange]);

  const handleClearOriginalScripts = useCallback(() => {
    setOriginalScripts([]);
    setMatchedOriginalScript(null);
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
  }, [mainScripts, handleSettingsChange]);


  const handleCurrentBlockContentChangeInSingleView = useCallback((newContent: string) => {
    if (!activeMainScript || currentBlockIndex === null) return;

    handleSettingsChange('text', newContent); 

    setMainScripts(prevScripts =>
      prevScripts.map(script => {
        if (script.id === activeMainScript.id) {
          return {
            ...script,
            blocks: script.blocks.map((block, index) =>
              index === currentBlockIndex ? { ...block, content: newContent } : block
            ),
          };
        }
        return script;
      })
    );
    setCurrentFindMatch(null);
    setFindResultsMessage("");
  }, [activeMainScript, currentBlockIndex, handleSettingsChange]);

  const displayedBlocksForView = useMemo(() => {
    const blocks = activeMainScript?.blocks || [];
    return showOnlyOverflowingBlocks ? blocks.filter(b => b.isOverflowing) : blocks;
  }, [activeMainScript, showOnlyOverflowingBlocks]);


  const handleBlockContentChangeForCell = useCallback((blockOriginalIndexInActiveScript: number, newContent: string) => {
    if (!activeMainScript) return;
    setMainScripts(prevScripts =>
      prevScripts.map(script => {
        if (script.id === activeMainScript.id) {
          return {
            ...script,
            blocks: script.blocks.map(b =>
              b.index === blockOriginalIndexInActiveScript ? { ...b, content: newContent } : b
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
  }, [activeMainScript, activeMainScriptId, currentBlockIndex, viewMode, handleSettingsChange]);


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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                        return { ...block, content: newContent, isOverflowing: false };
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
        setFindResultsMessage("Failed to replace. Match might be stale.");
        setCurrentFindMatch(null); 
    }

  }, [currentFindMatch, findText, replaceText, mainScripts, activeMainScript, currentBlockIndex, viewMode, settings.text, handleFindNext, handleSettingsChange, handleCurrentBlockContentChangeInSingleView, findScope, activeMainScriptId, updateFindResultSummary]);

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
            return { ...block, content: newContent, isOverflowing: false };
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

  const handleLoadFileFromGitHub = useCallback(async () => {
    if (!gitHubSettings.pat || !gitHubSettings.repoFullName || !gitHubSettings.filePath) {
      setGitHubStatusMessage("Error: PAT, Repository, and File Path are required for single file load.");
      return;
    }
    setIsGitHubLoading(true);
    setGitHubStatusMessage("Loading file from GitHub...");

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
        path: gitHubSettings.filePath,
        ref: gitHubSettings.branch || undefined,
      });

      // @ts-ignore 
      if (response.data && response.data.content && response.data.encoding === 'base64') {
        // @ts-ignore
        const rawText = base64ToUtf8(response.data.content);
        const blocks = parseTextToBlocksInternal(rawText, settings.useCustomBlockSeparator, settings.blockSeparators);
        const newScript: ScriptFile = {
          id: `github-${owner}-${repo}-${gitHubSettings.filePath.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
          name: `GitHub: ${gitHubSettings.filePath.split('/').pop() || gitHubSettings.filePath} (${owner}/${repo})`,
          blocks,
          rawText,
          parsedWithCustomSeparators: settings.useCustomBlockSeparator,
        };
        setMainScripts(prev => [newScript, ...prev.filter(s => s.id !== newScript.id)]);
        setActiveMainScriptId(newScript.id);
        setCurrentBlockIndex(newScript.blocks.length > 0 ? 0 : null);
        setGitHubStatusMessage(`Successfully loaded file: ${newScript.name}.`);
      } else {
        setGitHubStatusMessage("Error: Could not decode file content from GitHub.");
      }
    } catch (error: any) {
      console.error("Error loading file from GitHub:", error);
      setGitHubStatusMessage(`Error: ${error.message || 'Failed to load file from GitHub.'}`);
    } finally {
      setIsGitHubLoading(false);
    }
  }, [gitHubSettings, settings.useCustomBlockSeparator, settings.blockSeparators, parseTextToBlocksInternal, setActiveMainScriptId, setCurrentBlockIndex]);

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
  

  const handleLoadAllFromGitHubFolder = useCallback(async () => {
    if (!gitHubSettings.pat || !gitHubSettings.repoFullName || !gitHubSettings.filePath) {
      setGitHubStatusMessage("Error: PAT, Repository, and Folder Path are required.");
      return;
    }
    setIsGitHubLoading(true);
    setGitHubStatusMessage("Loading scripts from GitHub folder...");
    let loadedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const newScripts: ScriptFile[] = [];
    const statusMessages: string[] = [];

    const [owner, repo] = gitHubSettings.repoFullName.split('/');
    if (!owner || !repo) {
      setGitHubStatusMessage("Error: Repository format must be 'owner/repo-name'.");
      setIsGitHubLoading(false);
      return;
    }

    try {
      const octokit = new Octokit({ auth: gitHubSettings.pat });
      const { data: folderContents } = await octokit.repos.getContent({
        owner,
        repo,
        path: gitHubSettings.filePath.endsWith('/') ? gitHubSettings.filePath.slice(0, -1) : gitHubSettings.filePath,
        ref: gitHubSettings.branch || undefined,
      });

      if (Array.isArray(folderContents)) {
        for (const item of folderContents) {
          if (item.type === 'file') {
            try {
              const { data: fileContent } = await octokit.repos.getContent({
                owner,
                repo,
                path: item.path,
                ref: gitHubSettings.branch || undefined,
              });
              // @ts-ignore
              if (fileContent && fileContent.content && fileContent.encoding === 'base64') {
                // @ts-ignore
                let rawText = "";
                try {
                  // @ts-ignore
                  rawText = base64ToUtf8(fileContent.content);
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

                const blocks = parseTextToBlocksInternal(rawText, settings.useCustomBlockSeparator, settings.blockSeparators);
                const newScript: ScriptFile = {
                  id: `github-${owner}-${repo}-${item.path.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
                  name: `GitHub: ${item.name} (${owner}/${repo}${gitHubSettings.filePath ? '/' + gitHubSettings.filePath : ''})`,
                  blocks,
                  rawText,
                  parsedWithCustomSeparators: settings.useCustomBlockSeparator,
                };
                newScripts.push(newScript);
                loadedCount++;
                statusMessages.push(`Loaded ${item.name}.`);
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
        if (newScripts.length > 0) {
          setMainScripts(prev => [...newScripts, ...prev.filter(s => !newScripts.find(ns => ns.name === s.name))]); 
          if (!activeMainScriptId && newScripts.length > 0) {
            setActiveMainScriptId(newScripts[0].id);
            setCurrentBlockIndex(newScripts[0].blocks.length > 0 ? 0 : null);
          }
        }
        setGitHubStatusMessage(`Folder load complete. Loaded: ${loadedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}. Details: ${statusMessages.slice(0,3).join(' ')}${statusMessages.length > 3 ? '...' : ''}`);

      } else {
        setGitHubStatusMessage("Error: The specified path is not a folder or is empty.");
      }
    } catch (error: any) {
      console.error("Error loading from GitHub folder:", error);
      setGitHubStatusMessage(`Error: ${error.message || 'Failed to load from GitHub folder.'}`);
    } finally {
      setIsGitHubLoading(false);
    }
  }, [gitHubSettings, settings.useCustomBlockSeparator, settings.blockSeparators, parseTextToBlocksInternal, activeMainScriptId, setActiveMainScriptId, setCurrentBlockIndex]);


  const handleSaveFileToGitHub = useCallback(async () => {
    if (!gitHubSettings.pat || !gitHubSettings.repoFullName || !gitHubSettings.filePath) {
      setGitHubStatusMessage("Error: PAT, Repository, and File Path are required for single file save.");
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
    } else if (activeMainScript.parsedWithCustomSeparators) {
      scriptContent = activeMainScript.blocks.map(block => block.content).join('');
    } else {
      scriptContent = activeMainScript.blocks.map(block => block.content).join('\n\n');
    }
    
    try {
      const octokit = new Octokit({ auth: gitHubSettings.pat });
      let existingSha: string | undefined = undefined;
      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner,
          repo,
          path: gitHubSettings.filePath,
          ref: gitHubSettings.branch || undefined,
        });
        // @ts-ignore
        if (fileData && fileData.sha) existingSha = fileData.sha;
      } catch (e: any) {
        if (e.status !== 404) throw e;
         setGitHubStatusMessage("File not found on GitHub, creating new file...");
      }

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: gitHubSettings.filePath,
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
      setGitHubStatusMessage("Error: PAT, Repository, and Folder Path are required.");
      return;
    }
    if (mainScripts.length === 0) {
      setGitHubStatusMessage("No scripts loaded to save.");
      return;
    }

    setIsGitHubLoading(true);
    setGitHubStatusMessage("Saving all modified scripts to GitHub folder...");
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
    const targetFolder = gitHubSettings.filePath.endsWith('/') ? gitHubSettings.filePath : `${gitHubSettings.filePath}/`;

    try {
      const octokit = new Octokit({ auth: gitHubSettings.pat });

      for (const script of mainScripts) {
        let currentScriptContent = "";
        if (script.blocks.length === 0) {
            currentScriptContent = "";
        } else if (script.parsedWithCustomSeparators) {
          currentScriptContent = script.blocks.map(block => block.content).join('');
        } else {
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
            const { data: fileData } = await octokit.repos.getContent({
              owner,
              repo,
              path: fullPath,
              ref: gitHubSettings.branch || undefined,
            });
             // @ts-ignore
            if (fileData && fileData.sha) existingSha = fileData.sha;
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


  const getFontFormatAndMime = (fileName: string): { format: string; mime: string } => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'ttf': return { format: 'truetype', mime: 'font/ttf' };
      case 'otf': return { format: 'opentype', mime: 'font/otf' };
      case 'woff': return { format: 'woff', mime: 'font/woff' };
      case 'woff2': return { format: 'woff2', mime: 'font/woff2' };
      default: return { format: 'truetype', mime: 'application/octet-stream' };
    }
  };

  const handleLoadCustomFont = useCallback((file: File, desiredCssName: string) => {
    if (!desiredCssName.trim()) {
      alert("Please provide a CSS name for the font.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const fontInfo = getFontFormatAndMime(file.name);
      const safeCssName = desiredCssName.trim();

      if (loadedCustomFontInfo?.styleElement) {
        document.head.removeChild(loadedCustomFontInfo.styleElement);
      }

      const styleElement = document.createElement('style');
      styleElement.textContent = `
        @font-face {
          font-family: "${safeCssName}";
          src: url(${dataUrl}) format('${fontInfo.format}');
        }
      `;
      document.head.appendChild(styleElement);

      setLoadedCustomFontInfo({ name: safeCssName, styleElement });
      handleNestedSettingsChange('systemFont', 'fontFamily', safeCssName);
    };
    reader.onerror = (error) => {
      console.error("Error reading font file:", error);
      alert("Failed to read font file.");
      reader.onload = null;
      reader.onerror = null;
    };
    
    const originalOnLoad = reader.onload;
    reader.onload = (event) => {
      if (originalOnLoad) originalOnLoad.call(reader, event);
      reader.onload = null;
      reader.onerror = null;
    };
    
    reader.readAsDataURL(file);
  }, [loadedCustomFontInfo, handleNestedSettingsChange]);

  useEffect(() => {
    if (loadedCustomFontInfo) {
      if (settings.currentFontType !== 'system' || settings.systemFont.fontFamily !== loadedCustomFontInfo.name) {
        if (loadedCustomFontInfo.styleElement) {
            document.head.removeChild(loadedCustomFontInfo.styleElement);
        }
        setLoadedCustomFontInfo(null);
      }
    }
  }, [settings.currentFontType, settings.systemFont.fontFamily, loadedCustomFontInfo]);

  useLayoutEffect(() => {
    if (currentMainView === 'editor' && viewMode === 'single' && previewRef.current && previewContainerRef.current) {
      const scaledHeight = previewRef.current.getBoundingClientRect().height;
      previewContainerRef.current.style.height = `${scaledHeight}px`;
    } else if (previewContainerRef.current) {
      previewContainerRef.current.style.height = 'auto';
    }
  }, [settings, currentBlockIndex, viewMode, activeMainScriptId, currentMainView]); 


  const currentEditableBlockForSingleView = (currentMainView === 'editor' && viewMode === 'single' && activeMainScript && currentBlockIndex !== null && activeScriptBlocks[currentBlockIndex])
    ? activeScriptBlocks[currentBlockIndex]
    : null;

  let originalBlockForSingleViewComparison: Block | null = null;
  let originalSourceInfoForSingleView = "";

  if (currentMainView === 'editor' && viewMode === 'single' && settings.comparisonModeEnabled && currentEditableBlockForSingleView && matchedOriginalScript) {
    if (matchedOriginalScript.blocks[currentEditableBlockForSingleView.index]) {
        originalBlockForSingleViewComparison = matchedOriginalScript.blocks[currentEditableBlockForSingleView.index];
        originalSourceInfoForSingleView = `(File: ${matchedOriginalScript.name})`;
    }
  } else if (currentMainView === 'editor' && viewMode === 'single' && settings.comparisonModeEnabled && currentEditableBlockForSingleView) {
      originalBlockForSingleViewComparison = {
          ...currentEditableBlockForSingleView,
          content: currentEditableBlockForSingleView.originalContent,
      };
      originalSourceInfoForSingleView = "(Initial Load of Active Script)";
  }

  const handleToggleMainView = useCallback(() => {
    setCurrentMainView(prev => prev === 'editor' ? 'profilesGallery' : 'editor');
  }, []);

  const showControlsPanel = currentMainView === 'editor';


  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 bg-[var(--bv-page-background)]">
      <header className="p-4 shadow-md bg-[var(--bv-toolbar-background)] text-[var(--bv-toolbar-text)]">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">🍌 Banana Vision</h1>
            <button
              onClick={toggleSpecialSettingsMenu}
              title="Special Settings"
              className="p-1.5 rounded-full hover:bg-[var(--bv-toolbar-button-hover-background)] text-[var(--bv-toolbar-text)] focus:outline-none focus:ring-2 focus:ring-[var(--bv-accent-primary)]"
              aria-label="Open Special Settings Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826 3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
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
            onToggleMainView={handleToggleMainView}
            onSaveScript={handleSaveScript}
            onSaveAllChangedScripts={handleSaveAllChangedScripts}
            onShowTutorial={handleStartTutorial}
          />
        </div>
      </header>

      <div className="flex-grow container mx-auto p-4 flex lg:flex-row gap-4 relative">
        {showControlsPanel && (
          <button
            onClick={() => setIsControlsPanelCollapsed(!isControlsPanelCollapsed)}
            title={isControlsPanelCollapsed ? 'Expand Controls' : 'Collapse Controls'}
            aria-expanded={!isControlsPanelCollapsed}
            aria-controls="controls-panel-aside"
            className={`
              fixed top-24 left-4 z-40
              lg:absolute lg:top-0
              p-2 rounded-full shadow-lg
              transition-all duration-300 ease-in-out
              bg-[var(--bv-accent-secondary)] text-[var(--bv-accent-secondary-content)] hover:opacity-80
              ${isControlsPanelCollapsed ? 
                'lg:left-4' 
                : 
                (viewMode === 'all' ? 'lg:left-1/5' : 'lg:left-1/3') + ' lg:ml-2' 
              }
            `}
          >
            {isControlsPanelCollapsed ? (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            )}
          </button>
        )}

        {showControlsPanel && (
          <aside
            id="controls-panel-aside"
            className={`
            flex-shrink-0 rounded-lg shadow-lg overflow-y-auto max-h-[calc(100vh-150px)]
            transition-all duration-300 ease-in-out
            bg-[var(--bv-element-background)] text-[var(--bv-text-primary)] backdrop-blur-sm
            ${isControlsPanelCollapsed ? 
              'w-0 p-0 opacity-0 -mr-4 lg:-mr-0' 
              : 
              `w-full ${viewMode === 'all' ? 'lg:w-1/5' : 'lg:w-1/3'} p-4`
            }
          `}>
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

                originalScripts={originalScripts}
                onOriginalScriptUpload={handleOriginalScriptUpload}
                matchedOriginalScriptName={matchedOriginalScript?.name || null}
                onClearOriginalScripts={handleClearOriginalScripts}

                viewMode={viewMode}
                onViewModeChange={setViewMode}

                findText={findText}
                onFindTextChange={onFindTextChange}
                replaceText={replaceText}
                onReplaceTextChange={onReplaceTextChange}
                findIsCaseSensitive={findIsCaseSensitive}
                onFindIsCaseSensitiveChange={onFindIsCaseSensitiveChange}
                findMatchWholeWord={findMatchWholeWord}
                onFindMatchWholeWordChange={onFindMatchWholeWordChange}
                findScope={findScope}
                onFindScopeChange={onFindScopeChange}
                onFindNext={handleFindNext}
                onReplace={handleReplace}
                onReplaceAll={handleReplaceAll}
                findResultsMessage={findResultsMessage}
                isFindCurrentBlockDisabled={!(viewMode === 'single' && activeMainScriptId && currentBlockIndex !== null)}
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
              />
            )}
          </aside>
        )}
        <main className={`
          flex-grow flex flex-col p-4 rounded-lg shadow-lg relative
          transition-all duration-300 ease-in-out
          bg-[var(--bv-element-background)] text-[var(--bv-text-primary)] backdrop-blur-sm
          ${!showControlsPanel || isControlsPanelCollapsed ? 'w-full ml-0' : `w-full ${viewMode === 'all' ? 'lg:w-4/5' : 'lg:w-2/3'} ${isControlsPanelCollapsed ? 'ml-0' : 'ml-0 lg:ml-0'}`} 
        `}>
          {currentMainView === 'editor' ? (
            <>
              {viewMode === 'single' ? (
                <>
                  <div
                    ref={previewContainerRef}
                    className="flex flex-col items-center justify-center w-full relative p-4 overflow-hidden"
                  >
                    {settings.comparisonModeEnabled && currentEditableBlockForSingleView ? (
                      <div className="flex flex-row w-full gap-4">
                        <div className="w-1/2 flex flex-col items-center justify-center relative">
                          <h3 className="text-sm font-semibold mb-1 text-[var(--bv-text-secondary)]">
                            Original {originalSourceInfoForSingleView} (Block {currentEditableBlockForSingleView.index + 1})
                          </h3>
                          <PreviewArea
                            key={`original-preview-single-${activeMainScriptId}-${currentEditableBlockForSingleView.index}-${globalBitmapCacheId}`}
                            baseSettings={settings}
                            textOverride={originalBlockForSingleViewComparison ? originalBlockForSingleViewComparison.content : "Original content not available."}
                            setIsOverflowing={() => {}}
                            onNestedSettingsChange={() => {}} 
                            showPixelMarginGuides={false}
                            isReadOnlyPreview={true}
                            simplifiedRender={false}
                            activeThemeKey={appThemeSettings.activeThemeKey}
                            bitmapCharCache={globalBitmapCharCache}
                            bitmapCacheId={globalBitmapCacheId}
                          />
                        </div>
                        <div className="w-1/2 flex flex-col items-center justify-center relative">
                          <h3 className="text-sm font-semibold mb-1 text-[var(--bv-text-secondary)]">
                            Editable (Block {currentEditableBlockForSingleView.index + 1})
                          </h3>
                          <PreviewArea
                            ref={previewRef}
                            key={`editable-preview-single-${activeMainScriptId}-${currentEditableBlockForSingleView.index}-${globalBitmapCacheId}`}
                            baseSettings={settings}
                            setIsOverflowing={handleMainPreviewOverflowStatusChange}
                            onNestedSettingsChange={handleNestedSettingsChange}
                            showPixelMarginGuides={overflowSettingsPanelOpen}
                            isReadOnlyPreview={false}
                            simplifiedRender={false}
                            activeThemeKey={appThemeSettings.activeThemeKey}
                            bitmapCharCache={globalBitmapCharCache}
                            bitmapCacheId={globalBitmapCacheId}
                          />
                          {activeScriptBlocks[currentBlockIndex || 0]?.isOverflowing && (
                            <div className="absolute top-0 right-1 mt-1 mr-1 bg-red-500 text-white text-xs px-2 py-1 rounded z-20">
                              Overflow!
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <PreviewArea
                          ref={previewRef}
                          baseSettings={settings}
                          setIsOverflowing={handleMainPreviewOverflowStatusChange}
                          onNestedSettingsChange={handleNestedSettingsChange}
                          showPixelMarginGuides={overflowSettingsPanelOpen}
                          isReadOnlyPreview={false}
                          simplifiedRender={false}
                          activeThemeKey={appThemeSettings.activeThemeKey}
                          bitmapCharCache={globalBitmapCharCache}
                          bitmapCacheId={globalBitmapCacheId}
                        />
                        {activeScriptBlocks[currentBlockIndex || 0]?.isOverflowing && (
                          <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-1 rounded z-10">
                            Overflow!
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className={`mt-4 w-full flex-grow flex flex-col ${settings.comparisonModeEnabled && currentEditableBlockForSingleView ? 'sm:flex-row gap-4' : ''}`}>
                    {settings.comparisonModeEnabled && currentEditableBlockForSingleView && (
                      <div className="w-full sm:w-1/2 flex flex-col">
                        <h2 className="text-lg font-semibold mb-2 text-[var(--bv-text-primary)]">
                          Original {originalSourceInfoForSingleView} (Block {currentEditableBlockForSingleView.index + 1})
                        </h2>
                        <textarea
                          id={`original-block-content-single-${activeMainScriptId}-${currentEditableBlockForSingleView.index}`}
                          aria-label={`Original content of block ${currentEditableBlockForSingleView.index + 1}`}
                          readOnly
                          value={originalBlockForSingleViewComparison ? originalBlockForSingleViewComparison.content : "Original content not available."}
                          className="w-full p-2 border rounded-md shadow-sm sm:text-sm flex-grow resize-y
                                      bg-[var(--bv-accent-secondary)] border-[var(--bv-border-color)] text-[var(--bv-accent-secondary-content)]
                                      cursor-not-allowed min-h-[100px]"
                        />
                      </div>
                    )}
                    <div className={`flex flex-col ${settings.comparisonModeEnabled && currentEditableBlockForSingleView ? 'w-full sm:w-1/2' : 'w-full flex-grow'}`}>
                      <h2 className="text-lg font-semibold mb-2 text-[var(--bv-text-primary)]">
                        Current Block Content {settings.comparisonModeEnabled && currentEditableBlockForSingleView ? '(Editable)' : ''}
                        {currentBlockIndex !== null && activeScriptBlocks.length > 0 && `(Block ${currentBlockIndex + 1} of Script: ${activeMainScript?.name || ''})`}
                      </h2>
                      <textarea
                        ref={mainTextAreaRef}
                        id="current-block-content-main"
                        aria-label="Current block content"
                        value={settings.text} 
                        onChange={(e) => handleCurrentBlockContentChangeInSingleView(e.target.value)}
                        disabled={currentBlockIndex === null && activeScriptBlocks.length > 0 && !!activeMainScriptId}
                        className="w-full p-2 border rounded-md shadow-sm sm:text-sm flex-grow resize-y min-h-[100px]
                                   bg-[var(--bv-input-background)] border-[var(--bv-input-border)] text-[var(--bv-input-text)]
                                   focus:ring-[var(--bv-input-focus-ring)] focus:border-[var(--bv-input-focus-ring)] placeholder:text-[var(--bv-text-secondary)]"
                        placeholder={activeScriptBlocks.length > 0 && currentBlockIndex === null ? "Select a block from the navigation to edit." : !activeMainScriptId ? "Load a main script to begin..." : "Type here..."}
                      />
                    </div>
                  </div>
                </>
              ) : ( 
                <div
                  ref={allBlocksScrollContainerRefCallback}
                  className="all-blocks-scroll-container w-full flex-grow min-h-0 overflow-y-auto space-y-6 pr-2"
                  aria-label={`Scrollable list of all text blocks for script: ${activeMainScript?.name || 'N/A'}`}
                >
                  {activeMainScript && displayedBlocksForView.map((block) => {
                    const isFullyVisible = fullyVisibleBlockOriginalIndices.has(block.index);
                    const placeholderHeight = (settings.previewHeight > 0 ? settings.previewHeight : 150) * settings.previewZoom;
                    const placeholderWidth = (settings.previewWidth > 0 ? settings.previewWidth : 250) * settings.previewZoom;

                    let comparisonContentForCell: string | null = null;
                    if (settings.comparisonModeEnabled && matchedOriginalScript && matchedOriginalScript.blocks[block.index]) {
                        comparisonContentForCell = matchedOriginalScript.blocks[block.index].content;
                    } else if (settings.comparisonModeEnabled) {
                        comparisonContentForCell = block.originalContent; 
                    }

                    return (
                      <MemoizedBlockCell
                        key={`${activeMainScript.id}-${block.index}-${globalBitmapCacheId}`}
                        block={block}
                        activeThemeKey={appThemeSettings.activeThemeKey}
                        appSettings={settings}
                        isFullyVisible={isFullyVisible}
                        placeholderHeight={placeholderHeight}
                        placeholderWidth={placeholderWidth}
                        onBlockContentChange={handleBlockContentChangeForCell}
                        onBlockOverflowChange={handleBlockCellOverflowChange}
                        onNestedSettingsChange={handleNestedSettingsChange}
                        comparisonOriginalContent={comparisonContentForCell}
                        overflowSettingsPanelOpen={overflowSettingsPanelOpen}
                        simplifiedRender={false} 
                        onVisibilityChange={handleBlockVisibilityChange}
                        scrollRootElement={scrollRootElement}
                        observerRootMarginValue={observerRootMarginValue}
                        globalBitmapCharCache={globalBitmapCharCache}
                        globalBitmapCacheId={globalBitmapCacheId}
                      />
                    );
                  })}
                  {activeMainScript && displayedBlocksForView.length === 0 && activeScriptBlocks.length > 0 && (
                    <p className="text-center italic text-[var(--bv-text-secondary)]">
                      No blocks match the current filter (e.g., "Show Only Overflowing") for script: {activeMainScript.name}.
                    </p>
                  )}
                   {!activeMainScript && (
                    <p className="text-center italic text-[var(--bv-text-secondary)]">
                      No active main script. Load or select a script from the Controls Panel.
                    </p>
                  )}
                   {activeMainScript && activeScriptBlocks.length === 0 && (
                    <p className="text-center italic text-[var(--bv-text-secondary)]">
                      Script "{activeMainScript.name}" has no blocks.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : ( 
            <ProfilesGalleryPage
              profiles={profiles}
              onLoadProfile={handleLoadProfile}
              onDeleteProfile={handleDeleteProfile}
              activeThemeKey={appThemeSettings.activeThemeKey}
              currentEditorSettings={settings}
              onSaveCurrentSettingsAsProfile={handleSaveProfile}
            />
          )}
        </main>
      </div>
      <footer className="text-center p-4 text-sm text-[var(--bv-text-secondary)]">
        Banana Vision &copy; {new Date().getFullYear()} - Romhacking Text Preview Tool
      </footer>

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
        onClose={(markCompleted) => handleCloseTutorial(markCompleted)}
        onSetStep={setCurrentTutorialStep}
      />
    </div>
  );
};

export default App;
