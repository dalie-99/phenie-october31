document.addEventListener("DOMContentLoaded", () => {

    // =========================================
    // 1. SIDEBAR NAVIGATION
    // =========================================

    const sidebarLinks = document.querySelectorAll(".sidebar-nav a");

    sidebarLinks.forEach(link => {
        link.addEventListener("click", () => {
            sidebarLinks.forEach(item => item.classList.remove("active"));
            link.classList.add("active");
        });
    });


    // =========================================
    // 2. MODAL / NOTE FUNCTIONALITY
    // Safely runs only if modal elements exist.
    // =========================================

    const modal = document.getElementById("modal");
    const modalTitle = document.getElementById("modalTitle");
    const modalText = document.getElementById("modalText");
    const modalClose = document.getElementById("modalClose");

    function openNote(title, message) {
        if (!modal || !modalTitle || !modalText) return;

        modalTitle.textContent = title;
        modalText.textContent = message;
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeModal() {
        if (!modal) return;

        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
    }

    document.querySelectorAll("[data-letter]").forEach(button => {
        button.addEventListener("click", () => {
            const [title, ...message] = button.dataset.letter.split("|");
            openNote(title, message.join("|"));
        });
    });

    document.querySelectorAll("[data-note]").forEach(button => {
        button.addEventListener("click", () => {
            openNote("A little memory", button.dataset.note);
        });
    });

    if (modalClose) {
        modalClose.addEventListener("click", closeModal);
    }

    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) closeModal();
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") closeModal();
        });
    }


    // =========================================
    // 2B. LOVE LETTER ENVELOPES
    // =========================================

    const loveLetterCards = document.querySelectorAll(".love-letter-card");

    loveLetterCards.forEach(card => {

        const envelope = card.querySelector(".letter-envelope");
        const paper = card.querySelector(".love-letter-paper");
        const closeButton = card.querySelector(".close-letter");

        if (!envelope || !paper) return;

        function setLetterOpen(isOpen) {

            card.classList.toggle("is-open", isOpen);
            envelope.classList.toggle("is-open", isOpen);

            envelope.setAttribute("aria-expanded", String(isOpen));

            paper.setAttribute("aria-hidden", String(!isOpen));
            paper.inert = !isOpen;
        }

        envelope.addEventListener("click", () => {

            const willOpen = !card.classList.contains("is-open");

            // Close all other letters first.
            loveLetterCards.forEach(otherCard => {

                const otherEnvelope =
                    otherCard.querySelector(".letter-envelope");

                const otherPaper =
                    otherCard.querySelector(".love-letter-paper");

                otherCard.classList.remove("is-open");

                if (otherEnvelope) {
                    otherEnvelope.classList.remove("is-open");
                    otherEnvelope.setAttribute("aria-expanded", "false");
                }

                if (otherPaper) {
                    otherPaper.setAttribute("aria-hidden", "true");
                    otherPaper.inert = true;
                }

            });

            // Open the selected letter.
            setLetterOpen(willOpen);

        });

        // Fold the letter when the close button is clicked.
        closeButton?.addEventListener("click", () => {

            setLetterOpen(false);
            envelope.focus();

        });

    });


    // =========================================
    // 3. AUTOMATIC GALLERY ORGANIZATION
    // =========================================

    function getMediaDetails(card) {

        const media = card.querySelector("img, video");

        if (!media) return null;

        let width;
        let height;
        let type;

        if (media.tagName === "IMG") {
            width = media.naturalWidth;
            height = media.naturalHeight;
            type = "photo";
        } else {
            width = media.videoWidth;
            height = media.videoHeight;
            type = "video";
        }

        // Wait until the browser knows the dimensions.
        if (!width || !height) return null;

        return {
            type,
            orientation: width > height ? "landscape" : "portrait"
        };
    }


    function waitForMedia(media) {

        return new Promise(resolve => {

            const isVideo = media.tagName === "VIDEO";

            const isReady = isVideo
                ? media.readyState >= 1 && media.videoWidth > 0
                : media.complete && media.naturalWidth > 0;

            if (isReady) {
                resolve();
                return;
            }

            let finished = false;

            function finish() {
                if (finished) return;

                finished = true;
                resolve();
            }

            media.addEventListener(
                isVideo ? "loadedmetadata" : "load",
                finish,
                { once: true }
            );

            media.addEventListener("error", finish, { once: true });
        });
    }


    async function organizeGallery(gallery) {

        const cards = Array.from(gallery.children).filter(card =>
            card.classList.contains("memory-photo") &&
            card.querySelector("img, video")
        );

        if (!cards.length) return;

        // Keep the original order for items in the same group.
        const originalPositions = new Map(
            cards.map((card, index) => [card, index])
        );

        const mediaElements = cards.map(card =>
            card.querySelector("img, video")
        );

        // Wait for all media to load their dimensions.
        await Promise.all(mediaElements.map(waitForMedia));

        const groupOrder = {
            "photo-landscape": 1,
            "photo-portrait": 2,
            "video-landscape": 3,
            "video-portrait": 4
        };

        // Classify each card.
        const classifiedCards = cards.map(card => {

            const details = getMediaDetails(card);

            if (!details) {
                return {
                    card,
                    group: 99
                };
            }

            const groupName =
                `${details.type}-${details.orientation}`;

            card.classList.remove(
                "landscape",
                "portrait",
                "photo-card",
                "video-card"
            );

            card.classList.add(details.orientation);

            card.classList.add(
                details.type === "photo" ? "photo-card" : "video-card"
            );

            return {
                card,
                group: groupOrder[groupName]
            };
        });

        // Sort by media type, then orientation.
        classifiedCards.sort((a, b) => {

            if (a.group !== b.group) {
                return a.group - b.group;
            }

            return (
                originalPositions.get(a.card) -
                originalPositions.get(b.card)
            );
        });

        // Put the sorted cards back into the original gallery.
        classifiedCards.forEach(item => {
            gallery.appendChild(item.card);
        });
    }


    // Organize all galleries that contain photos or videos.
    document.querySelectorAll(".memory-gallery").forEach(gallery => {
        organizeGallery(gallery);
    });


    // =========================================
    // 4. OUR MUSIC ROOM - PLAYLIST PLAYER
    // =========================================

    const playlistContainer = document.querySelector(".playlist-list");

    if (playlistContainer) {

        // Read the original songs before replacing their old layout.
        const originalItems = Array.from(
            playlistContainer.querySelectorAll(".playlist-item")
        );

        const tracks = originalItems.map(item => {

            const source = item.querySelector("audio source");

            if (!source) return null;

            const originalTitle =
                item.querySelector("p")?.textContent.trim() || "Untitled";

            // Remove the original playlist number.
            const title = originalTitle.replace(/^\d+\.\s*/, "");

            return {
                title,
                src: source.getAttribute("src"),
                type: source.getAttribute("type") || ""
            };

        }).filter(track => track && track.src);

        if (tracks.length) {

            let currentTrack = 0;

            // One audio player for the entire playlist.
            const audio = new Audio();
            audio.preload = "metadata";


            // -------------------------------------
            // PLAYER CONTAINER
            // -------------------------------------

            const player = document.createElement("div");
            player.className = "music-player";

            player.innerHTML = `
                <div class="music-player-header">

                    <div class="music-cover">
                        <span>♫</span>
                    </div>

                    <div class="music-now-playing">
                        <span class="music-label">NOW PLAYING</span>
                        <h3 class="current-song">Select a song</h3>
                        <p class="current-artist">
                            A little piece of our story ♡
                        </p>
                    </div>

                </div>

                <div class="music-progress-area">

                    <input
                        type="range"
                        class="music-progress"
                        min="0"
                        max="100"
                        value="0"
                        aria-label="Song progress"
                    >

                    <div class="music-time">
                        <span class="current-time">0:00</span>
                        <span class="total-time">0:00</span>
                    </div>

                </div>

                <div class="music-controls">

                    <button
                        type="button"
                        class="previous-track"
                        aria-label="Previous song"
                    >|◀</button>

                    <button
                        type="button"
                        class="play-track"
                        aria-label="Play song"
                    >▶</button>

                    <button
                        type="button"
                        class="next-track"
                        aria-label="Next song"
                    >▶|</button>

                </div>

                <p class="music-caption">
                    a little soundtrack of us ♡
                </p>
            `;


            // -------------------------------------
            // PLAYLIST HEADING
            // -------------------------------------

            const playlistHeading = document.createElement("div");
            playlistHeading.className = "playlist-heading";

            playlistHeading.innerHTML = `
                <div>
                    <span class="music-label">OUR COLLECTION</span>
                    <h3>Our Little Playlist ♡</h3>
                </div>

                <span class="song-count">
                    ${tracks.length} songs
                </span>
            `;


            // -------------------------------------
            // PLAYLIST SONGS
            // -------------------------------------

            const trackList = document.createElement("div");
            trackList.className = "music-track-list";

            const trackElements = [];

            tracks.forEach((track, index) => {

                const item = document.createElement("button");

                item.type = "button";
                item.className = "music-track";

                item.innerHTML = `
                    <span class="track-number">
                        ${String(index + 1).padStart(2, "0")}
                    </span>

                    <span class="track-icon">♫</span>

                    <span class="track-details">
                        <span class="track-title"></span>
                        <span class="track-subtitle">
                            A song in our collection
                        </span>
                    </span>

                    <span class="track-status">♡</span>
                `;

                // Use textContent so song titles display safely.
                item.querySelector(".track-title").textContent =
                    track.title;

                item.addEventListener("click", () => {
                    loadTrack(index, true);
                });

                trackElements.push(item);
                trackList.appendChild(item);
            });


            // Replace only the old playlist contents.
            playlistContainer.replaceChildren(
                player,
                playlistHeading,
                trackList
            );


            // -------------------------------------
            // PLAYER ELEMENTS
            // -------------------------------------

            const playButton =
                player.querySelector(".play-track");

            const previousButton =
                player.querySelector(".previous-track");

            const nextButton =
                player.querySelector(".next-track");

            const songTitle =
                player.querySelector(".current-song");

            const progress =
                player.querySelector(".music-progress");

            const currentTime =
                player.querySelector(".current-time");

            const totalTime =
                player.querySelector(".total-time");


            // -------------------------------------
            // FORMAT SONG TIME
            // -------------------------------------

            function formatTime(seconds) {

                if (!Number.isFinite(seconds)) {
                    return "0:00";
                }

                const minutes = Math.floor(seconds / 60);

                const remainingSeconds =
                    Math.floor(seconds % 60);

                return `${minutes}:${String(
                    remainingSeconds
                ).padStart(2, "0")}`;
            }


            // -------------------------------------
            // UPDATE ACTIVE SONG
            // -------------------------------------

            function updateActiveTrack() {

                trackElements.forEach((item, index) => {

                    const isActive = index === currentTrack;

                    item.classList.toggle(
                        "active-track",
                        isActive
                    );

                    item.querySelector(
                        ".track-status"
                    ).textContent = isActive ? "♫" : "♡";

                    item.setAttribute(
                        "aria-current",
                        isActive ? "true" : "false"
                    );
                });

                songTitle.textContent =
                    tracks[currentTrack].title;
            }


            // -------------------------------------
            // LOAD SONG
            // -------------------------------------

            function loadTrack(index, autoplay = false) {

                if (index < 0) {
                    index = tracks.length - 1;
                }

                if (index >= tracks.length) {
                    index = 0;
                }

                currentTrack = index;

                audio.pause();

                audio.src = tracks[currentTrack].src;
                audio.load();

                progress.value = 0;
                currentTime.textContent = "0:00";
                totalTime.textContent = "0:00";

                updateActiveTrack();

                playButton.textContent = "▶";
                playButton.setAttribute("aria-label", "Play song");

                if (autoplay) {
                    playAudio();
                }
            }


            // -------------------------------------
            // PLAY SONG
            // -------------------------------------

            async function playAudio() {

                try {
                    await audio.play();
                } catch (error) {
                    console.warn(
                        "Unable to play this song:",
                        tracks[currentTrack].title,
                        error
                    );
                }
            }


            // -------------------------------------
            // PLAY / PAUSE
            // -------------------------------------

            playButton.addEventListener("click", () => {

                if (audio.paused) {
                    playAudio();
                } else {
                    audio.pause();
                }
            });

            audio.addEventListener("play", () => {

                playButton.textContent = "Ⅱ";

                playButton.setAttribute(
                    "aria-label",
                    "Pause song"
                );
            });

            audio.addEventListener("pause", () => {

                playButton.textContent = "▶";

                playButton.setAttribute(
                    "aria-label",
                    "Play song"
                );
            });


            // -------------------------------------
            // PREVIOUS SONG
            // -------------------------------------

            previousButton.addEventListener("click", () => {

                if (audio.currentTime > 3) {
                    audio.currentTime = 0;
                } else {
                    loadTrack(currentTrack - 1, true);
                }
            });


            // -------------------------------------
            // NEXT SONG
            // -------------------------------------

            nextButton.addEventListener("click", () => {
                loadTrack(currentTrack + 1, true);
            });


            // -------------------------------------
            // SONG PROGRESS
            // -------------------------------------

            audio.addEventListener("loadedmetadata", () => {

                totalTime.textContent =
                    formatTime(audio.duration);
            });

            audio.addEventListener("timeupdate", () => {

                if (!Number.isFinite(audio.duration)) return;

                progress.value =
                    (audio.currentTime / audio.duration) * 100;

                currentTime.textContent =
                    formatTime(audio.currentTime);
            });

            progress.addEventListener("input", () => {

                if (!Number.isFinite(audio.duration)) return;

                audio.currentTime =
                    (Number(progress.value) / 100) *
                    audio.duration;
            });


            // -------------------------------------
            // AUTOMATIC NEXT SONG
            // -------------------------------------

            audio.addEventListener("ended", () => {
                loadTrack(currentTrack + 1, true);
            });


            // -------------------------------------
            // AUDIO ERROR
            // -------------------------------------

            audio.addEventListener("error", () => {

                console.warn(
                    "Song could not be loaded:",
                    tracks[currentTrack].title
                );
            });


            // Start with the first song selected.
            // It will not play until the user presses play.
            loadTrack(0, false);
        }
    }

});