// unlock right click and copy
(function() {
  'use strict';
  
  // 1. add CSS to allow selection
  try {
    const style = document.createElement('style');
    style.id = 'rightclick_unlocker_styles';
    style.textContent = `
      * {
        user-select: text !important;
        -webkit-user-select: text !important;
      }
      img, video {
        -webkit-user-drag: auto !important;
      }
    `;
    document.head.appendChild(style);
  } catch(e) {}
  
  // 2. remove oncontextmenu attributes
  document.querySelectorAll('[oncontextmenu]').forEach(el => {
    el.removeAttribute('oncontextmenu');
  });
  
  // 3. clear context menu handlers
  document.oncontextmenu = null;
  if (document.body) document.body.oncontextmenu = null;
  window.oncontextmenu = null;
  
  // 4. event listeners to stop blocking
  function stopBlocking(e) {
    e.stopImmediatePropagation();
    // dont prevent default - let it happen
  }
  
  window.addEventListener('contextmenu', stopBlocking, true);
  window.addEventListener('copy', stopBlocking, true);
  window.addEventListener('cut', stopBlocking, true);
  window.addEventListener('selectstart', stopBlocking, true);
  
  // 5. fix inline styles
  const elements = document.querySelectorAll('[style]');
  elements.forEach(el => {
    const style = el.getAttribute('style') || '';
    let newStyle = style;
    newStyle = newStyle.replace(/pointer-events\s*:\s*none;?/gi, '');
    newStyle = newStyle.replace(/user-select\s*:\s*none;?/gi, '');
    if (newStyle !== style) {
      el.setAttribute('style', newStyle);
    }
  });
  
  // mark as done
  window.__rightclickFixed = true;
})();