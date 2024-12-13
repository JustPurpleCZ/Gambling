const symbolImages = [
    'icon/1.png',
    'icon/2.png',
    'icon/3.png',
    'icon/4.png',
    'icon/1.png'
];
const symbolWinAmounts = {
    'icon/1.png': 'main/screen/low.png',
    'icon/2.png': 'main/screen/mid.png',
    'icon/3.png': 'main/screen/mid.png',
    'icon/4.png': 'main/screen/big.png'
};

const reels = document.querySelectorAll('.reel');
const lever = document.querySelector('.lever-image');
const winText = document.querySelector('#text');
const musicToggle = document.querySelector('.music-toggle');
let isSpinning = false;

// Convert measurements to vw
const SYMBOL_HEIGHT = 7; // 5vw to match CSS
const VISIBLE_SYMBOLS = 3;
const BUFFER_SYMBOLS = 2;
const TOTAL_SYMBOLS = VISIBLE_SYMBOLS + BUFFER_SYMBOLS;


const LEVER_GIF = 'main/automat/paka.gif';
const LEVER_STATIC = 'main/automat/paka.png';

// Music states
const MUSIC_STATES = {
    STATIC: 'main/radio/radio.png',
    PLAYING_START: 'main/radio/ni.gif',
    PLAYING: 'main/music_playing.gif',
    STOPPING: 'main/music_stop.gif'
};

// Create audio elements
const leverSound = new Audio('sound/lever.mp3');
const backgroundMusic = new Audio('sound/background_music.mp3');
const yaySound = new Audio('sound/yay.mp3');
const winSound = new Audio('sound/win.mp3');
const bigWinSound = new Audio('sound/bigwin.mp3');
const squeakSound = new Audio('sound/squeak.mp3');
const reelTickSound = new Audio('sound/tick2.mp3');
reelTickSound.volume = 0.3;
backgroundMusic.loop = true;

let isMusicPlaying = false;

const tickSoundPool = Array.from({ length: 5 }, () => {
    const audio = new Audio('sound/tick2.mp3');
    audio.volume = 0.3;
    return audio;
});
let currentTickIndex = 0;

function playTickSound() {
    tickSoundPool[currentTickIndex].currentTime = 0;
    tickSoundPool[currentTickIndex].play().catch(error => {
        console.log('Tick sound failed:', error);
    });
    currentTickIndex = (currentTickIndex + 1) % tickSoundPool.length;
}

function checkSymbolPosition(top) {
    const centerPosition = SYMBOL_HEIGHT;
    return Math.abs(top - centerPosition) < 0.5;
}

function getSymbolsAtPosition(position) {
    return Array.from(reels).map(reel => {
        const symbols = Array.from(reel.children);
        const symbol = symbols.find(s => {
            const top = parseFloat(s.style.top);
            return Math.abs(top - (SYMBOL_HEIGHT * position)) < SYMBOL_HEIGHT * 0.1;
        });
        return symbol ? symbol.querySelector('img').src : null;
    });
}
function playWinSound(win_type) {
    let soundToPlay;
    
    switch(win_type) {
        case 'low':
        case 'mid':
            soundToPlay = yaySound;
            break;
        case 'big':
            soundToPlay = winSound;
            break;
        case 'giant':
            soundToPlay = bigWinSound;
            break;
    }
    
    if (soundToPlay) {
        soundToPlay.currentTime = 0;
        soundToPlay.play().catch(error => {
            console.log('Win sound failed:', error);
        });
    }
}

// Helper function to convert vw to pixels
function vwToPx(vw) {
    return (window.innerWidth * vw) / 100;
}

function initializeReel(reel) {
    reel.innerHTML = '';
    
    for (let i = 0; i < TOTAL_SYMBOLS; i++) {
        const symbol = document.createElement('div');
        symbol.className = 'symbol';
        const img = document.createElement('img');
        img.src = symbolImages[Math.floor(Math.random() * symbolImages.length)];
        img.alt = 'Slot Symbol';
        symbol.appendChild(img);
        symbol.style.top = `${i * SYMBOL_HEIGHT}vw`;
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
function shakeSound() {
    squeakSound.currentTime = 0;
    squeakSound.play().catch(error => {
        console.log('Sound play failed:', error);
    });
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
    winText.src = '';
    
    const middleRow = getSymbolsAtPosition(1);
    if (middleRow.every(symbol => symbol === middleRow[0])) {
        const winningSymbol = middleRow[0].split('/').pop();
        const baseSymbol = `icon/${winningSymbol}`;
        
        const topRow = getSymbolsAtPosition(0);
        const bottomRow = getSymbolsAtPosition(2);
        
        if (topRow.every(symbol => symbol === topRow[0]) && 
            bottomRow.every(symbol => symbol === bottomRow[0])) {
            winText.src = 'main/screen/giant.png';
            playWinSound('giant');
            return true;
        }
        
        winText.src = symbolWinAmounts[baseSymbol];
        // Determine win type from symbol
        let winType = 'low';
        if (baseSymbol === 'icon/4.png') {
            winType = 'big';
        } else if (baseSymbol === 'icon/2.png' || baseSymbol === 'icon/3.png') {
            winType = 'mid';
        }
        
        playWinSound(winType);
        return true;
    }
    return false;
}

function animateReel(reel, speed, duration) {
    return new Promise(resolve => {
        const symbols = Array.from(reel.children);
        let startTime = null;
        let isSlowingDown = false;
        let currentSpeed = speed;
        let lastTickPosition = null;

        function update(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            
            if (elapsed > duration * 0.7 && !isSlowingDown) {
                isSlowingDown = true;
            }

            if (isSlowingDown) {
                currentSpeed = Math.max(0.05, currentSpeed * 0.97);
            }

            symbols.forEach(symbol => {
                let top = parseFloat(symbol.style.top);
                const previousTop = top;
                top += currentSpeed;

                // Check if symbol passed center point
                if ((previousTop < SYMBOL_HEIGHT && top >= SYMBOL_HEIGHT) ||
                    (previousTop > SYMBOL_HEIGHT && top <= SYMBOL_HEIGHT)) {
                    playTickSound();
                }

                if (top >= SYMBOL_HEIGHT * (VISIBLE_SYMBOLS + 1)) {
                    top -= SYMBOL_HEIGHT * TOTAL_SYMBOLS;
                    const img = symbol.querySelector('img');
                    img.src = symbolImages[Math.floor(Math.random() * symbolImages.length)];
                }

                symbol.style.top = `${top}vw`;
            });

            if (elapsed < duration) {
                requestAnimationFrame(update);
            } else {
                // Previous stopping logic remains the same...
                const firstSymbol = symbols[0];
                const currentOffset = parseFloat(firstSymbol.style.top);
                const targetOffset = Math.round(currentOffset / SYMBOL_HEIGHT) * SYMBOL_HEIGHT;
                const distance = targetOffset - currentOffset;

                symbols.forEach(symbol => {
                    const currentTop = parseFloat(symbol.style.top);
                    const finalTop = currentTop + distance;
                    symbol.style.transition = 'top 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
                    symbol.style.top = `${finalTop}vw`;
                });

                setTimeout(() => {
                    symbols.forEach(symbol => {
                        symbol.style.transition = 'none';
                        let top = parseFloat(symbol.style.top);
                        if (top >= SYMBOL_HEIGHT * (VISIBLE_SYMBOLS + 1)) {
                            top -= SYMBOL_HEIGHT * TOTAL_SYMBOLS;
                            symbol.style.top = `${top}vw`;
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
        shakeSound();
        return;
    }
    
    isSpinning = true;
    winText.src = ''; // Clear win display when spinning starts

    playLeverSound();
    playLeverAnimation();

    const spinPromises = Array.from(reels).map((reel, index) => {
        const duration = 2000 + (index * 1000);
        const speed = 1.5;
        return animateReel(reel, speed, duration);
    });

    await Promise.all(spinPromises);
    
    isSpinning = false;
    checkWin();
}

// Initialize
lever.src = LEVER_STATIC;
reels.forEach(initializeReel);

// Event listeners
document.querySelector('.lever-container').addEventListener('click', spin);
musicToggle.addEventListener('click', toggleMusic);