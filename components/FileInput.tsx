

import React, { useRef } from 'react';

interface FileInputProps {
  onChange: (files: FileList | null) => void; // Allow null for cancellation
  accept?: string;
  buttonLabel?: string;
  buttonClassName?: string;
  multiple?: boolean;
  id?: string; // For label association
  inputRef?: React.RefObject<HTMLInputElement>; // For programmatic click
}

const FileInput: React.FC<FileInputProps> = ({ 
  onChange, 
  accept, 
  buttonLabel = "Upload File", 
  buttonClassName,
  multiple = false,
  id,
  inputRef: externalInputRef
}) => {
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || internalInputRef;


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onChange(files);
    } else {
      onChange(null); // Pass null if no files selected (e.g., user cancelled dialog)
    }
    // Reset input value to allow selecting the same file again if needed
    if (inputRef.current) {
      inputRef.current.value = ""; 
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
        id={id}
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
