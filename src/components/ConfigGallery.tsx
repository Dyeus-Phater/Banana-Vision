
import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PreviewSettings } from '@/types/preview';
import default1 from '../data/gallery-configs/default1.json';
import default2 from '../data/gallery-configs/default2.json';
import nine_text_box_style from '../data/gallery-configs/nine_text_box_style.json';
import fragile_box from '../data/gallery-configs/fragile_box.json';

interface ConfigPreset {
  name: string;
  description: string;
  thumbnail: string;
  settings: PreviewSettings;
}

interface ConfigGalleryProps {
  onSelectConfig: (settings: PreviewSettings) => void;
  settings: PreviewSettings;
  onSettingsChange: (settings: PreviewSettings) => void;
}

const presets: ConfigPreset[] = [
  default1 as ConfigPreset,
  default2 as ConfigPreset,
  nine_text_box_style as ConfigPreset,
  fragile_box as ConfigPreset,
];

const ConfigGallery: React.FC<ConfigGalleryProps> = ({ onSelectConfig, settings, onSettingsChange }) => {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Style Presets</h2>
        <Button 
          variant="outline" 
          onClick={() => onSettingsChange({ ...settings, isPresetsMinimized: !settings.isPresetsMinimized })}
          className="text-sm"
        >
          {settings.isPresetsMinimized ? "Expand" : "Minimize"}
        </Button>
      </div>

      <div className={`transition-all duration-300 ${settings.isPresetsMinimized ? 'hidden' : ''}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {presets.map((preset, index) => (
            <Card key={index} className="p-4 flex flex-col gap-2">
              {preset.thumbnail && (
                <div className="relative aspect-video overflow-hidden rounded-md">
                  <img
                    src={preset.thumbnail}
                    alt={preset.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h3 className="font-semibold">{preset.name}</h3>
              <p className="text-sm text-gray-500">{preset.description}</p>
              <Button 
                onClick={() => onSelectConfig(preset.settings)}
                className="mt-2"
              >
                Use This Style
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default ConfigGallery;
