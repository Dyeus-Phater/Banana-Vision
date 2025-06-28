
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
  disabled?: boolean;
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
  disabled = false,
}) => {
  const handleValueChange = (rawValue: string) => {
    if (disabled) return;

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
  const labelClasses = `block text-sm font-medium text-[var(--bv-text-primary)] mb-1 ${disabled ? 'cursor-not-allowed' : ''}`;
  const numberInputClasses = `block w-24 px-2 py-1 border border-[var(--bv-input-border)] rounded-md shadow-sm 
                            focus:outline-none focus:ring-[var(--bv-input-focus-ring)] focus:border-[var(--bv-input-focus-ring)] 
                            sm:text-sm bg-[var(--bv-input-background)] text-[var(--bv-input-text)] 
                            ${disabled ? 'cursor-not-allowed bg-opacity-70' : ''}`;
  const rangeInputClasses = `w-full h-2 rounded-lg appearance-none custom-styled slider-thumb 
                           bg-[var(--bv-border-color-light,var(--bv-input-border))]
                           ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`;
  const subTextClasses = `text-xs text-[var(--bv-text-secondary)] mt-0.5 ${disabled ? 'cursor-not-allowed' : ''}`;

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
          id={`${id}-slider`}
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