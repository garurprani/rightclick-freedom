const defaults = {
  autoEnabled: false,
  allowList: [],
  blockList: []
};

// when installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(defaults, (data) => {
    chrome.storage.sync.set({...defaults, ...data});
  });
});

// check if domain matches any in list
function matches(domain, list) {
  if (!domain || !list.length) return false;
  return list.some(pattern => {
    pattern = pattern.trim();
    if (!pattern) return false;
    
    // exact match
    if (domain === pattern) return true;
    // subdomain match
    if (domain.endsWith('.' + pattern)) return true;
    // contains pattern
    return domain.includes(pattern);
  });
}

// auto inject when page loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  
  chrome.storage.sync.get(defaults, (data) => {
    if (!data.autoEnabled) return;
    
    let domain = '';
    try {
      domain = new URL(tab.url).hostname;
    } catch(e) {
      return;
    }
    
    // check block list first
    if (matches(domain, data.blockList || [])) {
      return;
    }
    
    // if allow list empty, allow all except blocked
    const allow = data.allowList || [];
    if (allow.length === 0 || matches(domain, allow)) {
      try {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['js/content_script.js']
        });
      } catch(err) {
        // cant inject here, ignore
      }
    }
  });
});