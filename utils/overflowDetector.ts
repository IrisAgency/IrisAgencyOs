/**
 * Overflow Detection Utility
 * Detects DOM elements causing horizontal overflow
 * Only runs in development mode
 */

export const detectOverflowElements = (): void => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const overflowingElements: Array<{
    element: HTMLElement;
    selector: string;
    scrollWidth: number;
    clientWidth: number;
    overflow: number;
  }> = [];

  // Scan all elements in the DOM
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    
    // Skip invisible elements
    if (htmlEl.offsetParent === null) return;
    
    // Check if element is wider than its container
    const scrollWidth = htmlEl.scrollWidth;
    const clientWidth = htmlEl.clientWidth;
    
    if (scrollWidth > clientWidth) {
      // Generate a useful selector for the element
      let selector = htmlEl.tagName.toLowerCase();
      if (htmlEl.id) {
        selector += `#${htmlEl.id}`;
      }
      if (htmlEl.className && typeof htmlEl.className === 'string') {
        const classes = htmlEl.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          selector += `.${classes.slice(0, 3).join('.')}`;
        }
      }
      
      overflowingElements.push({
        element: htmlEl,
        selector,
        scrollWidth,
        clientWidth,
        overflow: scrollWidth - clientWidth,
      });
    }
  });

  if (overflowingElements.length > 0) {
    console.group('🚨 Horizontal Overflow Detected');
    console.log(`Found ${overflowingElements.length} elements causing horizontal overflow:`);
    
    // Sort by overflow amount (largest first)
    overflowingElements
      .sort((a, b) => b.overflow - a.overflow)
      .forEach((item, index) => {
        console.group(`${index + 1}. ${item.selector}`);
        console.log('Element:', item.element);
        console.log(`Width: ${item.clientWidth}px (visible) vs ${item.scrollWidth}px (content)`);
        console.log(`Overflow: ${item.overflow}px`);
        console.log('Computed styles:', {
          width: getComputedStyle(item.element).width,
          maxWidth: getComputedStyle(item.element).maxWidth,
          overflowX: getComputedStyle(item.element).overflowX,
          position: getComputedStyle(item.element).position,
        });
        console.groupEnd();
      });
    
    console.groupEnd();
  } else {
    console.log('✅ No horizontal overflow detected!');
  }
};

/**
 * Auto-detect overflow on window resize (debounced)
 */
let resizeTimeout: NodeJS.Timeout;
export const startOverflowMonitoring = (): (() => void) => {
  if (process.env.NODE_ENV !== 'development') {
    return () => {};
  }

  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      console.clear();
      detectOverflowElements();
    }, 500);
  };

  window.addEventListener('resize', handleResize);
  
  // Run initial detection
  setTimeout(detectOverflowElements, 1000);

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
    clearTimeout(resizeTimeout);
  };
};

/**
 * Highlight overflowing elements with red border (for debugging)
 */
export const highlightOverflowElements = (): void => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const allElements = document.querySelectorAll('*');
  
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    
    if (htmlEl.offsetParent === null) return;
    
    if (htmlEl.scrollWidth > htmlEl.clientWidth) {
      htmlEl.style.outline = '3px solid red';
      htmlEl.style.outlineOffset = '-3px';
    }
  });

  console.log('🔴 Overflowing elements highlighted with red border');
};

/**
 * Remove highlight from elements
 */
export const clearOverflowHighlights = (): void => {
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.outline = '';
    htmlEl.style.outlineOffset = '';
  });

  console.log('✅ Overflow highlights cleared');
};

// Make utilities available in browser console
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).detectOverflow = detectOverflowElements;
  (window as any).highlightOverflow = highlightOverflowElements;
  (window as any).clearOverflowHighlights = clearOverflowHighlights;
  
  console.log('🛠️ Overflow detection utilities loaded. Use in console:');
  console.log('  - detectOverflow()');
  console.log('  - highlightOverflow()');
  console.log('  - clearOverflowHighlights()');
}
