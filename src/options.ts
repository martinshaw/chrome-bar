import keycode from "keycode";

const displayCurrentKeyCombination = (key: number) => {
    const currentKeyLabelElement: HTMLSpanElement | null = document.querySelector('label#current-key-combination span');
    if (currentKeyLabelElement == null) return false;

    currentKeyLabelElement.textContent = keycode(key);
}

// Restores select box and checkbox state using the preferences
const restore_options = () => {
    const keyPressButtonElement: HTMLButtonElement | null = document.querySelector('button#key-press');
    const statusElement: HTMLDivElement | null = document.querySelector('div#status');
    if (keyPressButtonElement == null || statusElement == null) return false;

    keyPressButtonElement.addEventListener('click', () => {
        statusElement.textContent = 'Now press a key';
    });

    chrome.storage.sync.get({
        theme: 'dark',
        displayAutomatically: true,
        activateKey: '17',
    }, function(items) {
        const themeSelectElement: HTMLSelectElement | null = document.querySelector('select#theme');
        if (themeSelectElement == null) return false;

        themeSelectElement.value = items.theme;

        const displayAutomaticallyCheckboxElement: HTMLInputElement | null = document.querySelector('input#display-automatically');
        if (displayAutomaticallyCheckboxElement == null) return false;

        displayAutomaticallyCheckboxElement.checked = items.displayAutomatically;

        const activateKeyElement: HTMLInputElement | null = document.querySelector('input#activate-key');
        if (activateKeyElement == null) return false;

        activateKeyElement.value = items.activateKey;
        displayCurrentKeyCombination(parseInt(items.activateKey));
    });
}

// Saves options to chrome.storage
const save_options = () => {
    const themeSelectElement: HTMLSelectElement | null = document.querySelector('select#theme');
    if (themeSelectElement == null) return false;

    const displayAutomaticallyCheckboxElement: HTMLInputElement | null = document.querySelector('input#display-automatically');
    if (displayAutomaticallyCheckboxElement == null) return false;

    const activateKeyElement: HTMLInputElement | null = document.querySelector('input#activate-key');
    if (activateKeyElement == null) return false;

    chrome.storage.sync.set({
        theme: themeSelectElement.value,
        displayAutomatically: displayAutomaticallyCheckboxElement.checked,
        activateKey: activateKeyElement.value,
    }, function() {
        const statusElement: HTMLDivElement | null = document.querySelector('div#status');
        if (statusElement == null) return false;

        // Update status to let user know options were saved.
        statusElement.textContent = 'Options saved';
        
        setTimeout( () => { statusElement.textContent = '' }, 2000);

        displayCurrentKeyCombination(parseInt(activateKeyElement.value));
    });
}

document.addEventListener('DOMContentLoaded', restore_options);

const saveButtonElement: HTMLButtonElement | null = document.querySelector('button#save');
if (saveButtonElement != null) {
    saveButtonElement.addEventListener('click', save_options);
}

document.onkeydown = (event) => {
    const activateKeyElement: HTMLInputElement | null = document.querySelector('input#activate-key');
    const statusElement: HTMLDivElement | null = document.querySelector('div#status');
    if (activateKeyElement == null || statusElement == null) return false;

    activateKeyElement.value = event.which.toString();
    statusElement.textContent = 'Selected key: ' + keycode(event.which);
};