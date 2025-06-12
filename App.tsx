
import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { AppSettings, Theme, Block, NestedAppSettingsObjectKeys, ScriptFile } from './types';
import { DEFAULT_SETTINGS } from './constants';
import ControlsPanel from './components/ControlsPanel';
import PreviewArea, { PreviewAreaProps } from './components/PreviewArea';
import Toolbar from './components/Toolbar';
import { exportSettingsAsJson, importSettingsFromJson } from './services/fileService';
import { exportToPng } from './services/exportService';

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


const ESTIMATED_BLOCK_CELL_HEIGHT_PX = 350;
const OBSERVER_MARGIN_ITEM_COUNT = 2;

interface BlockCellProps {
  block: Block;
  theme: Theme;
  appSettings: AppSettings;
  isFullyVisible: boolean;
  placeholderHeight: number;
  placeholderWidth: number;
  onBlockContentChange: (blockOriginalIndex: number, newContent: string) => void;
  onBlockOverflowChange: (blockOriginalIndex: number, isOverflowing: boolean) => void;
  onNestedSettingsChange: PreviewAreaProps['onNestedSettingsChange'];
  comparisonOriginalContent: string | null; // Content of the corresponding block from the matched original script
  overflowSettingsPanelOpen: boolean;
  simplifiedRender: boolean;
  onVisibilityChange: (blockOriginalIndex: number, isVisible: boolean) => void;
  scrollRootElement: HTMLDivElement | null;
  observerRootMarginValue: number;
}

const BlockCell: React.FC<BlockCellProps> = ({
  block,
  theme,
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
  observerRootMarginValue
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
      className={`block-cell p-4 rounded-lg shadow-md border ${
      theme === 'banana' ? 'bg-yellow-50/70 border-yellow-300' :
      theme === 'dark' ? 'bg-gray-800/70 border-gray-700' :
      'bg-gray-50/70 border-gray-300'
    }`}>
      <h3 className={`text-md font-semibold mb-2 flex justify-between items-center ${
        theme === 'banana' ? 'text-yellow-800' : theme === 'dark' ? 'text-yellow-300' : 'text-gray-800'
      }`}>
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
          key={`preview-cell-${block.index}`} // Consider adding active script ID to key if necessary
          baseSettings={appSettings}
          textOverride={block.content}
          simplifiedRender={simplifiedRender}
          setIsOverflowing={(isOverflowing) => onBlockOverflowChange(blockOriginalIndex, isOverflowing)}
          onNestedSettingsChange={onNestedSettingsChange}
          showPixelMarginGuides={appSettings.pixelOverflowMargins.enabled && overflowSettingsPanelOpen}
          isReadOnlyPreview={false}
        />
        ) : (
          <div
            className="flex items-center justify-center border border-dashed border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-gray-750 text-gray-500 dark:text-gray-400 text-sm italic"
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
        className={`w-full p-2 border rounded-md shadow-sm sm:text-sm resize-y min-h-[80px] mb-2
                    ${ theme === 'banana' ? 'bg-yellow-50 border-yellow-400 focus:ring-yellow-500 focus:border-yellow-500'
                                        : theme === 'dark' ? 'bg-gray-600 border-gray-500 focus:ring-yellow-500 focus:border-yellow-500 text-gray-100'
                                        : 'bg-white border-gray-300 focus:ring-yellow-500 focus:border-yellow-500'}`}
      />
      {appSettings.comparisonModeEnabled && comparisonOriginalContent !== null && (
        <div>
          <h4 className={`text-sm font-medium mt-2 mb-1 ${
             theme === 'banana' ? 'text-yellow-700' : theme === 'dark' ? 'text-yellow-400' : 'text-gray-700'
          }`}>Original Text (Block {block.index + 1})</h4>
          <textarea
            aria-label={`Original content for block ${block.index + 1}`}
            readOnly
            value={comparisonOriginalContent}
            className={`w-full p-2 border rounded-md shadow-sm sm:text-sm resize-y min-h-[60px]
                        bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400
                        cursor-not-allowed`}
          />
        </div>
      )}
    </div>
  );
};

const MemoizedBlockCell = React.memo(BlockCell);


const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<Theme>('banana');
  const previewRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const mainTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const [mainScripts, setMainScripts] = useState<ScriptFile[]>([]);
  const [activeMainScriptId, setActiveMainScriptId] = useState<string | null>(null);
  const [originalScripts, setOriginalScripts] = useState<ScriptFile[]>([]);

  const [currentBlockIndex, setCurrentBlockIndex] = useState<number | null>(0); // Index within active script's blocks
  const [showOnlyOverflowingBlocks, setShowOnlyOverflowingBlocks] = useState<boolean>(false);

  const [loadedCustomFontInfo, setLoadedCustomFontInfo] = useState<LoadedCustomFontInfo | null>(null);
  const [overflowSettingsPanelOpen, setOverflowSettingsPanelOpen] = useState(true);

  const [matchedOriginalScript, setMatchedOriginalScript] = useState<ScriptFile | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('single');

  const [fullyVisibleBlockOriginalIndices, setFullyVisibleBlockOriginalIndices] = useState<Set<number>>(new Set());
  const [scrollRootElement, setScrollRootElement] = useState<HTMLDivElement | null>(null);

  // Find and Replace State
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


  const allBlocksScrollContainerRefCallback = useCallback((node: HTMLDivElement | null) => {
    setScrollRootElement(node);
  }, []);

  const observerRootMarginValue = useMemo(() => OBSERVER_MARGIN_ITEM_COUNT * ESTIMATED_BLOCK_CELL_HEIGHT_PX, []);

  const activeMainScript = useMemo(() => {
    if (!activeMainScriptId) return null;
    return mainScripts.find(script => script.id === activeMainScriptId) || null;
  }, [mainScripts, activeMainScriptId]);

  const activeScriptBlocks = useMemo(() => activeMainScript?.blocks || [], [activeMainScript]);

  useEffect(() => {
    // Determine matched original script for comparison
    if (activeMainScript && settings.comparisonModeEnabled) {
      let match: ScriptFile | null = null;
      // 1. Try to match by name
      match = originalScripts.find(os => os.name === activeMainScript.name) || null;
      // 2. If no name match, try to match by index (order of upload)
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


  const handleSettingsChange = useCallback(<K extends keyof AppSettings, V extends AppSettings[K]>(
    key: K,
    value: V
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Sync settings.text with current block of active script
  useEffect(() => {
    if (viewMode === 'single') {
      if (activeScriptBlocks.length > 0 && currentBlockIndex !== null && activeScriptBlocks[currentBlockIndex]) {
        if (settings.text !== activeScriptBlocks[currentBlockIndex].content) {
          handleSettingsChange('text', activeScriptBlocks[currentBlockIndex].content);
        }
      } else if (activeScriptBlocks.length > 0 && currentBlockIndex === null) {
        setCurrentBlockIndex(0); // This will trigger another effect run
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
    exportSettingsAsJson(settings, 'banana-vision-settings.json');
  }, [settings]);

  const handleImportJson = useCallback(async (files: FileList) => { // Takes FileList
    if (!files || files.length === 0) return;
    const file = files[0]; // Assuming settings import is always single file
    try {
      const newSettings = await importSettingsFromJson(file);
      setSettings(newSettings);
      setMainScripts([]);
      setActiveMainScriptId(null);
      setOriginalScripts([]);
      setMatchedOriginalScript(null);
      setCurrentBlockIndex(null);
      setFullyVisibleBlockOriginalIndices(new Set());

      // Reset find/replace state on import
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

      // If imported settings have text, treat it as a single default script
      if (newSettings.text && newSettings.text !== DEFAULT_SETTINGS.text) {
          const initialBlocks = parseTextToBlocksInternal(newSettings.text, newSettings.useCustomBlockSeparator, newSettings.blockSeparators);
          const defaultScript: ScriptFile = {
            id: `settings-import-${Date.now()}`,
            name: "Imported Settings Script",
            blocks: initialBlocks,
            rawText: newSettings.text,
            parsedWithCustomSeparators: newSettings.useCustomBlockSeparator,
          };
          setMainScripts([defaultScript]);
          setActiveMainScriptId(defaultScript.id);
          if (initialBlocks.length > 0) {
              setCurrentBlockIndex(0);
          } else {
              setCurrentBlockIndex(null);
          }
      } else {
         if (viewMode === 'single') {
            handleSettingsChange('text', DEFAULT_SETTINGS.text);
         }
      }

    } catch (error) {
      console.error("Failed to import JSON:", error);
      alert("Error importing settings. Make sure it's a valid JSON file.");
    }
  }, [loadedCustomFontInfo, handleSettingsChange, viewMode]);

  const handleExportPng = useCallback(() => {
    const targetElement = previewRef.current;
    if (targetElement) {
      exportToPng(targetElement, `banana-vision-preview-${Date.now()}.png`);
    } else {
        alert("Preview area not found for PNG export. Ensure you are in 'Single Block View' or a block is focused.");
    }
  }, []);

  const handleSaveScript = useCallback(() => {
    if (!activeMainScript) {
      alert("No active script selected to save.");
      return;
    }

    let scriptContent = "";
    if (activeMainScript.blocks.length === 0) {
        scriptContent = ""; // Handle saving an empty script
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


  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark', 'banana');
    document.documentElement.classList.add(theme);
    if (theme === 'banana') {
      document.body.className = 'bg-yellow-50 text-gray-800 font-sans';
    } else if (theme === 'dark') {
      document.body.className = 'bg-gray-900 text-gray-100 font-sans';
    } else {
      document.body.className = 'bg-white text-gray-900 font-sans';
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'banana';
      return 'light';
    });
  };

  const readFileAsText = (fileToRead: File, encoding: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(fileToRead, encoding);
    });
  };

  const parseTextToBlocksInternal = (rawText: string, useCustomSep: boolean, separators: string[]): Block[] => {
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
  };

  const processAndAddFiles = async (
    files: FileList,
    isMainScript: boolean
  ): Promise<void> => {
    const currentUseCustomSep = settings.useCustomBlockSeparator;
    const currentBlockSeps = [...settings.blockSeparators];

    const scriptFilePromises = Array.from(files).map(async (file, i) => {
      try {
        let rawText = await readFileAsText(file, 'UTF-8');
        // Basic check for mojibake, might need more sophisticated detection
        if (rawText.includes('\uFFFD')) { 
          rawText = await readFileAsText(file, 'Windows-1252'); // Try Windows-1252 as a common fallback
        }
        const blocks = parseTextToBlocksInternal(rawText, currentUseCustomSep, currentBlockSeps);
        return {
          id: `${file.name}-${Date.now()}-${i}`,
          name: file.name,
          blocks,
          rawText,
          parsedWithCustomSeparators: currentUseCustomSep,
        } as ScriptFile; // Assert type here as we handle null below
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        alert(`Error processing file ${file.name}. It will be skipped.`);
        return null; // Return null for failed files
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
      setFullyVisibleBlockOriginalIndices(new Set()); // Reset visibility on new scripts
    }
  };


  const handleTextFileUpload = useCallback(async (files: FileList) => {
    await processAndAddFiles(files, true);
  }, [settings.useCustomBlockSeparator, settings.blockSeparators, activeMainScriptId]); 

  const handleOriginalScriptUpload = useCallback(async (files: FileList) => {
    await processAndAddFiles(files, false);
  }, [settings.useCustomBlockSeparator, settings.blockSeparators]);


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
    // Summary will be updated by useEffect on findScope/findText or by explicit call
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
    // When user types, invalidate current find match and potentially summary
    setCurrentFindMatch(null);
    setFindResultsMessage("");
    // setFindResultSummary([]); // Optionally clear summary on typing, or let it be stale until next find op
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
    // setFindResultSummary([]);
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
      setFindResultsMessage(""); // Clear specific find message
      setCurrentFindMatch(null);
      setLastSearchIterationDetails(null); 
      // Do not clear findResultSummary here, it's based on findText/scope, not navigation
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

  // --- Find and Replace Logic ---
  const getRegexForFind = useCallback(() => {
    if (!findText) return null;
    const flags = findIsCaseSensitive ? 'g' : 'gi'; // Always global for counting/multiple replaces
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
    if (!findText || findScope === 'currentBlock') { // No summary list for 'currentBlock'
      setFindResultSummary([]);
      if (!findText) setFindResultsMessage("");
      return;
    }
    const regex = getRegexForFind();
    if (!regex) {
      setFindResultSummary([]);
      // Message already set by getRegexForFind if error
      return;
    }
  
    const summary: FindResultSummaryItem[] = [];
    let totalMatchesOverall = 0;
  
    if (findScope === 'activeScript' && activeMainScript) {
      activeMainScript.blocks.forEach(block => {
        const blockRegex = new RegExp(regex); // New instance for each use due to global flag
        let match;
        let countInBlock = 0;
        while ((match = blockRegex.exec(block.content)) !== null) {
          countInBlock++;
        }
        if (countInBlock > 0) {
          summary.push({
            id: `${activeMainScript.id}-${block.index}`, // original index
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
          const blockRegex = new RegExp(regex); // New instance
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
    // Update summary when find parameters change
    // Avoid calling if findText is empty initially, updateFindResultSummary handles empty findText
    if (mainScripts.length > 0) { // Only run if there are scripts to search
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
    } else if (activeMainScript) { // activeScript or currentBlock (if in single view)
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
    
    // Special handling for 'currentBlock' scope if in single view
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
            if (script.id !== activeMainScriptId) { // Switch active script if needed
                handleSetActiveMainScriptId(script.id);
                 // handleSetCurrentBlockIndex will be called by handleSetActiveMainScriptId's effect
                 // or directly set it here, then highlight.
                 // For now, rely on active script change + this find to set context.
            }
            if (block.index !== currentBlockIndex || script.id !== activeMainScriptId) {
              handleSetCurrentBlockIndex(block.index); 
              setFindResultsMessage(`Found in Script: ${script.name}, Block: ${block.index + 1}. Switched to block.`);
            } else { // Match is in the already active script and block
               setFindResultsMessage(`Found in Script: ${script.name}, Block: ${block.index + 1} at pos ${match.index + 1}.`);
               if (mainTextAreaRef.current) { // Highlight will be handled by useEffect on currentFindMatch
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
            startCharIdxInBlock = 0; // Reset for next block if we started mid-block
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
      if (targetBlock && settings.text === targetBlock.content) { // Ensure textarea reflects the matched block
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
        handleCurrentBlockContentChangeInSingleView(newText); // This updates script and settings.text
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
        setCurrentFindMatch(null); // Clear the just-replaced match
        setLastSearchIterationDetails({ // Set to search after the replacement
            scriptId: scriptId,
            blockOriginalIndex: blockIndex,
            searchStartIndexInBlock: searchStartIndexAfterReplace,
        });
        setFindResultsMessage("Replaced. Finding next...");
        updateFindResultSummary(); // Update summary after content change
        setTimeout(() => handleFindNext(), 50); // Small delay for state to settle
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
    const regex = getRegexForFind(); // This regex will have 'g' flag
    if (!regex) return;

    let scriptsToUpdate: ScriptFile[] = [];
    if (findScope === 'allScripts') {
      scriptsToUpdate = mainScripts;
    } else if (findScope === 'activeScript' && activeMainScript) {
      scriptsToUpdate = [activeMainScript];
    } else if (findScope === 'currentBlock' && viewMode === 'single' && activeMainScript && currentBlockIndex !== null) {
        const currentTextAreaContent = settings.text;
        const freshRegex = getRegexForFind(); // Ensure fresh regex for counting
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
        updateFindResultSummary(); // Update summary for current block if applicable
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
        const freshRegexForBlock = getRegexForFind(); // Fresh regex for each block
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
    updateFindResultSummary(); // Update summary for all affected scopes
  }, [findText, replaceText, getRegexForFind, mainScripts, activeMainScript, activeMainScriptId, findScope, viewMode, currentBlockIndex, settings.text, handleSettingsChange, handleCurrentBlockContentChangeInSingleView, updateFindResultSummary]);

  const onFindTextChange = (text: string) => { setFindText(text); setCurrentFindMatch(null); setLastSearchIterationDetails(null); /* Summary updates via useEffect */ };
  const onReplaceTextChange = (text: string) => setReplaceText(text);
  const onFindIsCaseSensitiveChange = (value: boolean) => { setFindIsCaseSensitive(value); setCurrentFindMatch(null); setLastSearchIterationDetails(null);};
  const onFindMatchWholeWordChange = (value: boolean) => { setFindMatchWholeWord(value); setCurrentFindMatch(null); setLastSearchIterationDetails(null);};
  const onFindScopeChange = (scope: FindScope) => { setFindScope(scope); setCurrentFindMatch(null); setLastSearchIterationDetails(null);};

  const handleNavigateToFindResult = useCallback(async (item: FindResultSummaryItem) => {
    setCurrentFindMatch(null); 
    setLastSearchIterationDetails(null);
  
    if (item.scriptId !== activeMainScriptId) {
      handleSetActiveMainScriptId(item.scriptId);
      // It's important that activeMainScript and activeScriptBlocks are updated before proceeding.
      // handleSetActiveMainScriptId should handle this. We might need to wait for these updates.
      // A small timeout can sometimes help ensure state propagation if direct chaining causes issues.
      await new Promise(resolve => setTimeout(resolve, 0)); // Ensure state update for activeMainScript
    }
  
    if (item.type === 'block' && item.blockOriginalIndex !== undefined) {
      if (viewMode !== 'single') {
        setViewMode('single');
        await new Promise(resolve => setTimeout(resolve, 0)); // Ensure viewMode update
      }
      handleSetCurrentBlockIndex(item.blockOriginalIndex);
      await new Promise(resolve => setTimeout(resolve, 0)); // Ensure currentBlockIndex & settings.text update
  
      // Now find the first match in this newly set current block.
      // The content of settings.text should be the target.
      setTimeout(() => {
        // Find the script and block from the *current* state, which should now be updated
        const currentActiveScript = mainScripts.find(s => s.id === item.scriptId);
        const targetBlock = currentActiveScript?.blocks.find(b => b.index === item.blockOriginalIndex);

        if (!targetBlock || !mainTextAreaRef.current) {
             setFindResultsMessage(`Error navigating to ${item.name}. Block not found or text area unavailable.`);
             return;
        }
        // Ensure settings.text in the App state is in sync with targetBlock.content for the regex to work on the correct string
        // This should have been handled by handleSetCurrentBlockIndex and its useEffect
        // If settings.text is not yet updated, this find will be on old data.

        const regex = getRegexForFind();
        if (!regex) return;
        
        regex.lastIndex = 0; 
        const match = regex.exec(targetBlock.content); // Use targetBlock.content
  
        if (match) {
          const matchDetails: FoundMatch = {
            scriptId: item.scriptId,
            blockIndex: item.blockOriginalIndex,
            charStartIndex: match.index,
            charEndIndex: regex.lastIndex,
          };
          setCurrentFindMatch(matchDetails); // This will trigger the useEffect for highlighting
          setLastSearchIterationDetails({
            scriptId: item.scriptId,
            blockOriginalIndex: item.blockOriginalIndex,
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

        // Set currentFindMatch directly after states are updated
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

  // --- End Find and Replace Logic ---


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
    if (viewMode === 'single' && previewRef.current && previewContainerRef.current) {
      const scaledHeight = previewRef.current.getBoundingClientRect().height;
      previewContainerRef.current.style.height = `${scaledHeight}px`;
    } else if (previewContainerRef.current) {
      previewContainerRef.current.style.height = 'auto';
    }
  }, [settings, currentBlockIndex, viewMode, activeMainScriptId]); 


  const currentEditableBlockForSingleView = (viewMode === 'single' && activeMainScript && currentBlockIndex !== null && activeScriptBlocks[currentBlockIndex])
    ? activeScriptBlocks[currentBlockIndex]
    : null;

  let originalBlockForSingleViewComparison: Block | null = null;
  let originalSourceInfoForSingleView = "";

  if (viewMode === 'single' && settings.comparisonModeEnabled && currentEditableBlockForSingleView && matchedOriginalScript) {
    if (matchedOriginalScript.blocks[currentEditableBlockForSingleView.index]) {
        originalBlockForSingleViewComparison = matchedOriginalScript.blocks[currentEditableBlockForSingleView.index];
        originalSourceInfoForSingleView = `(File: ${matchedOriginalScript.name})`;
    }
  } else if (viewMode === 'single' && settings.comparisonModeEnabled && currentEditableBlockForSingleView) {
      originalBlockForSingleViewComparison = {
          ...currentEditableBlockForSingleView,
          content: currentEditableBlockForSingleView.originalContent,
      };
      originalSourceInfoForSingleView = "(Initial Load of Active Script)";
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      theme === 'banana' ? 'bg-yellow-100' : theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
    }`}>
      <header className={`p-4 shadow-md ${
        theme === 'banana' ? 'bg-yellow-400 text-yellow-900' : theme === 'dark' ? 'bg-gray-900 text-yellow-400' : 'bg-white text-yellow-600'
      }`}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold">🍌 Banana Vision</h1>
          <Toolbar
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            onExportPng={handleExportPng}
            onToggleTheme={toggleTheme}
            currentTheme={theme}
            onSaveScript={handleSaveScript}
          />
        </div>
      </header>

      <div className="flex-grow container mx-auto p-4 flex flex-col lg:flex-row gap-4">
        <aside className={`w-full ${viewMode === 'all' ? 'lg:w-1/5' : 'lg:w-1/3'} p-4 rounded-lg shadow-lg overflow-y-auto max-h-[calc(100vh-150px)] ${
          theme === 'banana' ? 'bg-yellow-200/80 backdrop-blur-sm' : theme === 'dark' ? 'bg-gray-700/80 backdrop-blur-sm text-gray-200' : 'bg-white/80 backdrop-blur-sm'
        }`}>
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
          />
        </aside>
        <main className={`w-full ${viewMode === 'all' ? 'lg:w-4/5' : 'lg:w-2/3'} flex-grow flex flex-col p-4 rounded-lg shadow-lg relative ${
          theme === 'banana' ? 'bg-yellow-200/80 backdrop-blur-sm' : theme === 'dark' ? 'bg-gray-700/80 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm'
        }`}>

          {viewMode === 'single' ? (
            <>
              <div
                ref={previewContainerRef}
                className="flex flex-col items-center justify-center w-full relative p-4 overflow-hidden"
              >
                {settings.comparisonModeEnabled && currentEditableBlockForSingleView ? (
                  <div className="flex flex-row w-full gap-4">
                    <div className="w-1/2 flex flex-col items-center justify-center relative">
                      <h3 className={`text-sm font-semibold mb-1 ${ theme === 'banana' ? 'text-yellow-700' : theme === 'dark' ? 'text-yellow-300' : 'text-gray-700'}`}>
                        Original {originalSourceInfoForSingleView} (Block {currentEditableBlockForSingleView.index + 1})
                      </h3>
                      <PreviewArea
                        key={`original-preview-single-${activeMainScriptId}-${currentEditableBlockForSingleView.index}`}
                        baseSettings={settings}
                        textOverride={originalBlockForSingleViewComparison ? originalBlockForSingleViewComparison.content : "Original content not available."}
                        setIsOverflowing={() => {}}
                        onNestedSettingsChange={() => {}} 
                        showPixelMarginGuides={false}
                        isReadOnlyPreview={true}
                        simplifiedRender={false}
                      />
                    </div>
                    <div className="w-1/2 flex flex-col items-center justify-center relative">
                      <h3 className={`text-sm font-semibold mb-1 ${ theme === 'banana' ? 'text-yellow-700' : theme === 'dark' ? 'text-yellow-300' : 'text-gray-700'}`}>
                        Editable (Block {currentEditableBlockForSingleView.index + 1})
                      </h3>
                      <PreviewArea
                        ref={previewRef}
                        key={`editable-preview-single-${activeMainScriptId}-${currentEditableBlockForSingleView.index}`}
                        baseSettings={settings}
                        setIsOverflowing={handleMainPreviewOverflowStatusChange}
                        onNestedSettingsChange={handleNestedSettingsChange}
                        showPixelMarginGuides={overflowSettingsPanelOpen}
                        isReadOnlyPreview={false}
                        simplifiedRender={false}
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
                    <h2 className={`text-lg font-semibold mb-2 ${ theme === 'banana' ? 'text-yellow-700' : theme === 'dark' ? 'text-yellow-300' : 'text-gray-800'}`}>
                      Original {originalSourceInfoForSingleView} (Block {currentEditableBlockForSingleView.index + 1})
                    </h2>
                    <textarea
                      id={`original-block-content-single-${activeMainScriptId}-${currentEditableBlockForSingleView.index}`}
                      aria-label={`Original content of block ${currentEditableBlockForSingleView.index + 1}`}
                      readOnly
                      value={originalBlockForSingleViewComparison ? originalBlockForSingleViewComparison.content : "Original content not available."}
                      className={`w-full p-2 border rounded-md shadow-sm sm:text-sm flex-grow resize-y
                                  bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400
                                  cursor-not-allowed min-h-[100px]`}
                    />
                  </div>
                )}
                <div className={`flex flex-col ${settings.comparisonModeEnabled && currentEditableBlockForSingleView ? 'w-full sm:w-1/2' : 'w-full flex-grow'}`}>
                  <h2 className={`text-lg font-semibold mb-2 ${ theme === 'banana' ? 'text-yellow-700' : theme === 'dark' ? 'text-yellow-300' : 'text-gray-800'}`}>
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
                    className={`w-full p-2 border rounded-md shadow-sm sm:text-sm flex-grow resize-y min-h-[100px]
                                ${ theme === 'banana' ? 'bg-yellow-50 border-yellow-400 focus:ring-yellow-500 focus:border-yellow-500 text-gray-800 placeholder-gray-500'
                                                    : theme === 'dark' ? 'bg-gray-600 border-gray-500 focus:ring-yellow-500 focus:border-yellow-500 text-gray-100 placeholder-gray-400'
                                                    : 'bg-white border-gray-300 focus:ring-yellow-500 focus:border-yellow-500 text-gray-900 placeholder-gray-500'}`}
                    placeholder={activeScriptBlocks.length > 0 && currentBlockIndex === null ? "Select a block from the navigation to edit." : !activeMainScriptId ? "Load a main script to begin..." : "Type here..."}
                  />
                </div>
              </div>
            </>
          ) : ( // All Blocks View
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
                    key={`${activeMainScript.id}-${block.index}`}
                    block={block}
                    theme={theme}
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
                  />
                );
              })}
              {activeMainScript && displayedBlocksForView.length === 0 && activeScriptBlocks.length > 0 && (
                <p className={`text-center italic ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  No blocks match the current filter (e.g., "Show Only Overflowing") for script: {activeMainScript.name}.
                </p>
              )}
               {!activeMainScript && (
                <p className={`text-center italic ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  No active main script. Load or select a script from the Controls Panel.
                </p>
              )}
               {activeMainScript && activeScriptBlocks.length === 0 && (
                <p className={`text-center italic ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Script "{activeMainScript.name}" has no blocks.
                </p>
              )}
            </div>
          )}
        </main>
      </div>
      <footer className={`text-center p-4 text-sm ${
        theme === 'banana' ? 'text-yellow-700' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
      }`}>
        Banana Vision &copy; {new Date().getFullYear()} - Romhacking Text Preview Tool
      </footer>
    </div>
  );
};

export default App;
