import React, { useState, useEffect } from 'react';
import { Input } from "./input";
import { Label } from "./label";

interface ColorInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}

const ColorInput: React.FC<ColorInputProps> = ({
  label,
  value,
  onChange,
  className = "",
  id,
}) => {
  const [hexValue, setHexValue] = useState(value);

  // Update local state when the external value changes
  useEffect(() => {
    setHexValue(value);
  }, [value]);

  // Validate and update the hex value
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHexValue(newValue);
    
    // Only update the parent component if the hex is valid
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  // Handle color picker change
  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHexValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="flex gap-2">
        <Input
          type="color"
          value={value}
          onChange={handleColorPickerChange}
          className="w-12 h-10 p-1"
          id={id}
        />
        <Input
          type="text"
          value={hexValue}
          onChange={handleHexChange}
          placeholder="#RRGGBB"
          className="flex-1"
          pattern="^#[0-9A-Fa-f]{6}$"
          title="Enter a valid HEX color (e.g. #FF0000)"
        />
      </div>
    </div>
  );
};

export { ColorInput };