const symbolImages = [
    'icon/1.png',
    'icon/2.png',
    'icon/3.png',
    'icon/4.png',
    'icon/1.png'
];

const reels = document.querySelectorAll('.reel');
const lever = document.querySelector('.lever-image');
const winMessage = document.querySelector('.win-message');
const musicToggle = document.querySelector('.music-toggle');
let isSpinning = false;

const SYMBOL_HEIGHT = 120;
const VISIBLE_SYMBOLS = 3;
const BUFFER_SYMBOLS = 2;
const TOTAL_SYMBOLS = VISIBLE_SYMBOLS + BUFFER_SYMBOLS;

const LEVER_GIF = 'main/automat/paka.gif';
const LEVER_STATIC = 'main/automat/paka.png';

// Music states
const MUSIC_STATES = {
    STATIC: 'main/radio/radio.png',
    PLAYING_START: 'main/automat/music_start.gif',
    PLAYING: 'main/automat/music_playing.gif',
    STOPPING: 'main/automat/music_stop.gif'
};

// Create audio elements
const leverSound = new Audio('sound/lever.mp3');
const backgroundMusic = new Audio('sound/background_music.mp3');
backgroundMusic.loop = true;

let isMusicPlaying = false;

function initializeReel(reel) {
    reel.innerHTML = '';
    
    for (let i = 0; i < TOTAL_SYMBOLS; i++) {
        const symbol = document.createElement('div');
        symbol.className = 'symbol';
        const img = document.createElement('img');
        img.src = symbolImages[Math.floor(Math.random() * symbolImages.length)];
        img.alt = 'Slot Symbol';
        symbol.appendChild(img);
        symbol.style.top = `${i * SYMBOL_HEIGHT}px`;
        reel.appendChild(symbol);
    }
}

function shakeLever() {
    lever.classList.add('shake');
    setTimeout(() => {
        lever.classList.remove('shake');
    }, 200);
}

function playLeverAnimation() {
    lever.src = LEVER_GIF;
    setTimeout(() => {
        lever.src = LEVER_STATIC;
    }, 500);
}

function playLeverSound() {
    leverSound.currentTime = 0;
    leverSound.play().catch(error => {
        console.log('Sound play failed:', error);
    });
}

async function toggleMusic() {
    if (!isMusicPlaying) {
        musicToggle.src = MUSIC_STATES.PLAYING_START;
        await new Promise(resolve => setTimeout(resolve, 500));
        musicToggle.src = MUSIC_STATES.PLAYING;
        
        try {
            await backgroundMusic.play();
            isMusicPlaying = true;
        } catch (error) {
            console.log('Music playback failed:', error);
            musicToggle.src = MUSIC_STATES.STATIC;
        }
    } else {
        musicToggle.src = MUSIC_STATES.STOPPING;
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        await new Promise(resolve => setTimeout(resolve, 500));
        musicToggle.src = MUSIC_STATES.STATIC;
        isMusicPlaying = false;
    }
}

function checkWin() {
    const results = Array.from(reels).map(reel => {
        const middleSymbol = Array.from(reel.children).find(symbol => {
            const top = parseInt(symbol.style.top);
            return Math.abs(top - SYMBOL_HEIGHT) < SYMBOL_HEIGHT * 0.1;
        });
        return middleSymbol ? middleSymbol.querySelector('img').src : null;
    });
    
    return results.every(symbol => symbol === results[0]);
}

function animateReel(reel, speed, duration) {
    return new Promise(resolve => {
        const symbols = Array.from(reel.children);
        let startTime = null;
        let isSlowingDown = false;
        let currentSpeed = speed;

        function update(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            
            if (elapsed > duration * 0.7 && !isSlowingDown) {
                isSlowingDown = true;
            }

            if (isSlowingDown) {
                currentSpeed = Math.max(1, currentSpeed * 0.97);
            }

            symbols.forEach(symbol => {
                let top = parseFloat(symbol.style.top);
                top += currentSpeed;

                if (top >= SYMBOL_HEIGHT * (VISIBLE_SYMBOLS + 1)) {
                    top -= SYMBOL_HEIGHT * TOTAL_SYMBOLS;
                    const img = symbol.querySelector('img');
                    img.src = symbolImages[Math.floor(Math.random() * symbolImages.length)];
                }

                symbol.style.top = `${top}px`;
            });

            if (elapsed < duration) {
                requestAnimationFrame(update);
            } else {
                const firstSymbol = symbols[0];
                const currentOffset = parseFloat(firstSymbol.style.top);
                const targetOffset = Math.round(currentOffset / SYMBOL_HEIGHT) * SYMBOL_HEIGHT;
                const distance = targetOffset - currentOffset;

                symbols.forEach((symbol, index) => {
                    const currentTop = parseFloat(symbol.style.top);
                    const finalTop = currentTop + distance;
                    
                    symbol.style.transition = 'top 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
                    symbol.style.top = `${finalTop}px`;
                });

                setTimeout(() => {
                    symbols.forEach(symbol => {
                        symbol.style.transition = 'none';
                        let top = parseFloat(symbol.style.top);
                        
                        if (top >= SYMBOL_HEIGHT * (VISIBLE_SYMBOLS + 1)) {
                            top -= SYMBOL_HEIGHT * TOTAL_SYMBOLS;
                            symbol.style.top = `${top}px`;
                        }
                    });
                    resolve();
                }, 500);
            }
        }

        requestAnimationFrame(update);
    });
}

async function spin() {
    if (isSpinning) {
        shakeLever();
        return;
    }
    
    isSpinning = true;
    winMessage.style.display = 'none';

    playLeverSound();
    playLeverAnimation();

    const spinPromises = Array.from(reels).map((reel, index) => {
        const duration = 2000 + (index * 500);
        const speed = 15;
        return animateReel(reel, speed, duration);
    });

    await Promise.all(spinPromises);
    
    isSpinning = false;
    if (checkWin()) {
        winMessage.style.display = 'block';
    }
}

// Initialize
lever.src = LEVER_STATIC;
reels.forEach(initializeReel);

// Event listeners
document.querySelector('.lever-container').addEventListener('click', spin);
musicToggle.addEventListener('click', toggleMusic);