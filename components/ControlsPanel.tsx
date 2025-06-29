

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
}>> = ({ children, isDragging, isDragOver, ...dragProps }) => {
  return (
    <div
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
    onToggleOverflowSettingsPanel,
    glossaryTerms, onAddGlossaryTerm, onUpdateGlossaryTerm, onDeleteGlossaryTerm,
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
    const newCanonicalText = settings.blockSeparators.join(',');
    if (blockSeparatorsInputText !== newCanonicalText) {
      setBlockSeparatorsInputText(newCanonicalText);
    }
  }, [settings.blockSeparators]); // Removed blockSeparatorsInputText from dependencies


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


  const getPanelSectionsConfig = useCallback((currentProps: ControlsPanelProps): PanelSectionItem[] => {
    const { settings, onSettingsChange, onNestedSettingsChange, ...restOfProps } = currentProps;

    const handleToggleTreatEachLineAsBlock = (checked: boolean) => {
        onSettingsChange('treatEachLineAsBlock', checked);
        if (checked) {
            onSettingsChange('useCustomBlockSeparator', false);
            onSettingsChange('useEmptyLinesAsSeparator', false);
        }
    };

    const handleToggleUseCustomBlockSeparator = (checked: boolean) => {
        onSettingsChange('useCustomBlockSeparator', checked);
        if (checked) {
            onSettingsChange('treatEachLineAsBlock', false);
            onSettingsChange('useEmptyLinesAsSeparator', false);
        }
    };
    
    const handleToggleUseEmptyLinesAsSeparator = (checked: boolean) => {
        onSettingsChange('useEmptyLinesAsSeparator', checked);
        if (checked) {
            onSettingsChange('treatEachLineAsBlock', false);
            onSettingsChange('useCustomBlockSeparator', false);
        }
    };
    
    const githubBaseDisabled = restOfProps.isGitHubLoading || !restOfProps.gitHubSettings.pat || !restOfProps.gitHubSettings.repoFullName;
    const githubMainOpsDisabled = githubBaseDisabled || !restOfProps.gitHubSettings.filePath;
    const githubOriginalOpsDisabled = githubBaseDisabled || !restOfProps.gitHubSettings.originalFilePath;

    const namesGlossaryItems = restOfProps.glossaryTerms.filter(gt => gt.category === 'name');
    const termsGlossaryItems = restOfProps.glossaryTerms.filter(gt => gt.category === 'term');

    const displayCustomFontNameInConfig = settings.systemFont.customFontFileName 
        ? settings.systemFont.customFontFileName.split('/').pop()?.split('\\').pop()
        : loadedCustomFontName; 

    const showCustomFontLoadUIInConfig = settings.currentFontType === 'system' &&
                               (settings.systemFont.fontFamily === "Custom..." || 
                                (settings.systemFont.customFontBase64 && settings.systemFont.customFontFileName) || 
                                (loadedCustomFontName && settings.systemFont.fontFamily === loadedCustomFontName));

    const activeMainScriptNameInConfig = mainScripts.find(s => s.id === activeMainScriptId)?.name || null;
    const isFindReplaceDisabledInConfig = mainScripts.length === 0;


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
                <LabelInputContainer label="Treat each line as a block" htmlFor="treatEachLineAsBlock" inline disabled={settings.useCustomBlockSeparator || settings.useEmptyLinesAsSeparator}>
                    <input 
                        type="checkbox" 
                        id="treatEachLineAsBlock" 
                        checked={settings.treatEachLineAsBlock} 
                        onChange={(e) => handleToggleTreatEachLineAsBlock(e.target.checked)}
                        disabled={settings.useCustomBlockSeparator || settings.useEmptyLinesAsSeparator}
                        className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]"
                    />
                </LabelInputContainer>
                
                <LabelInputContainer label="Use Empty Lines as Separators" htmlFor="useEmptyLinesAsSeparator" inline disabled={settings.treatEachLineAsBlock || settings.useCustomBlockSeparator} subText="One or more empty lines separate blocks.">
                    <input 
                        type="checkbox" 
                        id="useEmptyLinesAsSeparator" 
                        checked={settings.useEmptyLinesAsSeparator} 
                        onChange={(e) => handleToggleUseEmptyLinesAsSeparator(e.target.checked)}
                        disabled={settings.treatEachLineAsBlock || settings.useCustomBlockSeparator}
                        className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]"
                    />
                </LabelInputContainer>

                <LabelInputContainer label="Use Custom Block Separators" htmlFor="useCustomBlockSeparator" inline disabled={settings.treatEachLineAsBlock || settings.useEmptyLinesAsSeparator}>
                    <input 
                        type="checkbox" 
                        id="useCustomBlockSeparator" 
                        checked={settings.useCustomBlockSeparator} 
                        onChange={(e) => handleToggleUseCustomBlockSeparator(e.target.checked)}
                        disabled={settings.treatEachLineAsBlock || settings.useEmptyLinesAsSeparator}
                        className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" 
                    />
                </LabelInputContainer>
                {settings.useCustomBlockSeparator && (
                    <LabelInputContainer label="Block Separators (comma-separated)" htmlFor="blockSeparators" disabled={!settings.useCustomBlockSeparator || settings.treatEachLineAsBlock || settings.useEmptyLinesAsSeparator}>
                        <TextInput 
                            id="blockSeparators" 
                            value={blockSeparatorsInputText} 
                            onChange={handleBlockSeparatorsInputChange}
                            onBlur={handleBlockSeparatorsInputBlur}
                            placeholder="e.g. <PAGE>,[END]"
                            disabled={!settings.useCustomBlockSeparator || settings.treatEachLineAsBlock || settings.useEmptyLinesAsSeparator}
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
                  checked={settings.useCustomLineBreakTags}
                  onChange={(e) => onSettingsChange('useCustomLineBreakTags', e.target.checked)}
                  className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]"
                />
              </LabelInputContainer>
              {settings.useCustomLineBreakTags && (
                <LabelInputContainer label="Custom Line Break Tags (one per line):" htmlFor="customLineBreakTags" subText="These tags will be replaced with newlines in the preview.">
                  <TextAreaInput
                    id="customLineBreakTags"
                    value={settings.customLineBreakTags.join('\n')}
                    onChange={(e) => handleCustomLineBreakTagsChange(e.target.value)}
                    rows={3}
                    placeholder="e.g. <br>\n[NEWLINE]"
                  />
                </LabelInputContainer>
              )}
            </div>
            
            <LabelInputContainer label="Enable Comparison Mode" htmlFor="comparisonModeEnabled" inline disabled={restOfProps.mainScripts.length === 0 || restOfProps.originalScripts.length === 0} subText={(restOfProps.mainScripts.length === 0 || restOfProps.originalScripts.length === 0) ? "Load at least one main and one original script." : "View original and edited text side-by-side."}>
              <input type="checkbox" id="comparisonModeEnabled" checked={settings.comparisonModeEnabled} onChange={(e) => onSettingsChange('comparisonModeEnabled', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" disabled={restOfProps.mainScripts.length === 0 || restOfProps.originalScripts.length === 0} />
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
            <InputWithSlider label="Width" unit="px" id="previewWidth" value={settings.previewWidth} onChange={(val) => onSettingsChange('previewWidth', val)} min={0} max={1280} step={10} subText={settings.previewWidth === 0 ? "Width auto (overflow based on content)" : undefined} />
            <InputWithSlider label="Height" unit="px" id="previewHeight" value={settings.previewHeight} onChange={(val) => onSettingsChange('previewHeight', val)} min={0} max={1024} step={10} subText={settings.previewHeight === 0 ? "Height auto (overflow based on content or Max Content Height)" : undefined} />
            <InputWithSlider label="Preview Zoom" unit="x" id="previewZoom" value={settings.previewZoom} onChange={(val) => onSettingsChange('previewZoom', val)} min={0.25} max={4} step={0.05} subText="Visually scales the entire preview area." />
            <LabelInputContainer label="Background Color" htmlFor="bgColor"><TextInput type="color" id="bgColor" value={settings.backgroundColor} onChange={(e) => onSettingsChange('backgroundColor', e.target.value)} className="h-10 w-full" /></LabelInputContainer>
            <LabelInputContainer label="Primary Background Image"><FileInput accept="image/*" onChange={handlePrimaryBgImageUpload} />{settings.backgroundImageUrl && (<button onClick={() => onSettingsChange('backgroundImageUrl', null)} className="mt-1 text-xs text-red-500 hover:text-red-700">Remove Primary Image</button>)}</LabelInputContainer>
            <LabelInputContainer label="Secondary Background Image"><FileInput accept="image/*" onChange={handleSecondaryBgImageUpload} />{settings.secondaryBackgroundImageUrl && (<button onClick={() => onSettingsChange('secondaryBackgroundImageUrl', null)} className="mt-1 text-xs text-red-500 hover:text-red-700">Remove Secondary Image</button>)}</LabelInputContainer>
            <LabelInputContainer label="Show Secondary Background" htmlFor="showSecondaryBg" inline disabled={!settings.secondaryBackgroundImageUrl} subText={!settings.secondaryBackgroundImageUrl ? "Load a secondary image first." : ""}><input type="checkbox" id="showSecondaryBg" checked={settings.showSecondaryBackgroundImage} onChange={(e) => onSettingsChange('showSecondaryBackgroundImage', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" disabled={!settings.secondaryBackgroundImageUrl} /></LabelInputContainer>
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
        id: 'overflow-settings-section', title: 'Overflow Settings', defaultOpen: currentProps.overflowSettingsPanelOpen, content: (
          <>
            <LabelInputContainer label="Overflow Detection Method" htmlFor="overflowDetectionMode">
              <SelectInput id="overflowDetectionMode" value={settings.overflowDetectionMode} onChange={(e) => onSettingsChange('overflowDetectionMode', e.target.value as 'pixel' | 'character')}>
                <option value="pixel">Pixel Based</option>
                <option value="character">Character Based</option>
              </SelectInput>
            </LabelInputContainer>
            {settings.overflowDetectionMode === 'pixel' && (
              <>
                <LabelInputContainer label="Use Margin-Based Overflow" htmlFor="enablePixelMargins" inline><input type="checkbox" id="enablePixelMargins" checked={settings.pixelOverflowMargins.enabled} onChange={(e) => onNestedSettingsChange('pixelOverflowMargins', 'enabled', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
                <InputWithSlider label="Max Content Height (for Auto Preview)" unit="px" id="maxPixelHeight" value={settings.maxPixelHeight} onChange={(val) => onSettingsChange('maxPixelHeight', val)} min={0} max={2048} step={1} subText={settings.pixelOverflowMargins.enabled ? "Disabled when Margin-Based Overflow is active." : "Used if 'Preview Height' is 0 (auto) and Margin-Based is off."} disabled={settings.pixelOverflowMargins.enabled} />
                {settings.pixelOverflowMargins.enabled && (
                  <div className="mt-2 pt-2 border-t border-[var(--bv-border-color-light)]">
                    {(['top', 'right', 'bottom', 'left'] as const).map(marginKey => {
                      const currentMargin = settings.pixelOverflowMargins[marginKey];
                      const isDimensionAuto = (marginKey === 'top' || marginKey === 'bottom') ? settings.previewHeight === 0 : settings.previewWidth === 0;
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
            {settings.overflowDetectionMode === 'character' && (
              <InputWithSlider label="Max Characters Per Line" unit="chars" id="maxCharacters" value={settings.maxCharacters} onChange={(val) => onSettingsChange('maxCharacters', val)} min={0} max={10000} step={1} subText={settings.maxCharacters === 0 ? "No character limit." : "Applies to the longest line. Tags & block separators are not counted."} />
            )}
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
        id: 'font-type-styling-section', title: 'Font Type, Styling & Effects', defaultOpen: true, content: (
          <>
            <LabelInputContainer label="Type" htmlFor="fontType">
              <SelectInput id="fontType" value={settings.currentFontType} onChange={(e) => onSettingsChange('currentFontType', e.target.value as 'system' | 'bitmap')}>
                <option value="system">System Font</option><option value="bitmap">Bitmap Font</option>
              </SelectInput>
            </LabelInputContainer>
            {settings.currentFontType === 'system' && (
              <div className="mt-3 pt-3 border-t border-[var(--bv-border-color-light)]">
                <h4 className="text-md font-semibold mb-1 text-[var(--bv-accent-primary)]">System Font Specifics</h4>
                <LabelInputContainer label="Font Family" htmlFor="fontFamily">
                  <SelectInput id="fontFamily" value={settings.systemFont.fontFamily} onChange={handleFontFamilyChange}>
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
                <InputWithSlider label="Font Size" unit="px" id="fontSize" value={settings.systemFont.fontSize} onChange={(val) => onNestedSettingsChange('systemFont', 'fontSize', val)} min={6} max={120} step={1} />
                <InputWithSlider label="Space Width Override" unit="px" id="systemSpaceWidthOverride" value={settings.systemFont.spaceWidthOverride || 0} onChange={(val) => onNestedSettingsChange('systemFont', 'spaceWidthOverride', val)} min={0} max={Math.max(30, settings.systemFont.fontSize * 1.5)} step={0.5} subText="Custom width for space char. 0 for auto/default." />
                <LabelInputContainer label="Font Color" htmlFor="fontColor"><TextInput type="color" id="fontColor" value={settings.systemFont.color} onChange={(e) => onNestedSettingsChange('systemFont', 'color', e.target.value)} className="h-10 w-full" /></LabelInputContainer>
                <InputWithSlider label="Letter Spacing" unit="px" id="letterSpacing" value={settings.systemFont.letterSpacing} onChange={(val) => onNestedSettingsChange('systemFont', 'letterSpacing', val)} min={-10} max={30} step={1} />
                <LabelInputContainer label="Bold" htmlFor="fontWeight" inline><input type="checkbox" id="fontWeight" checked={settings.systemFont.fontWeight === 'bold'} onChange={(e) => onNestedSettingsChange('systemFont', 'fontWeight', e.target.checked ? 'bold' : 'normal')} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
              </div>
            )}
            {settings.currentFontType === 'bitmap' && (
              <div className="mt-3 pt-3 border-t border-[var(--bv-border-color-light)]">
                <h4 className="text-md font-semibold mb-1 text-[var(--bv-accent-primary)]">Bitmap Font Specifics</h4>
                <LabelInputContainer label="Font Image"><FileInput accept="image/*" onChange={handleBitmapFontImageUpload} />{settings.bitmapFont.imageUrl && (<button onClick={() => onNestedSettingsChange('bitmapFont', 'imageUrl', null)} className="mt-1 text-xs text-red-500 hover:text-red-700">Remove Image</button>)}</LabelInputContainer>
                <InputWithSlider label="Character Width" unit="px" id="charWidth" value={settings.bitmapFont.charWidth} onChange={(val) => onNestedSettingsChange('bitmapFont', 'charWidth', val)} min={1} max={128} step={1} />
                <InputWithSlider label="Character Height" unit="px" id="charHeight" value={settings.bitmapFont.charHeight} onChange={(val) => onNestedSettingsChange('bitmapFont', 'charHeight', val)} min={1} max={128} step={1} />
                <InputWithSlider label="Tile Separation X" unit="px" id="bitmapSeparationX" value={settings.bitmapFont.separationX} onChange={(val) => onNestedSettingsChange('bitmapFont', 'separationX', val)} min={0} max={64} step={1} subText="Horizontal pixels between tiles." />
                <InputWithSlider label="Tile Separation Y" unit="px" id="bitmapSeparationY" value={settings.bitmapFont.separationY} onChange={(val) => onNestedSettingsChange('bitmapFont', 'separationY', val)} min={0} max={64} step={1} subText="Vertical pixels between tiles." />
                <LabelInputContainer label="Character Map" htmlFor="charMap"><TextInput type="text" id="charMap" value={settings.bitmapFont.charMap} onChange={(e) => onNestedSettingsChange('bitmapFont', 'charMap', e.target.value)} /></LabelInputContainer>
                <InputWithSlider label="Spacing" unit="px" id="bitmapSpacing" value={settings.bitmapFont.spacing} onChange={(val) => onNestedSettingsChange('bitmapFont', 'spacing', val)} min={-10} max={50} step={1} />
                <InputWithSlider label="Zoom" unit="x" id="bitmapZoom" value={settings.bitmapFont.zoom} onChange={(val) => onNestedSettingsChange('bitmapFont', 'zoom', val)} min={0.1} max={16} step={0.1} />
                <InputWithSlider label="Space Width Override" unit="px" id="bitmapSpaceWidthOverride" value={settings.bitmapFont.spaceWidthOverride} onChange={(val) => onNestedSettingsChange('bitmapFont', 'spaceWidthOverride', val)} min={0} max={Math.max(32, settings.bitmapFont.charWidth * 2)} step={1} subText="Custom width for space char. 0 for auto (pixel scan: ~charWidth/4, normal: full charWidth)." disabled={!(settings.currentFontType === 'bitmap' && settings.bitmapFont.enabled)} />
                <LabelInputContainer label="Enable Pixel Scanning" htmlFor="bitmapEnablePixelScanning" inline><input type="checkbox" id="bitmapEnablePixelScanning" checked={settings.bitmapFont.enablePixelScanning} onChange={(e) => onNestedSettingsChange('bitmapFont', 'enablePixelScanning', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
                {settings.bitmapFont.enablePixelScanning && (<p className="text-xs text-[var(--bv-text-secondary)] mb-1">Adjusts character width based on content. Space characters use approx. 1/4 of Character Width unless overridden.</p>)}
                <LabelInputContainer label="Enable Color Removal" htmlFor="bitmapEnableColorRemoval" inline><input type="checkbox" id="bitmapEnableColorRemoval" checked={settings.bitmapFont.enableColorRemoval} onChange={(e) => onNestedSettingsChange('bitmapFont', 'enableColorRemoval', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
                {settings.bitmapFont.enableColorRemoval && (<><LabelInputContainer label="Color to Remove" htmlFor="bitmapColorToRemove"><TextInput type="color" id="bitmapColorToRemove" value={settings.bitmapFont.colorToRemove} onChange={(e) => onNestedSettingsChange('bitmapFont', 'colorToRemove', e.target.value)} className="h-10 w-full" /></LabelInputContainer><InputWithSlider label="Removal Tolerance" id="bitmapColorRemovalTolerance" value={settings.bitmapFont.colorRemovalTolerance} onChange={(val) => onNestedSettingsChange('bitmapFont', 'colorRemovalTolerance', val)} min={0} max={75} step={1} unit="level" /></>)}
                <LabelInputContainer label="Enable Tint Color" htmlFor="bitmapEnableTintColor" inline><input type="checkbox" id="bitmapEnableTintColor" checked={settings.bitmapFont.enableTintColor} onChange={(e) => onNestedSettingsChange('bitmapFont', 'enableTintColor', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
                {settings.bitmapFont.enableTintColor && (<LabelInputContainer label="Tint Color" htmlFor="bitmapColor"><TextInput type="color" id="bitmapColor" value={settings.bitmapFont.color} onChange={(e) => onNestedSettingsChange('bitmapFont', 'color', e.target.value)} className="h-10 w-full" /></LabelInputContainer>)}
                <LabelInputContainer label="Enabled" htmlFor="bitmapEnabled" inline><input type="checkbox" id="bitmapEnabled" checked={settings.bitmapFont.enabled} onChange={(e) => onNestedSettingsChange('bitmapFont', 'enabled', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-[var(--bv-border-color-light)]">
              <h4 className="text-md font-semibold mb-1 text-[var(--bv-accent-primary)]">Effects</h4>
              <LabelInputContainer label="Shadow Enabled" htmlFor="shadowEnabled" inline><input type="checkbox" id="shadowEnabled" checked={settings.shadowEffect.enabled} onChange={(e) => onNestedSettingsChange('shadowEffect', 'enabled', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
              {settings.shadowEffect.enabled && (<><InputWithSlider label="Shadow Offset X" unit="px" id="shadowOffsetX" value={settings.shadowEffect.offsetX} onChange={(val) => onNestedSettingsChange('shadowEffect', 'offsetX', val)} min={-50} max={50} step={1} /><InputWithSlider label="Shadow Offset Y" unit="px" id="shadowOffsetY" value={settings.shadowEffect.offsetY} onChange={(val) => onNestedSettingsChange('shadowEffect', 'offsetY', val)} min={-50} max={50} step={1} /><InputWithSlider label="Shadow Blur" unit="px" id="shadowBlur" value={settings.shadowEffect.blur} onChange={(val) => onNestedSettingsChange('shadowEffect', 'blur', val)} min={0} max={100} step={1} /><LabelInputContainer label="Shadow Color" htmlFor="shadowColor"><TextInput type="color" id="shadowColor" value={settings.shadowEffect.color} onChange={(e) => onNestedSettingsChange('shadowEffect', 'color', e.target.value)} className="h-10 w-full" /></LabelInputContainer></>)}
              <LabelInputContainer label="Outline Enabled" htmlFor="outlineEnabled" inline><input type="checkbox" id="outlineEnabled" checked={settings.outlineEffect.enabled} onChange={(e) => onNestedSettingsChange('outlineEffect', 'enabled', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
              {settings.outlineEffect.enabled && (<><InputWithSlider label="Outline Width" unit="px" id="outlineWidth" value={settings.outlineEffect.width} onChange={(val) => onNestedSettingsChange('outlineEffect', 'width', val)} min={0} max={30} step={1} /><LabelInputContainer label="Outline Color" htmlFor="outlineColor"><TextInput type="color" id="outlineColor" value={settings.outlineEffect.color} onChange={(e) => onNestedSettingsChange('outlineEffect', 'color', e.target.value)} className="h-10 w-full"/></LabelInputContainer></>)}
            </div>
          </>
        )
      },
      {
        id: 'tag-handling-section', title: 'Tag Handling & Colorization', defaultOpen: false, content: (
          <>
            
            <LabelInputContainer label="Hide General Tags in Preview" htmlFor="hideTagsInPreview" inline>
              <input type="checkbox" id="hideTagsInPreview" checked={settings.hideTagsInPreview} onChange={(e) => onSettingsChange('hideTagsInPreview', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" />
            </LabelInputContainer>
            <LabelInputContainer label="General Tag Patterns to Hide:" htmlFor="tagPatternsToHide" subText="Enter RegEx patterns, one per line. Applied if 'Hide Tags' is enabled. These are for non-coloring, non-image tags.">
              <TextAreaInput id="tagPatternsToHide" value={settings.tagPatternsToHide.join('\n')} onChange={(e) => handleTagPatternsChange(e.target.value)} rows={3} placeholder="e.g. <[^>]*>\n\\[[^\\]]*\\]" />
            </LabelInputContainer>
            
            
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

              {settings.customColorTags.length === 0 && !isEditingColorTag && (
                <p className="text-xs text-[var(--bv-text-secondary)]">No custom color tags defined.</p>
              )}
              {settings.customColorTags.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {settings.customColorTags.map(tag => (
                    <div key={tag.id} className="p-2 border border-[var(--bv-border-color-light)] rounded-md bg-[var(--bv-element-background)] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-grow">
                        <input type="checkbox" checked={tag.enabled} onChange={e => handleToggleColorTagEnabled(tag.id, e.target.checked)} className="h-4 w-4 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)] flex-shrink-0" title={tag.enabled ? 'Disable Tag' : 'Enable Tag'} />
                        <span className="text-xs font-mono truncate" title={`Opening: ${tag.openingTag}\nClosing: ${tag.closingTag}`}>
                          <code>{tag.openingTag}</code>...<code>{tag.closingTag}</code>
                        </span>
                        <div style={{ backgroundColor: tag.color, width: '16px', height: '16px', borderRadius: '4px', border: '1px solid var(--bv-border-color)' }} title={`Color: ${tag.color}`}></div>
                      </div>
                      <div className="flex-shrink-0 space-x-1">
                        <Button onClick={() => handleStartEditColorTag(tag)} className="!p-1 text-xs !bg-blue-500 hover:!bg-blue-600" title="Edit Tag">✏️</Button>
                        <Button onClick={() => handleDeleteColorTag(tag.id)} className="!p-1 text-xs !bg-red-500 hover:!bg-red-600" title="Delete Tag">🗑️</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            
            <div className="mt-4 pt-3 border-t border-[var(--bv-border-color-light)]">
              <h4 className="text-md font-semibold mb-2 text-[var(--bv-accent-primary)]">Image Tags (Emojis/Icons)</h4>
              {isEditingImageTag ? (
                <div className="p-3 border border-[var(--bv-border-color)] rounded-md space-y-2 bg-[var(--bv-element-background)] mb-3">
                  <h5 className="text-sm font-medium">{editingImageTagId ? 'Edit' : 'Add New'} Image Tag</h5>
                  <LabelInputContainer label="Tag String" htmlFor="editingImageTagString">
                    <TextInput id="editingImageTagString" value={editingImageTagFields.tag || ''} onChange={e => handleEditingImageTagFieldChange('tag', e.target.value)} placeholder="e.g. [GOLD_COIN]" />
                  </LabelInputContainer>
                  <LabelInputContainer label="Image File" htmlFor="editingImageTagFile">
                    <FileInput accept="image/*" onChange={handleImageTagFileSelected} buttonLabel={editingImageTagFile ? `Selected: ${editingImageTagFile.name.substring(0,20)}...` : "Choose Image"} />
                    {editingImageTagFields.imageUrl && !editingImageTagFile && <img src={editingImageTagFields.imageUrl} alt="Current" className="mt-1 h-8 w-8 object-contain border border-[var(--bv-border-color-light)]"/>}
                    {editingImageTagPreviewUrl && editingImageTagFile && <img src={editingImageTagPreviewUrl} alt="New preview" className="mt-1 h-8 w-8 object-contain border border-[var(--bv-border-color-light)]"/>}
                  </LabelInputContainer>
                   <div className="flex gap-2">
                        <LabelInputContainer label="Width (px)" htmlFor="editingImageTagWidth" subText="Display width in preview.">
                            <TextInput type="number" id="editingImageTagWidth" value={editingImageTagFields.width || 0} onChange={e => handleEditingImageTagFieldChange('width', parseInt(e.target.value, 10))} min="1" className="w-20"/>
                        </LabelInputContainer>
                        <LabelInputContainer label="Height (px)" htmlFor="editingImageTagHeight" subText="Display height in preview.">
                            <TextInput type="number" id="editingImageTagHeight" value={editingImageTagFields.height || 0} onChange={e => handleEditingImageTagFieldChange('height', parseInt(e.target.value, 10))} min="1" className="w-20"/>
                        </LabelInputContainer>
                   </div>
                  <div className="flex gap-2 mt-2">
                    <Button onClick={handleSaveImageTag} className="flex-1">Save Image Tag</Button>
                    <Button onClick={() => {
                        setIsEditingImageTag(false);
                        setEditingImageTagFile(null); 
                      }} 
                      className="flex-1 !bg-gray-500 hover:!bg-gray-600">Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button onClick={handleStartAddNewImageTag} className="w-full mb-3">Add New Image Tag</Button>
              )}
              {settings.imageTags.length === 0 && !isEditingImageTag && (
                <p className="text-xs text-[var(--bv-text-secondary)]">No image tags defined.</p>
              )}
              {settings.imageTags.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {settings.imageTags.map(imgTag => (
                    <div key={imgTag.id} className="p-2 border border-[var(--bv-border-color-light)] rounded-md bg-[var(--bv-element-background)] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-grow">
                        <input type="checkbox" checked={imgTag.enabled} onChange={e => handleToggleImageTagEnabled(imgTag.id, e.target.checked)} className="h-4 w-4 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)] flex-shrink-0" title={imgTag.enabled ? 'Disable Tag' : 'Enable Tag'} />
                        <img src={imgTag.imageUrl} alt={imgTag.tag} className="h-6 w-6 object-contain flex-shrink-0" />
                        <span className="text-xs font-mono truncate flex-grow" title={`Tag: ${imgTag.tag}\nSize: ${imgTag.width}x${imgTag.height}px`}>
                          <code>{imgTag.tag}</code> ({imgTag.width}x{imgTag.height})
                        </span>
                      </div>
                      <div className="flex-shrink-0 space-x-1">
                        <Button onClick={() => handleStartEditImageTag(imgTag)} className="!p-1 text-xs !bg-blue-500 hover:!bg-blue-600" title="Edit Image Tag">✏️</Button>
                        <Button onClick={() => handleDeleteImageTag(imgTag.id)} className="!p-1 text-xs !bg-red-500 hover:!bg-red-600" title="Delete Image Tag">🗑️</Button>
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
        id: 'glossary-management-section', title: 'Glossary Management', defaultOpen: false, content: (
          <>
            {showGlossaryFormFor && (
              <div className="p-3 border border-[var(--bv-border-color)] rounded-md space-y-2 bg-[var(--bv-element-background)] mb-3">
                <h5 className="text-sm font-medium">
                  {editingGlossaryItemId ? `Edit ${editingGlossaryItemCategory === 'name' ? 'Name' : 'Term'}` : `Add New ${showGlossaryFormFor === 'name' ? 'Name' : 'Term'}`}
                </h5>
                <LabelInputContainer label="Term" htmlFor="glossaryTermInput">
                  <TextInput 
                    id="glossaryTermInput" 
                    value={glossaryTermInput} 
                    onChange={e => setGlossaryTermInput(e.target.value)} 
                    placeholder="Enter term" 
                  />
                </LabelInputContainer>
                <LabelInputContainer label="Translation" htmlFor="glossaryTranslationInput">
                  <TextAreaInput 
                    id="glossaryTranslationInput" 
                    value={glossaryTranslationInput} 
                    onChange={e => setGlossaryTranslationInput(e.target.value)} 
                    placeholder="Enter translation" 
                    rows={3}
                  />
                </LabelInputContainer>
                <div className="flex gap-2 mt-2">
                  <Button onClick={handleSaveGlossaryItem} className="flex-1">
                    {editingGlossaryItemId ? `Update ${editingGlossaryItemCategory === 'name' ? 'Name' : 'Term'}` : `Add ${showGlossaryFormFor === 'name' ? 'Name' : 'Term'}`}
                  </Button>
                  <Button onClick={handleCancelEditOrAddGlossaryItem} className="flex-1 !bg-gray-500 hover:!bg-gray-600">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Names Section */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-md font-semibold text-[var(--bv-accent-primary)]">Names</h4>
                {!showGlossaryFormFor && (
                  <Button onClick={() => handleShowAddGlossaryItemForm('name')} className="text-xs !py-1 !px-2">
                    Add New Name
                  </Button>
                )}
              </div>
              {namesGlossaryItems.length === 0 && !showGlossaryFormFor && (
                <p className="text-xs text-[var(--bv-text-secondary)]">No names defined.</p>
              )}
              {namesGlossaryItems.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 border border-[var(--bv-border-color-light)] rounded-md p-2">
                  {namesGlossaryItems.map(gItem => (
                    <div key={gItem.id} className="p-2 border border-[var(--bv-border-color)] rounded-md bg-[var(--bv-element-background)]">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <strong className="text-sm text-[var(--bv-text-primary)] block break-all">{gItem.term}</strong>
                          <p className="text-xs text-[var(--bv-text-secondary)] mt-0.5 break-words whitespace-pre-wrap">{gItem.translation}</p>
                        </div>
                        <div className="flex-shrink-0 space-x-1 mt-0.5">
                          <Button onClick={() => handleStartEditGlossaryItem(gItem)} className="!p-1 text-xs !bg-blue-500 hover:!bg-blue-600" title="Edit Item">✏️</Button>
                          <Button onClick={() => onDeleteGlossaryTerm(gItem.id)} className="!p-1 text-xs !bg-red-500 hover:!bg-red-600" title="Delete Item">🗑️</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Terms Section */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-md font-semibold text-[var(--bv-accent-primary)]">Terms</h4>
                 {!showGlossaryFormFor && (
                    <Button onClick={() => handleShowAddGlossaryItemForm('term')} className="text-xs !py-1 !px-2">
                      Add New Term
                    </Button>
                  )}
              </div>
              {termsGlossaryItems.length === 0 && !showGlossaryFormFor && (
                <p className="text-xs text-[var(--bv-text-secondary)]">No terms defined.</p>
              )}
              {termsGlossaryItems.length > 0 && (
                 <div className="space-y-2 max-h-48 overflow-y-auto pr-1 border border-[var(--bv-border-color-light)] rounded-md p-2">
                  {termsGlossaryItems.map(gItem => (
                    <div key={gItem.id} className="p-2 border border-[var(--bv-border-color)] rounded-md bg-[var(--bv-element-background)]">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <strong className="text-sm text-[var(--bv-text-primary)] block break-all">{gItem.term}</strong>
                          <p className="text-xs text-[var(--bv-text-secondary)] mt-0.5 break-words whitespace-pre-wrap">{gItem.translation}</p>
                        </div>
                        <div className="flex-shrink-0 space-x-1 mt-0.5">
                          <Button onClick={() => handleStartEditGlossaryItem(gItem)} className="!p-1 text-xs !bg-blue-500 hover:!bg-blue-600" title="Edit Item">✏️</Button>
                          <Button onClick={() => onDeleteGlossaryTerm(gItem.id)} className="!p-1 text-xs !bg-red-500 hover:!bg-red-600" title="Delete Item">🗑️</Button>
                        </div>
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
            <LabelInputContainer label="Custom Character Byte Map" htmlFor="customByteMapString" subText="One char/tag per line, e.g., A=1 or [ICON]=2. '#' starts a comment.">
              <TextAreaInput
                id="customByteMapString"
                value={settings.customByteMapString}
                onChange={(e) => onSettingsChange('customByteMapString', e.target.value)}
                rows={6}
                placeholder={"A=1\nB=1\n€=3\n[SMILEY_ICON]=2\n# This is a comment"}
              />
            </LabelInputContainer>
            <InputWithSlider 
              label="Default Byte Value for Unmapped Chars" 
              unit="bytes" 
              id="defaultCharacterByteValue" 
              value={settings.defaultCharacterByteValue} 
              onChange={(val) => onSettingsChange('defaultCharacterByteValue', Math.max(0, val))} 
              min={0} max={8} step={1} 
              subText="Bytes for chars not in the map."
            />
            <LabelInputContainer 
              label="Enable Byte Restriction in Comparison Mode" 
              htmlFor="enableByteRestriction" 
              inline
              disabled={!settings.comparisonModeEnabled}
              subText={!settings.comparisonModeEnabled ? "Enable Comparison Mode first." : "Prevent lines in edited script from exceeding original's byte count."}
            >
              <input 
                type="checkbox" 
                id="enableByteRestriction" 
                checked={settings.enableByteRestrictionInComparisonMode} 
                onChange={(e) => onSettingsChange('enableByteRestrictionInComparisonMode', e.target.checked)}
                className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]"
                disabled={!settings.comparisonModeEnabled}
              />
            </LabelInputContainer>
          </>
        )
      },
      {
        id: 'github-sync-section', title: 'GitHub Folder Sync', defaultOpen: false, content: (
           <>
            <LabelInputContainer label="Personal Access Token (PAT)" htmlFor="githubPat" subText="Requires 'repo' scope. Store securely.">
                <TextInput type="password" id="githubPat" value={restOfProps.gitHubSettings.pat} onChange={(e) => restOfProps.onGitHubSettingsChange('pat', e.target.value)} placeholder="ghp_YourTokenHere" />
            </LabelInputContainer>
            <LabelInputContainer label="Repository (owner/repo)" htmlFor="githubRepo" subText="e.g., username/my-project">
                <TextInput id="githubRepo" value={restOfProps.gitHubSettings.repoFullName} onChange={(e) => restOfProps.onGitHubSettingsChange('repoFullName', e.target.value)} placeholder="owner/repo-name" />
            </LabelInputContainer>
             <LabelInputContainer label="Branch" htmlFor="githubBranch" subText="Default: 'main'">
                <TextInput id="githubBranch" value={restOfProps.gitHubSettings.branch} onChange={(e) => restOfProps.onGitHubSettingsChange('branch', e.target.value)} placeholder="main" />
            </LabelInputContainer>

            <div className="mt-3 pt-3 border-t border-[var(--bv-border-color-light)]">
                <h4 className="text-md font-semibold text-[var(--bv-text-primary)] mb-1">Main Script Paths</h4>
                <LabelInputContainer label="File Path (for single file ops)" htmlFor="githubFilePathMain" subText="e.g., scripts/chapter1.txt">
                    <TextInput id="githubFilePathMain" value={restOfProps.gitHubSettings.filePath} onChange={(e) => restOfProps.onGitHubSettingsChange('filePath', e.target.value)} placeholder="path/to/your/main_script.txt" />
                </LabelInputContainer>
                <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button onClick={restOfProps.onSaveFileToGitHub} disabled={githubMainOpsDisabled} className="!bg-blue-600 hover:!bg-blue-700 text-xs !py-1" title="Save active script to its GitHub path">Save Active to Path</Button>
                    <Button onClick={restOfProps.onSaveAllToGitHubFolder} disabled={githubMainOpsDisabled} className="!bg-blue-500 hover:!bg-blue-600 text-xs !py-1" title="Save all changed main scripts to their respective paths in the folder">Save All to Folder</Button>
                </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[var(--bv-border-color-light)]">
                <h4 className="text-md font-semibold text-[var(--bv-text-primary)] mb-1">Original Script Paths (for Comparison)</h4>
                <LabelInputContainer label="File Path (for single file ops)" htmlFor="githubFilePathOriginal" subText="e.g., original_scripts/chapter1.txt">
                    <TextInput id="githubFilePathOriginal" value={restOfProps.gitHubSettings.originalFilePath} onChange={(e) => restOfProps.onGitHubSettingsChange('originalFilePath', e.target.value)} placeholder="path/to/your/original_script.txt" />
                </LabelInputContainer>
            </div>
            {restOfProps.isGitHubLoading && <p className="text-sm text-yellow-500 mt-2 animate-pulse">{restOfProps.gitHubStatusMessage || "Loading from GitHub..."}</p>}
            {!restOfProps.isGitHubLoading && restOfProps.gitHubStatusMessage && <p className={`text-sm mt-2 ${restOfProps.gitHubStatusMessage.startsWith("Error:") ? 'text-red-500' : 'text-green-500'}`}>{restOfProps.gitHubStatusMessage}</p>}
           </>
        )
      }
    ];
  }, [
    props, // Main prop object
    settings, onSettingsChange, onNestedSettingsChange, // Destructured from props, but props covers them
    mainScripts, activeMainScriptId, loadedCustomFontName, glossaryTerms, // Other props items
    blockSeparatorsInputText, activeNavigationTab,
    isEditingColorTag, editingColorTag, editingColorTagId,
    isEditingImageTag, editingImageTagFields, editingImageTagId, editingImageTagFile, editingImageTagPreviewUrl,
    glossaryTermInput, glossaryTranslationInput, editingGlossaryItemId, editingGlossaryItemCategory, showGlossaryFormFor,
    // Callbacks from ControlsPanel scope (ensure they are memoized themselves)
    handleBlockSeparatorsInputChange, handleBlockSeparatorsInputBlur,
    handlePrimaryBgImageUpload, handleSecondaryBgImageUpload, handleBitmapFontImageUpload,
    handleFontFileSelected, handleFontFamilyChange,
    handleStartAddNewColorTag, handleStartEditColorTag, handleSaveColorTag, handleDeleteColorTag, handleToggleColorTagEnabled, handleEditingColorTagChange,
    handleStartAddNewImageTag, handleStartEditImageTag, handleImageTagFileSelected, handleEditingImageTagFieldChange, handleSaveImageTag, handleDeleteImageTag, handleToggleImageTagEnabled,
    handleTagPatternsChange, handleCustomLineBreakTagsChange, handlePixelMarginChange,
    handleShowAddGlossaryItemForm, handleSaveGlossaryItem, handleStartEditGlossaryItem, handleCancelEditOrAddGlossaryItem,
    setActiveNavigationTab, setGlossaryTermInput, setGlossaryTranslationInput, // State setters
  ]);

  const panelItems = useMemo(() => getPanelSectionsConfig(props), [getPanelSectionsConfig, props]);

  const [panelSectionsOrder, setPanelSectionsOrder] = useState<string[]>(() => panelItems.map(s => s.id));
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    panelItems.reduce((acc, section) => {
      acc[section.id] = section.defaultOpen ?? false;
      return acc;
    }, {} as Record<string, boolean>)
  );
  
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  useEffect(() => {
    const newOrderFromItems = panelItems.map(s => s.id);
    setPanelSectionsOrder(currentOrder => {
      const currentOrderSet = new Set(currentOrder);
      const newOrderSet = new Set(newOrderFromItems);
      const maintainedOrder = currentOrder.filter(id => newOrderSet.has(id));
      const addedIds = newOrderFromItems.filter(id => !currentOrderSet.has(id));
      return [...maintainedOrder, ...addedIds];
    });

    setOpenSections(currentOpenSections => {
      const nextOpenSections = { ...currentOpenSections };
      const itemIds = new Set(panelItems.map(s => s.id));
      panelItems.forEach(item => {
        if (nextOpenSections[item.id] === undefined) {
          // Initialize open state based on defaultOpen from panelItems,
          // which itself is derived from props.overflowSettingsPanelOpen for the specific section.
          nextOpenSections[item.id] = item.defaultOpen ?? false;
        }
      });
      Object.keys(nextOpenSections).forEach(id => {
        if (!itemIds.has(id)) {
          delete nextOpenSections[id];
        }
      });
      return nextOpenSections;
    });
  }, [panelItems]);


  const handleToggleSection = useCallback((sectionId: string) => {
    setOpenSections(prevOpenSections => {
      const newOpenState = !prevOpenSections[sectionId];
      if (sectionId === 'overflow-settings-section') {
        // This call updates App.tsx's overflowSettingsPanelOpen state,
        // which then flows down to PreviewArea's showPixelMarginGuides prop.
        onToggleOverflowSettingsPanel();
      }
      return { ...prevOpenSections, [sectionId]: newOpenState };
    });
  }, [onToggleOverflowSettingsPanel]);


  const handleDragStart = useCallback((e: React.DragEvent<HTMLButtonElement>, sectionId: string) => {
    setDraggedSectionId(sectionId);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', sectionId);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedSectionId(null);
    setDragOverSectionId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
    if (draggedSectionId && e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }, [draggedSectionId]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>, targetSectionId: string) => {
    e.preventDefault();
    if (draggedSectionId && draggedSectionId !== targetSectionId) {
      setDragOverSectionId(targetSectionId);
    }
  }, [draggedSectionId]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>, targetSectionId: string) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          if (dragOverSectionId === targetSectionId) {
            setDragOverSectionId(null);
          }
      }
  }, [dragOverSectionId]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, targetSectionId: string) => {
    e.preventDefault();
    if (!draggedSectionId || draggedSectionId === targetSectionId) {
      setDragOverSectionId(null);
      setDraggedSectionId(null);
      return;
    }

    setPanelSectionsOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const draggedIndex = newOrder.indexOf(draggedSectionId);
      const targetIndex = newOrder.indexOf(targetSectionId);

      if (draggedIndex === -1 || targetIndex === -1) return prevOrder;

      const [draggedItem] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedItem);
      return newOrder;
    });
    setDragOverSectionId(null);
    setDraggedSectionId(null);
  }, [draggedSectionId]);

  const sectionsById = useMemo(() => 
    panelItems.reduce((acc, section) => {
      acc[section.id] = section;
      return acc;
    }, {} as Record<string, PanelSectionItem>), 
    [panelItems]
  );
  
  const sortedPanelSections = useMemo(() => 
    panelSectionsOrder
      .map(id => sectionsById[id])
      .filter(Boolean),
    [panelSectionsOrder, sectionsById]
  );

  return (
    <div ref={controlsPanelRef} className="h-full overflow-y-auto p-1 space-y-0.5 controls-panel-scroll-container" role="form" aria-label="Controls Panel">
      {sortedPanelSections.map((section) => (
        <DraggableSectionWrapper
          key={section.id}
          onDragEnter={(e) => handleDragEnter(e, section.id)}
          onDragOver={handleDragOver}
          onDragLeave={(e) => handleDragLeave(e, section.id)}
          onDrop={(e) => handleDrop(e, section.id)}
          isDragging={draggedSectionId === section.id}
          isDragOver={dragOverSectionId === section.id && draggedSectionId !== section.id}
        >
          <Section
            id={section.id}
            title={section.title}
            isOpen={openSections[section.id] ?? section.defaultOpen ?? false}
            onToggle={() => handleToggleSection(section.id)}
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
