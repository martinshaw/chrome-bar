// Saves options to chrome.storage
function save_options() {
    const activateKeyElement: HTMLInputElement | null = document.querySelector('input#activate_key');
    if (activateKeyElement == null) return false;

    chrome.storage.sync.set({
        activateKey: activateKeyElement.value
    }, function() {
        const statusElement: HTMLDivElement | null = document.querySelector('div#status');
        const saveButtonElement: HTMLButtonElement | null = document.querySelector('button#save');
        if (statusElement == null || saveButtonElement == null) return false;

        // Update status to let user know options were saved.
        statusElement.textContent = 'Options saved';
        saveButtonElement.style.display = 'none';
        
        setTimeout(
            function() {
                statusElement.textContent = '';
            }, 
            2000
        );
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    const keyPressButtonElement: HTMLButtonElement | null = document.querySelector('button#key_press');
    const statusElement: HTMLDivElement | null = document.querySelector('div#status');
    if (keyPressButtonElement == null || statusElement == null) return false;

    keyPressButtonElement.addEventListener('click', function () {
        statusElement.textContent = 'Now press a key';
    });

    chrome.storage.sync.get({
        activateKey: '17'
    }, function(items) {
        const activateKeyElement: HTMLInputElement | null = document.querySelector('input#activate_key');
        if (activateKeyElement == null) return false;

        activateKeyElement.value = items.activateKey;
    });
}

document.addEventListener('DOMContentLoaded', restore_options);

const saveButtonElement: HTMLButtonElement | null = document.querySelector('button#save');
if (saveButtonElement != null) {
    saveButtonElement.addEventListener('click', save_options);
}

document.onkeydown=function(e) {
    const activateKeyElement: HTMLInputElement | null = document.querySelector('input#activate_key');
    const statusElement: HTMLDivElement | null = document.querySelector('div#status');
    const saveButtonElement: HTMLButtonElement | null = document.querySelector('button#save');
    if (activateKeyElement == null || statusElement == null || saveButtonElement == null) return false;

    activateKeyElement.value = e.which.toString();
    statusElement.textContent = 'Selected key id: ' + e.which.toString();
    saveButtonElement.style.display = 'block';
};