
import type { CharacterByteMapEntry, LineMetrics, BlockMetrics } from '../types';

export const parseCustomByteMapString = (mapString: string): CharacterByteMapEntry[] => {
  if (!mapString || typeof mapString !== 'string') {
    return [];
  }
  const entries: CharacterByteMapEntry[] = [];
  const lines = mapString.split('\n');

  for (const originalLine of lines) {
    const lineToConsider = originalLine; 
    const trimmedForEmptyCheck = lineToConsider.trim();
    if (!trimmedForEmptyCheck || trimmedForEmptyCheck.startsWith('#')) { // Allow comments starting with #
      continue;
    }

    const parts = lineToConsider.split('='); // Split the original line (or line after initial comment/blank check)
    
    if (parts.length === 2) {
      const charPartRaw = parts[0]; // This is the part before '=', can have spaces. E.g., " " from " =1"
      const bytePartRaw = parts[1]; // This is the part after '=', can have spaces. E.g., "1" or " 1 "
      
      const bytes = parseInt(bytePartRaw.trim(), 10); // Trim byte part before parsing
      if (isNaN(bytes) || bytes < 0) {
        console.warn(`Invalid byte value in line: "${originalLine}". Byte part: "${bytePartRaw.trim()}"`);
        continue;
      }

      const charPartTrimmed = charPartRaw.trim(); // Fully trimmed version of the char part. E.g., "" from " ", "A" from " A "

      let finalCharKey: string | null = null;

      if (charPartTrimmed.startsWith('[') && charPartTrimmed.endsWith(']') && charPartTrimmed.length > 2) {
        // It's a tag, use the trimmed version (e.g., "[ICON]")
        finalCharKey = charPartTrimmed;
      } else if (charPartRaw.length === 1) { 
        // The raw part (before any specific trim for logic) is a single char.
        // Catches "A" from "A=1" (charPartRaw is "A")
        // Catches " " from " =1" (charPartRaw is " ")
        finalCharKey = charPartRaw;
      } else if (charPartTrimmed.length === 1) {
        // The raw part was multi-char (e.g., had spaces) but trims to a single char.
        // E.g., " A "=1 -> charPartRaw is " A ", charPartTrimmed is "A". Use "A".
        finalCharKey = charPartTrimmed;
      }
      // If finalCharKey is still null here, it means:
      // - charPartTrimmed was not a tag.
      // - charPartRaw was not a single character.
      // - charPartTrimmed was not a single character (e.g. it was "" or a multi-char string not a tag).
      // This correctly identifies invalid char parts like "" (from "   =1") or "AB" (from "AB=1").

      if (finalCharKey !== null && finalCharKey.length > 0) { // Ensure final key isn't effectively empty
        entries.push({ char: finalCharKey, bytes });
      } else {
        console.warn(`Invalid byte map entry: "${originalLine}". Char part as read: "${charPartRaw}", Byte part: "${bytePartRaw.trim()}"`);
      }
    } else {
      // Handle lines that don't have exactly one '='
      if (trimmedForEmptyCheck.length > 0 && !trimmedForEmptyCheck.includes("=")) {
         console.warn(`Invalid byte map line format (missing '='): "${originalLine}"`);
      } else if (parts.length > 2) { // Too many '='
         console.warn(`Invalid byte map line format (multiple '='): "${originalLine}"`);
      }
      // Silently ignore if it was effectively blank or only a comment that somehow passed initial checks
      // or if it was an empty line that split weirdly (though initial check should catch empty lines).
    }
  }
  // Sort by length of char string descending to match longer tags first (e.g., "[ICON]" before "I")
  return entries.sort((a, b) => b.char.length - a.char.length);
};

const getCharBytes = (charOrTag: string, parsedMap: CharacterByteMapEntry[], defaultByteValue: number): number => {
    // Check for multi-character tags first due to sorting of parsedMap
    for (const entry of parsedMap) {
        if (entry.char.length > 1 && charOrTag.startsWith(entry.char)) {
            return entry.bytes; // Return bytes for the tag and indicate tag length consumed
        }
    }
    // Then check for single characters
    const singleChar = charOrTag[0];
    const entry = parsedMap.find(e => e.char === singleChar && e.char.length === 1);
    return entry ? entry.bytes : defaultByteValue;
};


export const calculateLineMetrics = (
  line: string,
  parsedMap: CharacterByteMapEntry[],
  defaultByteValue: number
): LineMetrics => {
  let chars = 0;
  let bytes = 0;
  let i = 0;
  while (i < line.length) {
    chars++;
    let consumedChars = 1; // Assume consuming 1 char by default
    let charBytes = defaultByteValue;

    // Check for matching multi-character tags first
    let matchedTag = false;
    for (const entry of parsedMap) {
        if (entry.char.length > 1 && line.substring(i).startsWith(entry.char)) {
            charBytes = entry.bytes;
            consumedChars = entry.char.length;
            matchedTag = true;
            break;
        }
    }

    // If no multi-character tag matched, process as a single character
    if (!matchedTag) {
        const singleChar = line[i];
        const singleCharEntry = parsedMap.find(e => e.char === singleChar && e.char.length === 1);
        charBytes = singleCharEntry ? singleCharEntry.bytes : defaultByteValue;
    }
    
    bytes += charBytes;
    i += consumedChars;
  }
  return { chars, bytes };
};


export const calculateBlockMetrics = (
  content: string,
  parsedMap: CharacterByteMapEntry[],
  defaultByteValue: number
): BlockMetrics => {
  const lines = content.split('\n');
  const lineDetails: LineMetrics[] = [];
  let totalChars = 0;
  let totalBytes = 0;

  for (const line of lines) {
    const metrics = calculateLineMetrics(line, parsedMap, defaultByteValue);
    lineDetails.push(metrics);
    totalChars += metrics.chars;
    totalBytes += metrics.bytes;
  }

  const totalBits = totalBytes * 8;
  return { totalChars, totalBytes, totalBits, lineDetails };
};
