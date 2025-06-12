import React from 'react';

interface InputWithSliderProps {
  label: string;
  id: string;
  value: number;
  onChange: (newValue: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  className?: string;
  subText?: string;
  disabled?: boolean; // Added disabled prop
}

const InputWithSlider: React.FC<InputWithSliderProps> = ({
  label,
  id,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  className,
  subText,
  disabled = false, // Default to false
}) => {
  const handleValueChange = (rawValue: string) => {
    if (disabled) return; // Do nothing if disabled

    const isFloat = step % 1 !== 0 || String(step).includes('.');
    const numValue = isFloat ? parseFloat(rawValue) : parseInt(rawValue, 10);

    if (!isNaN(numValue)) {
      onChange(Math.max(min, Math.min(max, numValue)));
    } else if (rawValue === "" || rawValue === "-") {
       if (rawValue === "") onChange(min);
    }
  };
  
  const internalValue = isNaN(value) ? min : value;

  const containerClasses = `py-1 ${className || ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;
  const labelClasses = `block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${disabled ? 'cursor-not-allowed' : ''}`;
  const numberInputClasses = `block w-24 px-2 py-1 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm dark:bg-gray-800 dark:text-gray-200 ${disabled ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-700' : ''}`;
  const rangeInputClasses = `w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none custom-styled slider-thumb ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`;
  const subTextClasses = `text-xs text-gray-500 dark:text-gray-400 mt-0.5 ${disabled ? 'cursor-not-allowed' : ''}`;

  return (
    <div className={containerClasses}>
      <label htmlFor={id} className={labelClasses}>
        {label} {unit && <span className="text-xs">({unit})</span>}
      </label>
      <div className="flex items-center space-x-3">
        <input
          type="number"
          id={id}
          value={internalValue}
          onChange={(e) => handleValueChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className={numberInputClasses}
          disabled={disabled}
          aria-disabled={disabled}
        />
        <input
          type="range"
          aria-label={`${label} slider`}
          value={internalValue}
          onChange={(e) => handleValueChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className={rangeInputClasses}
          disabled={disabled}
          aria-disabled={disabled}
        />
      </div>
      {subText && <p className={subTextClasses}>{subText}</p>}
    </div>
  );
};

export default InputWithSlider;