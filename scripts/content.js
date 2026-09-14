// content.js
// console.log('LaTeX Copier Extension loaded!');

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
    // console.log('Found Wiki math elements:', wikiMathElements.length);

    // Process Wikipedia elements
    wikiMathElements.forEach(element => {
      if (!element.dataset.latexCopierInitialized) {
        // for wikipedia elements, target the <img> elem (if there is one) inside of the .mwe-math-element elem
        const imgElement = element.querySelector('img');
        if (imgElement) {
          element = imgElement;
        }
        setupCopyableElement(element, "wikipedia");
        element.dataset.latexCopierInitialized = 'true';
      }
    });
        
    // KaTeX elements (both display and inline)
    const katexElements = document.querySelectorAll('.katex-display, .katex:not(.katex-display .katex)');
    // ".katex:not(.katex-display .katex)" selects for elems with class katex but excludes those that are inside an element with the class katex-display
    // console.log('Found KaTeX elements:', katexElements.length);

    // Process KaTeX elements
    katexElements.forEach(element => {
      if (!element.dataset.latexCopierInitialized) {
        setupCopyableElement(element, "katex");
        element.dataset.latexCopierInitialized = 'true';
      }
    });
  } catch (error) {
    console.error('Error finding LaTeX elements:', error);
  }
}

function setupCopyableElement(element, type) {
  // const timestamp = () => performance.now().toFixed(2); // debugging

  if (!element) {
    console.error('Attempted to setup copyable element on null element');
    return;
  }

  /*
  1. set cursor to pointer
  2. add latex-copyable class
  3. add click handler
  */

  element.style.cursor = 'pointer';
  // console.log(`[${timestamp()}] Added cursor style`); // debugging

  element.classList.add('latex-copyable');

  // console.log(`[${timestamp()}] Added latex-copyable class. Classes now:`, element.className); // debugging
  // console.log(`[${timestamp()}] Element:`, element); // debugging
  
  if (type === "wikipedia") {
    var extractorFn = extractWikipediaLatex;
  } else if (type === "katex") {
    var extractorFn = extractKatexLatex;
  } else {
    // console.error('Invalid type:', type); // this should never happen unless you literally make a typo
    return;
  }
  element.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const latexSource = extractorFn(element);
      // console.log('Extracted LaTeX:', latexSource);
      
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
  // console.log(`[${timestamp()}] Added click handler`); // debugging
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    // console.log('Copied to clipboard:', text);
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
    // If the element itself is an img
    if (element.tagName.toLowerCase() === 'img' && element.alt) {
      return cleanWikipediaLatex(element.alt);
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

    // Fallback: some sites (e.g. ChatGPT) render KaTeX with output:"html" only,
    // so no MathML/annotation ever reaches the DOM. Recover the source from the
    // React fiber props of the enclosing message, where the original markdown lives.
    const viaFiber = extractKatexLatexViaReactFiber(element);
    if (viaFiber) {
      return viaFiber;
    }

    return '';
  } catch (error) {
    console.error('Error extracting KaTeX LaTeX:', error);
    return '';
  }
}

// ChatGPT renders assistant replies as a React tree and strips KaTeX's MathML
// annotation from the DOM. The original markdown (with \( \), \[ \], $$ $$ or
// $ $ math) is still held in React's internal props on the message container -
// but only page-world.js (running in the page's own JS world) can read it, since
// expando properties like React's "__reactFiber$..." aren't visible from our
// isolated world even though the DOM node itself is shared. So we ask it via a
// DOM attribute handshake, then match the clicked element's position among the
// message's rendered math elements to the same-position math source in the markdown.
function extractKatexLatexViaReactFiber(element) {
  try {
    const messageContainer = element.closest('[data-message-author-role]');
    if (!messageContainer) return '';

    const markdown = requestMarkdownSourceFromPageWorld(messageContainer);
    if (!markdown) return '';

    const sources = extractMathSourcesFromMarkdown(markdown);
    if (!sources.length) return '';

    const mathElements = Array.from(
      messageContainer.querySelectorAll('.katex-display, .katex:not(.katex-display .katex)')
    );
    const index = mathElements.indexOf(element);
    if (index === -1 || index >= sources.length) return '';

    return sources[index];
  } catch (error) {
    console.error('Error extracting KaTeX LaTeX via React fiber:', error);
    return '';
  }
}

let latexCopierRequestCounter = 0;

// Synchronous handshake with page-world.js: dispatching an event on a shared DOM
// node runs same-world and cross-world listeners synchronously and in order, so by
// the time dispatchEvent() returns, page-world.js has already written its response
// (if any) to a DOM attribute we can read immediately - no async messaging needed.
function requestMarkdownSourceFromPageWorld(container) {
  const requestId = 'r' + (++latexCopierRequestCounter) + '-' + Date.now();
  const responseAttr = 'data-latex-copier-response-' + requestId;
  try {
    container.setAttribute('data-latex-copier-request', requestId);
    container.dispatchEvent(new CustomEvent('latex-copier-request', { bubbles: true }));

    const encoded = container.getAttribute(responseAttr);
    if (!encoded) return null;
    return decodeURIComponent(encoded);
  } catch (error) {
    console.error('Error requesting markdown source from page world:', error);
    return null;
  } finally {
    container.removeAttribute('data-latex-copier-request');
    container.removeAttribute(responseAttr);
  }
}

function extractMathSourcesFromMarkdown(markdown) {
  // Strip fenced/inline code, since math-looking delimiters inside code samples
  // aren't actually rendered as math and would throw off the ordering.
  const cleaned = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');

  const pattern = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^\n$]+?)\$/g;
  const sources = [];
  let match;
  while ((match = pattern.exec(cleaned)) !== null) {
    const latex = match[1] ?? match[2] ?? match[3] ?? match[4];
    sources.push(latex.trim());
  }
  return sources;
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
  
  element.parentElement.appendChild(notification);
  
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
  top += element.offsetTop;
  left -= rect.left;
  left += element.offsetLeft;
  
  notification.style.top = `${top}px`;
  notification.style.left = `${left}px`;
  
  // Remove notification after 2 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 2000);
}

// run findLatexElements() immediately and also after a delay for dynamic content
findLatexElements();
setTimeout(findLatexElements, 1000);

// also run findLatexElements() on dynamic changes
try {
  const observer = new MutationObserver((mutations) => {
    try {
      let shouldUpdate = false;
      
      // check each mutation for math elements to set shouldUpdate
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
      
      // if above we set shouldUpdate to true, then run findLatexElements()
      if (shouldUpdate) {
        // console.log('Detected dynamic math content update');
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