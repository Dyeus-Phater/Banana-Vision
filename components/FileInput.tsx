
import React, { useRef } from 'react';

interface FileInputProps {
  onChange: (files: FileList) => void;
  accept?: string;
  buttonLabel?: string;
  buttonClassName?: string;
  multiple?: boolean;
}

const FileInput: React.FC<FileInputProps> = ({ 
  onChange, 
  accept, 
  buttonLabel = "Upload File", 
  buttonClassName,
  multiple = false 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onChange(files);
      if (inputRef.current) {
        inputRef.current.value = ""; 
      }
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  // Default button styling using CSS variables if no custom class is provided
  const defaultButtonClass = `px-3 py-1.5 border border-[var(--bv-input-border)] rounded-md shadow-sm 
                            text-sm font-medium text-[var(--bv-input-text)] 
                            bg-[var(--bv-input-background)] hover:opacity-80
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--bv-input-focus-ring)]`;

  return (
    <>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
        multiple={multiple}
      />
      <button
        type="button"
        onClick={handleClick}
        className={buttonClassName || defaultButtonClass}
      >
        {buttonLabel}
      </button>
    </>
  );
};

export default FileInput;
