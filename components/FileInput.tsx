
import React, { useRef } from 'react';

interface FileInputProps {
  onChange: (files: FileList) => void; // Changed from File to FileList
  accept?: string;
  buttonLabel?: string;
  buttonClassName?: string;
  multiple?: boolean; // New prop
}

const FileInput: React.FC<FileInputProps> = ({ 
  onChange, 
  accept, 
  buttonLabel = "Upload File", 
  buttonClassName,
  multiple = false // Default to single file selection
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onChange(files); // Pass the whole FileList
      // Reset input value to allow uploading the same file(s) again
      if (inputRef.current) {
        inputRef.current.value = ""; 
      }
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
        multiple={multiple} // Use the new prop
      />
      <button
        type="button"
        onClick={handleClick}
        className={buttonClassName || "px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"}
      >
        {buttonLabel}
      </button>
    </>
  );
};

export default FileInput;