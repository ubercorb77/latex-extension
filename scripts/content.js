// content.js
console.log('LaTeX Copier Extension loaded!');

// Notification types and their configurations
const NOTIFICATION_TYPES = {
  SUCCESS: {
    backgroundColor: '#4CAF50',
    message: 'LaTeX copied!'
  },
  ERROR: {
    backgroundColor: '#f44336',
    message: 'Failed to copy LaTeX'
  },
  WARNING: {
    backgroundColor: '#ff9800',
    message: 'No LaTeX found'
  }
};

function findLatexElements() {
  try {
    // Wikipedia math elements
    const wikiMathElements = document.querySelectorAll('.mwe-math-element');
    
    // KaTeX elements (both display and inline)
    const katexElements = document.querySelectorAll('.katex-display, .katex:not(.katex-display .katex)');
    
    console.log('Found Wiki math elements:', wikiMathElements.length);
    console.log('Found KaTeX elements:', katexElements.length);

    // Process Wikipedia elements
    wikiMathElements.forEach(element => {
      if (!element.dataset.latexCopierInitialized) {
        makeWikiElementCopyable(element);
        element.dataset.latexCopierInitialized = 'true';
      }
    });

    // Process KaTeX elements
    katexElements.forEach(element => {
      if (!element.dataset.latexCopierInitialized) {
        makeKatexElementCopyable(element);
        element.dataset.latexCopierInitialized = 'true';
      }
    });
  } catch (error) {
    console.error('Error finding LaTeX elements:', error);
  }
}

function makeWikiElementCopyable(element) {
  setupCopyableElement(element, extractWikipediaLatex);
}

function makeKatexElementCopyable(element) {
  setupCopyableElement(element, extractKatexLatex);
}

function setupCopyableElement(element, extractorFn) {
  if (!element) {
    console.error('Attempted to setup copyable element on null element');
    return;
  }

  // Check if element already has a positioned ancestor
  let wrapper = element.closest('.latex-copyable-wrapper');

  // If no wrapper exists, create one
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'latex-copyable-wrapper';

    // Inherit display style from the element
    const computedStyle = window.getComputedStyle(element);
    wrapper.style.display = computedStyle.display;
    
    // Preserve inline behavior if needed
    if (computedStyle.display === 'inline' || computedStyle.display === 'inline-block') {
      wrapper.style.display = computedStyle.display;
    }
    
    // Wrap the element
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);
  }
  
  // Set cursor style
  if (element.classList.contains('mwe-math-element')) {
    // for wikipedia elements, set cursor on the img inside the elem
    const imgElement = element.querySelector('img');
    if (imgElement) {
      imgElement.style.cursor = 'pointer';
    }
  } else {
    // for non-wikipedia elements (katex), set cursor on the whole elem
    element.style.cursor = 'pointer';
  }

  element.classList.add('latex-copyable');
  
  element.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const latexSource = extractorFn(element);
      console.log('Extracted LaTeX:', latexSource);
      
      if (!latexSource) {
        showNotification(element, 'WARNING');
        return;
      }

      await copyToClipboard(latexSource);
      showNotification(element, 'SUCCESS');
      
    } catch (error) {
      console.error('Error handling click:', error);
      showNotification(element, 'ERROR');
    }
  });
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Copied to clipboard:', text);
  } catch (error) {
    console.error('Failed to copy:', error);
    throw new Error('Failed to copy to clipboard');
  }
}

function cleanWikipediaLatex(latex) {
  if (!latex) return '';
  
  try {
    return latex
      // Remove displaystyle and textstyle wrappers
      .replace(/^{\\(?:display|text)style\s+(.+)}$/, '$1')
      // Remove common environment wrappers
      .replace(/^\\begin{(?:equation|align|gather|multline)}\s*(.+?)\s*\\end{(?:equation|align|gather|multline)}$/, '$1')
      .trim();
  } catch (error) {
    console.error('Error cleaning LaTeX:', error);
    return latex.trim();
  }
}

function extractWikipediaLatex(element) {
  try {
    // SVG annotation (primary method)
    const svgElement = element.querySelector('svg');
    if (svgElement) {
      const annotation = svgElement.querySelector('annotation');
      if (annotation) {
        return cleanWikipediaLatex(annotation.textContent);
      }
    }

    // Image alt text fallback
    const imgElement = element.querySelector('img');
    if (imgElement && imgElement.alt) {
      return cleanWikipediaLatex(imgElement.alt);
    }

    // Fallback source element
    const fallbackElement = element.querySelector('.mwe-math-fallback-source-inline');
    if (fallbackElement) {
      return cleanWikipediaLatex(fallbackElement.textContent);
    }

    const latex = element.getAttribute('data-latex') || 
                  element.getAttribute('alttext') || 
                  '';
    return cleanWikipediaLatex(latex);
  } catch (error) {
    console.error('Error extracting Wikipedia LaTeX:', error);
    return '';
  }
}

function extractKatexLatex(element) {
  try {
    // Try to find the source annotation
    const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
    if (annotation) {
      return annotation.textContent;
    }

    // Look for data attributes
    if (element.hasAttribute('data-latex')) {
      return element.getAttribute('data-latex');
    }

    // Try to find the source from a parent element
    const container = element.closest('[data-latex]');
    if (container) {
      return container.getAttribute('data-latex');
    }

    // For KaTeX display mode, check the wrapping element
    if (element.classList.contains('katex-display')) {
      const wrapper = element.closest('[data-latex]');
      if (wrapper) {
        return wrapper.getAttribute('data-latex');
      }
    }

    // Try to get from a tex source element if present
    const texSource = element.querySelector('.katex-html');
    if (texSource && texSource.hasAttribute('data-latex')) {
      return texSource.getAttribute('data-latex');
    }

    return '';
  } catch (error) {
    console.error('Error extracting KaTeX LaTeX:', error);
    return '';
  }
}

function showNotification(element, type) {
  const config = NOTIFICATION_TYPES[type];
  if (!config) {
    console.error('Invalid notification type:', type);
    return;
  }

  const notification = document.createElement('div');
  notification.className = 'latex-copier-notification';
  notification.textContent = config.message;
  notification.style.backgroundColor = config.backgroundColor;
  
  // Find the wrapper (which we created in setupCopyableElement)
  const wrapper = element.closest('.latex-copyable-wrapper');
  wrapper.appendChild(notification);
  
  // Calculate viewport-relative positions
  const rect = element.getBoundingClientRect();
  let top = rect.top - 40; // 40px above the element
  let left = rect.left;
  
  // Ensure notification stays within viewport bounds
  const margin = 10; // minimum distance from viewport edge
  const notificationWidth = 120; // approximate width of notification
  
  // Adjust horizontal position if too far left or right
  if (left < margin) {
    left = margin;
  } else if (left + notificationWidth > window.innerWidth - margin) {
    left = window.innerWidth - notificationWidth - margin;
  }
  
  // Adjust vertical position if too high
  if (top < margin) {
    top = rect.bottom + 10; // show below instead
  }

  top -= rect.top;
  left -= rect.left;
  
  notification.style.top = `${top}px`;
  notification.style.left = `${left}px`;
  
  // Remove notification after 2 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 2000);
}

// Run immediately and after a delay for dynamic content
findLatexElements();
setTimeout(findLatexElements, 1000);

// Watch for dynamic changes with error handling
try {
  const observer = new MutationObserver((mutations) => {
    try {
      let shouldUpdate = false;
      
      for (const mutation of mutations) {
        // Check for new nodes
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            
            // Check if the node itself is a math element
            if (node.classList && (
              node.classList.contains('mwe-math-element') ||
              node.classList.contains('katex') ||
              node.classList.contains('katex-display')
            )) {
              shouldUpdate = true;
              break;
            }
            
            // Check children for math elements
            if (node.querySelectorAll) {
              const mathElements = node.querySelectorAll('.mwe-math-element, .katex, .katex-display');
              if (mathElements.length > 0) {
                shouldUpdate = true;
                break;
              }
            }
          }
        }
        
        // Check for attribute changes
        if (mutation.type === 'attributes') {
          if (mutation.target.classList && (
            mutation.target.classList.contains('mwe-math-element') ||
            mutation.target.classList.contains('katex') ||
            mutation.target.classList.contains('katex-display')
          )) {
            shouldUpdate = true;
            break;
          }
        }
        
        if (shouldUpdate) break;
      }
      
      if (shouldUpdate) {
        console.log('Detected dynamic math content update');
        findLatexElements();
      }
    } catch (error) {
      console.error('Error in mutation observer callback:', error);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-latex', 'alttext']
  });
} catch (error) {
  console.error('Error setting up mutation observer:', error);
}