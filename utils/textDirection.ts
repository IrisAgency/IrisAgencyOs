/**
 * RTL/Arabic Text Handling Utility
 * Provides utilities for detecting and handling Arabic text and mixed content
 */

/**
 * Check if text contains Arabic characters
 */
export const hasArabic = (text: string): boolean => {
  if (!text) return false;
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(text);
};

/**
 * Check if text contains only Arabic characters (excluding numbers and punctuation)
 */
export const isArabicOnly = (text: string): boolean => {
  if (!text) return false;
  // Remove numbers, punctuation, and whitespace
  const cleanedText = text.replace(/[\d\s\p{P}]/gu, '');
  if (cleanedText.length === 0) return false;
  
  const arabicPattern = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+$/;
  return arabicPattern.test(cleanedText);
};

/**
 * Detect text direction based on content
 */
export const detectTextDirection = (text: string): 'rtl' | 'ltr' => {
  if (!text) return 'ltr';
  
  // Count Arabic and English characters
  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  
  // If more Arabic characters, use RTL
  if (arabicChars > latinChars) {
    return 'rtl';
  }
  
  return 'ltr';
};

/**
 * Get CSS properties for proper text rendering
 */
export const getTextDirectionStyles = (text: string, forceDirection?: 'rtl' | 'ltr' | 'auto'): React.CSSProperties => {
  let direction: 'rtl' | 'ltr' = 'ltr';
  
  if (forceDirection && forceDirection !== 'auto') {
    direction = forceDirection;
  } else {
    direction = detectTextDirection(text);
  }
  
  return {
    direction,
    textAlign: direction === 'rtl' ? 'right' : 'left',
    unicodeBidi: 'plaintext',
  };
};

/**
 * Wrap text segments with proper direction handling for mixed content
 */
export const formatMixedText = (text: string): string => {
  if (!text) return text;
  
  // Split by words and group by script type
  const words = text.split(/(\s+)/);
  let result = '';
  let currentSegment = '';
  let currentIsArabic: boolean | null = null;
  
  words.forEach((word) => {
    const wordIsArabic = hasArabic(word);
    
    if (currentIsArabic === null || currentIsArabic === wordIsArabic || /^\s+$/.test(word)) {
      currentSegment += word;
      currentIsArabic = wordIsArabic;
    } else {
      // Direction change detected
      if (currentIsArabic) {
        result += `<span dir="rtl">${currentSegment}</span>`;
      } else {
        result += `<span dir="ltr">${currentSegment}</span>`;
      }
      currentSegment = word;
      currentIsArabic = wordIsArabic;
    }
  });
  
  // Add remaining segment
  if (currentSegment) {
    if (currentIsArabic) {
      result += `<span dir="rtl">${currentSegment}</span>`;
    } else {
      result += `<span dir="ltr">${currentSegment}</span>`;
    }
  }
  
  return result;
};

/**
 * React hook for text direction
 */
export const useTextDirection = (text: string, forceDirection?: 'rtl' | 'ltr' | 'auto') => {
  const direction = forceDirection && forceDirection !== 'auto' 
    ? forceDirection 
    : detectTextDirection(text);
  
  return {
    direction,
    textAlign: direction === 'rtl' ? 'right' as const : 'left' as const,
    unicodeBidi: 'plaintext' as const,
  };
};

/**
 * Get input field direction attributes
 */
export const getInputDirectionProps = (value: string, forceDirection?: 'rtl' | 'ltr' | 'auto') => {
  const direction = forceDirection && forceDirection !== 'auto'
    ? forceDirection
    : detectTextDirection(value);
  
  return {
    dir: direction,
    style: {
      textAlign: direction === 'rtl' ? 'right' : 'left',
      unicodeBidi: 'plaintext',
    } as React.CSSProperties,
  };
};

/**
 * Normalize Arabic text for better display
 * Handles common issues with Arabic text rendering
 */
export const normalizeArabicText = (text: string): string => {
  if (!text) return text;
  
  // Normalize Arabic characters
  return text
    // Replace Arabic-Indic digits with standard digits if needed
    .replace(/[\u0660-\u0669]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x0660 + 0x0030))
    // Normalize spaces
    .replace(/\u200F/g, '') // Remove RTL mark if causing issues
    .trim();
};

/**
 * Check if a field should use RTL input mode
 */
export const shouldUseRTLInput = (fieldType: string): boolean => {
  const ltrFields = [
    'email',
    'url',
    'tel',
    'password',
    'date',
    'datetime-local',
    'time',
    'number',
  ];
  
  return !ltrFields.includes(fieldType.toLowerCase());
};
