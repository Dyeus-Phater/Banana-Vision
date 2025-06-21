

import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import { AppSettings, Block, NestedAppSettingsObjectKeys, ScriptFile, GitHubSettings, ThemeKey, CustomColorTag, ImageTag, MarginSetting, GlossaryTerm, GlossaryCategory } from '../types';
import { FindScope, FindResultSummaryItem } from '../App';
import { AVAILABLE_FONTS } 
from '../constants';
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
  loadedCustomFontName: string | null; // This now primarily indicates if a custom font *style* is active
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
  gitHubSettings: GitHubSettings;
  onGitHubSettingsChange: <K extends keyof GitHubSettings>(key: K, value: GitHubSettings[K]) => void;
  onLoadFileFromGitHub: () => void;
  onSaveFileToGitHub: () => void;
  onLoadAllFromGitHubFolder: () => void;
  onSaveAllToGitHubFolder: () => void;
  onLoadFileFromGitHubForOriginal: () => void; 
  onLoadAllFromGitHubFolderForOriginal: () => void; 
  isGitHubLoading: boolean;
  gitHubStatusMessage: string;
  activeThemeKey: ThemeKey;
  // Glossary Props
  glossaryTerms: GlossaryTerm[];
  onAddGlossaryTerm: (term: string, translation: string, category: GlossaryCategory) => void;
  onUpdateGlossaryTerm: (id: string, term: string, translation: string, category: GlossaryCategory) => void;
  onDeleteGlossaryTerm: (id: string) => void;
  // AI Tag Pattern Props
  aiTagPatternExamples: string;
  onAiTagPatternExamplesChange: (examples: string) => void;
  aiTagPatternSuggestion: string;
  onAiSuggestTagPatterns: () => Promise<void>;
  aiTagPatternLoading: boolean;
  aiTagPatternError: string | null;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  id?: string;
  onDragStartButton?: React.DragEventHandler<HTMLButtonElement>;
  onDragEndButton?: React.DragEventHandler<HTMLButtonElement>;
}

const DraggableSectionWrapper: React.FC<React.PropsWithChildren<{
  onDragEnter?: React.DragEventHandler<HTMLDivElement>;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
  onDragLeave?: React.DragEventHandler<HTMLDivElement>;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
  isDragging?: boolean;
  isDragOver?: boolean;
  ['data-section-id']?: string; // Add data-section-id for dragLeave logic
}>> = ({ children, isDragging, isDragOver, ...dragProps }) => {
  return (
    <div
      data-section-id={dragProps['data-section-id']}
      onDragEnter={dragProps.onDragEnter}
      onDragOver={dragProps.onDragOver}
      onDragLeave={dragProps.onDragLeave}
      onDrop={dragProps.onDrop}
      className={`
        draggable-section-wrapper
        transition-all duration-150 ease-in-out
        ${isDragging ? 'opacity-50 scale-98 shadow-2xl cursor-grabbing' : 'opacity-100 scale-100'}
        ${isDragOver ? 'ring-2 ring-[var(--bv-accent-primary)] ring-offset-2 ring-offset-[var(--bv-page-background)]' : ''}
        my-1 rounded-lg
      `}
    >
      {children}
    </div>
  );
};

export const Section: React.FC<SectionProps> = ({ title, children, isOpen, onToggle, id, onDragStartButton, onDragEndButton }) => {
  return (
    <div className="mb-4 p-3 border border-[var(--bv-border-color)] rounded-lg bg-[var(--bv-element-background-secondary)] shadow-sm" id={id}>
      <div className="flex justify-between items-center mb-2">
        <button
          className="drag-handle-button text-lg font-semibold text-[var(--bv-text-primary)] w-full text-left flex items-center cursor-grab"
          onClick={onToggle}
          draggable={true}
          onDragStart={onDragStartButton}
          onDragEnd={onDragEndButton}
          aria-expanded={isOpen}
          aria-controls={id ? `${id}-content` : undefined}
          aria-roledescription="drag handle for section reordering"
          title={`Drag to reorder section: ${title}. Click to ${isOpen ? 'collapse' : 'expand'}.`}
        >
          <span className="mr-2 text-[var(--bv-accent-primary)] hover:text-[var(--bv-accent-secondary)]" aria-hidden="true">☰</span>
          {title}
        </button>
        <button
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={id ? `${id}-content` : undefined}
          className="text-[var(--bv-accent-primary)]"
          aria-label={isOpen ? `Collapse ${title} section` : `Expand ${title} section`}
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
    <label htmlFor={htmlFor} className={`block text-sm font-medium text-[var(--bv-text-primary)] ${disabled ? 'cursor-not-allowed' : ''}`}>
      {label}
    </label>
    {children}
    {subText && <p className="text-xs text-[var(--bv-text-secondary)] mt-0.5">{subText}</p>}
  </div>
);

export const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`mt-1 block w-full px-3 py-1.5 border border-[var(--bv-input-border)] rounded-md shadow-sm 
               focus:outline-none focus:ring-[var(--bv-input-focus-ring)] focus:border-[var(--bv-input-focus-ring)] 
               sm:text-sm bg-[var(--bv-input-background)] text-[var(--bv-input-text)] 
               ${props.disabled ? 'cursor-not-allowed bg-opacity-70' : ''} ${props.className || ''}`}
  />
);

export const TextAreaInput: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    className={`mt-1 block w-full px-3 py-1.5 border border-[var(--bv-input-border)] rounded-md shadow-sm 
               focus:outline-none focus:ring-[var(--bv-input-focus-ring)] focus:border-[var(--bv-input-focus-ring)] 
               sm:text-sm bg-[var(--bv-input-background)] text-[var(--bv-input-text)] resize-y ${props.className || ''}`}
  />
);


export const SelectInput: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
   <select
    {...props}
    className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-[var(--bv-input-border)] 
               focus:outline-none focus:ring-[var(--bv-input-focus-ring)] focus:border-[var(--bv-input-focus-ring)] 
               sm:text-sm rounded-md bg-[var(--bv-input-background)] text-[var(--bv-input-text)] ${props.className || ''}`}
  />
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
    <button
        {...props}
        className={`px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium 
                   text-[var(--bv-accent-primary-content)] bg-[var(--bv-accent-primary)] hover:opacity-80
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--bv-input-focus-ring)] 
                   ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${props.className || ''}`}
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

const DEFAULT_CUSTOM_COLOR_TAG: Omit<CustomColorTag, 'id'> = {
  openingTag: '',
  closingTag: '',
  color: '#000000',
  enabled: true,
};

const DEFAULT_IMAGE_TAG: Omit<ImageTag, 'id' | 'imageUrl'> = {
  tag: '',
  width: 24, 
  height: 24,
  enabled: true,
};

const DEFAULT_GLOSSARY_ITEM_INPUTS = { term: '', translation: '' };

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

type NavigationTabKey = 'scripts' | 'blocks';


export const ControlsPanel: React.FC<ControlsPanelProps> = (props) => {
  const {
    settings, onSettingsChange, onNestedSettingsChange,
    mainScripts, activeMainScriptId, 
    loadedCustomFontName, 
    // overflowSettingsPanelOpen, // Not directly used for section open state here
    // onToggleOverflowSettingsPanel, // This prop is not used
    glossaryTerms, onAddGlossaryTerm, onUpdateGlossaryTerm, onDeleteGlossaryTerm,
    // AI Tag Pattern Props
    aiTagPatternExamples, onAiTagPatternExamplesChange,
    aiTagPatternSuggestion, onAiSuggestTagPatterns,
    aiTagPatternLoading, aiTagPatternError,
    // Explicitly list props used in getPanelSectionsConfig or its returned content
    onTextFileUpload, onSetActiveMainScriptId, onClearMainScripts, activeScriptBlocks,
    currentBlockIndex, onSetCurrentBlockIndex, showOnlyOverflowingBlocks,
    onShowOnlyOverflowingBlocksChange, displayedBlocksForView, onLoadCustomFont,
    overflowSettingsPanelOpen, originalScripts, onOriginalScriptUpload,
    matchedOriginalScriptName, onClearOriginalScripts, viewMode, onViewModeChange,
    findText, onFindTextChange, replaceText, onReplaceTextChange,
    findIsCaseSensitive, onFindIsCaseSensitiveChange, findMatchWholeWord,
    onFindMatchWholeWordChange, findScope, onFindScopeChange, onFindNext,
    onReplace, onReplaceAll, findResultsMessage, isFindCurrentBlockDisabled,
    findResultSummary, onNavigateToFindResult, gitHubSettings, onGitHubSettingsChange,
    onLoadFileFromGitHub, onSaveFileToGitHub, onLoadAllFromGitHubFolder,
    onSaveAllToGitHubFolder, onLoadFileFromGitHubForOriginal,
    onLoadAllFromGitHubFolderForOriginal, isGitHubLoading, gitHubStatusMessage,
    activeThemeKey
  } = props;

  const customFontFilePickerRef = useRef<HTMLInputElement>(null);
  const controlsPanelRef = useRef<HTMLDivElement>(null);


  const [isEditingColorTag, setIsEditingColorTag] = useState<boolean>(false);
  const [editingColorTag, setEditingColorTag] = useState<CustomColorTag | Omit<CustomColorTag, 'id'>>(DEFAULT_CUSTOM_COLOR_TAG);
  const [editingColorTagId, setEditingColorTagId] = useState<string | null>(null);

  const [isEditingImageTag, setIsEditingImageTag] = useState<boolean>(false);
  const [editingImageTagFields, setEditingImageTagFields] = useState<Omit<ImageTag, 'id' | 'imageUrl'> & { imageUrl?: string }>(DEFAULT_IMAGE_TAG);
  const [editingImageTagId, setEditingImageTagId] = useState<string | null>(null);
  const [editingImageTagFile, setEditingImageTagFile] = useState<File | null>(null);
  const [editingImageTagPreviewUrl, setEditingImageTagPreviewUrl] = useState<string | null>(null);

  const [activeNavigationTab, setActiveNavigationTab] = useState<NavigationTabKey>('scripts');

  const [blockSeparatorsInputText, setBlockSeparatorsInputText] = useState<string>(
    () => settings.blockSeparators.join(',')
  );

  // Glossary State
  const [glossaryTermInput, setGlossaryTermInput] = useState<string>(DEFAULT_GLOSSARY_ITEM_INPUTS.term);
  const [glossaryTranslationInput, setGlossaryTranslationInput] = useState<string>(DEFAULT_GLOSSARY_ITEM_INPUTS.translation);
  const [editingGlossaryItemId, setEditingGlossaryItemId] = useState<string | null>(null);
  const [editingGlossaryItemCategory, setEditingGlossaryItemCategory] = useState<GlossaryCategory | null>(null);
  const [showGlossaryFormFor, setShowGlossaryFormFor] = useState<GlossaryCategory | null>(null);


  useEffect(() => {
    // This effect syncs the local input text if the canonical settings.blockSeparators array changes externally.
    const newSeparatorsText = settings.blockSeparators.join(',');
    if (blockSeparatorsInputText !== newSeparatorsText) {
      setBlockSeparatorsInputText(newSeparatorsText);
    }
  }, [settings.blockSeparators]); // Only depends on the canonical source


  const handleBlockSeparatorsInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBlockSeparatorsInputText(e.target.value);
  },[]);

  const handleBlockSeparatorsInputBlur = useCallback(() => {
    const newSeparators = blockSeparatorsInputText
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    onSettingsChange('blockSeparators', newSeparators);
    setBlockSeparatorsInputText(newSeparators.join(','));
  }, [blockSeparatorsInputText, onSettingsChange]);
  
  useEffect(() => {
    if (!isEditingImageTag && editingImageTagPreviewUrl) {
        URL.revokeObjectURL(editingImageTagPreviewUrl);
        setEditingImageTagPreviewUrl(null);
    }
    return () => {
        if (editingImageTagPreviewUrl) {
            URL.revokeObjectURL(editingImageTagPreviewUrl);
        }
    };
  }, [isEditingImageTag, editingImageTagPreviewUrl]);


  const handlePrimaryBgImageUpload = useCallback((files: FileList) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        onSettingsChange('previewWidth', img.naturalWidth);
        onSettingsChange('previewHeight', img.naturalHeight);
        onSettingsChange('backgroundImageUrl', dataUrl);
      };
      img.onerror = () => {
        console.error("Failed to load image for dimension extraction.");
        onSettingsChange('backgroundImageUrl', dataUrl); 
      }
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [onSettingsChange]);

  const handleSecondaryBgImageUpload = useCallback((files: FileList) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => onSettingsChange('secondaryBackgroundImageUrl', reader.result as string);
    reader.readAsDataURL(file);
  }, [onSettingsChange]);

  const handleBitmapFontImageUpload = useCallback((files: FileList) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => onNestedSettingsChange('bitmapFont', 'imageUrl', reader.result as string);
    reader.readAsDataURL(file);
  }, [onNestedSettingsChange]);


  const handleFontFileSelected = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      let fileNamePart = file.name.split('.').slice(0, -1).join('.');
      if (!fileNamePart && file.name.startsWith('.')) { 
          fileNamePart = file.name.substring(1).split('.').slice(0, -1).join('.');
      }
      if (!fileNamePart) { 
          fileNamePart = "My Custom Font";
      }
  
      let cssName = fileNamePart
        .replace(/[^a-zA-Z0-9\s_-]/g, '') 
        .trim() 
        .replace(/\s+/g, '-') 
        .replace(/_+/g, '_'); 
  
      if (!/^[a-zA-Z]/.test(cssName)) {
        cssName = "Custom-" + cssName;
      }
      if (!cssName || cssName === "Custom-") { 
          cssName = "My-Custom-Font";
      }
      
      props.onLoadCustomFont(file, cssName);
    }
  }, [props.onLoadCustomFont]);

  const handleFontFamilyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFontFamily = e.target.value;
    
    if (newFontFamily !== "Custom..." && newFontFamily !== loadedCustomFontName) {
      if (settings.systemFont.customFontBase64 || settings.systemFont.customFontFileName) {
        onNestedSettingsChange('systemFont', 'customFontBase64', undefined);
        onNestedSettingsChange('systemFont', 'customFontFileName', undefined);
      }
    }
    onNestedSettingsChange('systemFont', 'fontFamily', newFontFamily);

    if (newFontFamily === "Custom...") {
      setTimeout(() => {
        customFontFilePickerRef.current?.click();
      }, 0);
    }
  }, [onNestedSettingsChange, loadedCustomFontName, settings.systemFont.customFontBase64, settings.systemFont.customFontFileName]);


  const handleStartAddNewColorTag = useCallback(() => {
    setEditingColorTag(DEFAULT_CUSTOM_COLOR_TAG);
    setEditingColorTagId(null);
    setIsEditingColorTag(true);
  }, []);

  const handleStartEditColorTag = useCallback((tag: CustomColorTag) => {
    setEditingColorTag(tag);
    setEditingColorTagId(tag.id);
    setIsEditingColorTag(true);
  }, []);

  const handleSaveColorTag = useCallback(() => {
    if (!editingColorTag.openingTag.trim() || !editingColorTag.closingTag.trim()) {
      alert("Opening and closing tags cannot be empty.");
      return;
    }
    if (editingColorTag.openingTag === editingColorTag.closingTag) {
        alert("Opening and closing tags cannot be the same.");
        return;
    }

    let updatedTags;
    if (editingColorTagId) { 
      updatedTags = settings.customColorTags.map(t =>
        t.id === editingColorTagId ? { ...editingColorTag, id: editingColorTagId } as CustomColorTag : t
      );
    } else { 
      const newTag: CustomColorTag = {
        ...editingColorTag,
        id: `cct-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      } as CustomColorTag; 
      updatedTags = [...settings.customColorTags, newTag];
    }
    onSettingsChange('customColorTags', updatedTags);
    setIsEditingColorTag(false);
    setEditingColorTagId(null);
  }, [editingColorTag, editingColorTagId, settings.customColorTags, onSettingsChange]);

  const handleDeleteColorTag = useCallback((tagId: string) => {
    if (window.confirm("Are you sure you want to delete this color tag?")) {
      const updatedTags = settings.customColorTags.filter(t => t.id !== tagId);
      onSettingsChange('customColorTags', updatedTags);
    }
  }, [settings.customColorTags, onSettingsChange]);

  const handleToggleColorTagEnabled = useCallback((tagId: string, enabled: boolean) => {
    const updatedTags = settings.customColorTags.map(t =>
      t.id === tagId ? { ...t, enabled } : t
    );
    onSettingsChange('customColorTags', updatedTags);
  }, [settings.customColorTags, onSettingsChange]);

  const handleEditingColorTagChange = useCallback(<K extends keyof (typeof editingColorTag)>(key: K, value: (typeof editingColorTag)[K]) => {
    setEditingColorTag(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleStartAddNewImageTag = useCallback(() => {
    setEditingImageTagFields(DEFAULT_IMAGE_TAG);
    setEditingImageTagId(null);
    setEditingImageTagFile(null);
    if (editingImageTagPreviewUrl) {
        URL.revokeObjectURL(editingImageTagPreviewUrl);
    }
    setEditingImageTagPreviewUrl(null);
    setIsEditingImageTag(true);
  }, [editingImageTagPreviewUrl]);

  const handleStartEditImageTag = useCallback((imageTag: ImageTag) => {
    setEditingImageTagFields({ 
      tag: imageTag.tag, 
      width: imageTag.width, 
      height: imageTag.height, 
      enabled: imageTag.enabled,
      imageUrl: imageTag.imageUrl 
    });
    setEditingImageTagId(imageTag.id);
    setEditingImageTagFile(null);
    if (editingImageTagPreviewUrl) {
        URL.revokeObjectURL(editingImageTagPreviewUrl);
    }
    setEditingImageTagPreviewUrl(null); 
    setIsEditingImageTag(true);
  }, [editingImageTagPreviewUrl]);

  const handleImageTagFileSelected = useCallback((files: FileList) => {
    if (files && files.length > 0) {
      const file = files[0];
      setEditingImageTagFile(file);
      if (editingImageTagPreviewUrl) {
          URL.revokeObjectURL(editingImageTagPreviewUrl);
      }
      setEditingImageTagPreviewUrl(URL.createObjectURL(file));
    }
  }, [editingImageTagPreviewUrl]);
  
  const handleEditingImageTagFieldChange = useCallback(<K extends keyof typeof editingImageTagFields>(key: K, value: (typeof editingImageTagFields)[K]) => {
    setEditingImageTagFields(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSaveImageTag = useCallback(async () => {
    if (!editingImageTagFields.tag?.trim()) {
      alert("Image tag string cannot be empty.");
      return;
    }
    if (editingImageTagFields.width <=0 || editingImageTagFields.height <=0) {
      alert("Image width and height must be positive numbers.");
      return;
    }

    let finalImageUrl = editingImageTagFields.imageUrl;

    if (editingImageTagFile) {
      try {
        finalImageUrl = await readFileAsDataURL(editingImageTagFile);
      } catch (error) {
        console.error("Error reading image file for tag:", error);
        alert(`Failed to read image file: ${error instanceof Error ? error.message : "Unknown error"}`);
        return;
      }
    } else if (!editingImageTagId && !finalImageUrl) { 
      alert("Please select an image for the new tag.");
      return;
    }
    
    if (!finalImageUrl) { 
        alert("Image URL is missing.");
        return;
    }


    let updatedImageTags;
    if (editingImageTagId) { 
      updatedImageTags = settings.imageTags.map(it =>
        it.id === editingImageTagId ? { 
          ...it, 
          tag: editingImageTagFields.tag!, 
          imageUrl: finalImageUrl!, 
          width: editingImageTagFields.width!, 
          height: editingImageTagFields.height!, 
          enabled: editingImageTagFields.enabled! 
        } : it
      );
    } else { 
      const newImageTag: ImageTag = {
        id: `imgtag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        tag: editingImageTagFields.tag!,
        imageUrl: finalImageUrl!,
        width: editingImageTagFields.width!,
        height: editingImageTagFields.height!,
        enabled: editingImageTagFields.enabled!,
      };
      updatedImageTags = [...settings.imageTags, newImageTag];
    }
    onSettingsChange('imageTags', updatedImageTags);
    
    if (editingImageTagPreviewUrl) { 
        URL.revokeObjectURL(editingImageTagPreviewUrl);
        setEditingImageTagPreviewUrl(null);
    }
    setIsEditingImageTag(false); 
    setEditingImageTagId(null);
    setEditingImageTagFile(null);
  }, [editingImageTagFields, editingImageTagFile, editingImageTagId, settings.imageTags, onSettingsChange, editingImageTagPreviewUrl]);

  const handleDeleteImageTag = useCallback((tagId: string) => {
    if (window.confirm("Are you sure you want to delete this image tag?")) {
      const updatedTags = settings.imageTags.filter(t => t.id !== tagId);
      onSettingsChange('imageTags', updatedTags);
    }
  }, [settings.imageTags, onSettingsChange]);

  const handleToggleImageTagEnabled = useCallback((tagId: string, enabled: boolean) => {
    const updatedTags = settings.imageTags.map(t =>
      t.id === tagId ? { ...t, enabled } : t
    );
    onSettingsChange('imageTags', updatedTags);
  }, [settings.imageTags, onSettingsChange]);


  const handleTagPatternsChange = useCallback((value: string) => {
    onSettingsChange('tagPatternsToHide', value.split('\n'));
  }, [onSettingsChange]);
  
  const handleCustomLineBreakTagsChange = useCallback((value: string) => {
    onSettingsChange('customLineBreakTags', value.split('\n'));
  }, [onSettingsChange]);

  const handlePixelMarginChange = useCallback((
    marginKey: keyof Omit<AppSettings['pixelOverflowMargins'], 'enabled'>,
    subKey: keyof MarginSetting,
    value: number | boolean
  ) => {
    onNestedSettingsChange('pixelOverflowMargins', marginKey, {
      ...settings.pixelOverflowMargins[marginKey],
      [subKey]: value,
    } as MarginSetting); 
  }, [onNestedSettingsChange, settings.pixelOverflowMargins]);

  // Glossary Handlers
  const handleShowAddGlossaryItemForm = useCallback((category: GlossaryCategory) => {
    setGlossaryTermInput(DEFAULT_GLOSSARY_ITEM_INPUTS.term);
    setGlossaryTranslationInput(DEFAULT_GLOSSARY_ITEM_INPUTS.translation);
    setEditingGlossaryItemId(null);
    setEditingGlossaryItemCategory(null);
    setShowGlossaryFormFor(category);
  }, []);
  
  const handleSaveGlossaryItem = useCallback(() => {
    if (!glossaryTermInput.trim()) {
      alert("Term cannot be empty.");
      return;
    }

    const categoryForSave = editingGlossaryItemId ? editingGlossaryItemCategory : showGlossaryFormFor;
    if (!categoryForSave) {
        alert("Category not set for glossary item. This shouldn't happen.");
        return;
    }

    if (editingGlossaryItemId) {
      onUpdateGlossaryTerm(editingGlossaryItemId, glossaryTermInput, glossaryTranslationInput, categoryForSave);
    } else {
      onAddGlossaryTerm(glossaryTermInput, glossaryTranslationInput, categoryForSave);
    }
    
    setGlossaryTermInput(DEFAULT_GLOSSARY_ITEM_INPUTS.term);
    setGlossaryTranslationInput(DEFAULT_GLOSSARY_ITEM_INPUTS.translation);
    setEditingGlossaryItemId(null);
    setEditingGlossaryItemCategory(null);
    setShowGlossaryFormFor(null);
  }, [glossaryTermInput, glossaryTranslationInput, editingGlossaryItemId, editingGlossaryItemCategory, showGlossaryFormFor, onAddGlossaryTerm, onUpdateGlossaryTerm]);

  const handleStartEditGlossaryItem = useCallback((item: GlossaryTerm) => {
    setGlossaryTermInput(item.term);
    setGlossaryTranslationInput(item.translation);
    setEditingGlossaryItemId(item.id);
    setEditingGlossaryItemCategory(item.category);
    setShowGlossaryFormFor(item.category);
  }, []);

  const handleCancelEditOrAddGlossaryItem = useCallback(() => {
    setGlossaryTermInput(DEFAULT_GLOSSARY_ITEM_INPUTS.term);
    setGlossaryTranslationInput(DEFAULT_GLOSSARY_ITEM_INPUTS.translation);
    setEditingGlossaryItemId(null);
    setEditingGlossaryItemCategory(null);
    setShowGlossaryFormFor(null);
  }, []);

  const handleCopyAiSuggestion = async () => {
    if (!aiTagPatternSuggestion) return;
    try {
      await navigator.clipboard.writeText(aiTagPatternSuggestion);
      alert('AI suggestion copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy AI suggestion: ', err);
      alert('Failed to copy suggestion.');
    }
  };


  const getPanelSectionsConfig = useCallback((currentProps: ControlsPanelProps): PanelSectionItem[] => {
    const { 
        settings: currentSettings, 
        onSettingsChange: currentOnSettingsChange, 
        onNestedSettingsChange: currentOnNestedSettingsChange, 
        ...restOfProps 
    } = currentProps;

    const handleToggleTreatEachLineAsBlock = (checked: boolean) => {
        currentOnSettingsChange('treatEachLineAsBlock', checked);
        if (checked) {
            currentOnSettingsChange('useCustomBlockSeparator', false);
            currentOnSettingsChange('useEmptyLinesAsSeparator', false);
        }
    };

    const handleToggleUseCustomBlockSeparator = (checked: boolean) => {
        currentOnSettingsChange('useCustomBlockSeparator', checked);
        if (checked) {
            currentOnSettingsChange('treatEachLineAsBlock', false);
            currentOnSettingsChange('useEmptyLinesAsSeparator', false);
        }
    };
    
    const handleToggleUseEmptyLinesAsSeparator = (checked: boolean) => {
        currentOnSettingsChange('useEmptyLinesAsSeparator', checked);
        if (checked) {
            currentOnSettingsChange('treatEachLineAsBlock', false);
            currentOnSettingsChange('useCustomBlockSeparator', false);
        }
    };
    
    const githubBaseDisabled = restOfProps.isGitHubLoading || !restOfProps.gitHubSettings.pat || !restOfProps.gitHubSettings.repoFullName;
    const githubMainOpsDisabled = githubBaseDisabled || !restOfProps.gitHubSettings.filePath;
    const githubOriginalOpsDisabled = githubBaseDisabled || !restOfProps.gitHubSettings.originalFilePath;

    const namesGlossaryItems = restOfProps.glossaryTerms.filter(gt => gt.category === 'name');
    const termsGlossaryItems = restOfProps.glossaryTerms.filter(gt => gt.category === 'term');

    const displayCustomFontNameInConfig = currentSettings.systemFont.customFontFileName 
        ? currentSettings.systemFont.customFontFileName.split('/').pop()?.split('\\').pop()
        : restOfProps.loadedCustomFontName; 

    const showCustomFontLoadUIInConfig = currentSettings.currentFontType === 'system' &&
                               (currentSettings.systemFont.fontFamily === "Custom..." || 
                                (currentSettings.systemFont.customFontBase64 && currentSettings.systemFont.customFontFileName) || 
                                (restOfProps.loadedCustomFontName && currentSettings.systemFont.fontFamily === restOfProps.loadedCustomFontName));

    const activeMainScriptNameInConfig = restOfProps.mainScripts.find(s => s.id === restOfProps.activeMainScriptId)?.name || null;
    const isFindReplaceDisabledInConfig = restOfProps.mainScripts.length === 0;


    return [
      {
        id: 'script-management-section', title: 'Script Management', defaultOpen: true, content: (
          <>
            <LabelInputContainer label="Upload Main Script(s) (.txt, .scp, etc.)">
              <FileInput accept=".txt,.scp,.text,text/plain" onChange={restOfProps.onTextFileUpload} buttonLabel="Load Main Script(s) from Device" multiple />
            </LabelInputContainer>
            {restOfProps.mainScripts.length > 0 && (
              <Button onClick={restOfProps.onClearMainScripts} className="text-xs mt-1 !py-1 !px-2 !bg-red-500 hover:!bg-red-600 w-full">
                Clear All Main Scripts ({restOfProps.mainScripts.length} loaded)
              </Button>
            )}
             <div className="mt-2 grid grid-cols-2 gap-2">
                <Button 
                    onClick={restOfProps.onLoadFileFromGitHub} 
                    disabled={githubMainOpsDisabled} 
                    className="!bg-green-600 hover:!bg-green-700 text-xs !py-1"
                    title="Load single file from Main Script GitHub path"
                >
                    Load File from Path (Main)
                </Button>
                <Button 
                    onClick={restOfProps.onLoadAllFromGitHubFolder} 
                    disabled={githubMainOpsDisabled} 
                    className="!bg-green-500 hover:!bg-green-600 text-xs !py-1"
                    title="Load all text files from Main Script GitHub folder path"
                >
                    Load All from Folder (Main)
                </Button>
            </div>

            <div className="mt-3 pt-3 border-t border-[var(--bv-border-color-light)]">
              <LabelInputContainer label="Upload Original Script(s) (for Comparison)">
                <FileInput accept=".txt,.scp,.text,text/plain" onChange={restOfProps.onOriginalScriptUpload} buttonLabel="Load Original Script(s) from Device" multiple />
              </LabelInputContainer>
               {restOfProps.originalScripts.length > 0 && (
                <Button onClick={restOfProps.onClearOriginalScripts} className="text-xs mt-1 !py-1 !px-2 !bg-red-500 hover:!bg-red-600 w-full">
                  Clear All Original Scripts ({restOfProps.originalScripts.length} loaded)
                </Button>
              )}
              {restOfProps.matchedOriginalScriptName && (
                <p className="text-xs text-[var(--bv-text-secondary)] mt-1">
                  Comparing with: <span className="font-semibold">{restOfProps.matchedOriginalScriptName}</span>
                </p>
              )}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button 
                    onClick={restOfProps.onLoadFileFromGitHubForOriginal} 
                    disabled={githubOriginalOpsDisabled} 
                    className="!bg-purple-600 hover:!bg-purple-700 text-xs !py-1"
                    title="Load single file from Original Script GitHub path"
                >
                    Load File from Path (Original)
                </Button>
                <Button 
                    onClick={restOfProps.onLoadAllFromGitHubFolderForOriginal} 
                    disabled={githubOriginalOpsDisabled} 
                    className="!bg-purple-500 hover:!bg-purple-600 text-xs !py-1"
                    title="Load all text files from Original Script GitHub folder path"
                >
                    Load All from Folder (Original)
                </Button>
              </div>
            </div>
            
             <div className="mt-2 space-y-1">
                <LabelInputContainer label="Treat each line as a block" htmlFor="treatEachLineAsBlock" inline disabled={currentSettings.useCustomBlockSeparator || currentSettings.useEmptyLinesAsSeparator}>
                    <input 
                        type="checkbox" 
                        id="treatEachLineAsBlock" 
                        checked={currentSettings.treatEachLineAsBlock} 
                        onChange={(e) => handleToggleTreatEachLineAsBlock(e.target.checked)}
                        disabled={currentSettings.useCustomBlockSeparator || currentSettings.useEmptyLinesAsSeparator}
                        className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]"
                    />
                </LabelInputContainer>
                
                <LabelInputContainer label="Use Empty Lines as Separators" htmlFor="useEmptyLinesAsSeparator" inline disabled={currentSettings.treatEachLineAsBlock || currentSettings.useCustomBlockSeparator} subText="One or more empty lines separate blocks.">
                    <input 
                        type="checkbox" 
                        id="useEmptyLinesAsSeparator" 
                        checked={currentSettings.useEmptyLinesAsSeparator} 
                        onChange={(e) => handleToggleUseEmptyLinesAsSeparator(e.target.checked)}
                        disabled={currentSettings.treatEachLineAsBlock || currentSettings.useCustomBlockSeparator}
                        className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]"
                    />
                </LabelInputContainer>

                <LabelInputContainer label="Use Custom Block Separators" htmlFor="useCustomBlockSeparator" inline disabled={currentSettings.treatEachLineAsBlock || currentSettings.useEmptyLinesAsSeparator}>
                    <input 
                        type="checkbox" 
                        id="useCustomBlockSeparator" 
                        checked={currentSettings.useCustomBlockSeparator} 
                        onChange={(e) => handleToggleUseCustomBlockSeparator(e.target.checked)}
                        disabled={currentSettings.treatEachLineAsBlock || currentSettings.useEmptyLinesAsSeparator}
                        className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" 
                    />
                </LabelInputContainer>
                {currentSettings.useCustomBlockSeparator && (
                    <LabelInputContainer label="Block Separators (comma-separated)" htmlFor="blockSeparators" disabled={!currentSettings.useCustomBlockSeparator || currentSettings.treatEachLineAsBlock || currentSettings.useEmptyLinesAsSeparator}>
                        <TextInput 
                            id="blockSeparators" 
                            value={blockSeparatorsInputText} 
                            onChange={handleBlockSeparatorsInputChange}
                            onBlur={handleBlockSeparatorsInputBlur}
                            placeholder="e.g. <PAGE>,[END]"
                            disabled={!currentSettings.useCustomBlockSeparator || currentSettings.treatEachLineAsBlock || currentSettings.useEmptyLinesAsSeparator}
                        />
                    </LabelInputContainer>
                )}
            </div>

            
            <div className="mt-3 pt-3 border-t border-[var(--bv-border-color-light)]">
              <h4 className="text-md font-semibold mb-2 text-[var(--bv-accent-primary)]">Custom Line Break Tags</h4>
              <LabelInputContainer label="Use Custom Line Break Tags" htmlFor="useCustomLineBreakTags" inline>
                <input
                  type="checkbox"
                  id="useCustomLineBreakTags"
                  checked={currentSettings.useCustomLineBreakTags}
                  onChange={(e) => currentOnSettingsChange('useCustomLineBreakTags', e.target.checked)}
                  className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]"
                />
              </LabelInputContainer>
              {currentSettings.useCustomLineBreakTags && (
                <LabelInputContainer label="Custom Line Break Tags (one per line):" htmlFor="customLineBreakTags" subText="These tags will be replaced with newlines in the preview.">
                  <TextAreaInput
                    id="customLineBreakTags"
                    value={currentSettings.customLineBreakTags.join('\n')}
                    onChange={(e) => handleCustomLineBreakTagsChange(e.target.value)}
                    rows={3}
                    placeholder="e.g. <br>\n[NEWLINE]"
                  />
                </LabelInputContainer>
              )}
            </div>
            
            <LabelInputContainer label="Enable Comparison Mode" htmlFor="comparisonModeEnabled" inline disabled={restOfProps.mainScripts.length === 0 || restOfProps.originalScripts.length === 0} subText={(restOfProps.mainScripts.length === 0 || restOfProps.originalScripts.length === 0) ? "Load at least one main and one original script." : "View original and edited text side-by-side."}>
              <input type="checkbox" id="comparisonModeEnabled" checked={currentSettings.comparisonModeEnabled} onChange={(e) => currentOnSettingsChange('comparisonModeEnabled', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" disabled={restOfProps.mainScripts.length === 0 || restOfProps.originalScripts.length === 0} />
            </LabelInputContainer>
            <div className="mt-3 pt-3 border-t border-[var(--bv-border-color-light)]">
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
        id: 'preview-area-settings-section', title: 'Preview Area', defaultOpen: false, content: (
          <>
            <InputWithSlider label="Width" unit="px" id="previewWidth" value={currentSettings.previewWidth} onChange={(val) => currentOnSettingsChange('previewWidth', val)} min={0} max={1280} step={10} subText={currentSettings.previewWidth === 0 ? "Width auto (overflow based on content)" : undefined} />
            <InputWithSlider label="Height" unit="px" id="previewHeight" value={currentSettings.previewHeight} onChange={(val) => currentOnSettingsChange('previewHeight', val)} min={0} max={1024} step={10} subText={currentSettings.previewHeight === 0 ? "Height auto (overflow based on content or Max Content Height)" : undefined} />
            <InputWithSlider label="Preview Zoom" unit="x" id="previewZoom" value={currentSettings.previewZoom} onChange={(val) => currentOnSettingsChange('previewZoom', val)} min={0.25} max={4} step={0.05} subText="Visually scales the entire preview area." />
            <LabelInputContainer label="Background Color" htmlFor="bgColor"><TextInput type="color" id="bgColor" value={currentSettings.backgroundColor} onChange={(e) => currentOnSettingsChange('backgroundColor', e.target.value)} className="h-10 w-full" /></LabelInputContainer>
            <LabelInputContainer label="Primary Background Image"><FileInput accept="image/*" onChange={handlePrimaryBgImageUpload} />{currentSettings.backgroundImageUrl && (<button onClick={() => currentOnSettingsChange('backgroundImageUrl', null)} className="mt-1 text-xs text-red-500 hover:text-red-700">Remove Primary Image</button>)}</LabelInputContainer>
            <LabelInputContainer label="Secondary Background Image"><FileInput accept="image/*" onChange={handleSecondaryBgImageUpload} />{currentSettings.secondaryBackgroundImageUrl && (<button onClick={() => currentOnSettingsChange('secondaryBackgroundImageUrl', null)} className="mt-1 text-xs text-red-500 hover:text-red-700">Remove Secondary Image</button>)}</LabelInputContainer>
            <LabelInputContainer label="Show Secondary Background" htmlFor="showSecondaryBg" inline disabled={!currentSettings.secondaryBackgroundImageUrl} subText={!currentSettings.secondaryBackgroundImageUrl ? "Load a secondary image first." : ""}><input type="checkbox" id="showSecondaryBg" checked={currentSettings.showSecondaryBackgroundImage} onChange={(e) => currentOnSettingsChange('showSecondaryBackgroundImage', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" disabled={!currentSettings.secondaryBackgroundImageUrl} /></LabelInputContainer>
          </>
        )
      },
      {
        id: 'script-block-navigation-section', title: 'Script & Block Navigation', defaultOpen: true, content: (
          <>
            <div className="flex border-b border-[var(--bv-border-color-light)] mb-3">
              <button
                onClick={() => setActiveNavigationTab('scripts')}
                className={`px-4 py-2 -mb-px border-b-2 font-medium text-sm transition-colors
                            ${activeNavigationTab === 'scripts'
                              ? 'border-[var(--bv-accent-primary)] text-[var(--bv-accent-primary)]'
                              : 'border-transparent text-[var(--bv-text-secondary)] hover:text-[var(--bv-text-primary)] hover:border-gray-300'}`}
                aria-pressed={activeNavigationTab === 'scripts'}
                role="tab"
                aria-controls="scripts-tab-panel"
              >
                Scripts
              </button>
              <button
                onClick={() => setActiveNavigationTab('blocks')}
                className={`px-4 py-2 -mb-px border-b-2 font-medium text-sm transition-colors
                            ${activeNavigationTab === 'blocks'
                              ? 'border-[var(--bv-accent-primary)] text-[var(--bv-accent-primary)]'
                              : 'border-transparent text-[var(--bv-text-secondary)] hover:text-[var(--bv-text-primary)] hover:border-gray-300'}`}
                aria-pressed={activeNavigationTab === 'blocks'}
                role="tab"
                aria-controls="blocks-tab-panel"
                disabled={!(restOfProps.activeMainScriptId && restOfProps.activeScriptBlocks.length > 0)}
              >
                Blocks
              </button>
            </div>

            {activeNavigationTab === 'scripts' && (
              <div id="scripts-tab-panel" role="tabpanel" aria-labelledby="script-block-navigation-section">
                {restOfProps.mainScripts.length === 0 ? <p className="text-xs text-[var(--bv-text-secondary)]">No main scripts loaded.</p> :
                (<>
                  <p className="text-xs text-[var(--bv-text-secondary)] mb-1">
                      Active Script: <span className="font-semibold text-[var(--bv-text-primary)]">{activeMainScriptNameInConfig || "None Selected"}</span>
                  </p>
                  <div className="max-h-48 overflow-y-auto border border-[var(--bv-border-color)] rounded p-1 space-y-1 mt-1">
                      {restOfProps.mainScripts.map((script) => (
                          <button key={script.id} onClick={() => restOfProps.onSetActiveMainScriptId(script.id)}
                              className={`block w-full text-left p-1.5 rounded text-sm transition-colors duration-150 truncate 
                                         ${restOfProps.activeMainScriptId === script.id 
                                           ? 'bg-[var(--bv-accent-primary)] text-[var(--bv-accent-primary-content)] font-semibold' 
                                           : 'bg-transparent text-[var(--bv-text-primary)] hover:bg-[var(--bv-element-background)] hover:text-[var(--bv-text-primary)]'}`}
                              title={script.name} >
                              {script.name} ({script.blocks.length} blocks)
                          </button>
                      ))}
                  </div>
                </>)}
              </div>
            )}

            {activeNavigationTab === 'blocks' && (
              <div id="blocks-tab-panel" role="tabpanel" aria-labelledby="script-block-navigation-section">
                {!(restOfProps.activeMainScriptId && restOfProps.activeScriptBlocks.length > 0) ? (
                  <p className="text-xs text-[var(--bv-text-secondary)]">
                    Select an active script with blocks to navigate them.
                  </p>
                ) : restOfProps.viewMode !== 'single' ? (
                  <p className="text-xs text-[var(--bv-text-secondary)]">
                    Block navigation is available in "Single Block View". <br/>
                    Change view mode in "Script Management" to see the block list here.
                  </p>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-[var(--bv-text-primary)]"> Block: {restOfProps.currentBlockIndex !== null ? restOfProps.currentBlockIndex + 1 : '-'} / {restOfProps.activeScriptBlocks.length} {restOfProps.showOnlyOverflowingBlocks && ` (Showing ${restOfProps.displayedBlocksForView.length} overflowing)`}</span>
                      <div className="space-x-1">
                        <button onClick={() => { if (restOfProps.currentBlockIndex === null) return; const currentDisplayedIdx = restOfProps.displayedBlocksForView.findIndex(b => b.index === restOfProps.currentBlockIndex); if (currentDisplayedIdx > 0) { restOfProps.onSetCurrentBlockIndex(restOfProps.displayedBlocksForView[currentDisplayedIdx - 1].index); } else if (currentDisplayedIdx === -1 && restOfProps.currentBlockIndex > 0) { let prevActualIdx = restOfProps.currentBlockIndex - 1; while(prevActualIdx >= 0 && restOfProps.showOnlyOverflowingBlocks && !restOfProps.activeScriptBlocks[prevActualIdx].isOverflowing) { prevActualIdx--; } if(prevActualIdx >=0) restOfProps.onSetCurrentBlockIndex(prevActualIdx); } }} disabled={restOfProps.currentBlockIndex === null || (restOfProps.showOnlyOverflowingBlocks ? restOfProps.displayedBlocksForView.findIndex(b => b.index === restOfProps.currentBlockIndex) <= 0 : restOfProps.currentBlockIndex <=0)} className="px-2 py-1 text-xs rounded bg-[var(--bv-accent-secondary)] text-[var(--bv-accent-secondary-content)] hover:opacity-80 disabled:opacity-50" >Prev</button>
                        <button onClick={() => { if (restOfProps.currentBlockIndex === null) return; const currentDisplayedIdx = restOfProps.displayedBlocksForView.findIndex(b => b.index === restOfProps.currentBlockIndex); if (currentDisplayedIdx !== -1 && currentDisplayedIdx < restOfProps.displayedBlocksForView.length - 1) { restOfProps.onSetCurrentBlockIndex(restOfProps.displayedBlocksForView[currentDisplayedIdx + 1].index); } else if (currentDisplayedIdx === -1 && restOfProps.currentBlockIndex < restOfProps.activeScriptBlocks.length -1) { let nextActualIdx = restOfProps.currentBlockIndex + 1; while(nextActualIdx < restOfProps.activeScriptBlocks.length && restOfProps.showOnlyOverflowingBlocks && !restOfProps.activeScriptBlocks[nextActualIdx].isOverflowing) { nextActualIdx++; } if(nextActualIdx < restOfProps.activeScriptBlocks.length) restOfProps.onSetCurrentBlockIndex(nextActualIdx); } }} disabled={restOfProps.currentBlockIndex === null || (restOfProps.showOnlyOverflowingBlocks ? restOfProps.displayedBlocksForView.findIndex(b => b.index === restOfProps.currentBlockIndex) >= restOfProps.displayedBlocksForView.length -1 : restOfProps.currentBlockIndex >= restOfProps.activeScriptBlocks.length -1)} className="px-2 py-1 text-xs rounded bg-[var(--bv-accent-secondary)] text-[var(--bv-accent-secondary-content)] hover:opacity-80 disabled:opacity-50" >Next</button>
                      </div>
                    </div>
                    <LabelInputContainer label="Show Only Overflowing Blocks" htmlFor="showOnlyOverflow" inline><input type="checkbox" id="showOnlyOverflow" checked={restOfProps.showOnlyOverflowingBlocks} onChange={(e) => restOfProps.onShowOnlyOverflowingBlocksChange(e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
                    <div className="max-h-60 overflow-y-auto border border-[var(--bv-border-color)] rounded p-1 space-y-1 mt-2">
                      {restOfProps.displayedBlocksForView.map((block) => (<button key={block.index} onClick={() => restOfProps.onSetCurrentBlockIndex(block.index)} className={`block w-full text-left p-1.5 rounded text-sm transition-colors duration-150 truncate ${restOfProps.currentBlockIndex === block.index ? 'bg-[var(--bv-accent-primary)] text-[var(--bv-accent-primary-content)] font-semibold' : 'bg-transparent text-[var(--bv-text-primary)] hover:bg-[var(--bv-element-background)]'} ${block.isOverflowing ? 'border-l-4 border-red-500 pl-2' : 'pl-3'}`} title={block.content.substring(0,100) + (block.content.length > 100 ? '...' : '')} > Block {block.index + 1}{block.isOverflowing ? ' (Overflow!)' : ''} </button> ))}
                      {restOfProps.displayedBlocksForView.length === 0 && restOfProps.activeScriptBlocks.length > 0 && (<p className="text-center text-xs text-[var(--bv-text-secondary)] p-2">No blocks match filter.</p>)}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )
      },
      {
        id: 'find-replace-section', title: 'Find and Replace', defaultOpen: false, content: (
          <FindReplacePanel
            findText={restOfProps.findText} onFindTextChange={restOfProps.onFindTextChange}
            replaceText={restOfProps.replaceText} onReplaceTextChange={restOfProps.onReplaceTextChange}
            isCaseSensitive={restOfProps.findIsCaseSensitive} onIsCaseSensitiveChange={restOfProps.onFindIsCaseSensitiveChange}
            matchWholeWord={restOfProps.findMatchWholeWord} onMatchWholeWordChange={restOfProps.onFindMatchWholeWordChange}
            scope={restOfProps.findScope} onScopeChange={restOfProps.onFindScopeChange}
            onFindNext={restOfProps.onFindNext} onReplace={restOfProps.onReplace} onReplaceAll={restOfProps.onReplaceAll}
            resultsMessage={restOfProps.findResultsMessage}
            isCurrentBlockScopeDisabled={restOfProps.isFindCurrentBlockDisabled}
            isFindReplaceDisabled={isFindReplaceDisabledInConfig} 
            findResultSummary={restOfProps.findResultSummary}
            onNavigateToFindResult={restOfProps.onNavigateToFindResult}
            activeThemeKey={restOfProps.activeThemeKey}
          />
        )
      },
      {
        id: 'overflow-settings-section', title: 'Overflow Settings', defaultOpen: restOfProps.overflowSettingsPanelOpen, content: (
          <>
            <LabelInputContainer label="Overflow Detection Method" htmlFor="overflowDetectionMode">
              <SelectInput id="overflowDetectionMode" value={currentSettings.overflowDetectionMode} onChange={(e) => currentOnSettingsChange('overflowDetectionMode', e.target.value as 'pixel' | 'character')}>
                <option value="pixel">Pixel Based</option>
                <option value="character">Character Based</option>
              </SelectInput>
            </LabelInputContainer>
            {currentSettings.overflowDetectionMode === 'pixel' && (
              <>
                <LabelInputContainer label="Use Margin-Based Overflow" htmlFor="enablePixelMargins" inline><input type="checkbox" id="enablePixelMargins" checked={currentSettings.pixelOverflowMargins.enabled} onChange={(e) => currentOnNestedSettingsChange('pixelOverflowMargins', 'enabled', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
                <InputWithSlider label="Max Content Height (for Auto Preview)" unit="px" id="maxPixelHeight" value={currentSettings.maxPixelHeight} onChange={(val) => currentOnSettingsChange('maxPixelHeight', val)} min={0} max={2048} step={1} subText={currentSettings.pixelOverflowMargins.enabled ? "Disabled when Margin-Based Overflow is active." : "Used if 'Preview Height' is 0 (auto) and Margin-Based is off."} disabled={currentSettings.pixelOverflowMargins.enabled} />
                {currentSettings.pixelOverflowMargins.enabled && (
                  <div className="mt-2 pt-2 border-t border-[var(--bv-border-color-light)]">
                    {(['top', 'right', 'bottom', 'left'] as const).map(marginKey => {
                      const currentMargin = currentSettings.pixelOverflowMargins[marginKey];
                      const isDimensionAuto = (marginKey === 'top' || marginKey === 'bottom') ? currentSettings.previewHeight === 0 : currentSettings.previewWidth === 0;
                      const subTextBase = isDimensionAuto 
                        ? `Preview ${marginKey === 'top' || marginKey === 'bottom' ? 'Height' : 'Width'} is auto, ${marginKey.charAt(0).toUpperCase() + marginKey.slice(1)} Margin ignored.`
                        : `From ${marginKey} edge.`;
                      const subTextBreakLine = currentMargin.breakLine 
                        ? "If checked, acts as internal guide, text wraps." 
                        : "If unchecked, text crossing causes overflow.";
                      
                      return (
                        <React.Fragment key={marginKey}>
                          <InputWithSlider 
                            label={`${marginKey.charAt(0).toUpperCase() + marginKey.slice(1)} Margin`} 
                            unit="px" 
                            id={`pixelMargin${marginKey.charAt(0).toUpperCase() + marginKey.slice(1)}`} 
                            value={currentMargin.value} 
                            onChange={(val) => handlePixelMarginChange(marginKey, 'value', val)} 
                            min={0} max={512} step={1} 
                            subText={`${subTextBase} ${!isDimensionAuto ? subTextBreakLine : ''}`}
                            disabled={isDimensionAuto} 
                          />
                          {!isDimensionAuto && (
                            <LabelInputContainer 
                              label="Auto Line Break" 
                              htmlFor={`pixelMargin${marginKey}BreakLine`} 
                              inline 
                              subText={currentMargin.breakLine ? "Text wraps at this margin." : "Text overflowing this margin is flagged."}
                            >
                              <input 
                                type="checkbox" 
                                id={`pixelMargin${marginKey}BreakLine`} 
                                checked={currentMargin.breakLine} 
                                onChange={(e) => handlePixelMarginChange(marginKey, 'breakLine', e.target.checked)}
                                className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" 
                              />
                            </LabelInputContainer>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </>
            )}
            {currentSettings.overflowDetectionMode === 'character' && (
              <InputWithSlider label="Max Characters Per Line" unit="chars" id="maxCharacters" value={currentSettings.maxCharacters} onChange={(val) => currentOnSettingsChange('maxCharacters', val)} min={0} max={10000} step={1} subText={currentSettings.maxCharacters === 0 ? "No character limit." : "Applies to the longest line. Tags & block separators are not counted."} />
            )}
          </>
        )
      },
      {
        id: 'text-position-scale-section', title: 'Text Position & Scale', defaultOpen: true, content: (
          <>
            <InputWithSlider label="Text X Position" unit="px" id="textPositionX" value={currentSettings.transform.positionX} onChange={(val) => currentOnNestedSettingsChange('transform', 'positionX', val)} min={-500} max={500} step={1} />
            <InputWithSlider label="Text Y Position" unit="px" id="textPositionY" value={currentSettings.transform.positionY} onChange={(val) => currentOnNestedSettingsChange('transform', 'positionY', val)} min={-500} max={500} step={1} />
            <InputWithSlider label="Scale X" unit="x" id="textScaleX" value={currentSettings.transform.scaleX} onChange={(val) => currentOnNestedSettingsChange('transform', 'scaleX', val)} min={0.1} max={10} step={0.05} />
            <InputWithSlider label="Scale Y" unit="x" id="textScaleY" value={currentSettings.transform.scaleY} onChange={(val) => currentOnNestedSettingsChange('transform', 'scaleY', val)} min={0.1} max={10} step={0.05} />
            <LabelInputContainer label="Horizontal Align" htmlFor="textAlignHorizontal">
              <SelectInput id="textAlignHorizontal" value={currentSettings.systemFont.textAlignHorizontal} onChange={(e) => currentOnNestedSettingsChange('systemFont', 'textAlignHorizontal', e.target.value as 'left' | 'center' | 'right')}>
                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
              </SelectInput>
            </LabelInputContainer>
            <LabelInputContainer label="Vertical Align" htmlFor="textAlignVertical">
              <SelectInput id="textAlignVertical" value={currentSettings.systemFont.textAlignVertical} onChange={(e) => currentOnNestedSettingsChange('systemFont', 'textAlignVertical', e.target.value as 'top' | 'middle' | 'bottom')}>
                <option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option>
              </SelectInput>
            </LabelInputContainer>
            <InputWithSlider label="Line Height Factor" unit="factor" id="globalLineHeightFactor" value={currentSettings.globalLineHeightFactor} onChange={(val) => currentOnSettingsChange('globalLineHeightFactor', val)} min={0.5} max={4} step={0.1} subText="Adjusts line spacing for all font types. For bitmap, it's a factor of character height." />
          </>
        )
      },
      {
        id: 'font-type-styling-section', title: 'Font Type, Styling & Effects', defaultOpen: true, content: (
          <>
            <LabelInputContainer label="Type" htmlFor="fontType">
              <SelectInput id="fontType" value={currentSettings.currentFontType} onChange={(e) => currentOnSettingsChange('currentFontType', e.target.value as 'system' | 'bitmap')}>
                <option value="system">System Font</option><option value="bitmap">Bitmap Font</option>
              </SelectInput>
            </LabelInputContainer>
            {currentSettings.currentFontType === 'system' && (
              <div className="mt-3 pt-3 border-t border-[var(--bv-border-color-light)]">
                <h4 className="text-md font-semibold mb-1 text-[var(--bv-accent-primary)]">System Font Specifics</h4>
                <LabelInputContainer label="Font Family" htmlFor="fontFamily">
                  <SelectInput id="fontFamily" value={currentSettings.systemFont.fontFamily} onChange={handleFontFamilyChange}>
                    {AVAILABLE_FONTS.map(font => <option key={font} value={font}>{font.split(',')[0]}</option>)}
                    {displayCustomFontNameInConfig && !AVAILABLE_FONTS.includes(displayCustomFontNameInConfig) && displayCustomFontNameInConfig !== "Custom..." && (
                      <option value={displayCustomFontNameInConfig}>{displayCustomFontNameInConfig}</option>
                    )}
                    <option value="Custom...">Custom (Load from file)...</option>
                  </SelectInput>
                </LabelInputContainer>
                {showCustomFontLoadUIInConfig && (
                  <div className="mt-2 p-2 border border-[var(--bv-border-color)] rounded-md space-y-2">
                     <LabelInputContainer 
                        label={displayCustomFontNameInConfig ? `Loaded: ${displayCustomFontNameInConfig}` : "Custom Font"} 
                        htmlFor="customFontFileInput"
                    >
                        <FileInput
                            id="customFontFileInput"
                            inputRef={customFontFilePickerRef}
                            accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
                            onChange={handleFontFileSelected}
                            buttonLabel={
                                displayCustomFontNameInConfig 
                                ? `Change Font... (${displayCustomFontNameInConfig.substring(0,15)}${displayCustomFontNameInConfig.length > 15 ? '...' : ''})` 
                                : "Choose Font File..."
                            }
                        />
                    </LabelInputContainer>
                  </div>
                )}
                <InputWithSlider label="Font Size" unit="px" id="fontSize" value={currentSettings.systemFont.fontSize} onChange={(val) => currentOnNestedSettingsChange('systemFont', 'fontSize', val)} min={6} max={120} step={1} />
                <InputWithSlider label="Space Width Override" unit="px" id="systemSpaceWidthOverride" value={currentSettings.systemFont.spaceWidthOverride || 0} onChange={(val) => currentOnNestedSettingsChange('systemFont', 'spaceWidthOverride', val)} min={0} max={Math.max(30, currentSettings.systemFont.fontSize * 1.5)} step={0.5} subText="Custom width for space char. 0 for auto/default." />
                <LabelInputContainer label="Font Color" htmlFor="fontColor"><TextInput type="color" id="fontColor" value={currentSettings.systemFont.color} onChange={(e) => currentOnNestedSettingsChange('systemFont', 'color', e.target.value)} className="h-10 w-full" /></LabelInputContainer>
                <InputWithSlider label="Letter Spacing" unit="px" id="letterSpacing" value={currentSettings.systemFont.letterSpacing} onChange={(val) => currentOnNestedSettingsChange('systemFont', 'letterSpacing', val)} min={-10} max={30} step={1} />
                <LabelInputContainer label="Bold" htmlFor="fontWeight" inline><input type="checkbox" id="fontWeight" checked={currentSettings.systemFont.fontWeight === 'bold'} onChange={(e) => currentOnNestedSettingsChange('systemFont', 'fontWeight', e.target.checked ? 'bold' : 'normal')} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
              </div>
            )}
            {currentSettings.currentFontType === 'bitmap' && (
              <div className="mt-3 pt-3 border-t border-[var(--bv-border-color-light)]">
                <h4 className="text-md font-semibold mb-1 text-[var(--bv-accent-primary)]">Bitmap Font Specifics</h4>
                <LabelInputContainer label="Font Image"><FileInput accept="image/*" onChange={handleBitmapFontImageUpload} />{currentSettings.bitmapFont.imageUrl && (<button onClick={() => currentOnNestedSettingsChange('bitmapFont', 'imageUrl', null)} className="mt-1 text-xs text-red-500 hover:text-red-700">Remove Image</button>)}</LabelInputContainer>
                <InputWithSlider label="Character Width" unit="px" id="charWidth" value={currentSettings.bitmapFont.charWidth} onChange={(val) => currentOnNestedSettingsChange('bitmapFont', 'charWidth', val)} min={1} max={128} step={1} />
                <InputWithSlider label="Character Height" unit="px" id="charHeight" value={currentSettings.bitmapFont.charHeight} onChange={(val) => currentOnNestedSettingsChange('bitmapFont', 'charHeight', val)} min={1} max={128} step={1} />
                <InputWithSlider label="Tile Separation X" unit="px" id="bitmapSeparationX" value={currentSettings.bitmapFont.separationX} onChange={(val) => currentOnNestedSettingsChange('bitmapFont', 'separationX', val)} min={0} max={64} step={1} subText="Horizontal pixels between tiles." />
                <InputWithSlider label="Tile Separation Y" unit="px" id="bitmapSeparationY" value={currentSettings.bitmapFont.separationY} onChange={(val) => currentOnNestedSettingsChange('bitmapFont', 'separationY', val)} min={0} max={64} step={1} subText="Vertical pixels between tiles." />
                <LabelInputContainer label="Character Map" htmlFor="charMap"><TextInput type="text" id="charMap" value={currentSettings.bitmapFont.charMap} onChange={(e) => currentOnNestedSettingsChange('bitmapFont', 'charMap', e.target.value)} /></LabelInputContainer>
                <InputWithSlider label="Spacing" unit="px" id="bitmapSpacing" value={currentSettings.bitmapFont.spacing} onChange={(val) => currentOnNestedSettingsChange('bitmapFont', 'spacing', val)} min={-10} max={50} step={1} />
                <InputWithSlider label="Zoom" unit="x" id="bitmapZoom" value={currentSettings.bitmapFont.zoom} onChange={(val) => currentOnNestedSettingsChange('bitmapFont', 'zoom', val)} min={0.1} max={16} step={0.1} />
                <InputWithSlider label="Space Width Override" unit="px" id="bitmapSpaceWidthOverride" value={currentSettings.bitmapFont.spaceWidthOverride} onChange={(val) => currentOnNestedSettingsChange('bitmapFont', 'spaceWidthOverride', val)} min={0} max={Math.max(32, currentSettings.bitmapFont.charWidth * 2)} step={1} subText="Custom width for space char. 0 for auto (pixel scan: ~charWidth/4, normal: full charWidth)." disabled={!(currentSettings.currentFontType === 'bitmap' && currentSettings.bitmapFont.enabled)} />
                <LabelInputContainer label="Enable Pixel Scanning" htmlFor="bitmapEnablePixelScanning" inline><input type="checkbox" id="bitmapEnablePixelScanning" checked={currentSettings.bitmapFont.enablePixelScanning} onChange={(e) => currentOnNestedSettingsChange('bitmapFont', 'enablePixelScanning', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
                {currentSettings.bitmapFont.enablePixelScanning && (<p className="text-xs text-[var(--bv-text-secondary)] mb-1">Adjusts character width based on content. Space characters use approx. 1/4 of Character Width unless overridden.</p>)}
                <LabelInputContainer label="Enable Color Removal" htmlFor="bitmapEnableColorRemoval" inline><input type="checkbox" id="bitmapEnableColorRemoval" checked={currentSettings.bitmapFont.enableColorRemoval} onChange={(e) => currentOnNestedSettingsChange('bitmapFont', 'enableColorRemoval', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
                {currentSettings.bitmapFont.enableColorRemoval && (<><LabelInputContainer label="Color to Remove" htmlFor="bitmapColorToRemove"><TextInput type="color" id="bitmapColorToRemove" value={currentSettings.bitmapFont.colorToRemove} onChange={(e) => currentOnNestedSettingsChange('bitmapFont', 'colorToRemove', e.target.value)} className="h-10 w-full" /></LabelInputContainer><InputWithSlider label="Removal Tolerance" id="bitmapColorRemovalTolerance" value={currentSettings.bitmapFont.colorRemovalTolerance} onChange={(val) => currentOnNestedSettingsChange('bitmapFont', 'colorRemovalTolerance', val)} min={0} max={75} step={1} unit="level" /></>)}
                <LabelInputContainer label="Enable Tint Color" htmlFor="bitmapEnableTintColor" inline><input type="checkbox" id="bitmapEnableTintColor" checked={currentSettings.bitmapFont.enableTintColor} onChange={(e) => currentOnNestedSettingsChange('bitmapFont', 'enableTintColor', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
                {currentSettings.bitmapFont.enableTintColor && (<LabelInputContainer label="Tint Color" htmlFor="bitmapColor"><TextInput type="color" id="bitmapColor" value={currentSettings.bitmapFont.color} onChange={(e) => currentOnNestedSettingsChange('bitmapFont', 'color', e.target.value)} className="h-10 w-full" /></LabelInputContainer>)}
                <LabelInputContainer label="Enabled" htmlFor="bitmapEnabled" inline><input type="checkbox" id="bitmapEnabled" checked={currentSettings.bitmapFont.enabled} onChange={(e) => currentOnNestedSettingsChange('bitmapFont', 'enabled', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-[var(--bv-border-color-light)]">
              <h4 className="text-md font-semibold mb-1 text-[var(--bv-accent-primary)]">Effects</h4>
              <LabelInputContainer label="Shadow Enabled" htmlFor="shadowEnabled" inline><input type="checkbox" id="shadowEnabled" checked={currentSettings.shadowEffect.enabled} onChange={(e) => currentOnNestedSettingsChange('shadowEffect', 'enabled', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
              {currentSettings.shadowEffect.enabled && (<><InputWithSlider label="Shadow Offset X" unit="px" id="shadowOffsetX" value={currentSettings.shadowEffect.offsetX} onChange={(val) => currentOnNestedSettingsChange('shadowEffect', 'offsetX', val)} min={-50} max={50} step={1} /><InputWithSlider label="Shadow Offset Y" unit="px" id="shadowOffsetY" value={currentSettings.shadowEffect.offsetY} onChange={(val) => currentOnNestedSettingsChange('shadowEffect', 'offsetY', val)} min={-50} max={50} step={1} /><InputWithSlider label="Shadow Blur" unit="px" id="shadowBlur" value={currentSettings.shadowEffect.blur} onChange={(val) => currentOnNestedSettingsChange('shadowEffect', 'blur', val)} min={0} max={100} step={1} /><LabelInputContainer label="Shadow Color" htmlFor="shadowColor"><TextInput type="color" id="shadowColor" value={currentSettings.shadowEffect.color} onChange={(e) => currentOnNestedSettingsChange('shadowEffect', 'color', e.target.value)} className="h-10 w-full" /></LabelInputContainer></>)}
              <LabelInputContainer label="Outline Enabled" htmlFor="outlineEnabled" inline><input type="checkbox" id="outlineEnabled" checked={currentSettings.outlineEffect.enabled} onChange={(e) => currentOnNestedSettingsChange('outlineEffect', 'enabled', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
              {currentSettings.outlineEffect.enabled && (<><InputWithSlider label="Outline Width" unit="px" id="outlineWidth" value={currentSettings.outlineEffect.width} onChange={(val) => currentOnNestedSettingsChange('outlineEffect', 'width', val)} min={0} max={30} step={1} /><LabelInputContainer label="Outline Color" htmlFor="outlineColor"><TextInput type="color" id="outlineColor" value={currentSettings.outlineEffect.color} onChange={(e) => currentOnNestedSettingsChange('outlineEffect', 'color', e.target.value)} className="h-10 w-full"/></LabelInputContainer></>)}
            </div>
          </>
        )
      },
      {
        id: 'tag-handling-section', title: 'Tag Handling & Colorization', defaultOpen: false, content: (
          <>
            
            <LabelInputContainer label="Hide General Tags in Preview" htmlFor="hideTagsInPreview" inline>
              <input type="checkbox" id="hideTagsInPreview" checked={currentSettings.hideTagsInPreview} onChange={(e) => currentOnSettingsChange('hideTagsInPreview', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" />
            </LabelInputContainer>
            <LabelInputContainer label="General Tag Patterns to Hide:" htmlFor="tagPatternsToHide" subText="Enter RegEx patterns, one per line. Applied if 'Hide Tags' is enabled. These are for non-coloring, non-image tags.">
              <TextAreaInput id="tagPatternsToHide" value={currentSettings.tagPatternsToHide.join('\n')} onChange={(e) => handleTagPatternsChange(e.target.value)} rows={3} placeholder="e.g. <[^>]*>\n\\[[^\\]]*\\]" />
            </LabelInputContainer>

             {/* AI Tag Pattern Suggester */}
            <div className="mt-3 pt-3 border-t border-[var(--bv-border-color-light)]">
                <h4 className="text-md font-semibold text-[var(--bv-accent-primary)] mb-2">AI Tag/Separator Pattern Suggester</h4>
                <LabelInputContainer label="Examples of Tags/Separators (one per line):" htmlFor="aiTagExamples" subText="Provide examples like <PAGE>, [NEXT], <COLOR:RED>, {SPEAKER_X}">
                    <TextAreaInput
                        id="aiTagExamples"
                        value={restOfProps.aiTagPatternExamples}
                        onChange={(e) => restOfProps.onAiTagPatternExamplesChange(e.target.value)}
                        rows={3}
                        placeholder="e.g. <SPEAKER_A>\n[SOUND_EFFECT_BEEP]\n---"
                    />
                </LabelInputContainer>
                <Button 
                    onClick={restOfProps.onAiSuggestTagPatterns} 
                    disabled={restOfProps.aiTagPatternLoading || !process.env.GEMINI_API_KEY} 
                    className="w-full mt-1"
                >
                    {restOfProps.aiTagPatternLoading ? '✨ Thinking...' : 'Suggest Pattern with AI'}
                </Button>
                {restOfProps.aiTagPatternError && (
                    <p className="text-xs text-red-500 mt-1">{restOfProps.aiTagPatternError}</p>
                )}
                {restOfProps.aiTagPatternSuggestion && !restOfProps.aiTagPatternLoading && (
                    <div className="mt-2">
                        <LabelInputContainer label="AI Suggested Pattern(s):" htmlFor="aiTagSuggestionDisplay">
                             <TextAreaInput 
                                id="aiTagSuggestionDisplay"
                                value={restOfProps.aiTagPatternSuggestion} 
                                readOnly 
                                rows={4}
                                className="bg-[var(--bv-element-background)]"
                             />
                        </LabelInputContainer>
                        <Button onClick={handleCopyAiSuggestion} className="text-xs mt-1 !py-1 !px-2 w-full !bg-gray-500 hover:!bg-gray-600">
                            Copy Suggestion
                        </Button>
                        <p className="text-xs text-[var(--bv-text-secondary)] mt-1">Review and test suggestion. You can copy parts or all of it into the 'General Tag Patterns' or 'Block Separators' fields.</p>
                    </div>
                )}
                 {!process.env.GEMINI_API_KEY && <p className="text-xs text-orange-500 mt-1">AI features require an API Key.</p>}
            </div>
            
            
            <div className="mt-4 pt-3 border-t border-[var(--bv-border-color-light)]">
              <h4 className="text-md font-semibold mb-2 text-[var(--bv-accent-primary)]">Custom Color Tags</h4>
              {isEditingColorTag ? (
                <div className="p-3 border border-[var(--bv-border-color)] rounded-md space-y-2 bg-[var(--bv-element-background)] mb-3">
                  <h5 className="text-sm font-medium">{editingColorTagId ? 'Edit' : 'Add New'} Color Tag</h5>
                  <LabelInputContainer label="Opening Tag" htmlFor="editingOpeningTag">
                    <TextInput id="editingOpeningTag" value={editingColorTag.openingTag} onChange={e => handleEditingColorTagChange('openingTag', e.target.value)} placeholder="e.g. <RED>" />
                  </LabelInputContainer>
                  <LabelInputContainer label="Closing Tag" htmlFor="editingClosingTag">
                    <TextInput id="editingClosingTag" value={editingColorTag.closingTag} onChange={e => handleEditingColorTagChange('closingTag', e.target.value)} placeholder="e.g. </RED>" />
                  </LabelInputContainer>
                  <LabelInputContainer label="Color" htmlFor="editingColorTagColor" inline>
                    <input type="color" id="editingColorTagColor" value={editingColorTag.color} onChange={e => handleEditingColorTagChange('color', e.target.value)} className="h-8 w-14 rounded border border-[var(--bv-input-border)] p-0.5 bg-[var(--bv-input-background)]" />
                  </LabelInputContainer>
                  <div className="flex gap-2 mt-2">
                    <Button onClick={handleSaveColorTag} className="flex-1">Save Tag</Button>
                    <Button onClick={() => setIsEditingColorTag(false)} className="flex-1 !bg-gray-500 hover:!bg-gray-600">Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button onClick={handleStartAddNewColorTag} className="w-full mb-3">Add New Color Tag</Button>
              )}

              {currentSettings.customColorTags.length === 0 && !isEditingColorTag && (
                <p className="text-xs text-[var(--bv-text-secondary)]">No custom color tags defined.</p>
              )}
              {currentSettings.customColorTags.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {currentSettings.customColorTags.map(tag => (
                    <div key={tag.id} className="p-2 border border-[var(--bv-border-color-light)] rounded-md bg-[var(--bv-element-background)] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-grow">
                        <input type="checkbox" checked={tag.enabled} onChange={e => handleToggleColorTagEnabled(tag.id, e.target.checked)} className="h-4 w-4 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)] flex-shrink-0" title={tag.enabled ? 'Disable Tag' : 'Enable Tag'} />
                        <span className="text-xs font-mono truncate" title={`Opening: ${tag.openingTag}\nClosing: ${tag.closingTag}`}>
                          <code>{tag.openingTag}</code>...<code>{tag.closingTag}</code>
                        </span>
                        <div style={{ backgroundColor: tag.color, width: '16px', height: '16px', borderRadius: '4px', border: '1px solid var(--bv-border-color)' }} className="flex-shrink-0"></div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button onClick={() => handleStartEditColorTag(tag)} className="text-xs !p-1 !bg-blue-500 hover:!bg-blue-600">Edit</Button>
                        <Button onClick={() => handleDeleteColorTag(tag.id)} className="text-xs !p-1 !bg-red-500 hover:!bg-red-600">Del</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-3 border-t border-[var(--bv-border-color-light)]">
              <h4 className="text-md font-semibold mb-2 text-[var(--bv-accent-primary)]">Image Tags</h4>
              {isEditingImageTag ? (
                 <div className="p-3 border border-[var(--bv-border-color)] rounded-md space-y-2 bg-[var(--bv-element-background)] mb-3">
                    <h5 className="text-sm font-medium">{editingImageTagId ? 'Edit' : 'Add New'} Image Tag</h5>
                    <LabelInputContainer label="Tag String" htmlFor="editingImageTagString"><TextInput id="editingImageTagString" value={editingImageTagFields.tag || ''} onChange={e => handleEditingImageTagFieldChange('tag', e.target.value)} placeholder="e.g. [COIN]" /></LabelInputContainer>
                    <LabelInputContainer label="Image File">
                      <FileInput accept="image/*" onChange={handleImageTagFileSelected} buttonLabel={editingImageTagFields.imageUrl || editingImageTagPreviewUrl ? "Change Image" : "Select Image"} />
                    </LabelInputContainer>
                    {(editingImageTagPreviewUrl || editingImageTagFields.imageUrl) && (
                      <div className="my-1">
                        <img src={editingImageTagPreviewUrl || editingImageTagFields.imageUrl} alt="Preview" className="max-w-[100px] max-h-[50px] border border-[var(--bv-border-color)] rounded" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <InputWithSlider label="Width" unit="px" id="editingImageTagWidth" value={editingImageTagFields.width} onChange={val => handleEditingImageTagFieldChange('width', val)} min={1} max={512} step={1} />
                        <InputWithSlider label="Height" unit="px" id="editingImageTagHeight" value={editingImageTagFields.height} onChange={val => handleEditingImageTagFieldChange('height', val)} min={1} max={512} step={1} />
                    </div>
                    <LabelInputContainer label="Enabled" htmlFor="editingImageTagEnabled" inline>
                      <input type="checkbox" id="editingImageTagEnabled" checked={editingImageTagFields.enabled} onChange={e => handleEditingImageTagFieldChange('enabled', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" />
                    </LabelInputContainer>
                    <div className="flex gap-2 mt-2">
                        <Button onClick={handleSaveImageTag} className="flex-1">Save Image Tag</Button>
                        <Button onClick={() => setIsEditingImageTag(false)} className="flex-1 !bg-gray-500 hover:!bg-gray-600">Cancel</Button>
                    </div>
                 </div>
              ) : (
                <Button onClick={handleStartAddNewImageTag} className="w-full mb-3">Add New Image Tag</Button>
              )}
               {currentSettings.imageTags.length === 0 && !isEditingImageTag && (
                <p className="text-xs text-[var(--bv-text-secondary)]">No image tags defined.</p>
              )}
              {currentSettings.imageTags.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {currentSettings.imageTags.map(tag => (
                    <div key={tag.id} className="p-2 border border-[var(--bv-border-color-light)] rounded-md bg-[var(--bv-element-background)] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-grow">
                        <input type="checkbox" checked={tag.enabled} onChange={e => handleToggleImageTagEnabled(tag.id, e.target.checked)} className="h-4 w-4 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)] flex-shrink-0" title={tag.enabled ? 'Disable Tag' : 'Enable Tag'} />
                        <img src={tag.imageUrl} alt={tag.tag} className="w-6 h-6 object-contain border border-[var(--bv-border-color)] rounded flex-shrink-0" />
                        <span className="text-xs font-mono truncate" title={`Tag: ${tag.tag}, Size: ${tag.width}x${tag.height}`}>
                          <code>{tag.tag}</code> ({tag.width}x{tag.height})
                        </span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button onClick={() => handleStartEditImageTag(tag)} className="text-xs !p-1 !bg-blue-500 hover:!bg-blue-600">Edit</Button>
                        <Button onClick={() => handleDeleteImageTag(tag.id)} className="text-xs !p-1 !bg-red-500 hover:!bg-red-600">Del</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )
      },
      {
        id: 'byte-bit-counting-section', title: 'Byte/Bit Counting & Restrictions', defaultOpen: false, content: (
           <>
            <LabelInputContainer label="Custom Character Byte Map" htmlFor="customByteMapString" subText="Define byte values for characters/tags (e.g., A=1, €=2, [ICON]=0). One per line. Lines starting with # are comments. Tags go in [brackets].">
                <TextAreaInput 
                    id="customByteMapString"
                    value={currentSettings.customByteMapString}
                    onChange={(e) => currentOnSettingsChange('customByteMapString', e.target.value)}
                    rows={6}
                    placeholder={`# Example:\nA=1\nB=1\n…\nЯ=2\n€=3\n[ICON_SMILE]=0`}
                />
            </LabelInputContainer>
            <InputWithSlider label="Default Byte Value" unit="bytes" id="defaultCharacterByteValue" value={currentSettings.defaultCharacterByteValue} onChange={(val) => currentOnSettingsChange('defaultCharacterByteValue', val)} min={0} max={8} step={1} subText="For characters not in the custom map." />
            <LabelInputContainer label="Enable Byte Restriction in Comparison Mode" htmlFor="enableByteRestriction" inline disabled={!currentSettings.comparisonModeEnabled} subText={!currentSettings.comparisonModeEnabled ? "Enable Comparison Mode first." : "Prevents edited lines from exceeding original line byte counts."}>
                <input type="checkbox" id="enableByteRestriction" checked={currentSettings.enableByteRestrictionInComparisonMode} onChange={(e) => currentOnSettingsChange('enableByteRestrictionInComparisonMode', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" disabled={!currentSettings.comparisonModeEnabled} />
            </LabelInputContainer>
           </>
        )
      },
      {
        id: 'glossary-section', title: 'Glossary', defaultOpen: false, content: (
            <>
                {(['name', 'term'] as GlossaryCategory[]).map(category => (
                    <div key={category} className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="text-md font-semibold text-[var(--bv-accent-primary)] capitalize">{category}s</h4>
                            <Button onClick={() => handleShowAddGlossaryItemForm(category)} className="text-xs !py-1 !px-2">
                                Add New {category.charAt(0).toUpperCase() + category.slice(1)}
                            </Button>
                        </div>

                        {showGlossaryFormFor === category && (
                            <div className="p-3 border border-[var(--bv-border-color)] rounded-md space-y-2 bg-[var(--bv-element-background)] mb-3">
                                <h5 className="text-sm font-medium">{editingGlossaryItemId ? 'Edit' : 'Add New'} {category}</h5>
                                <LabelInputContainer label={category === 'name' ? 'Name' : 'Term'} htmlFor={`glossary-${category}-term`}>
                                    <TextInput id={`glossary-${category}-term`} value={glossaryTermInput} onChange={e => setGlossaryTermInput(e.target.value)} placeholder={category === 'name' ? 'e.g. Elara' : 'e.g. Mana Potion'} />
                                </LabelInputContainer>
                                <LabelInputContainer label="Translation/Notes" htmlFor={`glossary-${category}-translation`}>
                                    <TextInput id={`glossary-${category}-translation`} value={glossaryTranslationInput} onChange={e => setGlossaryTranslationInput(e.target.value)} placeholder={category === 'name' ? 'e.g. エララ' : 'e.g. マナポーション'} />
                                </LabelInputContainer>
                                <div className="flex gap-2 mt-2">
                                    <Button onClick={handleSaveGlossaryItem} className="flex-1">Save {category}</Button>
                                    <Button onClick={handleCancelEditOrAddGlossaryItem} className="flex-1 !bg-gray-500 hover:!bg-gray-600">Cancel</Button>
                                </div>
                            </div>
                        )}
                        {(category === 'name' ? namesGlossaryItems : termsGlossaryItems).length === 0 && showGlossaryFormFor !== category && (
                            <p className="text-xs text-[var(--bv-text-secondary)]">No {category}s defined.</p>
                        )}
                        {(category === 'name' ? namesGlossaryItems : termsGlossaryItems).length > 0 && (
                            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                {(category === 'name' ? namesGlossaryItems : termsGlossaryItems).map(item => (
                                    <div key={item.id} className="p-1.5 border border-[var(--bv-border-color-light)] rounded bg-[var(--bv-element-background)] flex items-center justify-between gap-2 text-xs">
                                        <div className="truncate flex-grow">
                                            <strong className="text-[var(--bv-text-primary)]">{item.term}</strong>
                                            {item.translation && <span className="text-[var(--bv-text-secondary)]"> → {item.translation}</span>}
                                        </div>
                                        <div className="flex gap-1 flex-shrink-0">
                                            <Button onClick={() => handleStartEditGlossaryItem(item)} className="!p-0.5 !text-xs !bg-blue-500 hover:!bg-blue-600">Edit</Button>
                                            <Button onClick={() => restOfProps.onDeleteGlossaryTerm(item.id)} className="!p-0.5 !text-xs !bg-red-500 hover:!bg-red-600">Del</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </>
        )
      },
      {
        id: 'github-sync-section', title: 'GitHub Folder Sync', defaultOpen: false, content: (
          <>
            <LabelInputContainer label="GitHub Personal Access Token (PAT)" htmlFor="githubPat" subText="Requires 'repo' scope. Store securely.">
                <TextInput type="password" id="githubPat" value={restOfProps.gitHubSettings.pat} onChange={(e) => restOfProps.onGitHubSettingsChange('pat', e.target.value)} placeholder="Enter PAT" />
            </LabelInputContainer>
            <LabelInputContainer label="Repository (owner/repo-name)" htmlFor="githubRepo" subText="e.g., MyUser/MyGameTranslation">
                <TextInput id="githubRepo" value={restOfProps.gitHubSettings.repoFullName} onChange={(e) => restOfProps.onGitHubSettingsChange('repoFullName', e.target.value)} placeholder="owner/repo-name" />
            </LabelInputContainer>
            <LabelInputContainer label="Branch (optional, defaults to repo default)" htmlFor="githubBranch">
                <TextInput id="githubBranch" value={restOfProps.gitHubSettings.branch} onChange={(e) => restOfProps.onGitHubSettingsChange('branch', e.target.value)} placeholder="e.g., main or develop" />
            </LabelInputContainer>
             <div className="my-2 p-2 border border-dashed border-[var(--bv-accent-secondary)] rounded-md">
                 <LabelInputContainer label="Main Scripts: File or Folder Path" htmlFor="githubFilePath" subText="Path to a single .txt file or a folder containing multiple .txt files (for main scripts).">
                    <TextInput id="githubFilePath" value={restOfProps.gitHubSettings.filePath} onChange={(e) => restOfProps.onGitHubSettingsChange('filePath', e.target.value)} placeholder="e.g., scripts/chapter1.txt or scripts/all_dialogue/" />
                </LabelInputContainer>
                <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button onClick={restOfProps.onLoadFileFromGitHub} disabled={githubMainOpsDisabled} className="!bg-green-600 hover:!bg-green-700 text-xs !py-1">Load File</Button>
                    <Button onClick={restOfProps.onLoadAllFromGitHubFolder} disabled={githubMainOpsDisabled} className="!bg-green-500 hover:!bg-green-600 text-xs !py-1">Load All from Folder</Button>
                </div>
                 <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button onClick={restOfProps.onSaveFileToGitHub} disabled={githubMainOpsDisabled || restOfProps.mainScripts.length === 0} className="!bg-blue-600 hover:!bg-blue-700 text-xs !py-1">Save Active to Path</Button>
                    <Button onClick={restOfProps.onSaveAllToGitHubFolder} disabled={githubMainOpsDisabled || restOfProps.mainScripts.length === 0} className="!bg-blue-500 hover:!bg-blue-600 text-xs !py-1">Save All Changed to Folder</Button>
                </div>
            </div>
            <div className="my-2 p-2 border border-dashed border-purple-500 rounded-md">
                <LabelInputContainer label="Original Scripts: File or Folder Path" htmlFor="githubOriginalFilePath" subText="Path for original/reference scripts (used in Comparison Mode).">
                    <TextInput id="githubOriginalFilePath" value={restOfProps.gitHubSettings.originalFilePath} onChange={(e) => restOfProps.onGitHubSettingsChange('originalFilePath', e.target.value)} placeholder="e.g., original_scripts/chapter1.txt" />
                </LabelInputContainer>
                 <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button onClick={restOfProps.onLoadFileFromGitHubForOriginal} disabled={githubOriginalOpsDisabled} className="!bg-purple-600 hover:!bg-purple-700 text-xs !py-1">Load File (Original)</Button>
                    <Button onClick={restOfProps.onLoadAllFromGitHubFolderForOriginal} disabled={githubOriginalOpsDisabled} className="!bg-purple-500 hover:!bg-purple-600 text-xs !py-1">Load All from Folder (Original)</Button>
                </div>
            </div>

            {restOfProps.isGitHubLoading && <p className="text-sm text-blue-500 mt-1">Working with GitHub...</p>}
            {restOfProps.gitHubStatusMessage && (
                <p className={`text-sm mt-1 ${restOfProps.gitHubStatusMessage.startsWith('Error:') ? 'text-red-500' : 'text-[var(--bv-text-secondary)]'}`}>
                    {restOfProps.gitHubStatusMessage}
                </p>
            )}
            <p className="text-xs text-[var(--bv-text-secondary)] mt-2">
                Note: GitHub operations use the paths specified above. "Save Active to Path" saves the currently active main script to the "Main Scripts: File Path". "Save All Changed to Folder" saves all modified main scripts to the "Main Scripts: Folder Path", creating files named after the script names.
            </p>
          </>
        )
      },
    ];
  }, [
    // Props directly from ControlsPanelProps (settings, onSettingsChange, onNestedSettingsChange are from props destructured at top)
    settings, onSettingsChange, onNestedSettingsChange,
    onTextFileUpload, mainScripts, activeMainScriptId, onSetActiveMainScriptId, onClearMainScripts,
    activeScriptBlocks, currentBlockIndex, onSetCurrentBlockIndex, showOnlyOverflowingBlocks,
    onShowOnlyOverflowingBlocksChange, displayedBlocksForView, onLoadCustomFont,
    loadedCustomFontName, overflowSettingsPanelOpen, originalScripts, onOriginalScriptUpload,
    matchedOriginalScriptName, onClearOriginalScripts, viewMode, onViewModeChange,
    findText, onFindTextChange, replaceText, onReplaceTextChange,
    findIsCaseSensitive, onFindIsCaseSensitiveChange, findMatchWholeWord,
    onFindMatchWholeWordChange, findScope, onFindScopeChange, onFindNext,
    onReplace, onReplaceAll, findResultsMessage, isFindCurrentBlockDisabled,
    findResultSummary, onNavigateToFindResult, gitHubSettings, onGitHubSettingsChange,
    onLoadFileFromGitHub, onSaveFileToGitHub, onLoadAllFromGitHubFolder,
    onSaveAllToGitHubFolder, onLoadFileFromGitHubForOriginal,
    onLoadAllFromGitHubFolderForOriginal, isGitHubLoading, gitHubStatusMessage,
    activeThemeKey, glossaryTerms, onAddGlossaryTerm, onUpdateGlossaryTerm, onDeleteGlossaryTerm,
    aiTagPatternExamples, onAiTagPatternExamplesChange, aiTagPatternSuggestion,
    onAiSuggestTagPatterns, aiTagPatternLoading, aiTagPatternError,
    // Local state and callbacks that are used to render the content of sections:
    blockSeparatorsInputText, handleBlockSeparatorsInputChange, handleBlockSeparatorsInputBlur,
    handleFontFamilyChange, handleFontFileSelected, customFontFilePickerRef,
    isEditingColorTag, editingColorTag, editingColorTagId,
    handleStartAddNewColorTag, handleStartEditColorTag, handleSaveColorTag, handleDeleteColorTag,
    handleToggleColorTagEnabled, handleEditingColorTagChange,
    isEditingImageTag, editingImageTagFields, editingImageTagId, editingImageTagPreviewUrl,
    handleStartAddNewImageTag, handleStartEditImageTag, handleImageTagFileSelected,
    handleEditingImageTagFieldChange, handleSaveImageTag, handleDeleteImageTag, handleToggleImageTagEnabled,
    handleTagPatternsChange, handleCustomLineBreakTagsChange, handlePixelMarginChange,
    activeNavigationTab, setActiveNavigationTab, 
    handlePrimaryBgImageUpload, handleSecondaryBgImageUpload, handleBitmapFontImageUpload, 
    glossaryTermInput, glossaryTranslationInput, editingGlossaryItemId, editingGlossaryItemCategory, showGlossaryFormFor, 
    handleShowAddGlossaryItemForm, handleSaveGlossaryItem, handleStartEditGlossaryItem, handleCancelEditOrAddGlossaryItem, 
    handleCopyAiSuggestion
  ]);


  // State for section order and open/closed status
  const [panelSections, setPanelSections] = useState<PanelSectionItem[]>(() => {
    const initialConfig = getPanelSectionsConfig(props);
    const savedOrder = localStorage.getItem('bv_panelSectionsOrder_v2');
    if (savedOrder) {
      try {
        const orderedIds = JSON.parse(savedOrder) as string[];
        const sectionsMap = new Map(initialConfig.map(s => [s.id, s]));
        const orderedConfig: PanelSectionItem[] = [];
        orderedIds.forEach(id => {
            const section = sectionsMap.get(id);
            if (section) {
                orderedConfig.push(section);
                sectionsMap.delete(id); // Remove from map to track remaining
            }
        });
        // Add any new sections from current config not in saved order
        sectionsMap.forEach(section => orderedConfig.push(section));
        return orderedConfig;
      } catch (e) { console.warn("Error parsing saved section order", e); }
    }
    return initialConfig;
  });

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initialConfig = getPanelSectionsConfig(props); // Use current props for defaultOpen
    const savedOpenStates = localStorage.getItem('bv_openSections_v2');
    let openState: Record<string, boolean> = {};
    initialConfig.forEach(section => {
      openState[section.id] = section.defaultOpen ?? false;
    });
    if (savedOpenStates) {
      try {
        openState = { ...openState, ...JSON.parse(savedOpenStates) };
      } catch (e) { console.warn("Error parsing saved open sections", e); }
    }
    return openState;
  });

  // Effect to update panelSections content if getPanelSectionsConfig produces different content,
  // while preserving order and open states.
  useEffect(() => {
    const newGeneratedConfig = getPanelSectionsConfig(props);
    const newConfigMap = new Map(newGeneratedConfig.map(s => [s.id, s]));

    setPanelSections(prevPanelSections => {
        let updatedSections = prevPanelSections
            .map(ps => newConfigMap.get(ps.id) || ps) // Update content of existing sections
            .filter(s => newConfigMap.has(s.id));     // Remove sections no longer in new config

        // Add any new sections from newGeneratedConfig not in prevPanelSections (append them)
        newGeneratedConfig.forEach(newSection => {
            if (!updatedSections.some(us => us.id === newSection.id)) {
                updatedSections.push(newSection);
            }
        });
        return updatedSections;
    });
    
    setOpenSections(prevOpenSections => {
        const newOpenState = { ...prevOpenSections };
        newGeneratedConfig.forEach(newSection => {
            if (!(newSection.id in newOpenState)) { // If section is new or state was missing
                newOpenState[newSection.id] = newSection.defaultOpen ?? false;
            }
        });
        // Prune open states for sections that no longer exist
        Object.keys(newOpenState).forEach(sectionId => {
            if (!newConfigMap.has(sectionId)) {
                delete newOpenState[sectionId];
            }
        });
        return newOpenState;
    });
  }, [getPanelSectionsConfig, props]); // Depend on getPanelSectionsConfig and props to re-evaluate when config logic or its inputs change.


  useEffect(() => {
    const orderedIds = panelSections.map(s => s.id);
    localStorage.setItem('bv_panelSectionsOrder_v2', JSON.stringify(orderedIds));
  }, [panelSections]);

  useEffect(() => {
    localStorage.setItem('bv_openSections_v2', JSON.stringify(openSections));
  }, [openSections]);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, sectionId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    setDraggedSectionId(sectionId);
    event.currentTarget.closest('.draggable-section-wrapper')?.classList.add('dragging-section-active');
  };

  const handleDragEnd = (event: React.DragEvent<HTMLButtonElement>) => {
    event.currentTarget.closest('.draggable-section-wrapper')?.classList.remove('dragging-section-active');
    setDraggedSectionId(null);
    setDragOverSectionId(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (draggedSectionId) {
      event.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>, sectionId: string) => {
    event.preventDefault();
    if (draggedSectionId && draggedSectionId !== sectionId) {
      setDragOverSectionId(sectionId);
    }
  };
  
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const wrapper = event.currentTarget as HTMLElement;
    const related = event.relatedTarget as HTMLElement;
    if (!wrapper.contains(related)) {
        // Only clear dragOverSectionId if leaving the current drag-over target
        if (dragOverSectionId === wrapper.dataset.sectionId) {
            setDragOverSectionId(null);
        }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, dropTargetIndex: number) => {
    event.preventDefault();
    if (!draggedSectionId) return;

    const draggedItemIndex = panelSections.findIndex(s => s.id === draggedSectionId);
    if (draggedItemIndex === -1 || draggedItemIndex === dropTargetIndex) {
      setDraggedSectionId(null);
      setDragOverSectionId(null);
      return;
    }

    const newSections = Array.from(panelSections);
    const [draggedItem] = newSections.splice(draggedItemIndex, 1);
    newSections.splice(dropTargetIndex, 0, draggedItem);

    setPanelSections(newSections);
    setDraggedSectionId(null);
    setDragOverSectionId(null);
  };

  return (
    <div 
        ref={controlsPanelRef} 
        className="controls-panel space-y-0.5 p-0.5 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-[var(--bv-scrollbar-thumb)] scrollbar-track-[var(--bv-scrollbar-track)] scrollbar-thumb-rounded scrollbar-track-rounded"
        aria-label="Controls Panel"
    >
      {panelSections.map((section, index) => (
        <DraggableSectionWrapper
          key={section.id}
          data-section-id={section.id}
          onDragEnter={(e) => handleDragEnter(e, section.id)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          isDragging={draggedSectionId === section.id}
          isDragOver={dragOverSectionId === section.id}
        >
          <Section
            id={`panel-section-${section.id}`}
            title={section.title}
            isOpen={openSections[section.id] ?? section.defaultOpen ?? false}
            onToggle={() => toggleSection(section.id)}
            onDragStartButton={(e) => handleDragStart(e, section.id)}
            onDragEndButton={handleDragEnd}
          >
            {section.content}
          </Section>
        </DraggableSectionWrapper>
      ))}
    </div>
  );
};
