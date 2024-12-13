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
const AVAILABLE_NOTES = [100, 50, 20, 10, 5, 1];
const cashoutButton = document.querySelector('.button');
const doorStack = document.querySelector('.door img');
const door = document.querySelector('.door');
const cashoutSound = new Audio('sound/cashout.mp3');
const pickupSound = new Audio('sound/note.mp3');
const wallet = document.querySelector('.wallet');
let notesAwaitingPickup = 0;
let isSpinning = false;
let mouseX = 0;
let mouseY = 0;

// Track mouse position
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});
document.addEventListener('click', () => {
    const notes = Array.from(document.querySelectorAll('.banknote'));
    if (notes.length === 0) return;
    
    // Find notes under cursor
    const hoveredNotes = notes.filter(note => {
        const rect = note.getBoundingClientRect();
        return mouseX >= rect.left && mouseX <= rect.right &&
               mouseY >= rect.top && mouseY <= rect.bottom;
    });
    
    // If any notes are hovered, pick up the last one (topmost in DOM)
    if (hoveredNotes.length > 0) {
        pickupNote(hoveredNotes[hoveredNotes.length - 1]);
    }
});


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
    PLAYING_START: 'main/radio/ni.gif'
};

// Add note sprites
const NOTE_SPRITES = [
    'main/radio/notes/note1.png',
    'main/radio/notes/note2.png',
    'main/radio/notes/note3.png',
    'main/radio/notes/note4.png'
];
let playerCredit = 1000; // Starting credit
let betAmount = 5;

function updateCreditDisplay() {
    // Check if there's no win being displayed
    if (!winText.src.includes('low.png') && 
        !winText.src.includes('mid.png') && 
        !winText.src.includes('big.png') && 
        !winText.src.includes('giant.png')) {
        
        // Set the credit text image
        winText.src = 'main/screen/credit.png';
        
        // Get the digits without padding, but ensure at least one digit (0)
        const digits = String(Math.max(0, playerCredit)).split('');
        
        // Clear any existing digits first
        clearCreditDisplay();
        
        // Calculate base position - this should be where the credit text ends
        const baseRight = 32; // Position where credit text ends
        const digitWidth = 11; // Width of each digit in percentage
        
        // Create and position each digit
        digits.forEach((digit, index) => {
            const digitImg = document.createElement('img');
            digitImg.src = `main/screen/${digit}.png`;
            digitImg.className = 'credit-digit';
            digitImg.style.position = 'absolute';
            digitImg.style.height = '2.6vw';
            digitImg.style.width = 'auto';
            // Position from left to right, starting at baseRight
            digitImg.style.right = `${baseRight - (index * digitWidth)}%`;
            digitImg.style.top = '1.1vw';
            digitImg.style.animation = 'flicker 0.2s infinite alternate';
            document.querySelector('.screen').appendChild(digitImg);
        });
    }
}
function openDoor() {
    return new Promise(resolve => {
        doorStack.style.transition = 'transform 1s ease-out';
        doorStack.style.transform = 'translateY(-100%)';
        
        setTimeout(() => {
            doorStack.style.visibility = 'hidden';
            doorStack.style.transform = 'translateY(0)';
            doorStack.style.transition = 'none';
            doorStack.style.bottom = '5vw'; // Set and maintain this position
            resolve();
        }, 1000);
    });
}

function closeDoor() {
    doorStack.style.visibility = 'visible';
    doorStack.style.transition = 'bottom 0.5s ease-out';
    doorStack.style.bottom = '0';
    
    setTimeout(() => {
        cashoutButton.style.pointerEvents = 'auto';
    }, 500);
}
function calculateNotes(amount) {
    const notes = [];
    let remaining = amount;
    
    for (const note of AVAILABLE_NOTES) {
        while (remaining >= note) {
            notes.push(note);
            remaining -= note;
        }
    }
    
    return notes;
}
function clearCreditDisplay() {
    // Remove all credit digits
    const digits = document.querySelectorAll('.credit-digit');
    digits.forEach(digit => digit.remove());
}

class MusicNote {
    constructor(container) {
        this.element = document.createElement('img');
        this.element.className = 'music-note';
        this.element.src = NOTE_SPRITES[Math.floor(Math.random() * NOTE_SPRITES.length)];
        
        // Random starting position near the radio
        this.x = -10; // -10 to 10vw
        this.y = -13;
        
        // Random movement parameters
        this.speedX = (Math.random() - 0.5) * 0.1; // -1 to 1
        this.speedY = -Math.random() * 0.1 - 0.1; // -3 to -1
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 4;
        
        // Random hue rotation
        const hue = Math.random() * 360;
        this.element.style.filter = `hue-rotate(${hue}deg) blur(1px)`;
        
        // Set initial position
        this.updatePosition();
        
        container.appendChild(this.element);
    }
    
    updatePosition() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;
        
        this.element.style.transform = `translate(${this.x}vw, ${this.y}vw) rotate(${this.rotation}deg)`;
        
        // Check if note should be removed (out of view)
        if (this.y < -50) {
            this.element.remove();
            return false;
        }
        return true;
    }
}

let musicNotes = [];
let noteInterval = null;

// Create audio elements
const leverSound = new Audio('sound/lever.mp3');
const backgroundMusic = new Audio('sound/background_music.mp3');
const yaySound = new Audio('sound/yay.mp3');
const winSound = new Audio('sound/win.mp3');
const bigWinSound = new Audio('sound/bigwin.mp3');
const squeakSound = new Audio('sound/squeak.mp3');
const reelTickSound = new Audio('sound/tick2.mp3');
const wrong = new Audio('sound/wrong.mp3');
wrong.volume = 0.2;
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
function noSound() {
    wrong.currentTime = 0;
    wrong.play().catch(error => {
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
    const noteContainer = document.querySelector('.music-container');
    
    if (!isMusicPlaying) {
        musicToggle.src = MUSIC_STATES.PLAYING_START;
        
        try {
            await backgroundMusic.play();
            isMusicPlaying = true;
            
            // Start spawning notes
            noteInterval = setInterval(() => {
                const note = new MusicNote(noteContainer);
                musicNotes.push(note);
            }, 300);
            
            // Start animation loop if not already running
            if (!window.musicAnimationFrame) {
                function animateNotes() {
                    musicNotes = musicNotes.filter(note => note.updatePosition());
                    window.musicAnimationFrame = requestAnimationFrame(animateNotes);
                }
                window.musicAnimationFrame = requestAnimationFrame(animateNotes);
            }
            
        } catch (error) {
            console.log('Music playback failed:', error);
            musicToggle.src = MUSIC_STATES.STATIC;
        }
    } else {
        musicToggle.src = MUSIC_STATES.PLAYING_START;
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        
        // Stop spawning new notes
        if (noteInterval) {
            clearInterval(noteInterval);
            noteInterval = null;
        }
        
        // Let existing notes continue moving until they're off screen
        // The animation loop will continue until all notes are gone
        
        await new Promise(resolve => setTimeout(resolve, 500));
        musicToggle.src = MUSIC_STATES.STATIC;
        isMusicPlaying = false;
    }
}
function checkWin() {
    clearCreditDisplay();
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
        let winType = 'low';
        if (baseSymbol === 'icon/4.png') {
            winType = 'big';
        } else if (baseSymbol === 'icon/2.png' || baseSymbol === 'icon/3.png') {
            winType = 'mid';
        }
        
        playWinSound(winType);
        return true;
    }
    updateCreditDisplay();
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
    
    if (playerCredit < betAmount) {
        shakeLever();
        shakeSound();
        noSound();
        return;
    }
    
    isSpinning = true;
    
    // Update credit immediately when bet is placed
    playerCredit -= betAmount;
    updateCreditDisplay();
    
    playLeverSound();
    playLeverAnimation();

    const spinPromises = Array.from(reels).map((reel, index) => {
        const duration = 2000 + (index * 1000);
        const speed = 1.5;
        return animateReel(reel, speed, duration);
    });

    await Promise.all(spinPromises);
    
    isSpinning = false;
    const hasWon = checkWin();
    
    if (hasWon) {
        const winAmount = calculateWinAmount();
        playerCredit += winAmount;
        
        // After win display, update credit
        setTimeout(() => {
            clearCreditDisplay();
            winText.src = '';
            updateCreditDisplay();
        }, 5000);
    }
}
async function spawnNote(noteValue) {
    return new Promise(resolve => {
        const note = document.createElement('img');
        note.src = `money/${noteValue}.png`;
        note.style.position = 'absolute';
        note.style.width = '65%';
        note.style.left = '15%';
        note.style.bottom = '0';
        note.style.zIndex = '1';
        note.style.transition = 'transform 0.5s ease-out';
        note.className = 'banknote';
        
        // Add an index to track stacking order
        
        door.appendChild(note);

        cashoutSound.currentTime = 0;
        cashoutSound.play().catch(error => {
            console.log('Sound play failed:', error);
        });

        setTimeout(() => {
            resolve();
        }, 100);
    });
}
function pickupNote(note) {
    if (note.dataset.isAnimating) return;
    note.dataset.isAnimating = 'true';
    
    // Play sound
    pickupSound.currentTime = 0;
    pickupSound.play().catch(error => {
        console.log('Sound play failed:', error);
    });
    
    // Get the current position and size of the note
    const noteRect = note.getBoundingClientRect();
    const walletRect = wallet.getBoundingClientRect();
    
    // Create a new note element at the body level
    const flyingNote = document.createElement('img');
    flyingNote.src = note.src;
    flyingNote.style.position = 'fixed';  // Use fixed positioning
    flyingNote.style.width = note.offsetWidth + 'px';
    flyingNote.style.height = note.offsetHeight + 'px';
    flyingNote.style.left = noteRect.left + 'px';
    flyingNote.style.top = noteRect.top + 'px';
    flyingNote.style.zIndex = '49';
    
    // Remove the original note
    note.remove();
    
    // Add the new note to the body
    document.body.appendChild(flyingNote);
    
    // Calculate the distance to travel
    const deltaX = walletRect.left - noteRect.left + (walletRect.width / 4);
    const deltaY = walletRect.top - noteRect.top + (walletRect.height / 2);
    
    // Trigger animation in the next frame
    requestAnimationFrame(() => {
        flyingNote.style.transition = 'all 0.5s ease-out';
        flyingNote.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        flyingNote.style.opacity = '0.6';
    });
    
    setTimeout(() => {
        flyingNote.remove();
        notesAwaitingPickup--;
        
        if (notesAwaitingPickup === 0) {
            closeDoor();
        }
    }, 500);
}
const BUTTON_NORMAL = 'main/automat/cash.png'; // Replace with your actual path
const BUTTON_PRESSED = 'main/automat/cash2.png'; // Replace with your actual path
const buttonImage = document.querySelector('.button img')

async function cashout() {
    if (playerCredit <= 0 || isSpinning || notesAwaitingPickup > 0) return;
    buttonImage.src = BUTTON_PRESSED;
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Reset button image
    buttonImage.src = BUTTON_NORMAL;
    const notesToDispense = calculateNotes(playerCredit);
    
    // Disable button during cashout
    cashoutButton.style.pointerEvents = 'none';
    
    // Set credit to 0 immediately
    playerCredit = 0;
    updateCreditDisplay();

    notesAwaitingPickup = notesToDispense.length;
    for (let i = 0; i < notesToDispense.length; i++) {
        await spawnNote(notesToDispense[i]);
        await new Promise(resolve => setTimeout(resolve, 540)); // Delay between notes
    }
    await openDoor();
}
function calculateWinAmount() {
    // Get the current win display image src
    const currentWin = winText.src;
    
    if (currentWin.includes('giant.png')) return 2700;
    if (currentWin.includes('big.png')) return 250;
    if (currentWin.includes('mid.png')) return 50;
    if (currentWin.includes('low.png')) return 5;
    return 0;
}
cashoutButton.addEventListener('click', cashout);
window.addEventListener('load', updateCreditDisplay);
// Initialize
lever.src = LEVER_STATIC;
reels.forEach(initializeReel);

// Event listeners
document.querySelector('.lever-container').addEventListener('click', spin);
musicToggle.addEventListener('click', toggleMusic);