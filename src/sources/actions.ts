import {
  SearchSelectorElementType,
  ShortcutEntryListType,
  getElementsFromFrame,
  searchSelector,
} from "../script";

export const determineActionShortcuts: () => ShortcutEntryListType = () => {
  return {
    home: {
      type: "action",
      alias: "home",
      title: "Go to Homepage",
      performAction: () => {
        window.location.href = "/";
      },
    },
    back: {
      type: "action",
      alias: "back",
      title: "Navigate Back",
      performAction: () => {
        window.history.back();
      },
    },
    forward: {
      type: "action",
      alias: "forward",
      title: "Navigate Forward",
      performAction: () => {
        window.history.forward();
      },
    },
    reload: {
      type: "action",
      alias: "reload",
      title: "Reload Tab",
      performAction: () => {
        window.location.reload();
      },
    },
    top: {
      type: "action",
      alias: "top",
      title: "Scroll to Top",
      performAction: () => {
        window.scrollTo(0, 0);
      },
    },
    bottom: {
      type: "action",
      alias: "bottom",
      title: "Scroll to Bottom",
      performAction: () => {
        window.scrollTo(0, document.body.scrollHeight);
      },
    },
    close: {
      type: "action",
      alias: "close",
      title: "Close Tab",
      performAction: () => {
        window.close();
      },
    },
    "copy-all-hyperlink-urls": {
      type: "action",
      alias: "copy-all-hyperlink-urls",
      title: "Copy All Hyperlink URLs",
      performAction: () => {
        let anchorElements: SearchSelectorElementType[];
        anchorElements = Array.from(document.querySelectorAll(searchSelector));
        anchorElements = getElementsFromFrame(anchorElements);

        let urls: string[] = [];
        for (let i = 0; i < anchorElements.length; i++) {
          let anchorElement = anchorElements[i];
          let href = anchorElement.getAttribute("href");
          if (href == null) continue;
          urls.push(href);
        }

        navigator.clipboard.writeText(urls.join("\n"));
      },
    },
    "copy-all-image-urls": {
      type: "action",
      alias: "copy-all-image-urls",
      title: "Copy All Image URLs",
      performAction: () => {
        let imageElements: HTMLImageElement[];
        imageElements = Array.from(document.getElementsByTagName("img"));

        let urls: string[] = [];
        for (let i = 0; i < imageElements.length; i++) {
          let imageElement = imageElements[i];
          let src = imageElement.getAttribute("src");
          if (src == null) continue;

          if (src.startsWith("//")) src = "https:" + src;

          urls.push(src);
        }

        navigator.clipboard.writeText(urls.join("\n"));
      },
    },
    "add-url-to-your-marchive": {
      type: "action",
      alias: "add-url-to-your-marchive",
      title: "Add URL to Your Marchive",
      performAction: () => {
        const url = window.location.href;
        if (
          url == null ||
          (url.startsWith("http://") || url.startsWith("https://")) === false
        )
          return;

        const urlEncoded = encodeURIComponent(url);

        window.open("marchive://" + urlEncoded, "_blank");
      },
    },
  };
};
