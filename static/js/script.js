let currentFile = '';
const audioPlayer = document.getElementById('audioPlayer');
const modalElement = document.getElementById('audioModal'); // Define modalElement here
const modal = new bootstrap.Modal(modalElement);

// Pause audio when modal is hidden
modalElement.addEventListener('hide.bs.modal', () => {
    audioPlayer.pause();
    // Optional: Uncomment to reset to start
    // audioPlayer.currentTime = 0;
});

function openAudioModal(filename) {
    currentFile = filename;
    document.getElementById('modalTitle').textContent = filename;
    audioPlayer.src = `/uploads/${filename}`;
    loadBookmarks(filename);
    modal.show();
}

async function loadBookmarks(filename) {
    const response = await fetch(`/bookmarks/${filename}`);
    const bookmarks = await response.json();
    const list = document.getElementById('bookmarksList');
    list.innerHTML = '';
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
        list.appendChild(div);
    });
}

async function addBookmark() {
    const name = document.getElementById('bookmarkName').value.trim();
    if (!name) return alert('Please enter a bookmark name');
    const time = audioPlayer.currentTime;
    const response = await fetch(`/bookmarks/${currentFile}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, time })
    });
    if (response.ok) {
        document.getElementById('bookmarkName').value = '';
        loadBookmarks(currentFile);
    } else {
        alert('Failed to add bookmark');
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

// Expose openAudioModal globally
window.openAudioModal = openAudioModal;