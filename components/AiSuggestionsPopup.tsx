
import React, { useState, useEffect } from 'react';
import { Button, LabelInputContainer, TextInput, TextAreaInput } from './ControlsPanel'; // Re-use styled components

type AiOperationType = 'translate' | 'variations' | 'tone';

interface AiSuggestionsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  targetText: string;
  onApplySuggestion: (suggestion: string) => void;
  isLoading: boolean;
  error: string | null;
  suggestions: string[] | string | null; // For variations (array) or translate/tone (string)
  onTranslate: (text: string) => Promise<void>;
  onSuggestVariations: (text: string) => Promise<void>;
  onCheckTone: (text: string, desiredTone?: string) => Promise<void>;
}

const AiSuggestionsPopup: React.FC<AiSuggestionsPopupProps> = ({
  isOpen,
  onClose,
  targetText,
  onApplySuggestion,
  isLoading,
  error,
  suggestions,
  onTranslate,
  onSuggestVariations,
  onCheckTone,
}) => {
  const [currentOperation, setCurrentOperation] = useState<AiOperationType | null>(null);
  const [desiredTone, setDesiredTone] = useState<string>('');
  const [processedSuggestions, setProcessedSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Reset state when popup opens
      setCurrentOperation(null);
      setDesiredTone('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (suggestions) {
      if (Array.isArray(suggestions)) {
        setProcessedSuggestions(suggestions);
      } else if (typeof suggestions === 'string') {
        // Attempt to parse if it's a JSON string representing an array (e.g., from variations)
        try {
          const parsed = JSON.parse(suggestions);
          if (Array.isArray(parsed)) {
            setProcessedSuggestions(parsed.map(String)); // Ensure elements are strings
            return;
          }
        } catch (e) {
          // Not a JSON array, treat as single string suggestion or descriptive text
        }
        setProcessedSuggestions([suggestions]);
      } else {
        setProcessedSuggestions([]);
      }
    } else {
      setProcessedSuggestions([]);
    }
  }, [suggestions]);


  const handleOperation = (opType: AiOperationType) => {
    setCurrentOperation(opType);
    if (opType === 'translate') onTranslate(targetText);
    if (opType === 'variations') onSuggestVariations(targetText);
    if (opType === 'tone') {
      // For tone, we might wait for user to input desiredTone, or allow check without it
      // For now, let's trigger it, and if desiredTone is empty, the API call should handle it
      onCheckTone(targetText, desiredTone);
    }
  };
  
  const handleToneCheckWithInput = () => {
    if (currentOperation === 'tone') {
      onCheckTone(targetText, desiredTone);
    }
  };

  const handleCopyToClipboard = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      alert('Suggestion copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy suggestion.');
    }
  };


  if (!isOpen) return null;

  const renderSuggestions = () => {
    if (!currentOperation) return null;
    if (isLoading) return <p className="text-center p-4">✨ Thinking... Please wait.</p>;
    if (error) return <p className="text-center p-4 text-red-500">Error: {error}</p>;
    if (!processedSuggestions || processedSuggestions.length === 0) return <p className="text-center p-4">No suggestions available at the moment.</p>;

    if (currentOperation === 'translate') {
      return (
        <div className="space-y-2">
          <h4 className="font-semibold text-[var(--bv-text-primary)]">Translation:</h4>
          <TextAreaInput value={processedSuggestions[0]} readOnly rows={4} className="bg-[var(--bv-element-background)]" />
          <div className="flex gap-2">
            <Button onClick={() => onApplySuggestion(processedSuggestions[0])} className="flex-1">Apply Translation</Button>
            <Button onClick={() => handleCopyToClipboard(processedSuggestions[0])} className="flex-1 !bg-gray-500 hover:!bg-gray-600">Copy</Button>
          </div>
        </div>
      );
    }

    if (currentOperation === 'variations') {
      return (
        <div className="space-y-3">
          <h4 className="font-semibold text-[var(--bv-text-primary)]">Suggested Variations:</h4>
          {processedSuggestions.map((suggestion, index) => (
            <div key={index} className="p-2 border border-[var(--bv-border-color-light)] rounded bg-[var(--bv-element-background)]">
              <p className="text-sm mb-1 whitespace-pre-wrap">{suggestion}</p>
              <div className="flex gap-2">
                <Button onClick={() => onApplySuggestion(suggestion)} className="flex-1 text-xs !py-1">Apply this variation</Button>
                <Button onClick={() => handleCopyToClipboard(suggestion)} className="flex-1 !bg-gray-500 hover:!bg-gray-600 text-xs !py-1">Copy</Button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (currentOperation === 'tone') {
      return (
        <div className="space-y-2">
          <h4 className="font-semibold text-[var(--bv-text-primary)]">Tone Analysis:</h4>
          <TextAreaInput value={processedSuggestions[0]} readOnly rows={6} className="bg-[var(--bv-element-background)] whitespace-pre-wrap" />
           <Button onClick={() => handleCopyToClipboard(processedSuggestions[0])} className="w-full !bg-gray-500 hover:!bg-gray-600">Copy Analysis</Button>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-popup-title"
    >
      <div
        className="bg-[var(--bv-modal-background,var(--bv-element-background))] text-[var(--bv-modal-text,var(--bv-text-primary))]
                   rounded-lg shadow-2xl p-6 w-full max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="ai-popup-title" className="text-xl font-bold text-[var(--bv-accent-primary)]">✨ AI Text Assistant</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--bv-element-background-secondary)] text-[var(--bv-text-secondary)]"
            aria-label="Close AI Assistant"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-[var(--bv-text-secondary)] mb-1">Original Text:</p>
          <TextAreaInput value={targetText} readOnly rows={3} className="bg-[var(--bv-element-background)] opacity-70" />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <Button onClick={() => handleOperation('translate')} className={currentOperation === 'translate' ? '!opacity-100' : 'opacity-80'}>Translate</Button>
          <Button onClick={() => handleOperation('variations')} className={currentOperation === 'variations' ? '!opacity-100' : 'opacity-80'}>Variations</Button>
          <Button onClick={() => { setCurrentOperation('tone'); onCheckTone(targetText, desiredTone); }} className={currentOperation === 'tone' ? '!opacity-100' : 'opacity-80'}>Check Tone</Button>
        </div>

        {currentOperation === 'tone' && (
          <div className="mb-4 p-3 border border-[var(--bv-border-color-light)] rounded-md bg-[var(--bv-element-background)]">
            <LabelInputContainer label="Optional: Desired Tone (e.g., formal, friendly, urgent)" htmlFor="desiredToneInput">
              <TextInput
                id="desiredToneInput"
                value={desiredTone}
                onChange={(e) => setDesiredTone(e.target.value)}
                placeholder="Enter desired tone"
              />
            </LabelInputContainer>
            <Button onClick={handleToneCheckWithInput} className="w-full mt-2" disabled={isLoading}>
              {isLoading ? 'Checking...' : 'Re-check Tone with Input'}
            </Button>
          </div>
        )}

        <div className="flex-grow overflow-y-auto pr-1 mb-4 min-h-[100px]">
          {renderSuggestions()}
        </div>

        <Button onClick={onClose} className="w-full !bg-gray-600 hover:!bg-gray-700">
          Close
        </Button>
      </div>
    </div>
  );
};

export default AiSuggestionsPopup;
