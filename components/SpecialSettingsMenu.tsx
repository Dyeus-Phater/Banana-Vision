
import React from 'react';
import { ThemeKey, CustomThemeColors, AppThemeSettings, ResolvedThemeColors } from '../types';
import { LabelInputContainer, TextInput, Button } from './ControlsPanel'; // Re-use styled components

interface SpecialSettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  appThemeSettings: AppThemeSettings;
  onThemeSettingsChange: (newSettings: Partial<AppThemeSettings>) => void;
  onCustomColorChange: (colorName: keyof CustomThemeColors, value: string) => void;
  onSaveCustomTheme: () => void;
  onResetCustomTheme: () => void;
  allThemeDefinitions: Record<Exclude<ThemeKey, 'custom'>, ResolvedThemeColors>;
}

// Updated QR code with the one provided by the user
const LN_QR_CODE_IMAGE_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAABQCAMAAACj6pYAAAAAUVBMVEVHcEzvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDPvKDP////3oF2XAAAAF3RSTlMAESIzVGaImZmqqrvM3e7///////8NnQClAAAFhElEQVR42uzZDXeiMBCGYVCFKyKCgIh77f//2WoZmZMGZ2Y2Wl/P86CK56kMzKTnMhY7h/P7PZfL+cpDItzI7yvP6P9Rj4l0t8/gIuWlSg0gEocPYLgyYkXKgC4kMvQIdvPAnJLxYYEfGkQDsjtwYETKjQG5hCBk7sCBEyo1LpD+DULK3IEBI0zqp8CqQ/hJMnJuAIKMEuUEyE8hSIkzcG5AgKME2K8hSHUjV5yZcyBBFgnhQhJ0k9DkDsP5GBCQJ8gIEzKfYGjOwbgwIEBOgQhZ2TcoUvYGSvUGBHzIExYysj9QpPIHSPUGBIAMQRR2yP5AkXIPSHMGBFzIEUQGIPUEid7AKd+AAGUggmwA1F+S6CMgnxYQoCRAFBkg9SJGdg9OeQwISBMkCKbjMHYJ4Y4gACjFHiDC2v2BEMoZkPqAgAZBFEC2vwMkegMlegMivUFkvUFkvUFAgCBFEMDa/wES/QGS/AGTegMkvUFk/QEBQIYgicT6BYgY7SAyKSAgQZAIosT6BYiY7SAyKSAgQJAEIs36BYj47SAPKRAQECRBZLN+ASJ+O8hLCkQAChJBNuuPIPHPQJL7AgIQBBkg1p8DJHoDIr1BRHqDyHqDCAAEEVlfIJH6BCJ9BRH7BQQgSCKzPkEig0Fk0kFAgCCJyPoEEhkMRCYNBADBZGSdyGI0BpHpBAIQIRmZpzIZzQEyGQQECBKRjM5TFZkPMBkMBAgQkYzQUxWZDzAZDAQIEJGM4FMVmQ8wGQwECAgQkQx8yqL4f4DJEAGCBASJCHxK0g8w+QRBEgRIQJCIwE8Z/QEm/wJBEgQIYBAsieDPEf0FEgUgSAJBAggQkTg+T8gPEPkEERIECECE4vE5If+AyCcgSIQAAQIidk/kRwg8g0gQIECAiN0TeSPCDyCSBAgQIGL3hL5E8INIEiBAgIjBE/kRwgcQSYIAAQIihk/kTwh/AJEmQIAAEYMn8kOEMyBxAggQICKhT8R7CB9AZBkQIEBEoU/EuwgfQOYZECAgQkShT6S5CR9AZRkQICJCiaBPEuEQPoDOEiBAQIREoU8k8QiHQN4JECBAQCSInhKJQygQ8gYQIECACEQnifQEIXcECBAgIBJuT0R7CMUjIECAAIHg9kRsB8VjIECAAIGg7wOyHBT7BAQIECBAkP0BshwU+wQECBAgQJDNAbIcFPcECBAgQECyBBzVzEFRnQQIECBAQLIEHNXMh2gVEiBAgACBDDhrHhzV8gN0gAABAgQIEMBpcNQyF0N0BggQIECAAAHOGseI7iBIECAgQIAAAZy2D9EuIECAAAECBGQ7CFIEAgQIECBAQNkOJIIECBAgQECxHSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQICPYdIJEAAQIECAj2HSCRAAECBAgI9h0gkQABAgQI/AfQnZ4qV1jQkAAAAASUVORK5CYII=";
const GITHUB_REPO_URL = "https://github.com/Dyeus-Phater/Banana-Vision";
const LIGHTNING_ADDRESS = "tamerichard76@walletofsatoshi.com";

const SpecialSettingsMenu: React.FC<SpecialSettingsMenuProps> = ({
  isOpen,
  onClose,
  appThemeSettings,
  onThemeSettingsChange,
  onCustomColorChange,
  onSaveCustomTheme,
  onResetCustomTheme,
  allThemeDefinitions
}) => {
  if (!isOpen) return null;

  const { activeThemeKey, customColors } = appThemeSettings;

  const handleThemeKeyChange = (key: ThemeKey) => {
    onThemeSettingsChange({ activeThemeKey: key });
  };

  const customizableColorFields: Array<{ key: keyof CustomThemeColors; label: string }> = [
    { key: 'pageBackground', label: 'Page Background' },
    { key: 'elementBackground', label: 'Element Background (Cards, Main)' },
    { key: 'elementBackgroundSecondary', label: 'Secondary Element Background (Panels)' },
    { key: 'textPrimary', label: 'Primary Text' },
    { key: 'textSecondary', label: 'Secondary Text' },
    { key: 'accentPrimary', label: 'Primary Accent' },
    { key: 'accentPrimaryContent', label: 'Text on Primary Accent' },
    { key: 'accentSecondary', label: 'Secondary Accent' },
    { key: 'accentSecondaryContent', label: 'Text on Secondary Accent' },
    { key: 'borderColor', label: 'Border Color' },
    { key: 'borderColorLight', label: 'Light Border/Divider' },
    { key: 'toolbarBackground', label: 'Toolbar Background' },
    { key: 'toolbarText', label: 'Toolbar Text' },
    { key: 'inputBackground', label: 'Input Background' },
    { key: 'inputText', label: 'Input Text' },
    { key: 'inputBorder', label: 'Input Border' },
    { key: 'inputFocusRing', label: 'Input Focus Ring' },
    { key: 'scrollbarTrack', label: 'Scrollbar Track' },
    { key: 'scrollbarThumb', label: 'Scrollbar Thumb' },
    { key: 'scrollbarThumbHover', label: 'Scrollbar Thumb Hover' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="special-settings-title"
    >
      <div 
        className="bg-[var(--bv-modal-background,var(--bv-element-background))] text-[var(--bv-modal-text,var(--bv-text-primary))] 
                   rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="special-settings-title" className="text-2xl font-bold text-[var(--bv-accent-primary)]">Special Settings</h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-[var(--bv-element-background-secondary)]"
            aria-label="Close Special Settings Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Theme Customization Section */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-4 border-b border-[var(--bv-border-color-light)] pb-2">Theme Customization</h3>
          
          <div className="mb-4">
            <LabelInputContainer label="Active Theme">
              <div className="flex flex-wrap gap-2 mt-1">
                {(Object.keys(allThemeDefinitions) as Array<Exclude<ThemeKey, 'custom'>>).map((key) => (
                  <Button 
                    key={key} 
                    onClick={() => handleThemeKeyChange(key)}
                    className={`${activeThemeKey === key ? '!bg-[var(--bv-accent-primary)] !text-[var(--bv-accent-primary-content)]' : 'bg-[var(--bv-element-background-secondary)] text-[var(--bv-text-primary)] border border-[var(--bv-border-color)] hover:bg-[var(--bv-element-background)]'}`}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Button>
                ))}
                <Button 
                  onClick={() => handleThemeKeyChange('custom')}
                  className={`${activeThemeKey === 'custom' ? '!bg-[var(--bv-accent-primary)] !text-[var(--bv-accent-primary-content)]' : 'bg-[var(--bv-element-background-secondary)] text-[var(--bv-text-primary)] border border-[var(--bv-border-color)] hover:bg-[var(--bv-element-background)]'}`}
                >
                  Custom
                </Button>
              </div>
            </LabelInputContainer>
          </div>

          {activeThemeKey === 'custom' && (
            <div className="space-y-3 p-3 border border-[var(--bv-border-color-light)] rounded-md bg-[var(--bv-element-background)]">
              <h4 className="text-lg font-medium mb-2">Customize Colors:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {customizableColorFields.map(({ key, label }) => (
                  <LabelInputContainer key={key} label={label} htmlFor={`custom-color-${key}`} inline>
                    <input
                      type="color"
                      id={`custom-color-${key}`}
                      value={customColors[key] || ''} // Handle potentially undefined optional colors
                      onChange={(e) => onCustomColorChange(key, e.target.value)}
                      className="h-8 w-14 rounded border border-[var(--bv-input-border)] p-0.5 bg-[var(--bv-input-background)]"
                    />
                  </LabelInputContainer>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <Button onClick={onSaveCustomTheme} className="flex-1">Save Custom Theme</Button>
                <Button onClick={onResetCustomTheme} className="flex-1 !bg-[var(--bv-accent-secondary)] !text-[var(--bv-accent-secondary-content)]">Reset Custom Colors</Button>
              </div>
            </div>
          )}
        </section>

        {/* About Section */}
        <section>
          <h3 className="text-xl font-semibold mb-4 border-b border-[var(--bv-border-color-light)] pb-2">About Banana Vision</h3>
          <div className="space-y-3 text-sm">
            <p>
              Banana Vision is a Romhacking Text Preview Tool designed to help visualize text with various font and styling options.
            </p>
            <p>
              <span className="font-medium">GitHub Repository:</span>{' '}
              <a 
                href={GITHUB_REPO_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[var(--bv-accent-primary)] hover:underline"
              >
                {GITHUB_REPO_URL}
              </a>
            </p>
            <div>
              <p className="font-medium mb-1">Support the Project (Bitcoin Lightning):</p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <img 
                  src={LN_QR_CODE_IMAGE_DATA_URI} 
                  alt="Bitcoin Lightning QR Code" 
                  className="w-32 h-32 border border-[var(--bv-border-color)] rounded bg-white object-contain" 
                />
                <div className="text-xs break-all">
                  <p className="mb-1">Scan the QR code or use the address below:</p>
                  <code className="bg-[var(--bv-element-background-secondary)] p-1 rounded block">{LIGHTNING_ADDRESS}</code>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SpecialSettingsMenu;
