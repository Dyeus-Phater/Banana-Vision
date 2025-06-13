
import { AppSettings, Profile } from '../types';

const PROFILES_STORAGE_KEY = 'bananaVision_profiles';

export const getProfiles = (): Profile[] => {
  try {
    const storedProfiles = localStorage.getItem(PROFILES_STORAGE_KEY);
    return storedProfiles ? JSON.parse(storedProfiles) : [];
  } catch (error) {
    console.error("Error loading profiles from localStorage:", error);
    return [];
  }
};

export const saveProfile = (name: string, settingsToSave: AppSettings): Profile[] => {
  if (!name.trim()) {
    throw new Error("Profile name cannot be empty.");
  }
  const profiles = getProfiles();
  const newProfile: Profile = {
    id: `profile-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name: name.trim(),
    coverImageUrl: settingsToSave.backgroundImageUrl,
    settings: { ...settingsToSave }, // Deep copy settings
  };

  const updatedProfiles = [...profiles, newProfile];
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updatedProfiles));
    return updatedProfiles;
  } catch (error) {
    console.error("Error saving profile to localStorage:", error);
    throw error; // Re-throw to be handled by caller
  }
};

export const deleteProfile = (profileId: string): Profile[] => {
  let profiles = getProfiles();
  profiles = profiles.filter(p => p.id !== profileId);
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    return profiles;
  } catch (error) {
    console.error("Error deleting profile from localStorage:", error);
    throw error;
  }
};

export const getProfileById = (profileId: string): Profile | undefined => {
  const profiles = getProfiles();
  return profiles.find(p => p.id === profileId);
};
