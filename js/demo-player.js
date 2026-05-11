(function () {
    'use strict';

    var audio = document.getElementById('audio-player');
    var fileInput = document.getElementById('file-input');
    var importBtn = document.getElementById('btn-import');
    var songList = document.getElementById('song-list');
    var playBtn = document.getElementById('ctrl-play');
    var prevBtn = document.getElementById('ctrl-prev');
    var nextBtn = document.getElementById('ctrl-next');
    var shuffleBtn = document.getElementById('ctrl-shuffle');
    var repeatBtn = document.getElementById('ctrl-repeat');
    var progressBar = document.getElementById('progress-bar');
    var volumeBar = document.getElementById('volume-bar');
    var volumePct = document.getElementById('volume-pct');
    var timeCurrent = document.getElementById('time-current');
    var timeTotal = document.getElementById('time-total');
    var playerTitle = document.getElementById('player-title');
    var playerSubtitle = document.getElementById('player-subtitle');
    var playerArt = document.getElementById('player-art');

    var playIcon = playBtn.querySelector('svg:first-child');
    var pauseIcon = playBtn.querySelector('svg:last-child');

    var songs = [];
    var currentIndex = -1;
    var shuffle = false;
    var repeat = false;
    var isPlaying = false;
    var selectedIndex = -1;
    var db = null;
    var DB_NAME = 'JuanTuneDemo';
    var DB_VERSION = 1;
    var STORE_NAME = 'songs';

    var DEFAULT_SONGS = [
        {
            name: 'Alan Walker - Fade',
            url: 'assets/music/fade_alan_walker.mp3',
            duration: 0,
            preloaded: true
        },
        {
            name: 'On & On',
            url: 'assets/music/onandon.mp3',
            duration: 0,
            preloaded: true
        },
        {
            name: 'DEAF KEV - Invincible',
            url: 'assets/music/deaf-kev-invincible.mp3',
            duration: 0,
            preloaded: true
        }
    ];

    function formatTime(s) {
        if (isNaN(s) || !isFinite(s)) return '0:00';
        var m = Math.floor(s / 60);
        var sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function formatSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function escapeHtml(text) {
        var d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function openDB() {
        return new Promise(function (resolve, reject) {
            try {
                var req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = function (e) {
                    var d = e.target.result;
                    if (!d.objectStoreNames.contains(STORE_NAME)) {
                        d.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    }
                };
                req.onsuccess = function (e) { db = e.target.result; resolve(db); };
                req.onerror = function () { resolve(null); };
            } catch (e) {
                resolve(null);
            }
        });
    }

    function saveSongToDB(name, arrayBuffer) {
        if (!db) return Promise.resolve();
        return new Promise(function (resolve) {
            try {
                var tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).add({ name: name, data: arrayBuffer, timestamp: Date.now() });
                tx.oncomplete = resolve;
                tx.onerror = resolve;
            } catch (e) { resolve(); }
        });
    }

    function loadAllSongsFromDB() {
        if (!db) return Promise.resolve([]);
        return new Promise(function (resolve) {
            try {
                var tx = db.transaction(STORE_NAME, 'readonly');
                var store = tx.objectStore(STORE_NAME);
                var req = store.getAll();
                req.onsuccess = function () { resolve(req.result || []); };
                req.onerror = function () { resolve([]); };
            } catch (e) { resolve([]); }
        });
    }

    function deleteSongFromDB(id) {
        if (!db) return;
        try {
            var tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(id);
        } catch (e) {}
    }

    function importFiles(files) {
        for (var i = 0; i < files.length; i++) {
            (function (file) {
                if (!file.type.startsWith('audio/')) return;
                var name = file.name.replace(/\.[^/.]+$/, '');
                var reader = new FileReader();
                reader.onload = function (e) {
                    var arrayBuffer = e.target.result;
                    var blob = new Blob([arrayBuffer], { type: file.type });
                    var url = URL.createObjectURL(blob);
                    var song = {
                        file: file,
                        url: url,
                        name: name,
                        duration: 0,
                        preloaded: false,
                        dbId: null,
                        _arrayBuffer: arrayBuffer
                    };
                    songs.push(song);
                    renderPlaylist();
                    if (currentIndex === -1) {
                        selectSong(0, false);
                    }
                    saveSongToDB(name, arrayBuffer);
                };
                reader.readAsArrayBuffer(file);
            })(files[i]);
        }
    }

    function renderPlaylist() {
        songList.innerHTML = '';
        if (songs.length === 0) {
            songList.innerHTML = '<p class="sidebar-empty">Importa un archivo MP3 para comenzar</p>';
            return;
        }
        for (var i = 0; i < songs.length; i++) {
            var s = songs[i];
            var btn = document.createElement('button');
            btn.className = 'song-item' + (i === currentIndex ? ' active' : '');
            if (s._missing) btn.classList.add('song-missing');

            var durText = s.duration > 0 ? formatTime(s.duration) : '--:--';
            btn.innerHTML = '<span class="song-name">' + escapeHtml(s.name) + '</span><span class="song-duration">' + durText + '</span>';

            if (!s.preloaded) {
                var delBtn = document.createElement('span');
                delBtn.className = 'song-delete';
                delBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
                (function (idx) {
                    delBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        deleteSong(idx);
                    });
                })(i);
                btn.appendChild(delBtn);
            }

            btn.addEventListener('click', (function (idx) { return function () { onSongClick(idx); }; })(i));
            songList.appendChild(btn);
        }
    }

    function onSongClick(index) {
        selectSong(index, isPlaying);
    }

    function deleteSong(index) {
        var song = songs[index];
        if (song.preloaded) return;

        if (song.url && song.url.startsWith('blob:')) {
            URL.revokeObjectURL(song.url);
        }
        if (song.dbId != null) {
            deleteSongFromDB(song.dbId);
        }

        songs.splice(index, 1);

        if (songs.length === 0) {
            currentIndex = -1;
            selectedIndex = -1;
            audio.src = '';
            audio.load();
            playerTitle.textContent = 'Ninguna cancion seleccionada';
            playerSubtitle.textContent = 'Importa un archivo MP3 para comenzar';
            playerArt.classList.remove('has-song');
            isPlaying = false;
            playIcon.style.display = '';
            pauseIcon.style.display = 'none';
            progressBar.value = 0;
            timeCurrent.textContent = '0:00';
            timeTotal.textContent = '0:00';
            renderPlaylist();
            return;
        }

        if (index === currentIndex) {
            var newIdx = index < songs.length ? index : songs.length - 1;
            selectSong(newIdx, false);
        } else if (index < currentIndex) {
            currentIndex--;
            renderPlaylist();
        } else {
            renderPlaylist();
        }
    }

    function selectSong(index, autoPlay) {
        if (index < 0 || index >= songs.length) return;
        currentIndex = index;
        selectedIndex = index;
        var song = songs[index];

        audio.src = song.url;
        audio.load();

        playerTitle.textContent = song.name;
        if (song.preloaded) {
            playerSubtitle.textContent = 'NCS - Musica sin copyright';
        } else if (song.file) {
            playerSubtitle.textContent = formatSize(song.file.size);
        } else {
            playerSubtitle.textContent = formatSize(song._arrayBuffer ? song._arrayBuffer.byteLength : 0);
        }
        playerArt.classList.add('has-song');
        renderPlaylist();

        audio.addEventListener('loadedmetadata', function () {
            if (selectedIndex !== currentIndex) return;
            song.duration = audio.duration;
            updateTimeTotal();
            updateProgress();
            renderPlaylist();
        }, { once: true });

        audio.addEventListener('error', function () {
            if (selectedIndex !== currentIndex) return;
            if (song.preloaded && !song._missing) {
                song._missing = true;
                playerSubtitle.textContent = 'Archivo no encontrado. Descarga desde NCS';
                renderPlaylist();
            }
        }, { once: true });

        isPlaying = false;
        playIcon.style.display = '';
        pauseIcon.style.display = 'none';

        if (autoPlay) {
            play();
        }
    }

    function play() {
        if (!audio.src || songs.length === 0) return;
        audio.play().then(function () {
            if (selectedIndex !== currentIndex) return;
            isPlaying = true;
            playIcon.style.display = 'none';
            pauseIcon.style.display = '';
        }).catch(function () {});
    }

    function pause() {
        audio.pause();
        isPlaying = false;
        playIcon.style.display = '';
        pauseIcon.style.display = 'none';
    }

    function togglePlay() {
        if (songs.length === 0) {
            fileInput.click();
            return;
        }
        if (!audio.src || currentIndex === -1) {
            selectSong(0, true);
            return;
        }
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }

    function nextSong() {
        if (songs.length === 0) return;
        var next;
        if (shuffle) {
            do { next = Math.floor(Math.random() * songs.length); }
            while (next === currentIndex && songs.length > 1);
        } else {
            next = (currentIndex + 1) % songs.length;
        }
        selectSong(next, isPlaying);
    }

    function prevSong() {
        if (songs.length === 0) return;
        var prev = (currentIndex - 1 + songs.length) % songs.length;
        selectSong(prev, isPlaying);
    }

    function updateProgress() {
        if (!audio.duration) {
            progressBar.value = 0;
            timeCurrent.textContent = '0:00';
            return;
        }
        var pct = (audio.currentTime / audio.duration) * 100;
        progressBar.value = pct;
        timeCurrent.textContent = formatTime(audio.currentTime);
    }

    function updateTimeTotal() {
        timeTotal.textContent = formatTime(audio.duration);
    }

    importBtn.addEventListener('click', function () { fileInput.click(); });

    fileInput.addEventListener('change', function () {
        if (this.files && this.files.length > 0) {
            importFiles(this.files);
        }
        this.value = '';
    });

    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);

    shuffleBtn.addEventListener('click', function () {
        shuffle = !shuffle;
        this.classList.toggle('active');
    });

    repeatBtn.addEventListener('click', function () {
        repeat = !repeat;
        this.classList.toggle('active');
    });

    progressBar.addEventListener('input', function () {
        if (audio.duration) {
            audio.currentTime = (this.value / 100) * audio.duration;
            updateProgress();
        }
    });

    volumeBar.addEventListener('input', function () {
        var v = parseInt(this.value);
        audio.volume = v / 100;
        volumePct.textContent = v + '%';
    });

    audio.addEventListener('timeupdate', function () { updateProgress(); });

    audio.addEventListener('ended', function () {
        isPlaying = false;
        playIcon.style.display = '';
        pauseIcon.style.display = 'none';
        if (repeat) {
            audio.currentTime = 0;
            play();
        } else {
            nextSong();
        }
    });

    audio.addEventListener('play', function () {
        if (selectedIndex !== currentIndex) return;
        isPlaying = true;
        playIcon.style.display = 'none';
        pauseIcon.style.display = '';
    });

    audio.addEventListener('pause', function () {
        isPlaying = false;
        playIcon.style.display = '';
        pauseIcon.style.display = 'none';
    });

    var demoSection = document.querySelector('.demo-player');
    if (demoSection) {
        demoSection.addEventListener('dragover', function (e) {
            e.preventDefault();
            demoSection.classList.add('drag-over');
        });
        demoSection.addEventListener('dragleave', function () {
            demoSection.classList.remove('drag-over');
        });
        demoSection.addEventListener('drop', function (e) {
            e.preventDefault();
            demoSection.classList.remove('drag-over');
            var files = e.dataTransfer.files;
            if (files.length > 0) { importFiles(files); }
        });
    }

    function init() {
        openDB().then(function () {
            // Load saved songs from IndexedDB
            return loadAllSongsFromDB();
        }).then(function (savedRecords) {
            // Add default NCS songs
            for (var d = 0; d < DEFAULT_SONGS.length; d++) {
                songs.push({
                    name: DEFAULT_SONGS[d].name,
                    url: DEFAULT_SONGS[d].url,
                    duration: 0,
                    preloaded: true,
                    _missing: false
                });
            }

            // Restore user-imported songs from IndexedDB
            for (var r = 0; r < savedRecords.length; r++) {
                (function (record) {
                    var blob = new Blob([record.data], { type: 'audio/mpeg' });
                    var url = URL.createObjectURL(blob);
                    songs.push({
                        name: record.name,
                        url: url,
                        duration: 0,
                        preloaded: false,
                        dbId: record.id,
                        _arrayBuffer: record.data
                    });
                })(savedRecords[r]);
            }

            renderPlaylist();

            if (songs.length > 0) {
                selectSong(0, false);
            }
        }).catch(function () {
            // Fallback: just load defaults without DB
            for (var d = 0; d < DEFAULT_SONGS.length; d++) {
                songs.push({
                    name: DEFAULT_SONGS[d].name,
                    url: DEFAULT_SONGS[d].url,
                    duration: 0,
                    preloaded: true,
                    _missing: false
                });
            }
            renderPlaylist();
            if (songs.length > 0) {
                selectSong(0, false);
            }
        });
    }

    init();

})();
