// page-world.js
// Runs in the page's own ("MAIN") JS world, unlike content.js which runs in the
// extension's isolated world. Isolated-world scripts share the DOM with the page
// but cannot see JS expando properties the page attaches to DOM nodes (e.g. React's
// "__reactFiber$..." instance pointers) - only main-world code can read those.
//
// Sites like ChatGPT render KaTeX with MathML output disabled, so the rendered
// math has no annotation element holding the original LaTeX source anywhere in
// the DOM. The source text still exists, though, inside React's in-memory props
// for the message (the raw markdown fed to the markdown renderer). This script
// answers content.js's request for that markdown via a DOM attribute handshake,
// since that's the one channel guaranteed to work synchronously across worlds.
(function () {
  document.addEventListener('latex-copier-request', (event) => {
    try {
      const container = event.target;
      const requestId = container.getAttribute('data-latex-copier-request');
      if (!requestId) return;

      const markdown = findMarkdownSourceViaFiber(container);
      const responseAttr = 'data-latex-copier-response-' + requestId;
      container.setAttribute(responseAttr, markdown ? encodeURIComponent(markdown) : '');
    } catch (error) {
      // Swallow: content.js will simply see no response attribute and fall back.
    }
  }, true);

  function findMarkdownSourceViaFiber(domElement) {
    const fiberKey = Object.keys(domElement).find(key => key.startsWith('__reactFiber$'));
    if (!fiberKey) return null;

    const seen = new Set();

    function search(node, depth) {
      if (depth > 12 || node === null || node === undefined) return null;
      if (typeof node !== 'object') return null;

      if (Array.isArray(node)) {
        for (const item of node) {
          const result = search(item, depth + 1);
          if (result) return result;
        }
        return null;
      }

      if (seen.has(node)) return null;
      seen.add(node);

      // A "parts" array of strings is the shape of ChatGPT's message content
      // (message.content.parts) - the raw markdown text for the message.
      if (Array.isArray(node.parts) && node.parts.length && typeof node.parts[0] === 'string' && node.parts[0]) {
        return node.parts.join('\n');
      }

      for (const key in node) {
        // Avoid walking back up the fiber tree / into unrelated React internals.
        if (key === 'return' || key === '_owner' || key === 'stateNode' || key === '_debugOwner' || key === 'ref') {
          continue;
        }
        const result = search(node[key], depth + 1);
        if (result) return result;
      }
      return null;
    }

    return search(domElement[fiberKey].memoizedProps, 0);
  }
})();
