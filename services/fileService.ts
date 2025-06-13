

import { DEFAULT_SETTINGS } from '../constants';
import type { AppSettings } from '../types'; 

export const exportSettingsAsJson = (settings: AppSettings, fileName: string): void => {
  const jsonString = JSON.stringify(settings, null, 2);
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

export const importSettingsFromJson = (file: File): Promise<AppSettings> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const parsedSettings = JSON.parse(jsonString);
        
        const validatedSettings: AppSettings = {
          ...DEFAULT_SETTINGS, 
          ...parsedSettings, 
          systemFont: { 
            ...DEFAULT_SETTINGS.systemFont,
            ...(parsedSettings.systemFont || {}),
          },
          shadowEffect: {
            ...DEFAULT_SETTINGS.shadowEffect,
            ...(parsedSettings.shadowEffect || {}),
          },
          outlineEffect: {
            ...DEFAULT_SETTINGS.outlineEffect,
            ...(parsedSettings.outlineEffect || {}),
          },
          bitmapFont: {
             ...DEFAULT_SETTINGS.bitmapFont,
            ...(parsedSettings.bitmapFont || {}),
          },
          transform: {
            ...DEFAULT_SETTINGS.transform,
            ...(parsedSettings.transform || {}),
          },
          pixelOverflowMargins: {
            ...DEFAULT_SETTINGS.pixelOverflowMargins,
            ...(parsedSettings.pixelOverflowMargins || {}),
          },
          customColorTags: Array.isArray(parsedSettings.customColorTags) 
            ? parsedSettings.customColorTags 
            : DEFAULT_SETTINGS.customColorTags,
          // Ensure boolean fields that might be missing are defaulted
          showSecondaryBackgroundImage: typeof parsedSettings.showSecondaryBackgroundImage === 'boolean' 
              ? parsedSettings.showSecondaryBackgroundImage 
              : DEFAULT_SETTINGS.showSecondaryBackgroundImage,
          comparisonModeEnabled: typeof parsedSettings.comparisonModeEnabled === 'boolean'
              ? parsedSettings.comparisonModeEnabled
              : DEFAULT_SETTINGS.comparisonModeEnabled,
        };
            
        resolve(validatedSettings);
      } catch (error) {
        reject(new Error('Invalid JSON file or format.'));
      }
    };
    reader.onerror = (error) => {
      reject(new Error('Error reading file.'));
    };
    reader.readAsText(file);
  });
};