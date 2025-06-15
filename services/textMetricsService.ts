
import type { CharacterByteMapEntry, LineMetrics, BlockMetrics } from '../types';

export const parseCustomByteMapString = (mapString: string): CharacterByteMapEntry[] => {
  if (!mapString || typeof mapString !== 'string') {
    return [];
  }
  const entries: CharacterByteMapEntry[] = [];
  const lines = mapString.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) { // Allow comments starting with #
      continue;
    }
    const parts = trimmedLine.split('=');
    if (parts.length === 2) {
      const char = parts[0].trim();
      const bytes = parseInt(parts[1].trim(), 10);
      if (char.length === 1 && !isNaN(bytes) && bytes >= 0) { // Ensure char is a single character and bytes is valid
        entries.push({ char, bytes });
      } else if (char.startsWith('[') && char.endsWith(']') && char.length > 2 && !isNaN(bytes) && bytes >= 0) {
        // Support for special tags like [ICON] or [PLAYER_NAME]
        entries.push({ char, bytes });
      } else {
        console.warn(`Invalid byte map entry: "${line}". Char: "${char}", Bytes: "${parts[1].trim()}"`);
      }
    } else {
      console.warn(`Invalid byte map line format: "${line}"`);
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
