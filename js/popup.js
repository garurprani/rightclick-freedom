const DEFAULTS = {
  autoEnabled: false,
  allowList: [],
  blockList: []
};

document.addEventListener('DOMContentLoaded', () => {
  // get elements
  const tabMain = document.getElementById('tab-main');
  const tabSettings = document.getElementById('tab-settings');
  const paneMain = document.getElementById('pane-main');
  const paneSettings = document.getElementById('pane-settings');
  const autoToggle = document.getElementById('autoToggle');
  const currentTitle = document.getElementById('currentTitle');
  const currentDomain = document.getElementById('currentDomain');
  const enableBtn = document.getElementById('enableNowBtn');
  const blockBtn = document.getElementById('addToBlock');
  const allowText = document.getElementById('allowListArea');
  const blockText = document.getElementById('blockListArea');
  const saveBtn = document.getElementById('saveSettings');
  const resetBtn = document.getElementById('resetSettings');
  const status = document.getElementById('statusMsg');
  const saveMsg = document.getElementById('saveIndicator');

  // tabs
  function showMain() {
    tabMain.classList.add('active');
    tabSettings.classList.remove('active');
    paneMain.style.display = 'block';
    paneSettings.style.display = 'none';
  }
  function showSettings() {
    tabSettings.classList.add('active');
    tabMain.classList.remove('active');
    paneSettings.style.display = 'block';
    paneMain.style.display = 'none';
  }
  tabMain.onclick = showMain;
  tabSettings.onclick = showSettings;

  // toggle switch
  function updateToggle(isOn) {
    if (isOn) {
      autoToggle.classList.add('on');
      autoToggle.setAttribute('aria-pressed', 'true');
    } else {
      autoToggle.classList.remove('on');
      autoToggle.setAttribute('aria-pressed', 'false');
    }
  }

  // load saved stuff
  chrome.storage.sync.get(DEFAULTS, (data) => {
    updateToggle(data.autoEnabled);
    if (allowText) allowText.value = (data.allowList || []).join('\n');
    if (blockText) blockText.value = (data.blockList || []).join('\n');
  });

  // toggle click
  autoToggle.addEventListener('click', () => {
    const isOn = autoToggle.classList.contains('on');
    const newState = !isOn;
    updateToggle(newState);
    
    chrome.storage.sync.set({ autoEnabled: newState }, () => {
      status.textContent = newState ? 'Auto ON' : 'Auto OFF';
      setTimeout(() => { status.textContent = 'idle'; }, 1000);
    });
  });

  // show current tab
  let currentTab = null;
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    if (tabs[0]) {
      currentTab = tabs[0];
      currentTitle.textContent = tabs[0].title || '—';
      const url = tabs[0].url || '';
      // get domain
      let domain = '—';
      try {
        domain = new URL(url).hostname;
      } catch(e) {
        // fallback
        domain = url.replace(/^https?:\/\//, '').split('/')[0];
      }
      currentDomain.textContent = domain || '—';
    }
  });

  // helper to get domain
  function getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch(e) {
      return '';
    }
  }

  // add to allow list
  function allowDomain(domain, callback) {
    chrome.storage.sync.get(DEFAULTS, items => {
      const allow = [...new Set([...(items.allowList || []), domain])];
      const block = (items.blockList || []).filter(d => d !== domain);
      
      chrome.storage.sync.set({ 
        allowList: allow, 
        blockList: block 
      }, () => {
        if (allowText) allowText.value = allow.join('\n');
        if (blockText) blockText.value = block.join('\n');
        if (callback) callback();
      });
    });
  }

  // add to block list
  function blockDomain(domain, callback) {
    chrome.storage.sync.get(DEFAULTS, items => {
      const block = [...new Set([...(items.blockList || []), domain])];
      const allow = (items.allowList || []).filter(d => d !== domain);
      
      chrome.storage.sync.set({ 
        allowList: allow, 
        blockList: block 
      }, () => {
        if (allowText) allowText.value = allow.join('\n');
        if (blockText) blockText.value = block.join('\n');
        if (callback) callback();
      });
    });
  }

  // enable button
  enableBtn.addEventListener('click', () => {
    if (!currentTab) return;
    
    enableBtn.disabled = true;
    enableBtn.textContent = 'Working...';
    
    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      files: ['js/content_script.js']
    }).then(() => {
      enableBtn.textContent = 'Done! ✓';
      status.textContent = 'Enabled on this tab';
      
      // auto add to allow list
      const domain = getDomain(currentTab.url);
      if (domain) {
        allowDomain(domain, () => {
          saveMsg.textContent = `Added ${domain} to Allowed`;
          setTimeout(() => { saveMsg.textContent = ''; }, 1500);
        });
      }
      
      setTimeout(() => {
        enableBtn.textContent = 'Enable right click';
        enableBtn.disabled = false;
        status.textContent = 'idle';
      }, 1200);
      
    }).catch(err => {
      enableBtn.textContent = 'Failed';
      enableBtn.disabled = false;
      status.textContent = 'Cannot inject (restricted page)';
      setTimeout(() => { status.textContent = 'idle'; }, 1600);
    });
  });

  // block button
  blockBtn.addEventListener('click', () => {
    if (!currentTab) return;
    
    const domain = getDomain(currentTab.url);
    if (!domain) return;
    
    blockDomain(domain, () => {
      status.textContent = `Blocked ${domain}`;
      setTimeout(() => { status.textContent = 'idle'; }, 1200);
    });
  });

  // save settings
  saveBtn.addEventListener('click', () => {
    const allow = allowText.value.split('\n').map(l => l.trim()).filter(l => l);
    const block = blockText.value.split('\n').map(l => l.trim()).filter(l => l);
    
    // remove duplicates between lists
    const finalAllow = allow.filter(d => !block.includes(d));
    
    chrome.storage.sync.set({ 
      allowList: finalAllow, 
      blockList: block 
    }, () => {
      saveBtn.textContent = 'Saved!';
      saveMsg.textContent = 'Settings saved';
      
      setTimeout(() => {
        saveBtn.textContent = 'Save';
        saveMsg.textContent = '';
      }, 1200);
    });
  });

  // reset
  resetBtn.addEventListener('click', () => {
    chrome.storage.sync.set(DEFAULTS, () => {
      if (allowText) allowText.value = '';
      if (blockText) blockText.value = '';
      updateToggle(false);
      status.textContent = 'Reset to defaults';
      setTimeout(() => { status.textContent = 'idle'; }, 1200);
      showMain();
    });
  });

  // start with main tab
  showMain();
});