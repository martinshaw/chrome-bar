import SimpleBar from "simplebar";
import "simplebar/dist/simplebar.css";
import {
  containsObject,
  currentSelectedElementIsInput,
  isAMac,
  isInteger,
  isNumeric,
} from "./utilities";
import { determineActionShortcuts } from "./sources/actions";
import { DOWN_KEY, ESC_KEY, MAC_CMD_KEY, UP_KEY, WIN_CTRL_KEY } from "./keys";

// Set this to `false` when testing and/or making changes to the design
const shouldCancelSearchBar: boolean = true as boolean;

const maxVisibleResults = 5;
const maxLatestUsedShortcuts = 3000;

export const searchSelector = "a,tr,button,.btn";
export type SearchSelectorElementType =
  | HTMLAnchorElement
  | HTMLTableRowElement
  | HTMLButtonElement
  | HTMLIFrameElement;

type ShortcutEntryType = {
  type: "hyperlink" | "action";
  alias: string;
  title: string | undefined;
  element?: HTMLElement;
  actionIcon?: string;
  performAction?: Function;
  filterLogic?: (input: string) => boolean;
};

export type ShortcutEntryListType = {
  [key: string]: ShortcutEntryType | ((input: string) => ShortcutEntryType);
};

let shortcuts: ShortcutEntryListType = {};
let lastKey: number | number | "" = "";
let activateKey: string | number | "" = "";
let resultItems: ShortcutEntryType[] = [];
let simpleBarInstance: SimpleBar | null = null;

// If not in iframe
if (window.self === window.top) {
  setInterval(() => {
    chrome.storage.sync.get(
      {
        eventShowSearchBar: false,
      },
      (settings) => {
        if (settings.eventShowSearchBar === true) {
          chrome.storage.sync.set({
            eventShowSearchBar: false,
          });
          initialize();
        }
      }
    );
  }, 500);
}

document.onmousedown = (event) => {
  lastKey = "";
  if (shouldCancelSearchBar === true) cancelSearchBar();
};

document.addEventListener("visibilitychange", (event) => {
  lastKey = "";
  if (shouldCancelSearchBar === true) cancelSearchBar();
});

const initialize = () => {
  /**
   * If in iframe
   */
  if (window.self !== window.top) {
    chrome.storage.sync.set({
      eventShowSearchBar: true,
    });
  } else if (!document.hidden) {
    /**
     * If outside iframe and tab is active
     */
    chrome.storage.sync.get((settings) => {
      let latestUsedShortcuts: string[] = settings["latestUsedShortcuts"]
        ? settings["latestUsedShortcuts"]
        : [];
      showSearchBar();
      setShortcuts(latestUsedShortcuts);
      fillResultBar();
    });
  }
};

document.onkeydown = (event) => {
  chrome.storage.sync.get(
    {
      activateKey: isAMac() ? MAC_CMD_KEY : WIN_CTRL_KEY,
    },
    (items) => {
      activateKey = parseInt(items.activateKey);
    }
  );

  let currentKey = event.which;

  /* if event is esc */
  if (currentKey === ESC_KEY) {
    if (shouldCancelSearchBar === true) cancelSearchBar();
    lastKey = currentKey;
    return;
  }

  const checkedChoiceElement: HTMLInputElement | null = document.querySelector(
    'input[name="chrome-bar__choice"]:checked'
  );

  /* nav results */
  if (
    checkedChoiceElement != null &&
    (currentKey === UP_KEY || currentKey === DOWN_KEY)
  ) {
    let currentSelectedItem: HTMLLIElement | null =
      checkedChoiceElement.parentElement as HTMLLIElement | null;
    if (currentSelectedItem == null) return;

    /* `up` key event */
    if (currentKey === UP_KEY && null !== currentSelectedItem.nextSibling) {
      const nextSiblingElement =
        currentSelectedItem?.nextSibling as HTMLLIElement | null;
      if (nextSiblingElement == null) return;

      const siblingChoice: HTMLInputElement | null =
        nextSiblingElement.querySelector('input[name="chrome-bar__choice"]');
      if (siblingChoice == null) return;

      nextSiblingElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      siblingChoice.checked = true;
    }

    /* `down` key event */
    if (
      currentKey === DOWN_KEY &&
      null !== currentSelectedItem.previousSibling
    ) {
      const previousSiblingElement =
        currentSelectedItem?.previousSibling as HTMLLIElement | null;
      if (previousSiblingElement == null) return;

      const siblingChoice: HTMLInputElement | null =
        previousSiblingElement.querySelector(
          'input[name="chrome-bar__choice"]'
        );
      if (siblingChoice == null) return;

      previousSiblingElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      siblingChoice.checked = true;
    }

    lastKey = currentKey;
    return;
  }

  if (isNumeric(lastKey) === false || lastKey === "") {
    lastKey = currentKey;
    return;
  }

  let lastKeyWasMeta = [MAC_CMD_KEY, WIN_CTRL_KEY].includes(lastKey);

  if (lastKeyWasMeta === false || currentKey !== activateKey) {
    lastKey = currentKey;
    return;
  }

  initialize();
};

chrome.storage.sync.get((settings) => {
  let displayAutomatically: boolean = true;
  if (
    settings.displayAutomatically === true ||
    settings.displayAutomatically === "true"
  )
    displayAutomatically = true;
  if (
    settings.displayAutomatically === false ||
    settings.displayAutomatically === "false"
  )
    displayAutomatically = false;

  if (
    displayAutomatically === true &&
    currentSelectedElementIsInput() === false
  )
    initialize();
});

let theme: "dark" | "light" = "dark";
chrome.storage.sync.get((settings) => {
  if (["dark", "light"].includes(settings.theme)) theme = settings.theme;
});

const showSearchBar = () => {
  cancelSearchBar();
  const approximateInputHeight = 57;
  const approximateResultItemHeight = 30;
  const resultsMaxHeightRule = `max-height: ${
    approximateInputHeight + approximateResultItemHeight * maxVisibleResults
  }px;`;

  let formElement = document.createElement("form");
  formElement.id = "chrome-bar__wrapper";
  formElement.classList.add("chrome-bar__theme--" + theme);
  formElement.innerHTML = `
<div id="chrome-bar__search"><input id="chrome-bar__search_input" placeholder="Type a link or command" autocomplete="off" /></div>
<ul class="chrome-bar__grid" id="chrome-bar__result" style="${resultsMaxHeightRule}"></ul>`;

  document.getElementsByTagName("body")[0].appendChild(formElement);
  formElement.addEventListener("submit", function (event) {
    event.preventDefault();
    doSearch();
  });

  let inputElement = document.getElementById("chrome-bar__search_input");
  if (inputElement == null) return;

  inputElement.oninput = fillResultBar;
  setTimeout(() => {
    if (inputElement == null || currentSelectedElementIsInput()) return;
    inputElement.focus();
  }, 250);
};

const setShortcuts = (latestUsed: string[]) => {
  shortcuts = {};

  let anchorElements: SearchSelectorElementType[];
  anchorElements = Array.from(document.querySelectorAll(searchSelector));
  anchorElements = getElementsFromFrame(anchorElements);

  anchorElements = Array.from(new Set(anchorElements));

  // Remove if title is an integer
  for (let i = anchorElements.length - 1; i >= 0; i--) {
    let title = getTitleFromElement(anchorElements[i]);
    if (isInteger(title)) {
      anchorElements.splice(i, 1);
    }
  }

  let currentPageLatestUsed = getCurrentPageLatestUsed(
    anchorElements,
    latestUsed
  );

  setShortcutsFromElements(currentPageLatestUsed);
  setShortcutsFromElements(anchorElements);
  shortcuts = { ...shortcuts, ...determineActionShortcuts() };
};

const setShortcutsFromElements = (
  anchorElements: SearchSelectorElementType[]
) => {
  for (let i = 0; i < anchorElements.length; i++) {
    let anchorElement = anchorElements[i];
    let title = getTitleFromElement(anchorElement);
    if (title == null) continue;
    let alias = title.toLowerCase();

    if (title.length > 1 && !(title in shortcuts)) {
      shortcuts[alias] = {
        type: "hyperlink",
        alias: alias,
        title: title,
        element: anchorElement,
      };
    }
  }
};

const getCurrentPageLatestUsed = (
  anchorElements: SearchSelectorElementType[],
  latestUsed: string[]
) => {
  let filteredElements: { [key: string]: SearchSelectorElementType } = {};
  let currentPageLatestUsed: SearchSelectorElementType[] = [];

  for (let i = 0; i < anchorElements.length; i++) {
    let element = anchorElements[i];
    const elementTitle = getTitleFromElement(element);
    if (elementTitle == null) continue;
    let alias = elementTitle.toLowerCase();

    if (latestUsed.indexOf(alias) !== -1 && filteredElements[alias] != null) {
      filteredElements[alias] = element;
    }
  }

  for (let i = 0; i < latestUsed.length; i++) {
    let alias = latestUsed[i];
    if (typeof filteredElements[alias] !== "undefined") {
      currentPageLatestUsed.unshift(filteredElements[alias]);
    }
  }

  return currentPageLatestUsed;
};

const setLatestUsedShortcuts = (element: HTMLElement | null | undefined) => {
  if (element == null) return;

  chrome.storage.sync.get((settings) => {
    let latestUsedShortcuts: string[] = settings["latestUsedShortcuts"]
      ? settings["latestUsedShortcuts"]
      : [];
    let newLatestUsedShortcuts: string[] = [];

    for (let i = 0; i < latestUsedShortcuts.length; i++) {
      let alias = latestUsedShortcuts[i];

      const elementTitle = getTitleFromElement(element);
      if (elementTitle == null) continue;

      if (
        alias !== elementTitle.toLowerCase() &&
        mustKeepLatestUsedShortcut(latestUsedShortcuts, i)
      ) {
        newLatestUsedShortcuts.push(alias);
      }
    }

    const elementTitle = getTitleFromElement(element);
    if (elementTitle == null) return;

    newLatestUsedShortcuts.push(elementTitle.toLowerCase());

    latestUsedShortcuts = newLatestUsedShortcuts;
    chrome.storage.sync.set({ latestUsedShortcuts });
  });
};

/**
 *  Remove old records
 */
const mustKeepLatestUsedShortcut = (
  latestUsedShortcuts: string[],
  index: number
) => {
  return latestUsedShortcuts.length < maxLatestUsedShortcuts || index > 4;
};

const getTitleFromElement = (element: HTMLElement) => {
  if (element.innerText == null) return;
  return element.innerText.replace(/\n|\r|\'|\"/g, "").trim();
};

export const getElementsFromFrame = (
  anchorElements: SearchSelectorElementType[]
) => {
  const frames = document.getElementsByTagName("iframe");
  if (frames == null) return anchorElements;
  if (frames.length < 1) return anchorElements;

  for (let i = 0; i < frames.length; ++i) {
    const contentDocument = frames[i].contentDocument;
    if (contentDocument == null) continue;

    try {
      let frameElements = Array.from(
        contentDocument.querySelectorAll(searchSelector)
      ) as SearchSelectorElementType[];
      anchorElements = [...anchorElements, ...frameElements];
    } catch (exception) {
      /* */
    }
  }

  return anchorElements;
};

const fillResultBar = () => {
  if (simpleBarInstance != null) {
    simpleBarInstance.unMount();
    simpleBarInstance = null;
  }

  resultItems = [];

  let searchResultElement: HTMLUListElement | null = document.querySelector(
    "ul#chrome-bar__result"
  );
  let searchInputElement: HTMLInputElement | null = document.querySelector(
    "input#chrome-bar__search_input"
  );
  if (searchResultElement == null || searchInputElement == null) return;

  let searchInputElementValue = searchInputElement.value;

  searchResultElement.innerText = "";

  resultItems = getResultItemsFromRegex(
    resultItems,
    "^" + searchInputElementValue,
    searchInputElementValue
  );
  resultItems = getResultItemsFromRegex(
    resultItems,
    searchInputElementValue.replace(" ", ".*"),
    searchInputElementValue
  );
  resultItems = getResultItemsFromRegex(
    resultItems,
    searchInputElementValue.split("").join("[^\\s]*\\W*"),
    searchInputElementValue
  );

  resultItems = getResultItemsFromFilterLogic(
    resultItems,
    searchInputElementValue
  );

  let i: number = 0;
  for (let key in resultItems) {
    i++;

    // if (i > maxVisibleResults) break;

    let option = document.createElement("li");

    let checked;
    if (i === 1) {
      checked = "checked";
    } else {
      checked = "";
    }

    let typeIcon: string = ``;
    if (resultItems[key].actionIcon == null) {
      if (resultItems[key].type === "action") typeIcon = `<span> ❗ </span>`;
      if (resultItems[key].type === "hyperlink") typeIcon = `<span> 🔗 </span>`;
    } else {
      typeIcon = `<span height="15" width="15"> ${resultItems[key].actionIcon} </span>`;
    }

    option.innerHTML =
      "<input type='radio' id='chrome-bar__choice__" +
      i +
      "' name='chrome-bar__choice' " +
      checked +
      " value='" +
      resultItems[key].alias +
      "'>" +
      "<label for='chrome-bar__choice__" +
      i +
      "'>" +
      typeIcon +
      resultItems[key].title +
      "</label>";
    searchResultElement.appendChild(option);
  }

  const resultsElement: HTMLUListElement | null = document.querySelector(
    "ul#chrome-bar__result"
  );
  if (resultsElement == null) return;
  simpleBarInstance = new SimpleBar(resultsElement);

  showHelperSelectedAnchor();
};

const showHelperSelectedAnchor = () => {
  hideHelperSelectedAnchor();

  if (typeof resultItems[0] === "undefined") {
    return;
  }
  let element = resultItems[0].element;
  if (typeof element !== "undefined") {
    element.classList.add("helper_selected_anchor");
  }
};

const hideHelperSelectedAnchor = () => {
  let elementsWithClass = document.getElementsByClassName(
    "helper_selected_anchor"
  );
  for (let i = 0; i < elementsWithClass.length; i++) {
    let element = elementsWithClass[i];
    element.classList.remove("helper_selected_anchor");
  }
};

const getResultItemsFromRegex = (
  resultItems: ShortcutEntryType[],
  searchValReg: RegExp | string,
  originalInput: string = ""
) => {
  if (resultItems.length >= maxVisibleResults) return resultItems;

  for (let alias in shortcuts) {
    if (
      containsObject(alias, resultItems, "alias") === false &&
      alias.match(new RegExp(searchValReg, "gi"))
    ) {
      const shortcut = shortcuts[alias];
      resultItems.push(
        typeof shortcut === "function" ? shortcut(originalInput) : shortcut
      );
    }
  }

  return resultItems;
};

const getResultItemsFromFilterLogic = (
  resultItems: ShortcutEntryType[],
  originalInput: string
) => {
  if (resultItems.length >= maxVisibleResults) return resultItems;

  for (let alias in shortcuts) {
    let shortcut = shortcuts[alias];
    if (typeof shortcut === "function") shortcut = shortcut(originalInput);

    if (
      containsObject(alias, resultItems, "alias") === false &&
      shortcut.filterLogic != null &&
      shortcut.filterLogic(originalInput)
    ) {
      resultItems.push(shortcut);
    }
  }

  return resultItems;
};

const cancelSearchBar = () => {
  let wrapperElement = document.getElementById("chrome-bar__wrapper");
  if (null !== wrapperElement) {
    wrapperElement.remove();
  }

  hideHelperSelectedAnchor();
};

const doSearch = () => {
  let selected: HTMLInputElement | null = document.querySelector(
    'input[name="chrome-bar__choice"]:checked'
  );
  if (selected == null) return;

  let key;
  for (let item in shortcuts) {
    if (item === selected.value) {
      key = item;
    }
  }

  if (key == null) return;

  let targetItem = shortcuts[key];
  if (targetItem == null) return;
  if (typeof targetItem === "function") targetItem = targetItem(selected.value);

  setLatestUsedShortcuts(targetItem.element);

  if (typeof targetItem.element !== "undefined") {
    targetItem.element.click();
  }

  if (typeof targetItem.performAction !== "undefined") {
    targetItem.performAction();
  }

  cancelSearchBar();
};
