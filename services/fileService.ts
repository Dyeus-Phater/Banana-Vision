
import { DEFAULT_SETTINGS, DEFAULT_GITHUB_SETTINGS } from '../constants';
import type { AppSettings, GitHubSettings, ImageTag } from '../types';

export const exportSettingsAsJson = (settings: AppSettings, gitHubSettings: GitHubSettings, fileName: string): void => {
  const exportData = {
    appSettings: settings,
    gitHubSettings: gitHubSettings,
  };
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importSettingsFromJson = (file: File): Promise<{ appSettings: AppSettings; gitHubSettings: GitHubSettings }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const parsedJson = JSON.parse(jsonString);

        let importedAppSettings: Partial<AppSettings>;
        let importedGitHubSettings: Partial<GitHubSettings>;

        // Check if the parsed JSON has the new structure or is an old AppSettings object
        if (parsedJson.appSettings !== undefined || parsedJson.gitHubSettings !== undefined) {
          // New structure: { appSettings: {}, gitHubSettings: {} }
          importedAppSettings = parsedJson.appSettings || {};
          importedGitHubSettings = parsedJson.gitHubSettings || {};
        } else {
          // Old structure: The root object is AppSettings itself
          // And no gitHubSettings were exported with it.
          importedAppSettings = parsedJson;
          importedGitHubSettings = {}; // Default to empty if old format
        }
        
        const validatedAppSettings: AppSettings = {
          ...DEFAULT_SETTINGS, 
          ...importedAppSettings, 
          systemFont: { 
            ...DEFAULT_SETTINGS.systemFont,
            ...(importedAppSettings.systemFont || {}),
          },
          shadowEffect: {
            ...DEFAULT_SETTINGS.shadowEffect,
            ...(importedAppSettings.shadowEffect || {}),
          },
          outlineEffect: {
            ...DEFAULT_SETTINGS.outlineEffect,
            ...(importedAppSettings.outlineEffect || {}),
          },
          bitmapFont: {
             ...DEFAULT_SETTINGS.bitmapFont,
            ...(importedAppSettings.bitmapFont || {}),
          },
          transform: {
            ...DEFAULT_SETTINGS.transform,
            ...(importedAppSettings.transform || {}),
          },
          pixelOverflowMargins: {
            ...DEFAULT_SETTINGS.pixelOverflowMargins,
            ...(importedAppSettings.pixelOverflowMargins || {}),
          },
          customColorTags: Array.isArray(importedAppSettings.customColorTags) 
            ? importedAppSettings.customColorTags 
            : DEFAULT_SETTINGS.customColorTags,
          imageTags: Array.isArray(importedAppSettings.imageTags)
            ? importedAppSettings.imageTags.map((tag: any): ImageTag => ({
                id: typeof tag.id === 'string' ? tag.id : `imgtag-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
                tag: typeof tag.tag === 'string' ? tag.tag : '[IMG]',
                imageUrl: typeof tag.imageUrl === 'string' ? tag.imageUrl : '',
                width: typeof tag.width === 'number' && tag.width > 0 ? tag.width : 16,
                height: typeof tag.height === 'number' && tag.height > 0 ? tag.height : 16,
                enabled: typeof tag.enabled === 'boolean' ? tag.enabled : true,
            })).filter(tag => tag.imageUrl)
            : DEFAULT_SETTINGS.imageTags,
          showSecondaryBackgroundImage: typeof importedAppSettings.showSecondaryBackgroundImage === 'boolean' 
              ? importedAppSettings.showSecondaryBackgroundImage 
              : DEFAULT_SETTINGS.showSecondaryBackgroundImage,
          comparisonModeEnabled: typeof importedAppSettings.comparisonModeEnabled === 'boolean'
              ? importedAppSettings.comparisonModeEnabled
              : DEFAULT_SETTINGS.comparisonModeEnabled,
        };

        const validatedGitHubSettings: GitHubSettings = {
          ...DEFAULT_GITHUB_SETTINGS,
          ...importedGitHubSettings,
        };
            
        resolve({ appSettings: validatedAppSettings, gitHubSettings: validatedGitHubSettings });
      } catch (error) {
        console.error("Error parsing JSON settings:", error);
        reject(new Error('Invalid JSON file or format.'));
      }
    };
    reader.onerror = (error) => {
      reject(new Error('Error reading file.'));
    };
    reader.readAsText(file);
  });
};
