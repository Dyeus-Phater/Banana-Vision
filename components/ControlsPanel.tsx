
import React, {useState, useEffect, useCallback, useMemo} from 'react';
import { AppSettings, Block, NestedAppSettingsObjectKeys, ScriptFile, GitHubSettings, ThemeKey, CustomColorTag, ImageTag } from '../types';
import { FindScope, FindResultSummaryItem } from '../App';
import { AVAILABLE_FONTS } // Removed DEFAULT_THEME_COLORS
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
  gitHubSettings: GitHubSettings;
  onGitHubSettingsChange: <K extends keyof GitHubSettings>(key: K, value: GitHubSettings[K]) => void;
  onLoadFileFromGitHub: () => void;
  onSaveFileToGitHub: () => void;
  onLoadAllFromGitHubFolder: () => void;
  onSaveAllToGitHubFolder: () => void;
  isGitHubLoading: boolean;
  gitHubStatusMessage: string;
  activeThemeKey: ThemeKey;
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
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--bv-accent-primary)] 
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
  width: 24, // Default sensible size for an icon/emoji
  height: 24,
  enabled: true,
};

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};


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
    isFindCurrentBlockDisabled, findResultSummary, onNavigateToFindResult,
    gitHubSettings, onGitHubSettingsChange, onLoadFileFromGitHub, onSaveFileToGitHub,
    onLoadAllFromGitHubFolder, onSaveAllToGitHubFolder,
    isGitHubLoading, gitHubStatusMessage,
    activeThemeKey
  } = props;

  const [customFontFile, setCustomFontFile] = useState<File | null>(null);
  const [customFontCssNameInput, setCustomFontCssNameInput] = useState<string>("");

  const [isEditingColorTag, setIsEditingColorTag] = useState<boolean>(false);
  const [editingColorTag, setEditingColorTag] = useState<CustomColorTag | Omit<CustomColorTag, 'id'>>(DEFAULT_CUSTOM_COLOR_TAG);
  const [editingColorTagId, setEditingColorTagId] = useState<string | null>(null);

  // State for Image Tag editing
  const [isEditingImageTag, setIsEditingImageTag] = useState<boolean>(false);
  const [editingImageTagFields, setEditingImageTagFields] = useState<Omit<ImageTag, 'id' | 'imageUrl'> & { imageUrl?: string }>(DEFAULT_IMAGE_TAG);
  const [editingImageTagId, setEditingImageTagId] = useState<string | null>(null);
  const [editingImageTagFile, setEditingImageTagFile] = useState<File | null>(null);
  const [editingImageTagPreviewUrl, setEditingImageTagPreviewUrl] = useState<string | null>(null);


  useEffect(() => {
    if (loadedCustomFontName && settings.systemFont.fontFamily === loadedCustomFontName) {
      setCustomFontCssNameInput(loadedCustomFontName);
    } else if (settings.systemFont.fontFamily === "Custom...") {
        if (!customFontFile) setCustomFontCssNameInput("");
    }
  }, [settings.systemFont.fontFamily, loadedCustomFontName, customFontFile]);


  // Effect to cleanup object URL for image tag preview
  useEffect(() => {
    // This effect runs when isEditingImageTag changes.
    // If we are no longer editing, and there was a preview URL, revoke it.
    if (!isEditingImageTag && editingImageTagPreviewUrl) {
        URL.revokeObjectURL(editingImageTagPreviewUrl);
        setEditingImageTagPreviewUrl(null);
    }

    // Return a cleanup function that will be called if the component unmounts
    // or if isEditingImageTag becomes true again.
    return () => {
        if (editingImageTagPreviewUrl) {
            URL.revokeObjectURL(editingImageTagPreviewUrl);
            // No need to set state here as component might be unmounting
        }
    };
  }, [isEditingImageTag, editingImageTagPreviewUrl]);


  const handlePrimaryBgImageUpload = (files: FileList) => {
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
        onSettingsChange('backgroundImageUrl', dataUrl); // Still set URL if dimensions fail
      }
      img.src = dataUrl;
    };
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


  // Custom Color Tag Management
  const handleStartAddNewColorTag = () => {
    setEditingColorTag(DEFAULT_CUSTOM_COLOR_TAG);
    setEditingColorTagId(null);
    setIsEditingColorTag(true);
  };

  const handleStartEditColorTag = (tag: CustomColorTag) => {
    setEditingColorTag(tag);
    setEditingColorTagId(tag.id);
    setIsEditingColorTag(true);
  };

  const handleSaveColorTag = () => {
    if (!editingColorTag.openingTag.trim() || !editingColorTag.closingTag.trim()) {
      alert("Opening and closing tags cannot be empty.");
      return;
    }
    if (editingColorTag.openingTag === editingColorTag.closingTag) {
        alert("Opening and closing tags cannot be the same.");
        return;
    }

    let updatedTags;
    if (editingColorTagId) { // Editing existing
      updatedTags = settings.customColorTags.map(t =>
        t.id === editingColorTagId ? { ...editingColorTag, id: editingColorTagId } as CustomColorTag : t
      );
    } else { // Adding new
      const newTag: CustomColorTag = {
        ...editingColorTag,
        id: `cct-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      } as CustomColorTag; // Ensure `id` is part of it.
      updatedTags = [...settings.customColorTags, newTag];
    }
    onSettingsChange('customColorTags', updatedTags);
    setIsEditingColorTag(false);
    setEditingColorTagId(null);
  };

  const handleDeleteColorTag = (tagId: string) => {
    if (window.confirm("Are you sure you want to delete this color tag?")) {
      const updatedTags = settings.customColorTags.filter(t => t.id !== tagId);
      onSettingsChange('customColorTags', updatedTags);
    }
  };

  const handleToggleColorTagEnabled = (tagId: string, enabled: boolean) => {
    const updatedTags = settings.customColorTags.map(t =>
      t.id === tagId ? { ...t, enabled } : t
    );
    onSettingsChange('customColorTags', updatedTags);
  };

  const handleEditingColorTagChange = <K extends keyof (typeof editingColorTag)>(key: K, value: (typeof editingColorTag)[K]) => {
    setEditingColorTag(prev => ({ ...prev, [key]: value }));
  };

  // Image Tag Management
  const handleStartAddNewImageTag = () => {
    setEditingImageTagFields(DEFAULT_IMAGE_TAG);
    setEditingImageTagId(null);
    setEditingImageTagFile(null);
    if (editingImageTagPreviewUrl) {
        URL.revokeObjectURL(editingImageTagPreviewUrl);
    }
    setEditingImageTagPreviewUrl(null);
    setIsEditingImageTag(true);
  };

  const handleStartEditImageTag = (imageTag: ImageTag) => {
    setEditingImageTagFields({ 
      tag: imageTag.tag, 
      width: imageTag.width, 
      height: imageTag.height, 
      enabled: imageTag.enabled,
      imageUrl: imageTag.imageUrl // Keep existing image URL for editing form
    });
    setEditingImageTagId(imageTag.id);
    setEditingImageTagFile(null);
    if (editingImageTagPreviewUrl) {
        URL.revokeObjectURL(editingImageTagPreviewUrl);
    }
    setEditingImageTagPreviewUrl(null); // No local file preview initially when editing existing
    setIsEditingImageTag(true);
  };

  const handleImageTagFileSelected = (files: FileList) => {
    if (files && files.length > 0) {
      const file = files[0];
      setEditingImageTagFile(file);
      if (editingImageTagPreviewUrl) {
          URL.revokeObjectURL(editingImageTagPreviewUrl);
      }
      setEditingImageTagPreviewUrl(URL.createObjectURL(file));
    }
  };
  
  const handleEditingImageTagFieldChange = <K extends keyof typeof editingImageTagFields>(key: K, value: (typeof editingImageTagFields)[K]) => {
    setEditingImageTagFields(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveImageTag = async () => {
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
    } else if (!editingImageTagId && !finalImageUrl) { // New tag and no file selected/no existing URL
      alert("Please select an image for the new tag.");
      return;
    }
    
    if (!finalImageUrl) { // Should only happen if editing an existing tag and somehow the URL was cleared, or new and no file
        alert("Image URL is missing.");
        return;
    }


    let updatedImageTags;
    if (editingImageTagId) { // Editing existing
      updatedImageTags = settings.imageTags.map(it =>
        it.id === editingImageTagId ? { 
          ...it, // Keep original ID
          tag: editingImageTagFields.tag!, 
          imageUrl: finalImageUrl!, 
          width: editingImageTagFields.width!, 
          height: editingImageTagFields.height!, 
          enabled: editingImageTagFields.enabled! 
        } : it
      );
    } else { // Adding new
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
    
    if (editingImageTagPreviewUrl) { // Clean up object URL after successful save or if data URL was used
        URL.revokeObjectURL(editingImageTagPreviewUrl);
        setEditingImageTagPreviewUrl(null);
    }
    setIsEditingImageTag(false); // This will also trigger useEffect cleanup if somehow URL still exists
    setEditingImageTagId(null);
    setEditingImageTagFile(null);
  };

  const handleDeleteImageTag = (tagId: string) => {
    if (window.confirm("Are you sure you want to delete this image tag?")) {
      const updatedTags = settings.imageTags.filter(t => t.id !== tagId);
      onSettingsChange('imageTags', updatedTags);
    }
  };

  const handleToggleImageTagEnabled = (tagId: string, enabled: boolean) => {
    const updatedTags = settings.imageTags.map(t =>
      t.id === tagId ? { ...t, enabled } : t
    );
    onSettingsChange('imageTags', updatedTags);
  };


  const handleTagPatternsChange = useCallback((value: string) => {
    onSettingsChange('tagPatternsToHide', value.split('\n'));
  }, [onSettingsChange]);

  const handleBlockSeparatorsChange = useCallback((value: string) => {
    onSettingsChange('blockSeparators', value.split(',').map(s => s.trim()).filter(s => s.length > 0));
  }, [onSettingsChange]);

  const getPanelSectionsConfig = useCallback((currentProps: ControlsPanelProps): PanelSectionItem[] => {
    const { settings, onSettingsChange, onNestedSettingsChange, ...restOfProps } = currentProps;


    return [
      {
        id: 'script-management-section', title: 'Script Management', defaultOpen: true, content: (
          <>
            <LabelInputContainer label="Upload Main Script(s) (.txt, .scp, etc.)">
              <FileInput accept=".txt,.scp,.text,text/plain" onChange={restOfProps.onTextFileUpload} buttonLabel="Load Main Script(s)" multiple />
            </LabelInputContainer>
            {restOfProps.mainScripts.length > 0 && (
              <Button onClick={restOfProps.onClearMainScripts} className="text-xs mt-1 !py-1 !px-2 !bg-red-500 hover:!bg-red-600 w-full">
                Clear All Main Scripts ({restOfProps.mainScripts.length} loaded)
              </Button>
            )}
            <div className="mt-3 pt-3 border-t border-[var(--bv-border-color-light)]">
              <LabelInputContainer label="Upload Original Script(s) (for Comparison)">
                <FileInput accept=".txt,.scp,.text,text/plain" onChange={restOfProps.onOriginalScriptUpload} buttonLabel="Load Original Script(s)" multiple />
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
            </div>
            <LabelInputContainer label="Use Custom Block Separators (for new uploads)" htmlFor="useCustomBlockSeparator" inline>
              <input type="checkbox" id="useCustomBlockSeparator" checked={settings.useCustomBlockSeparator} onChange={(e) => onSettingsChange('useCustomBlockSeparator', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" />
            </LabelInputContainer>
            {settings.useCustomBlockSeparator && (
              <LabelInputContainer label="Block Separators (comma-separated)" htmlFor="blockSeparators">
                <TextInput id="blockSeparators" value={settings.blockSeparators.join(',')} onChange={(e) => handleBlockSeparatorsChange(e.target.value)} placeholder="e.g. <PAGE>,[END]" />
              </LabelInputContainer>
            )}
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
        id: 'loaded-main-scripts-section', title: 'Loaded Main Scripts', defaultOpen: true, content: (
          <>
            {mainScripts.length === 0 ? <p className="text-xs text-[var(--bv-text-secondary)]">No main scripts loaded.</p> :
            (<>
              <p className="text-xs text-[var(--bv-text-secondary)] mb-1">
                  Active Script: <span className="font-semibold text-[var(--bv-text-primary)]">{activeMainScriptName || "None Selected"}</span>
              </p>
              <div className="max-h-48 overflow-y-auto border border-[var(--bv-border-color)] rounded p-1 space-y-1 mt-1">
                  {mainScripts.map((script) => (
                      <button key={script.id} onClick={() => onSetActiveMainScriptId(script.id)}
                          className={`block w-full text-left p-1.5 rounded text-sm transition-colors duration-150 truncate 
                                     ${activeMainScriptId === script.id 
                                       ? 'bg-[var(--bv-accent-primary)] text-[var(--bv-accent-primary-content)] font-semibold' 
                                       : 'bg-transparent text-[var(--bv-text-primary)] hover:bg-[var(--bv-element-background)] hover:text-[var(--bv-text-primary)]'}`}
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
            {!(activeMainScriptId && activeScriptBlocks.length > 0 && viewMode === 'single') ? <p className="text-xs text-[var(--bv-text-secondary)]">Block navigation is available in "Single Block View" with an active script and blocks.</p> :
            (<>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-[var(--bv-text-primary)]"> Block: {currentBlockIndex !== null ? currentBlockIndex + 1 : '-'} / {activeScriptBlocks.length} {showOnlyOverflowingBlocks && ` (Showing ${displayedBlocksForView.length} overflowing)`}</span>
                <div className="space-x-1">
                  <button onClick={() => { if (currentBlockIndex === null) return; const currentDisplayedIdx = displayedBlocksForView.findIndex(b => b.index === currentBlockIndex); if (currentDisplayedIdx > 0) { onSetCurrentBlockIndex(displayedBlocksForView[currentDisplayedIdx - 1].index); } else if (currentDisplayedIdx === -1 && currentBlockIndex > 0) { let prevActualIdx = currentBlockIndex - 1; while(prevActualIdx >= 0 && showOnlyOverflowingBlocks && !activeScriptBlocks[prevActualIdx].isOverflowing) { prevActualIdx--; } if(prevActualIdx >=0) onSetCurrentBlockIndex(prevActualIdx); } }} disabled={currentBlockIndex === null || (showOnlyOverflowingBlocks ? displayedBlocksForView.findIndex(b => b.index === currentBlockIndex) <= 0 : currentBlockIndex <=0)} className="px-2 py-1 text-xs rounded bg-[var(--bv-accent-secondary)] text-[var(--bv-accent-secondary-content)] hover:opacity-80 disabled:opacity-50" >Prev</button>
                  <button onClick={() => { if (currentBlockIndex === null) return; const currentDisplayedIdx = displayedBlocksForView.findIndex(b => b.index === currentBlockIndex); if (currentDisplayedIdx !== -1 && currentDisplayedIdx < displayedBlocksForView.length - 1) { onSetCurrentBlockIndex(displayedBlocksForView[currentDisplayedIdx + 1].index); } else if (currentDisplayedIdx === -1 && currentBlockIndex < activeScriptBlocks.length -1) { let nextActualIdx = currentBlockIndex + 1; while(nextActualIdx < activeScriptBlocks.length && showOnlyOverflowingBlocks && !activeScriptBlocks[nextActualIdx].isOverflowing) { nextActualIdx++; } if(nextActualIdx < activeScriptBlocks.length) onSetCurrentBlockIndex(nextActualIdx); } }} disabled={currentBlockIndex === null || (showOnlyOverflowingBlocks ? displayedBlocksForView.findIndex(b => b.index === currentBlockIndex) >= displayedBlocksForView.length -1 : currentBlockIndex >= activeScriptBlocks.length -1)} className="px-2 py-1 text-xs rounded bg-[var(--bv-accent-secondary)] text-[var(--bv-accent-secondary-content)] hover:opacity-80 disabled:opacity-50" >Next</button>
                </div>
              </div>
              <LabelInputContainer label="Show Only Overflowing Blocks" htmlFor="showOnlyOverflow" inline><input type="checkbox" id="showOnlyOverflow" checked={showOnlyOverflowingBlocks} onChange={(e) => onShowOnlyOverflowingBlocksChange(e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
              <div className="max-h-60 overflow-y-auto border border-[var(--bv-border-color)] rounded p-1 space-y-1 mt-2">
                {displayedBlocksForView.map((block) => (<button key={block.index} onClick={() => onSetCurrentBlockIndex(block.index)} className={`block w-full text-left p-1.5 rounded text-sm transition-colors duration-150 truncate ${currentBlockIndex === block.index ? 'bg-[var(--bv-accent-primary)] text-[var(--bv-accent-primary-content)] font-semibold' : 'bg-transparent text-[var(--bv-text-primary)] hover:bg-[var(--bv-element-background)]'} ${block.isOverflowing ? 'border-l-4 border-red-500 pl-2' : 'pl-3'}`} title={block.content.substring(0,100) + (block.content.length > 100 ? '...' : '')} > Block {block.index + 1}{block.isOverflowing ? ' (Overflow!)' : ''} </button> ))}
                {displayedBlocksForView.length === 0 && activeScriptBlocks.length > 0 && (<p className="text-center text-xs text-[var(--bv-text-secondary)] p-2">No blocks match filter.</p>)}
              </div>
            </>)}
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
            isFindReplaceDisabled={isFindReplaceDisabled} 
            findResultSummary={restOfProps.findResultSummary}
            onNavigateToFindResult={restOfProps.onNavigateToFindResult}
            activeThemeKey={restOfProps.activeThemeKey}
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
            <LabelInputContainer label="Show Secondary Background" htmlFor="showSecondaryBg" inline disabled={!settings.secondaryBackgroundImageUrl} subText={!settings.secondaryBackgroundImageUrl ? "Load a secondary image first." : ""}><input type="checkbox" id="showSecondaryBg" checked={settings.showSecondaryBackgroundImage} onChange={(e) => onSettingsChange('showSecondaryBackgroundImage', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" disabled={!settings.secondaryBackgroundImageUrl} /></LabelInputContainer>
          </>
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
        id: 'tag-handling-section', title: 'Tag Handling & Colorization', defaultOpen: false, content: (
          <>
            {/* General Tag Hiding */}
            <LabelInputContainer label="Hide General Tags in Preview" htmlFor="hideTagsInPreview" inline>
              <input type="checkbox" id="hideTagsInPreview" checked={settings.hideTagsInPreview} onChange={(e) => onSettingsChange('hideTagsInPreview', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" />
            </LabelInputContainer>
            <LabelInputContainer label="General Tag Patterns to Hide:" htmlFor="tagPatternsToHide" subText="Enter RegEx patterns, one per line. Applied if 'Hide Tags' is enabled. These are for non-coloring, non-image tags.">
              <TextAreaInput id="tagPatternsToHide" value={settings.tagPatternsToHide.join('\n')} onChange={(e) => handleTagPatternsChange(e.target.value)} rows={3} placeholder="e.g. <[^>]*>\n\\[[^\\]]*\\]" />
            </LabelInputContainer>
            
            {/* Custom Color Tags */}
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

            {/* Image Tags */}
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
                        // The useEffect for isEditingImageTag will handle revoking editingImageTagPreviewUrl
                        setEditingImageTagFile(null); // Explicitly clear the file selection state
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
              <div className="mt-3 pt-3 border-t border-[var(--bv-border-color-light)]">
                <h4 className="text-md font-semibold mb-1 text-[var(--bv-accent-primary)]">System Font Specifics</h4>
                <LabelInputContainer label="Font Family" htmlFor="fontFamily">
                  <SelectInput id="fontFamily" value={settings.systemFont.fontFamily} onChange={(e) => { const newFontFamily = e.target.value; onNestedSettingsChange('systemFont', 'fontFamily', newFontFamily); if (newFontFamily !== "Custom..." && newFontFamily !== loadedCustomFontName) { setCustomFontFile(null); } else if (newFontFamily === "Custom...") { setCustomFontFile(null); setCustomFontCssNameInput(""); } }}>
                    {AVAILABLE_FONTS.map(font => <option key={font} value={font}>{font.split(',')[0]}</option>)}
                    {loadedCustomFontName && !AVAILABLE_FONTS.includes(loadedCustomFontName) && loadedCustomFontName !== "Custom..." && (<option value={loadedCustomFontName}>{loadedCustomFontName}</option>)}
                    <option value="Custom...">Custom (Load from file)...</option>
                  </SelectInput>
                </LabelInputContainer>
                {showCustomFontLoadUI && (
                  <div className="mt-2 p-2 border border-[var(--bv-border-color)] rounded-md space-y-2">
                    <LabelInputContainer label="Font File (.ttf, .otf, .woff, .woff2)" htmlFor="customFontFile"><FileInput accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" onChange={handleFontFileSelected} buttonLabel={customFontFile ? `Selected: ${customFontFile.name}` : "Choose Font File"} /></LabelInputContainer>
                    <LabelInputContainer label="Desired CSS Font Name" htmlFor="customFontCssName"><TextInput id="customFontCssName" type="text" placeholder="e.g., My Awesome Font" value={customFontCssNameInput} onChange={(e) => setCustomFontCssNameInput(e.target.value)} /></LabelInputContainer>
                    <Button onClick={handleLoadCustomFontClick} disabled={!customFontFile || !customFontCssNameInput.trim()}>Load Font from File</Button>
                    {customFontFile && <p className="text-xs text-[var(--bv-text-secondary)]">Selected file: {customFontFile.name}</p>}
                  </div>
                )}
                <InputWithSlider label="Font Size" unit="px" id="fontSize" value={settings.systemFont.fontSize} onChange={(val) => onNestedSettingsChange('systemFont', 'fontSize', val)} min={6} max={120} step={1} />
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
          </>
        )
      },
      {
        id: 'effects-section', title: 'Effects', defaultOpen: false, content: (
          <>
            <LabelInputContainer label="Shadow Enabled" htmlFor="shadowEnabled" inline><input type="checkbox" id="shadowEnabled" checked={settings.shadowEffect.enabled} onChange={(e) => onNestedSettingsChange('shadowEffect', 'enabled', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
            {settings.shadowEffect.enabled && (<><InputWithSlider label="Shadow Offset X" unit="px" id="shadowOffsetX" value={settings.shadowEffect.offsetX} onChange={(val) => onNestedSettingsChange('shadowEffect', 'offsetX', val)} min={-50} max={50} step={1} /><InputWithSlider label="Shadow Offset Y" unit="px" id="shadowOffsetY" value={settings.shadowEffect.offsetY} onChange={(val) => onNestedSettingsChange('shadowEffect', 'offsetY', val)} min={-50} max={50} step={1} /><InputWithSlider label="Shadow Blur" unit="px" id="shadowBlur" value={settings.shadowEffect.blur} onChange={(val) => onNestedSettingsChange('shadowEffect', 'blur', val)} min={0} max={100} step={1} /><LabelInputContainer label="Shadow Color" htmlFor="shadowColor"><TextInput type="color" id="shadowColor" value={settings.shadowEffect.color} onChange={(e) => onNestedSettingsChange('shadowEffect', 'color', e.target.value)} className="h-10 w-full" /></LabelInputContainer></>)}
            <LabelInputContainer label="Outline Enabled" htmlFor="outlineEnabled" inline><input type="checkbox" id="outlineEnabled" checked={settings.outlineEffect.enabled} onChange={(e) => onNestedSettingsChange('outlineEffect', 'enabled', e.target.checked)} className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]" /></LabelInputContainer>
            {settings.outlineEffect.enabled && (<><InputWithSlider label="Outline Width" unit="px" id="outlineWidth" value={settings.outlineEffect.width} onChange={(val) => onNestedSettingsChange('outlineEffect', 'width', val)} min={0} max={30} step={1} /><LabelInputContainer label="Outline Color" htmlFor="outlineColor"><TextInput type="color" id="outlineColor" value={settings.outlineEffect.color} onChange={(e) => onNestedSettingsChange('outlineEffect', 'color', e.target.value)} className="h-10 w-full"/></LabelInputContainer></>)}
          </>
        )
      },
      {
        id: 'github-sync-section', title: 'GitHub Folder Sync', defaultOpen: false, content: (
          <>
            <div className="p-2 mb-2 border border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-900/30 rounded-md">
              <p className="text-xs text-red-700 dark:text-red-300 font-semibold">Security Warning:</p>
              <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-400">
                <li>Personal Access Tokens (PATs) are sensitive. Use tokens with the minimum necessary scopes (e.g., `repo` or `public_repo`).</li>
                <li>Prefer PATs with an expiration date.</li>
                <li>The PAT is stored in memory for the current session only and is not saved with profiles or JSON exports.</li>
              </ul>
            </div>
            <LabelInputContainer label="Personal Access Token (PAT)" htmlFor="github-pat">
              <TextInput id="github-pat" type="password" value={restOfProps.gitHubSettings.pat} onChange={(e) => restOfProps.onGitHubSettingsChange('pat', e.target.value)} placeholder="Enter your GitHub PAT" />
            </LabelInputContainer>
            <LabelInputContainer label="Repository (owner/repo-name)" htmlFor="github-repo">
              <TextInput id="github-repo" type="text" value={restOfProps.gitHubSettings.repoFullName} onChange={(e) => restOfProps.onGitHubSettingsChange('repoFullName', e.target.value)} placeholder="e.g., your-username/your-repo" />
            </LabelInputContainer>
            <LabelInputContainer label="Branch" htmlFor="github-branch">
              <TextInput id="github-branch" type="text" value={restOfProps.gitHubSettings.branch} onChange={(e) => restOfProps.onGitHubSettingsChange('branch', e.target.value)} placeholder="e.g., main (default if empty)" />
            </LabelInputContainer>
            <LabelInputContainer label="File/Folder Path in Repository" htmlFor="github-filepath" subText="For single file ops, use full path. For folder ops, use folder path (e.g., scripts/ or assets/dialogue/).">
              <TextInput id="github-filepath" type="text" value={restOfProps.gitHubSettings.filePath} onChange={(e) => restOfProps.onGitHubSettingsChange('filePath', e.target.value)} placeholder="e.g., path/to/file.txt or path/to/folder/" />
            </LabelInputContainer>
            
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button onClick={restOfProps.onLoadFileFromGitHub} disabled={restOfProps.isGitHubLoading || !restOfProps.gitHubSettings.pat || !restOfProps.gitHubSettings.repoFullName || !restOfProps.gitHubSettings.filePath} className="!bg-green-600 hover:!bg-green-700">Load File from Path</Button>
              <Button onClick={restOfProps.onLoadAllFromGitHubFolder} disabled={restOfProps.isGitHubLoading || !restOfProps.gitHubSettings.pat || !restOfProps.gitHubSettings.repoFullName || !restOfProps.gitHubSettings.filePath} className="!bg-green-500 hover:!bg-green-600">Load All from Folder</Button>
              <Button onClick={restOfProps.onSaveFileToGitHub} disabled={restOfProps.isGitHubLoading || !restOfProps.gitHubSettings.pat || !restOfProps.gitHubSettings.repoFullName || !restOfProps.gitHubSettings.filePath || !activeMainScriptId} className="!bg-blue-600 hover:!bg-blue-700">Save Active to Path</Button>
              <Button onClick={restOfProps.onSaveAllToGitHubFolder} disabled={restOfProps.isGitHubLoading || !restOfProps.gitHubSettings.pat || !restOfProps.gitHubSettings.repoFullName || !restOfProps.gitHubSettings.filePath || mainScripts.length === 0} className="!bg-blue-500 hover:!bg-blue-600">Save All to Folder</Button>
            </div>

            {restOfProps.gitHubStatusMessage && (
              <p className={`mt-2 text-sm ${restOfProps.gitHubStatusMessage.startsWith('Error:') ? 'text-red-600 dark:text-red-400' : 'text-[var(--bv-text-secondary)]'}`} aria-live="polite">
                {restOfProps.gitHubStatusMessage}
              </p>
            )}
          </>
        )
      }
    ];
  }, [
    settings, onSettingsChange, onNestedSettingsChange,
    onTextFileUpload, mainScripts, activeMainScriptId, onSetActiveMainScriptId, onClearMainScripts,
    activeScriptBlocks, currentBlockIndex, onSetCurrentBlockIndex,
    showOnlyOverflowingBlocks, onShowOnlyOverflowingBlocksChange, displayedBlocksForView,
    onLoadCustomFont, loadedCustomFontName, customFontFile, customFontCssNameInput,
    overflowSettingsPanelOpen,
    originalScripts, onOriginalScriptUpload, matchedOriginalScriptName, onClearOriginalScripts,
    viewMode, onViewModeChange,
    findText, onFindTextChange, replaceText, onReplaceTextChange,
    findIsCaseSensitive, onFindIsCaseSensitiveChange, findMatchWholeWord, onFindMatchWholeWordChange,
    findScope, onFindScopeChange, onFindNext, onReplace, onReplaceAll, findResultsMessage,
    isFindCurrentBlockDisabled, findResultSummary, onNavigateToFindResult,
    activeMainScriptName, isFindReplaceDisabled, showCustomFontLoadUI,
    gitHubSettings, onGitHubSettingsChange, onLoadFileFromGitHub, onSaveFileToGitHub, onLoadAllFromGitHubFolder, onSaveAllToGitHubFolder,
    isGitHubLoading, gitHubStatusMessage,
    activeThemeKey, 
    isEditingColorTag, editingColorTag, editingColorTagId,
    isEditingImageTag, editingImageTagFields, editingImageTagId, editingImageTagFile, editingImageTagPreviewUrl,
    handlePrimaryBgImageUpload, handleSecondaryBgImageUpload, handleBitmapFontImageUpload,
    handleTagPatternsChange, handleBlockSeparatorsChange
  ]);


  const basePanelSections = useMemo(() => getPanelSectionsConfig(props), [props, getPanelSectionsConfig]);
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => basePanelSections.map((s: PanelSectionItem) => s.id));
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [draggingItemIndex, setDraggingItemIndex] = useState<number | null>(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);

  // Update section order when base sections change
  useEffect(() => {
    const newIds = basePanelSections.map((s: PanelSectionItem) => s.id);
    setSectionOrder(prevOrder => {
      const validIds = prevOrder.filter((id: string) => newIds.includes(id));
      const missingIds = newIds.filter(id => !validIds.includes(id));
      return [...validIds, ...missingIds];
    });
  }, [basePanelSections]);

  // Create ordered panel sections based on current order
  const panelSections = useMemo((): PanelSectionItem[] => {
    return sectionOrder.map((id: string) => basePanelSections.find((s: PanelSectionItem) => s.id === id)).filter(Boolean) as PanelSectionItem[];
  }, [basePanelSections, sectionOrder]);


  useEffect(() => {
    setOpenSections(prevOpenSections => {
      const newOpenSectionsState = { ...prevOpenSections };
      let hasChanges = false;

      panelSections.forEach((section: PanelSectionItem) => {
        if (section.id === 'overflow-settings-section') {
          if (newOpenSectionsState[section.id] !== overflowSettingsPanelOpen) {
            newOpenSectionsState[section.id] = overflowSettingsPanelOpen;
            hasChanges = true;
          }
        } else {
          if (newOpenSectionsState[section.id] === undefined) {
            newOpenSectionsState[section.id] = section.defaultOpen !== undefined ? section.defaultOpen : true;
            hasChanges = true;
          }
        }
      });

      const currentSectionIds = new Set(panelSections.map(s => s.id));
      for (const idInState in newOpenSectionsState) {
        if (!currentSectionIds.has(idInState)) {
          delete newOpenSectionsState[idInState];
          hasChanges = true;
        }
      }

      return hasChanges ? newOpenSectionsState : prevOpenSections;
    });
  }, [panelSections, overflowSettingsPanelOpen]);

  const toggleSectionOpen = (sectionId: string) => {
    if (sectionId === 'overflow-settings-section') {
      onToggleOverflowSettingsPanel();
    } else {
      setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
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

    setSectionOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const [draggedId] = newOrder.splice(draggingItemIndex, 1);
      newOrder.splice(targetIndex, 0, draggedId);
      return newOrder;
    });
    setDraggingItemIndex(null);
    setDragOverItemIndex(null);
  };

  const handleDragEnd = () => {
    setDraggingItemIndex(null);
    setDragOverItemIndex(null);
  };


  return (
    <div className="space-y-0">
      {panelSections.map((section: PanelSectionItem, index: number) => (
         <DraggableSectionWrapper
            key={section.id}
            onDragEnter={() => handleDragEnter(index)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(index)}
            isDragging={draggingItemIndex === index}
            isDragOver={dragOverItemIndex === index && draggingItemIndex !== null && draggingItemIndex !== index}
        >
          <Section
            title={section.title}
            isOpen={openSections[section.id] === undefined ? true : openSections[section.id]}
            onToggle={() => toggleSectionOpen(section.id)}
            id={section.id}
            onDragStartButton={(e) => handleDragStart(e, index)}
            onDragEndButton={handleDragEnd}
          >
            {section.content}
          </Section>
        </DraggableSectionWrapper>
      ))}
    </div>
  );
};

export default ControlsPanel;
