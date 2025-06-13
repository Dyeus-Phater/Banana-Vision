
import React, { useState } from 'react';
import { AppSettings, Profile, ThemeKey } from '../types';
import { LabelInputContainer, TextInput, Button } from './ControlsPanel'; 

interface ProfilesGalleryPageProps {
  profiles: Profile[];
  onLoadProfile: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
  activeThemeKey: ThemeKey;
  currentEditorSettings: AppSettings;
  onSaveCurrentSettingsAsProfile: (profileName: string, settingsToSave: AppSettings) => void;
}

const ProfilesGalleryPage: React.FC<ProfilesGalleryPageProps> = ({
  profiles,
  onLoadProfile,
  onDeleteProfile,
  activeThemeKey,
  currentEditorSettings,
  onSaveCurrentSettingsAsProfile,
}) => {
  const [newProfileNameInput, setNewProfileNameInput] = useState<string>("");

  const handleDelete = (profileId: string, profileName: string) => {
    if (window.confirm(`Are you sure you want to delete the profile "${profileName}"? This action cannot be undone.`)) {
      onDeleteProfile(profileId);
    }
  };

  const handleSaveCurrentProfile = () => {
    if (!newProfileNameInput.trim()) {
      alert("Please enter a name for the profile.");
      return;
    }
    onSaveCurrentSettingsAsProfile(newProfileNameInput, currentEditorSettings);
    setNewProfileNameInput(""); 
  };
  
  // Dynamic classes based on CSS variables are preferred now.
  // These direct Tailwind classes are mostly fallbacks or structure.
  const cardBaseBg = 'bg-[var(--bv-element-background-secondary)]';
  const cardBorder = 'border-[var(--bv-border-color)]';
  const textColor = 'text-[var(--bv-text-primary)]';
  const nameColor = 'text-[var(--bv-text-primary)]'; // Title color, usually primary
  
  const placeholderBg = 'bg-[var(--bv-element-background)]';
  const placeholderText = 'text-[var(--bv-text-secondary)]';

  const sectionBg = 'bg-[var(--bv-element-background-secondary)]'; 
  const sectionBorder = 'border-[var(--bv-border-color)]';


  return (
    <div className={`w-full h-full p-4 md:p-6 ${textColor} flex flex-col`}>
      <h2 className={`text-2xl md:text-3xl font-bold mb-6 text-center text-[var(--bv-accent-primary)]`}>
        Profiles Gallery
      </h2>

      <div className={`mb-8 p-4 border ${sectionBorder} rounded-lg ${sectionBg} shadow-md`}>
        <h3 className={`text-xl font-semibold mb-3 ${nameColor}`}>Save Current Editor Settings</h3>
        <LabelInputContainer label="New Profile Name" htmlFor="galleryNewProfileNameInput">
          <TextInput
            id="galleryNewProfileNameInput"
            type="text"
            value={newProfileNameInput}
            onChange={(e) => setNewProfileNameInput(e.target.value)}
            placeholder="Enter a name for this profile"
            className="w-full"
          />
        </LabelInputContainer>
        <Button
          onClick={handleSaveCurrentProfile}
          disabled={!newProfileNameInput.trim()}
          className="w-full mt-3 py-2"
        >
          Save Current Editor Settings as Profile
        </Button>
      </div>
      
      {profiles.length === 0 ? (
        <p className="text-center text-lg italic mt-4">
          No profiles saved yet. Use the section above to save the current editor settings.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 flex-grow overflow-y-auto pr-2">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`profile-card rounded-lg shadow-lg border ${cardBorder} ${cardBaseBg} transition-all duration-200 ease-in-out transform hover:scale-105 flex flex-col overflow-hidden`}
              role="listitem"
              aria-labelledby={`profile-name-${profile.id}`}
            >
              <div className={`w-full h-40 ${placeholderBg} flex items-center justify-center overflow-hidden`}>
                {profile.coverImageUrl ? (
                  <img
                    src={profile.coverImageUrl}
                    alt={`${profile.name} cover`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 ${placeholderText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <h3 id={`profile-name-${profile.id}`} className={`text-lg font-semibold truncate mb-2 ${nameColor}`} title={profile.name}>
                  {profile.name}
                </h3>
                <div className="mt-auto space-y-2">
                  <button
                    onClick={() => onLoadProfile(profile.id)}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-colors
                                bg-[var(--bv-accent-primary)] text-[var(--bv-accent-primary-content)] hover:opacity-80`}
                    aria-label={`Load profile ${profile.name}`}
                  >
                    Load Profile
                  </button>
                  <button
                    onClick={() => handleDelete(profile.id, profile.name)}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-colors
                                bg-red-500 hover:bg-red-600 text-white`}
                    aria-label={`Delete profile ${profile.name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfilesGalleryPage;
