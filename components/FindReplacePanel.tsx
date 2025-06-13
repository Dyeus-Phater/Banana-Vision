

import React from 'react';
import { LabelInputContainer, TextInput, SelectInput, Button } from './ControlsPanel'; 
import { FindScope, FindResultSummaryItem } from '../App';
import { ThemeKey } from '../types';

interface FindReplacePanelProps {
  findText: string;
  onFindTextChange: (text: string) => void;
  replaceText: string;
  onReplaceTextChange: (text: string) => void;
  isCaseSensitive: boolean;
  onIsCaseSensitiveChange: (value: boolean) => void;
  matchWholeWord: boolean;
  onMatchWholeWordChange: (value: boolean) => void;
  scope: FindScope;
  onScopeChange: (scope: FindScope) => void;
  onFindNext: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  resultsMessage: string;
  isCurrentBlockScopeDisabled: boolean;
  isFindReplaceDisabled: boolean;
  findResultSummary: FindResultSummaryItem[];
  onNavigateToFindResult: (item: FindResultSummaryItem) => void;
  activeThemeKey: ThemeKey; // Added for theming if needed, though CSS vars should handle most
}

const FindReplacePanel: React.FC<FindReplacePanelProps> = ({
  findText, onFindTextChange,
  replaceText, onReplaceTextChange,
  isCaseSensitive, onIsCaseSensitiveChange,
  matchWholeWord, onMatchWholeWordChange,
  scope, onScopeChange,
  onFindNext, onReplace, onReplaceAll,
  resultsMessage,
  isCurrentBlockScopeDisabled,
  isFindReplaceDisabled,
  findResultSummary,
  onNavigateToFindResult,
  activeThemeKey
}) => {
  return (
    <>
      <LabelInputContainer label="Find" htmlFor="find-text-input">
        <TextInput
          id="find-text-input"
          type="text"
          value={findText}
          onChange={(e) => onFindTextChange(e.target.value)}
          placeholder="Text to find"
          disabled={isFindReplaceDisabled}
          aria-disabled={isFindReplaceDisabled}
        />
      </LabelInputContainer>
      <LabelInputContainer label="Replace with" htmlFor="replace-text-input">
        <TextInput
          id="replace-text-input"
          type="text"
          value={replaceText}
          onChange={(e) => onReplaceTextChange(e.target.value)}
          placeholder="Replacement text"
          disabled={isFindReplaceDisabled}
          aria-disabled={isFindReplaceDisabled}
        />
      </LabelInputContainer>

      <div className="flex flex-row items-center gap-x-4 my-1">
        <LabelInputContainer label="Case sensitive" htmlFor="find-case-sensitive" inline>
          <input
            type="checkbox"
            id="find-case-sensitive"
            checked={isCaseSensitive}
            onChange={(e) => onIsCaseSensitiveChange(e.target.checked)}
            className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]"
            disabled={isFindReplaceDisabled}
            aria-disabled={isFindReplaceDisabled}
          />
        </LabelInputContainer>
        <LabelInputContainer label="Match whole word" htmlFor="find-whole-word" inline>
          <input
            type="checkbox"
            id="find-whole-word"
            checked={matchWholeWord}
            onChange={(e) => onMatchWholeWordChange(e.target.checked)}
            className="h-5 w-5 text-[var(--bv-accent-primary)] border-[var(--bv-input-border)] rounded focus:ring-[var(--bv-input-focus-ring)]"
            disabled={isFindReplaceDisabled}
            aria-disabled={isFindReplaceDisabled}
          />
        </LabelInputContainer>
      </div>

      <LabelInputContainer label="Scope" htmlFor="find-scope-select">
        <SelectInput
          id="find-scope-select"
          value={scope}
          onChange={(e) => onScopeChange(e.target.value as FindScope)}
          disabled={isFindReplaceDisabled}
          aria-disabled={isFindReplaceDisabled}
        >
          <option value="currentBlock" disabled={isCurrentBlockScopeDisabled}>Current Block</option>
          <option value="activeScript">Active Script</option>
          <option value="allScripts">All Loaded Main Scripts</option>
        </SelectInput>
      </LabelInputContainer>

      <div className="flex space-x-2 mt-3">
        <Button onClick={onFindNext} disabled={isFindReplaceDisabled || !findText} className="flex-1">Find Next</Button>
        <Button onClick={onReplace} disabled={isFindReplaceDisabled || !findText} className="flex-1">Replace</Button>
        <Button onClick={onReplaceAll} disabled={isFindReplaceDisabled || !findText} className="flex-1 !bg-[var(--bv-accent-secondary)] !text-[var(--bv-accent-secondary-content)]">Replace All</Button>
      </div>

      {resultsMessage && (
        <p className={`mt-2 text-sm ${resultsMessage.startsWith('Error:') || resultsMessage.startsWith('Failed') ? 'text-red-600 dark:text-red-400' : 'text-[var(--bv-text-secondary)]'}`}
           aria-live="polite"
        >
          {resultsMessage}
        </p>
      )}
      {isFindReplaceDisabled && (
         <p className="mt-2 text-xs text-[var(--bv-text-secondary)]">
            Load a main script to enable Find and Replace.
        </p>
      )}

      {findResultSummary.length > 0 && !isFindReplaceDisabled && scope !== 'currentBlock' && (
        <div className="mt-3 pt-3 border-t border-[var(--bv-border-color-light)]">
          <h4 className="text-sm font-semibold mb-1 text-[var(--bv-accent-primary)]" id="find-results-summary-heading">
            Search Results Summary:
          </h4>
          <div 
            className="max-h-40 overflow-y-auto border border-[var(--bv-border-color)] rounded p-1 space-y-1"
            role="list"
            aria-labelledby="find-results-summary-heading"
          >
            {findResultSummary.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigateToFindResult(item)}
                className="block w-full text-left p-1.5 rounded text-sm transition-colors duration-150
                           bg-transparent text-[var(--bv-text-primary)]
                           hover:bg-[var(--bv-element-background)]"
                title={`Go to ${item.name} (${item.count} matches)`}
                role="listitem"
              >
                {item.name} <span className="text-xs opacity-75">(Matches: {item.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {findText && findResultSummary.length === 0 && resultsMessage === "No matches found in the selected scope." && !isFindReplaceDisabled && scope !== 'currentBlock' && (
         <p className="mt-2 text-sm text-[var(--bv-text-secondary)]">No matches found in the selected scope for summary list.</p>
      )}
    </>
  );
};

export default FindReplacePanel;
