"use strict";

chrome.pageAction.onClicked.addListener(function() {
    chrome.tabs.create({
        url: chrome.runtime.getURL('window.html'),
        active: true
    });
});

function checkForValidUrl(tabId, changeInfo, tab) {
    if (tab.url && tab.url.indexOf('https://github.com') === 0) {
        chrome.pageAction.show(tabId);
    }
}
chrome.tabs.onUpdated.addListener(checkForValidUrl);