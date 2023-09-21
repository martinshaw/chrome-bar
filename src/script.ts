const maxResult = 10;
const maxLatestUsedShortcuts = 3000;

const searchSelector = 'a,tr,button,.btn';
type SearchSelectorElementType = HTMLAnchorElement | HTMLTableRowElement | HTMLButtonElement | HTMLIFrameElement;

type ShortcutEntryType = {
    alias: string,
    title: string | undefined,
    element?: HTMLElement,
    performAction?: Function,
};

let shortcuts: {[key: string]: ShortcutEntryType} = {};
let lastKey: number | null = null;
let activateKey: string | number | '' = '';
let resultItems: ShortcutEntryType[] = [];

function isElementVisible(element: HTMLElement): element is HTMLElement {
    const rect = element.getBoundingClientRect(),
        vWidth = window.innerWidth || document.documentElement.clientWidth,
        vHeight = window.innerHeight || document.documentElement.clientHeight;

    // Return false if it's not in the viewport
    if (rect.right < 0 || rect.bottom < 0 || rect.left > vWidth || rect.top > vHeight) return false;

    // Return true if any of its four corners are visible
    return (
        element.contains(document.elementFromPoint(rect.left,  rect.top)) ||
        element.contains(document.elementFromPoint(rect.right, rect.top)) ||
        element.contains(document.elementFromPoint(rect.right, rect.bottom)) ||
        element.contains(document.elementFromPoint(rect.left,  rect.bottom))
    );
}

// If not in iframe
if (window.self === window.top) {
    setInterval(function () {
        chrome.storage.sync.get({
            eventShowSearchBar: false
        }, settings => {
            if (settings.eventShowSearchBar === true) {
                chrome.storage.sync.set({
                    eventShowSearchBar: false
                });
                initialize();
            }
        });
    }, 500);
}

document.onmousedown = function (e) {
    lastKey = null;
    cancelSearchBar();
};

// switch tap
document.addEventListener("visibilitychange", event => {
    lastKey = null;
    cancelSearchBar();
})

document.onkeydown=function(e){
    chrome.storage.sync.get({
        activateKey: '91'
    }, items => {
        activateKey = parseInt(items.activateKey);
    });

    let currentKey = e.which;

    /* if event is esc */
    if (currentKey === 27) {
        cancelSearchBar();
        lastKey = currentKey;
        return;
    }

    const checkedChoiceElement: HTMLInputElement | null =  document.querySelector('input[name="chrome-bar__choice"]:checked');

    /* nav results */
    if (checkedChoiceElement != null &&
        (currentKey === 40 || currentKey === 38)
    ) {
        let currentSelectedItem: HTMLLIElement | null = checkedChoiceElement.parentElement as HTMLLIElement | null;
        if (currentSelectedItem == null) return;

        /* up */
        if (currentKey === 40 && null !== currentSelectedItem.nextSibling) {
            const nextSiblingElement = currentSelectedItem?.nextSibling as HTMLLIElement | null;
            if (nextSiblingElement == null) return;

            const siblingChoice: HTMLInputElement | null = nextSiblingElement.querySelector('input[name="chrome-bar__choice"]');
            if (siblingChoice == null) return;

            siblingChoice.checked = true;
        }

        /* down */
        if (currentKey === 38 && null !== currentSelectedItem.previousSibling) {
            const previousSiblingElement = currentSelectedItem?.previousSibling as HTMLLIElement | null;
            if (previousSiblingElement == null) return;

            const siblingChoice: HTMLInputElement | null = previousSiblingElement.querySelector('input[name="chrome-bar__choice"]');
            if (siblingChoice == null) return;

            siblingChoice.checked = true;
        }

        lastKey = currentKey;
        return;
    }

    const cmdKey = 91

    // Only trigger popup if last key is shift
    if (lastKey !== cmdKey || currentKey !== activateKey) {
        lastKey = currentKey;
        return;
    }

    initialize();
};

function initialize() {
    /**
     * If in iframe
     */
    if (window.self !== window.top) {
        chrome.storage.sync.set({
            eventShowSearchBar: true
        });
    }
    /**
     * If outside iframe and tab is active
     */
    else if (!document.hidden) {
        chrome.storage.sync.get(settings => {
            let latestUsedShortcuts: string[] = settings["latestUsedShortcuts"] ? settings["latestUsedShortcuts"] : [];
            showSearchBar();
            setShortcuts(latestUsedShortcuts);
            fillResultBar();
        });
    }
}

function showSearchBar() {
    cancelSearchBar();
    let formElement = document.createElement('form');
    formElement.id = 'chrome-bar__wrapper';
    formElement.classList.add('chrome-bar__theme--dark')
    formElement.innerHTML =
        '<div id="chrome-bar__search"><input id="chrome-bar__search_input" placeholder="Search" autocomplete="off" /></div>' +
        '<ul class="chrome-bar__grid" id="chrome-bar__result" ></ul>';

    document.getElementsByTagName('body')[0].appendChild(formElement);
    formElement.addEventListener('submit', function(event){event.preventDefault();doSearch()});

    let inputElement = document.getElementById("chrome-bar__search_input");
    if (inputElement == null) return;

    inputElement.oninput = fillResultBar;
    setTimeout(() => { 
        if (inputElement == null) return;
        inputElement.focus() 
    }, 300);
}

function uniqueSet<T extends any>(a: T[]) { return Array.from(new Set(a)) }

function setShortcuts(latestUsed: string[]) {
    shortcuts = {};

    let anchorElements: SearchSelectorElementType[];
    anchorElements = Array.from(document.querySelectorAll(searchSelector));
    anchorElements = getElementsFromFrame(anchorElements);

    anchorElements = Array.from(new Set(anchorElements));

    // remove if title is an integer
    for(let i = anchorElements.length - 1; i >= 0; i--) {
        let title = getTitleFromElement(anchorElements[i]);
        if(isInteger(title)) {
            anchorElements.splice(i, 1);
        }
    }

    let currentPageLatestUsed = getCurrentPageLatestUsed(anchorElements, latestUsed);

    setShortcutsFromElements(currentPageLatestUsed);
    shortcuts['home'] = {
        'alias': 'home', 
        'title': 'Home', 
        'performAction': () => { 
            window.location.href = '/'; 
        }
    };
    setShortcutsFromElements(anchorElements);
}

function setShortcutsFromElements(anchorElements: SearchSelectorElementType[]) {
    for (let i = 0; i < anchorElements.length; i++) {
        let anchorElement = anchorElements[i];
        let title = getTitleFromElement(anchorElement);
        if (title == null) continue;
        let alias = title.toLowerCase();

        if (title.length > 1 &&
            !(title in shortcuts)
        ) {
            shortcuts[alias] = {
                'alias': alias,
                'title': title,
                'element': anchorElement
            };
        }
    }
}

function getCurrentPageLatestUsed(anchorElements: SearchSelectorElementType[], latestUsed: string[]) {
    let filteredElements: {[key: string]: SearchSelectorElementType} = {};
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
        if (typeof filteredElements[alias] !== 'undefined') {
            currentPageLatestUsed.unshift(filteredElements[alias]);
        }
    }

    return currentPageLatestUsed;
}

function setLatestUsedShortcuts(element: HTMLElement | null | undefined) {
    if (element == null) return;

    chrome.storage.sync.get(settings => {
        let latestUsedShortcuts: string[] = settings["latestUsedShortcuts"] ? settings["latestUsedShortcuts"] : [];
        let newLatestUsedShortcuts: string[] = [];

        for (let i = 0; i < latestUsedShortcuts.length; i++) {
            let alias = latestUsedShortcuts[i];
            
            const elementTitle = getTitleFromElement(element);
            if (elementTitle == null) continue;

            if (alias !== elementTitle.toLowerCase() && mustKeepLatestUsedShortcut(latestUsedShortcuts, i)) {
                newLatestUsedShortcuts.push(alias);
            }
        }
            
        const elementTitle = getTitleFromElement(element);
        if (elementTitle == null) return;

        newLatestUsedShortcuts.push(elementTitle.toLowerCase());

        latestUsedShortcuts = newLatestUsedShortcuts;
        chrome.storage.sync.set({latestUsedShortcuts});
    });
}

/**
 *  Remove old records
 **/
function mustKeepLatestUsedShortcut(latestUsedShortcuts: string[], index: number) {
    return latestUsedShortcuts.length < maxLatestUsedShortcuts || index > 4;
}

function getTitleFromElement(element: HTMLElement) {
    if (element.innerText == null) return;

    return element.innerText.replace(/\n|\r|\'|\"/g, "").trim();
}

function getElementsFromFrame(anchorElements: SearchSelectorElementType[]) {
    const frames = document.getElementsByTagName("iframe");
    if (frames == null) return anchorElements;
    if (frames.length < 1) return anchorElements;

    for (let i = 0; i < frames.length; ++i)
    {
        const contentDocument = frames[i].contentDocument;
        if (contentDocument == null) continue;

        try {
            let frameElements = Array.from(contentDocument.querySelectorAll(searchSelector)) as SearchSelectorElementType[];
            anchorElements = [...anchorElements, ...frameElements];
        } catch (exception){ /* */ }
    }

    return anchorElements;
}

function fillResultBar() {
    resultItems = [];

    let searchResultElement: HTMLUListElement | null = document.querySelector('ul#chrome-bar__result');
    let searchInputElement: HTMLInputElement | null = document.querySelector('input#chrome-bar__search_input');
    if (searchResultElement == null || searchInputElement == null) return;

    let searchInputElementValue = searchInputElement.value;

    searchResultElement.innerText = '';

    resultItems = getResultItemsFromRegex(resultItems, '^' + searchInputElementValue);
    resultItems = getResultItemsFromRegex(resultItems, searchInputElementValue.replace(" ", ".*"));
    resultItems = getResultItemsFromRegex(resultItems, searchInputElementValue.split('').join('[^\\s]*\\W*'));

    let i: number = 0;
    for (let key in resultItems){
        i++;
        if (i > maxResult) {
            break;
        }

        let option = document.createElement("li");

        let checked;
        if (i === 1) {
            checked = 'checked';
        } else {
            checked = '';
        }

        option.innerHTML =
            "<input type='radio' id='chrome-bar__choice__" + i + "' name='chrome-bar__choice' " + checked + " value='" + resultItems[key].alias + "'>" +
            "<label for='chrome-bar__choice__" + i + "'>" + resultItems[key].title + "</label>";
        searchResultElement.appendChild(option);
    }

    showHelperSelectedAnchor();
}

function showHelperSelectedAnchor() {
    hideHelperSelectedAnchor();

    if (typeof resultItems[0] === 'undefined') {
      return;
    }
    let element = resultItems[0].element;
    if (typeof element !== 'undefined') {
      element.classList.add('helper_selected_anchor');
    }
}

function hideHelperSelectedAnchor() {
    let elementsWithClass = document.getElementsByClassName('helper_selected_anchor');
    for(let i = 0; i < elementsWithClass.length; i++) {
        let element = elementsWithClass[i];
        element.classList.remove('helper_selected_anchor');
    }
}

function getResultItemsFromRegex(resultItems: ShortcutEntryType[], searchValReg: RegExp | string) {
    if (resultItems.length >= maxResult) {
        return resultItems;
    }

    for (let alias in shortcuts){
        if (containsObject(alias, resultItems, 'alias') === false && alias.match(new RegExp(searchValReg, "gi"))) {
            resultItems.push(shortcuts[alias]);
        }
    }

    return resultItems;
}

function cancelSearchBar() {
    let wrapperElement = document.getElementById('chrome-bar__wrapper');
    if (null !== wrapperElement) {
        wrapperElement.remove();
    }

    hideHelperSelectedAnchor();
}

function doSearch() {
    let selected: HTMLInputElement | null = document.querySelector('input[name="chrome-bar__choice"]:checked');
    if (selected == null) return;

    let key;
    for (let item in shortcuts) {
        if (item === selected.value) {
            key = item;
        }
    }

    if (key == null) return;

    let targetItem = shortcuts[key];

    setLatestUsedShortcuts(targetItem.element);

    if (typeof targetItem.element !== 'undefined') {
        targetItem.element.click();
    }

    if (typeof targetItem.performAction !== 'undefined') {
        targetItem.performAction();
    }

    cancelSearchBar();
}

function containsObject(obj: Object, list: any[], suffix: string = '') {
    let i;
    for (i in list) {
        if (list.hasOwnProperty(i) && list[i][suffix] === obj) {
            return true;
        }
    }

    return false;
}

function isInteger(n: any): n is number {
    return n == +n && n == (n|0);
}