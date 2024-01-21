/*
All Rights Reserved, (c) 2024 CodeAtlas LTD.

Author: Martin Shaw (developer@martinshaw.co)
File Name: service-worker.ts
Created:  2024-01-21T03:25:47.005Z
Modified: 2024-01-21T03:25:47.005Z

Description: description
*/

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "duplicate-tab") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length < 1) return;
      if (tabs[0].id == null) return;

      chrome.tabs.duplicate(tabs[0].id);
    });
  }

  if (request.message === "close-other-tabs-in-all-windows") {
    chrome.tabs.query({}, function (tabs) {
      const currentTabId = sender.tab?.id;
      if (currentTabId == null) return;

      tabs.forEach((tab) => {
        if (tab.id == null) return;
        if (tab.id === currentTabId) return;

        chrome.tabs.remove(tab.id);
      });
    });
  }

  if (request.message === "close-other-tabs-in-window") {
    chrome.tabs.query({ currentWindow: true }, function (tabs) {
      const currentTabId = sender.tab?.id;
      if (currentTabId == null) return;

      tabs.forEach((tab) => {
        if (tab.id == null) return;
        if (tab.id === currentTabId) return;

        chrome.tabs.remove(tab.id);
      });
    });
  }

  // if (request.message === "take-screenshot") {
  //   // Capture active tab using activeTab or tabCapture or pageCapture permissions

  //   // get current active tab Id
  //   chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  //     if (tabs.length < 1) return;
  //     if (tabs[0].id == null) return;

  //     // Capture the visible tab
  //     chrome.tabs.captureVisibleTab(
  //       tabs[0].windowId,
  //       { format: "png", quality: 100 },
  //       function (dataUrl) {
  //         if (dataUrl == null) return;

  //         // Create a new tab with the screenshot
  //         console.log(dataUrl);
  //       }
  //     );
  //   });
  // }

  if (request.message === "pin-tab") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length < 1) return;
      if (tabs[0].id == null) return;

      chrome.tabs.update(tabs[0].id, { pinned: true });
    });
  }

  if (request.message === "unpin-tab") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length < 1) return;
      if (tabs[0].id == null) return;

      chrome.tabs.update(tabs[0].id, { pinned: false });
    });
  }

  if (request.message === "mute-tab") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length < 1) return;
      if (tabs[0].id == null) return;

      chrome.tabs.update(tabs[0].id, { muted: true });
    });
  }

  if (request.message === "unmute-tab") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length < 1) return;
      if (tabs[0].id == null) return;

      chrome.tabs.update(tabs[0].id, { muted: false });
    });
  }

  if (request.message === "ungroup-tab") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length < 1) return;
      if (tabs[0].id == null) return;

      chrome.tabs.ungroup(tabs[0].id);
    });
  }

  if (request.message === "ungroup-all-tabs-in-group") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length < 1) return;
      if (tabs[0].id == null) return;
      if (tabs[0].groupId == null) return;

      chrome.tabs.query({ groupId: tabs[0].groupId }, function (tabs) {
        tabs.forEach((tab) => {
          if (tab.id == null) return;

          chrome.tabs.ungroup(tab.id);
        });
      });
    });
  }

  if (request.message === "add-tab-to-new-group") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length < 1) return;
      if (tabs[0].id == null) return;

      chrome.tabs.group({ tabIds: tabs[0].id });
    });
  }
});
