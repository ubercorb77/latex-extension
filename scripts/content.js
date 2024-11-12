// content.js
console.log('LaTeX Copier Extension loaded!');

function findLatexElements() {
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
}

function makeWikiElementCopyable(element) {
  setupCopyableElement(element, extractWikipediaLatex);
}

function makeKatexElementCopyable(element) {
  setupCopyableElement(element, extractKatexLatex);
}

function setupCopyableElement(element, extractorFn) {
  element.style.cursor = 'pointer';
  element.classList.add('latex-copyable');
  
  element.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const latexSource = extractorFn(element);
    console.log('Extracted LaTeX:', latexSource);
    
    if (latexSource) {
      try {
        await navigator.clipboard.writeText(latexSource);
        showCopiedNotification(element);
        console.log('Copied to clipboard:', latexSource);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  });
}

function cleanWikipediaLatex(latex) {
  return latex
    // Remove displaystyle and textstyle wrappers
    .replace(/^{\\(?:display|text)style\s+(.+)}$/, '$1')
    // Remove common environment wrappers
    .replace(/^\\begin{(?:equation|align|gather|multline)}\s*(.+?)\s*\\end{(?:equation|align|gather|multline)}$/, '$1')
    .trim();
}

function extractWikipediaLatex(element) {
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
}

function extractKatexLatex(element) {
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
}

function showCopiedNotification(element) {
  const notification = document.createElement('div');
  notification.className = 'latex-copier-notification';
  notification.textContent = 'LaTeX copied!';
  
  document.body.appendChild(notification);
  
  const rect = element.getBoundingClientRect();
  
  // Calculate viewport-relative positions
  let top = rect.top - 40; // 40px above the element
  let left = rect.left;
  
  // Ensure notification stays within viewport bounds
  const margin = 10; // minimum distance from viewport edge
  const notificationWidth = 120; // approximate width of notification
  const notificationHeight = 40; // approximate height of notification
  
  // Adjust vertical position if too high or low
  if (top < margin) {
    top = rect.bottom + 10; // show below instead
  }
  
  // Adjust horizontal position if too far left or right
  if (left < margin) {
    left = margin;
  } else if (left + notificationWidth > window.innerWidth - margin) {
    left = window.innerWidth - notificationWidth - margin;
  }
  
  notification.style.top = `${top}px`;
  notification.style.left = `${left}px`;
  
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

// Run immediately
findLatexElements();

// Run again after a short delay for dynamic content
setTimeout(findLatexElements, 1000);

// Watch for dynamic changes
const observer = new MutationObserver((mutations) => {
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
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class', 'data-latex', 'alttext']
});