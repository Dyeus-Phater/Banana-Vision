

import type { ThemeKey, CustomThemeColors, AppThemeSettings, ResolvedThemeColors } from '../types'; // Adjust path as needed
import { DEFAULT_BANANA_THEME_COLORS, DEFAULT_CUSTOM_THEME_TEMPLATE, ALL_THEME_DEFINITIONS } from '../constants'; // Adjust path as needed

const THEME_SETTINGS_STORAGE_KEY = 'bananaVision_themeSettings';

const DEFAULT_APP_THEME_SETTINGS: AppThemeSettings = {
  activeThemeKey: 'banana',
  customColors: DEFAULT_CUSTOM_THEME_TEMPLATE,
};

export const loadThemeSettings = (): AppThemeSettings => {
  try {
    const storedSettings = localStorage.getItem(THEME_SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings) as Partial<AppThemeSettings>;
      // Ensure all parts of CustomThemeColors are present, merging with default custom
      const completeCustomColors: CustomThemeColors = {
        ...DEFAULT_CUSTOM_THEME_TEMPLATE,
        ...(parsed.customColors || {}),
      };
      return {
        activeThemeKey: parsed.activeThemeKey || DEFAULT_APP_THEME_SETTINGS.activeThemeKey,
        customColors: completeCustomColors,
      };
    }
    return { ...DEFAULT_APP_THEME_SETTINGS, customColors: { ...DEFAULT_CUSTOM_THEME_TEMPLATE } };
  } catch (error) {
    console.error("Error loading theme settings from localStorage:", error);
    return { ...DEFAULT_APP_THEME_SETTINGS, customColors: { ...DEFAULT_CUSTOM_THEME_TEMPLATE } };
  }
};

export const saveThemeSettings = (settings: AppThemeSettings): void => {
  try {
    const settingsToSave: AppThemeSettings = {
      ...settings,
      customColors: { ...settings.customColors } // Ensure it's a fresh copy
    };
    localStorage.setItem(THEME_SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
  } catch (error) {
    console.error("Error saving theme settings to localStorage:", error);
  }
};

export const getResolvedThemeColors = (
  activeThemeKey: ThemeKey,
  customColors: CustomThemeColors
): ResolvedThemeColors => {
  if (activeThemeKey === 'custom') {
    return customColors;
  }
  return ALL_THEME_DEFINITIONS[activeThemeKey] || DEFAULT_BANANA_THEME_COLORS;
};