let currentFile = '';
const audioPlayer = document.getElementById('audioPlayer');
const modalElement = document.getElementById('audioModal');
const modal = new bootstrap.Modal(modalElement);
const skipModeSelect = document.getElementById('skipMode');
const subtitleDisplay = document.getElementById('subtitleDisplay');
const toggleSubtitlesBtn = document.getElementById('toggleSubtitles');
const bookmarkNameInput = document.getElementById('bookmarkName');
const toggleViewModeBtn = document.getElementById('toggleViewMode');
const bookmarksList = document.getElementById('bookmarksList');
const addBookmarkBtn = document.getElementById('addBookmarkBtn');

let recognition;
let isRecognizing = false;

document.addEventListener('keydown', handleKeyboardControls);

modalElement.addEventListener('hide.bs.modal', () => {
    audioPlayer.pause();
    stopRecognition();
});

// Add event listener for view mode toggle
toggleViewModeBtn.addEventListener('click', () => {
    if (bookmarksList.classList.contains('vertical-mode')) {
        bookmarksList.classList.remove('vertical-mode');
        bookmarksList.classList.add('column-mode');
        toggleViewModeBtn.innerHTML = '<i class="bi bi-columns"></i> Switch to Vertical';
    } else {
        bookmarksList.classList.remove('column-mode');
        bookmarksList.classList.add('vertical-mode');
        toggleViewModeBtn.innerHTML = '<i class="bi bi-list"></i> Switch to Columns';
    }
});

bookmarkNameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent any default form submission behavior
        addBookmark();

        event.target.blur(); // Remove focus from the input field after adding a bookmark
    }
});

function openAudioModal(filename) {
    currentFile = filename;
    document.getElementById('modalTitle').textContent = filename;
    audioPlayer.src = `/uploads/${filename}`;
    loadBookmarks(filename);
    updatePlayPauseButton(); // Added
    modal.show();

    audioPlayer.onplay = updatePlayPauseButton; // Added
    audioPlayer.onpause = updatePlayPauseButton; // Added

    // Add focus to audio player for keyboard accessibility
    audioPlayer.focus();
}

// Add this new function to handle keyboard events
function handleKeyboardControls(event) {
    // Only handle keyboard events when modal is open
    if (!modal._isShown) return;

    // Ignore keyboard controls if an input element is focused
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
        return; // Do not process keyboard shortcuts when typing
    }

    // Prevent default behavior for these keys when modal is open
    switch (event.key) {
        case ' ':
            event.preventDefault(); // Prevent page scrolling
            togglePlayPause();
            break;
        case 'ArrowLeft':
            skipBackward();
            break;
        case 'ArrowRight':
            skipForward();
            break;
    }
}

// Added audio control functions
function togglePlayPause() {
    if (audioPlayer.paused) {
        audioPlayer.play();
    } else {
        audioPlayer.pause();
    }
}

function updatePlayPauseButton() {
    const icon = document.getElementById('playPauseIcon');
    const text = document.getElementById('playPauseText');

    if (audioPlayer.paused) {
        icon.className = 'bi bi-play';
        text.textContent = 'Play';
    } else {
        icon.className = 'bi bi-pause';
        text.textContent = 'Pause';
    }
}

function skipForward() {
    const skipTimeInput = parseFloat(document.getElementById('skipTime').value);
    const skipMode = skipModeSelect.value;
    const skipTime = skipMode === 'minutes' ? skipTimeInput * 60 : skipTimeInput;
    audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + skipTime);
}

function skipBackward() {
    const skipTimeInput = parseFloat(document.getElementById('skipTime').value);
    const skipMode = skipModeSelect.value;
    const skipTime = skipMode === 'minutes' ? skipTimeInput * 60 : skipTimeInput;
    audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - skipTime);
}

async function loadBookmarks(filename) {
    const response = await fetch(`/bookmarks/${filename}`);
    const bookmarks = await response.json();

    const sections = {
        1: document.querySelector('#part1Bookmarks .bookmark-section'),
        2: document.querySelector('#part2Bookmarks .bookmark-section'),
        3: document.querySelector('#part3Bookmarks .bookmark-section'),
        4: document.querySelector('#part4Bookmarks .bookmark-section')
    };
    Object.values(sections).forEach(section => section.innerHTML = '');

    bookmarks.forEach(bm => {
        const div = document.createElement('div');
        div.className = 'bookmark-item';

        const playBtn = document.createElement('button');
        playBtn.textContent = `${bm.name} (${bm.time.toFixed(2)}s)`;
        playBtn.onclick = () => audioPlayer.currentTime = bm.time;

        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'bi bi-trash text-danger';
        deleteIcon.onclick = () => deleteBookmark(bm.id);

        div.appendChild(playBtn);
        div.appendChild(deleteIcon);

        sections[bm.part].appendChild(div);
    });
}

function initRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
        subtitleDisplay.textContent = 'Speech recognition not supported in this browser.';
        toggleSubtitlesBtn.disabled = true;
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; // Adjust language as needed

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        subtitleDisplay.textContent = transcript;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        subtitleDisplay.textContent = 'Error generating subtitles';
    };

    recognition.onend = () => {
        if (isRecognizing && !audioPlayer.paused) {
            recognition.start(); // Restart if audio is still playing
        }
    };
}

function startRecognition() {
    if (!recognition) initRecognition();
    if (!isRecognizing && !audioPlayer.paused) {
        recognition.start();
        isRecognizing = true;
        toggleSubtitlesBtn.textContent = 'Disable Subtitles';
        toggleSubtitlesBtn.classList.remove('btn-outline-secondary');
        toggleSubtitlesBtn.classList.add('btn-secondary');
    }
}

function stopRecognition() {
    if (recognition && isRecognizing) {
        recognition.stop();
        isRecognizing = false;
        subtitleDisplay.textContent = '';
        toggleSubtitlesBtn.textContent = 'Enable Subtitles';
        toggleSubtitlesBtn.classList.remove('btn-secondary');
        toggleSubtitlesBtn.classList.add('btn-outline-secondary');
    }
}

toggleSubtitlesBtn.addEventListener('click', () => {
    if (isRecognizing) {
        stopRecognition();
    } else {
        startRecognition();
    }
});

audioPlayer.addEventListener('play', () => {
    if (isRecognizing) startRecognition();
});

audioPlayer.addEventListener('pause', () => {
    stopRecognition();
});

async function addBookmark() {
    const name = document.getElementById('bookmarkName').value.trim();
    const part = document.getElementById('bookmarkPart').value;
    if (!name) return alert('Please enter a bookmark name');

    const buttonText = addBookmarkBtn.querySelector('.button-text');
    const spinner = addBookmarkBtn.querySelector('.spinner-border');
    addBookmarkBtn.disabled = true;
    buttonText.classList.add('d-none');
    spinner.classList.remove('d-none');

    const time = audioPlayer.currentTime;
    try {
        const response = await fetch(`/bookmarks/${currentFile}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, time, part })
        });
        if (response.ok) {
            bookmarkNameInput.value = '';
            loadBookmarks(currentFile);
        } else {
            alert('Failed to add bookmark');
        }
    } catch (error) {
        console.error('Error adding bookmark:', error);
        alert('An error occurred while adding the bookmark');
    } finally {
        addBookmarkBtn.disabled = false;
        buttonText.classList.remove('d-none');
        spinner.classList.add('d-none');
    }
}

async function deleteBookmark(id) {
    const response = await fetch(`/bookmarks/${currentFile}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    if (response.ok) {
        loadBookmarks(currentFile);
    } else {
        alert('Failed to delete bookmark');
    }
}

async function clearBookmarks() {
    if (!confirm('Are you sure you want to clear all bookmarks for this file?')) return;
    const response = await fetch(`/bookmarks/${currentFile}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    if (response.ok) {
        loadBookmarks(currentFile);
    } else {
        alert('Failed to clear bookmarks');
    }
}

window.openAudioModal = openAudioModal;