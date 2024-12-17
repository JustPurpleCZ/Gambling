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
let screenClickCount = 0;
let lastScreenClickTime = 0;
const SCREEN_CLICK_RESET_TIME = 2000; // Reset counter after 2 seconds of no clicks
const SCREEN_CLICK_TARGET = 10;
const screenClickSound = new Audio('sound/screentap.mp3');

// Track mouse position
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});
document.addEventListener('click', () => {
    if (!isDoorOpen) return; // Only allow note pickup when door is open
    
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


// Convert measurements to vh
const SYMBOL_HEIGHT = 14; // 5vh to match CSS
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
            digitImg.style.height = '5vh';
            digitImg.style.width = 'auto';
            // Position from left to right, starting at baseRight
            digitImg.style.right = `${baseRight - (index * digitWidth)}%`;
            digitImg.style.top = '2vh';
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
            doorStack.style.bottom = '5vh'; // Set and maintain this position
            resolve();
        }, 1000);
    });
}

function closeDoor() {
    doorStack.style.visibility = 'visible';
    doorStack.style.transition = 'bottom 0.5s ease-out';
    doorStack.style.bottom = '0';
    isDoorOpen = false;
    
    // Move wallet back down after door closes
    updateWalletPosition(false);
    
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
        this.x = -20; // -10 to 10vh
        this.y = -26;
        
        // Random movement parameters
        this.speedX = (Math.random() - 0.5) * 0.2; // -1 to 1
        this.speedY = -Math.random() * 0.1 - 0.2; // -3 to -1
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
        
        this.element.style.transform = `translate(${this.x}vh, ${this.y}vh) rotate(${this.rotation}deg)`;
        
        // Check if note should be removed (out of view)
        if (this.y < -100) {
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
const clickSound = new Audio('sound/button.mp3');
const radioSound = new Audio('sound/radio.mp3');
wrong.volume = 0.2;
yaySound.volume = 0.3;
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

// Helper function to convert vh to pixels
function vhToPx(vh) {
    return (window.innerWidth * vh) / 100;
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
        symbol.style.top = `${i * SYMBOL_HEIGHT}vh`;
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
let radioClickCount = 0;
let lastRadioClickTime = 0;
const RADIO_CLICK_RESET_TIME = 2000; // Reset counter after 2 seconds of no clicks
const RADIO_CLICK_TARGET = 10;

async function toggleMusic() {
    const noteContainer = document.querySelector('.music-container');
    const currentTime = Date.now();
    
    // Check if it's a rapid click
    if (currentTime - lastRadioClickTime > RADIO_CLICK_RESET_TIME) {
        radioClickCount = 0;
    }
    
    radioClickCount++;
    lastRadioClickTime = currentTime;
    
    // Check if we've reached the target number of clicks
    if (radioClickCount === RADIO_CLICK_TARGET) {
        radioClickCount = 0;
        // Stop any playing music first
        if (isMusicPlaying) {
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
            musicToggle.src = MUSIC_STATES.STATIC;
            isMusicPlaying = false;
            if (noteInterval) {
                clearInterval(noteInterval);
                noteInterval = null;
            }
        }
        // Trigger robot's special sequence
        await robotController.playRadioSpecialSequence();
        return;
    }

    // Normal music toggle behavior
    radioSound.play().catch(error => {
        console.log('Sound play failed:', error);
    });
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

                symbol.style.top = `${top}vh`;
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
                    symbol.style.top = `${finalTop}vh`;
                });

                setTimeout(() => {
                    symbols.forEach(symbol => {
                        symbol.style.transition = 'none';
                        let top = parseFloat(symbol.style.top);
                        if (top >= SYMBOL_HEIGHT * (VISIBLE_SYMBOLS + 1)) {
                            top -= SYMBOL_HEIGHT * TOTAL_SYMBOLS;
                            symbol.style.top = `${top}vh`;
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
        const speed = 4;
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
        note.style.bottom = '2vh';
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
    flyingNote.style.position = 'fixed';
    flyingNote.style.width = note.offsetWidth + 'px';
    flyingNote.style.height = note.offsetHeight + 'px';
    flyingNote.style.left = noteRect.left + 'px';
    flyingNote.style.top = noteRect.top + 'px';
    flyingNote.style.zIndex = '49';
    flyingNote.style.transform = 'translate(0, 0)'; // Set initial position
    
    // Remove the original note
    note.remove();
    
    // Add the new note to the body
    document.body.appendChild(flyingNote);
    
    // Calculate positions
    const targetX = walletRect.left - noteRect.left + (walletRect.width / 5);
    const aboveWalletY = walletRect.top - noteRect.top - 300; // Position above wallet
    const finalY = walletRect.top - noteRect.top * 1.01; // Final wallet position
    
    // Force a reflow to ensure initial position is set
    flyingNote.offsetHeight;
    
    requestAnimationFrame(() => {
        // First animation: Move above wallet
        flyingNote.style.transition = 'transform 0.3s ease-out';
        flyingNote.style.transform = `translate(${targetX}px, ${aboveWalletY}px)`;
        
        flyingNote.addEventListener('transitionend', function dropDown() {
            flyingNote.removeEventListener('transitionend', dropDown);
            
            // Second animation: Drop into wallet
            flyingNote.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-out';
            flyingNote.style.transform = `translate(${targetX}px, ${finalY}px)`;
            flyingNote.style.opacity = '0.6';
            
            setTimeout(() => {
                flyingNote.remove();
                notesAwaitingPickup--;
                
                if (notesAwaitingPickup === 0) {
                    closeDoor();
                }
            }, 200);
        }, { once: true });
    });
}
const BUTTON_NORMAL = 'main/automat/cash.png'; // Replace with your actual path
const BUTTON_PRESSED = 'main/automat/cash2.png'; // Replace with your actual path
const buttonImage = document.querySelector('.button img')

let isDoorOpen = false;
let isProcessingCashout = false;

async function cashout() {
    if (playerCredit <= 0 || isSpinning || notesAwaitingPickup > 0 || isProcessingCashout) return;
    
    isProcessingCashout = true;
    buttonImage.src = BUTTON_PRESSED;
    clickSound.play().catch(error => {
        console.log('Sound play failed:', error);
    });
    await new Promise(resolve => setTimeout(resolve, 200));
    
    buttonImage.src = BUTTON_NORMAL;
    const notesToDispense = calculateNotes(playerCredit);
    
    cashoutButton.style.pointerEvents = 'none';
    
    playerCredit = 0;
    updateCreditDisplay();
    
    // Move wallet up before spawning notes
    updateWalletPosition(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for wallet to move

    notesAwaitingPickup = notesToDispense.length;
    for (let i = 0; i < notesToDispense.length; i++) {
        await spawnNote(notesToDispense[i]);
        await new Promise(resolve => setTimeout(resolve, 540));
    }
    
    await openDoor();
    isDoorOpen = true;
    isProcessingCashout = false;
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

// Define the robot's states and animations
const ROBOT_STATES = {
    IDLE: {
        position: '2vh',
        size: '40vh',
        top: '60vh',
        blur: '2px',
        brightness: '70%',
        gif: 'robot/idlefull.gif'
    },
    ACTIVE: {
        position: '2vh',
        size: '90vh',
        top: '80vh',
        blur: '0px',
        brightness: '100%',
        gif: 'robot/idle.gif'
    },
    OFFSCREEN_LEFT: {
        position: '-80vh',
        size: '60vh',
        top: '90vh',
        blur: '1px',
        brightness: '100%'
    }
};

// Define dialogue sequences with their corresponding animations
const DIALOGUE_SEQUENCES = [
    {
        id: 'sequence1',
        sound: 'robot/dialogue/motivace.mp3',
        animations: [
            { gif: 'robot/speakstart.gif', duration: 250 },
            { gif: 'robot/talk.gif', duration: 4500 },
            { gif: 'robot/talkswitch.gif', duration: 290 },
            { gif: 'robot/talk2.gif', duration: 3000 },
            { gif: 'robot/talk2end.gif', duration: 500 },
        ]
    },
    {
        id: 'sequence2',
        sound: 'robot/dialogue/investice.mp3',
        animations: [
            { gif: 'robot/speakstart.gif', duration: 250 },
            { gif: 'robot/talk.gif', duration: 2000 },
            { gif: 'robot/talkend.gif', duration: 600 }
        ]
    },
    {
        id: 'sequence3',
        sound: 'robot/dialogue/99.wav',
        animations: [
            { gif: 'robot/speakstart.gif', duration: 250 },
            { gif: 'robot/talk.gif', duration: 4000 },
            { gif: 'robot/talkend.gif', duration: 600 }
        ]
    },
    {
        id: 'sequence4',
        sound: 'robot/dialogue/moudro.mp3',
        animations: [
            { gif: 'robot/speakstart.gif', duration: 250 },
            { gif: 'robot/talk.gif', duration: 2000 },
            { gif: 'robot/talkswitch2.gif', duration: 250 },
            { gif: 'robot/sing.gif', duration: 4500 },
            { gif: 'robot/singend.gif', duration: 600 }
        ]
    }
];
const SPECIAL_SEQUENCE = {
    id: 'special',
    sound: 'robot/dialogue/do not the glass.mp3',
    animations: [
        { gif: 'robot/speakstart.gif', duration: 250 },
        { gif: 'robot/talk.gif', duration: 2500 },
        { gif: 'robot/talkend.gif', duration: 600 },
        { gif: 'robot/idle.gif', duration: 2000 }
    ]
};
const RADIO_SPECIAL_SEQUENCE = {
    id: 'radio_special',
    sound: 'robot/dialogue/stop.mp3',
    animations: [
        { gif: 'robot/idle.gif', duration: 1000 }
    ]
};

class RobotController {
    constructor() {
        this.robot = document.querySelector('.vlad img');
        this.container = document.querySelector('.vlad');
        this.isAnimating = false;
        this.currentState = 'IDLE';
        this.isInActiveState = false;
        this.dialogueAudio = new Audio();
        this.squeakSound = new Audio('sound/slab.mp3');
        this.idleSound = new Audio('robot/dialogue/anyways.mp3');
        this.squeakSound.volume = 0.15;
        
        this.optionsMenu = document.querySelector('.options-menu');
        
        // Initialize robot
        this.updateRobotState(ROBOT_STATES.IDLE);
        this.setupEventListeners();
        this.setupOptionListeners();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setupEventListeners() {
        this.container.addEventListener('click', () => this.handleClick());
    }

    setupOptionListeners() {
        const optionButtons = document.querySelectorAll('.option-btn');
        optionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const option = e.target.dataset.option;
                if (option === 'close') {
                    this.closeOptionsAndReturn();
                } else {
                    console.log(`Option ${option} clicked`);
                }
            });
        });
    }

    updateRobotState(state, transition = true) {
        this.container.style.transition = transition ? 'all 0.5s ease-out' : 'none';
        this.container.style.left = state.position;
        this.container.style.width = state.size;
        this.container.style.top = state.top;
        this.robot.style.filter = `blur(${state.blur}) brightness(${state.brightness})`;
        if (state.gif) {
            this.robot.src = state.gif;
        }
    }

    showOptions() {
        this.optionsMenu.classList.add('active');
    }

    async closeOptionsAndReturn() {
        this.optionsMenu.classList.remove('active');
        await this.returnToIdle();
        this.isInActiveState = false;
    }

    async handleClick() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        try {
            await this.growthSequence();
            await this.transformAndReturn();
            const sequence = DIALOGUE_SEQUENCES[Math.floor(Math.random() * DIALOGUE_SEQUENCES.length)];
            await this.playDialogueSequence(sequence);
            
            this.showOptions();
            this.isInActiveState = true;
        } catch (error) {
            console.error('Animation sequence failed:', error);
        } finally {
            this.isAnimating = false;
        }
    }

    async growthSequence() {
        const startTime = Date.now();
        const duration = 4200;
        const initialSize = 40;
        const targetSize = 50;
        const initialTop = 60;
        const targetTop = 76;

        this.squeakSound.currentTime = 0;
        this.squeakSound.play().catch(err => console.error('Squeak failed:', err));

        this.container.style.transition = 'none';

        return new Promise(resolve => {
            const animate = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                const currentSize = initialSize + (targetSize - initialSize) * progress;
                const currentTop = initialTop + (targetTop - initialTop) * progress;

                this.container.style.width = `${currentSize}vh`;
                this.container.style.top = `${currentTop}vh`;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.container.style.transition = 'all 0.5s ease-out';
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    async playIdleSequence() {
        let totalIdleTime = 0;
        let hasPlayedShortSound = false;
        let hasPlayedLongSound = false;
    
        while (this.isInActiveState && !this.isAnimating) {
            await this.delay(1000); // Check every second
            totalIdleTime += 1;
    
            // Play sound at 30 seconds
            if (totalIdleTime === 30 && !hasPlayedShortSound) {
                hasPlayedShortSound = true;
                IDLE_SOUNDS.SHORT.play().catch(err => console.error('Short idle sound failed:', err));
            }
    
            // Play sound at 120 seconds
            if (totalIdleTime === 120 && !hasPlayedLongSound) {
                hasPlayedLongSound = true;
                IDLE_SOUNDS.LONG.play().catch(err => console.error('Long idle sound failed:', err));
            }
        }
    }

    async transformAndReturn() {
        this.updateRobotState({
            ...ROBOT_STATES.OFFSCREEN_LEFT,
            size: this.container.style.width,
            top: this.container.style.top
        });
        await this.delay(500);
    
        this.container.style.transition = 'none';
        
        this.container.style.width = ROBOT_STATES.ACTIVE.size;
        this.container.style.top = ROBOT_STATES.ACTIVE.top;
        this.robot.style.filter = `blur(${ROBOT_STATES.ACTIVE.blur}) brightness(${ROBOT_STATES.ACTIVE.brightness})`;
        this.robot.src = ROBOT_STATES.ACTIVE.gif;
        
        this.container.offsetHeight;
        
        this.container.style.transition = 'left 0.5s ease-out';
        this.container.style.left = ROBOT_STATES.ACTIVE.position;
    
        const slotMachine = document.querySelector('.slot-machine-container');
        slotMachine.style.transition = 'filter 0.5s ease-out';
        slotMachine.style.filter = 'blur(2px)';
        
        await this.delay(500);
    }

    async playDialogueSequence(sequence) {
        this.dialogueAudio.src = sequence.sound;
        this.robot.src = sequence.animations[0].gif;
        await this.delay(200);
        
        const audioPromise = this.dialogueAudio.play()
            .catch(err => console.error('Audio playback failed:', err));
        
        for (const animation of sequence.animations) {
            this.robot.src = animation.gif;
            await this.delay(animation.duration);
        }
    
        await audioPromise;
        
        // Only play idle sound if it's not the special sequence
        if (sequence.id !== 'special' && sequence.id !== 'radio_special') {
            this.idleSound.currentTime = 0;
            await this.idleSound.play().catch(err => console.error('Idle sound failed:', err));
        }
        
        this.robot.src = 'robot/idle.gif';
    }

    async returnToIdle() {
        this.container.style.transition = 'left 0.5s ease-out';
        this.container.style.left = '-80vh';
        
        const slotMachine = document.querySelector('.slot-machine-container');
        slotMachine.style.transition = 'filter 0.5s ease-out';
        slotMachine.style.filter = 'blur(0px)';
        
        await this.delay(500);
    
        this.container.style.transition = 'none';
        this.container.style.width = ROBOT_STATES.IDLE.size;
        this.container.style.top = ROBOT_STATES.IDLE.top;
        this.robot.style.filter = `blur(${ROBOT_STATES.IDLE.blur}) brightness(${ROBOT_STATES.IDLE.brightness})`;
        this.robot.src = ROBOT_STATES.IDLE.gif;
        
        this.container.offsetHeight;
        
        this.container.style.transition = 'left 0.5s ease-out';
        this.container.style.left = ROBOT_STATES.IDLE.position;
    
        await this.delay(500);
    }

    async playSpecialSequence() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        try {
            await this.growthSequence();
            await this.transformAndReturn();
            await this.playDialogueSequence(SPECIAL_SEQUENCE);
            await this.returnToIdle();
        } catch (error) {
            console.error('Special sequence failed:', error);
        } finally {
            this.isAnimating = false;
            this.isInActiveState = false;
        }
    }
    async playRadioSpecialSequence() {
        if (this.isAnimating) return;
        this.isAnimating = true;
    
        try {
            await this.growthSequence();
            await this.transformAndReturn();
            await this.playDialogueSequence(RADIO_SPECIAL_SEQUENCE);
            await this.returnToIdle();
        } catch (error) {
            console.error('Radio special sequence failed:', error);
        } finally {
            this.isAnimating = false;
            this.isInActiveState = false;
        }
    }
}
function updateWalletPosition(hasNotes = false) {
    const walletElement = document.querySelector('.wallet');
    walletElement.style.transition = 'bottom 0.5s ease-out';
    walletElement.style.bottom = hasNotes ? '-4vh' : '-30vh';
}

// Initialize the robot controller
const robotController = new RobotController();

let isMouseOverScreen = false;

// Function to check if coordinates are within screen bounds
function isWithinScreenBounds(x, y) {
    const screen = document.querySelector('.screen');
    const rect = screen.getBoundingClientRect();
    return (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
    );
}
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    const screen = document.querySelector('.screen');
    const rect = screen.getBoundingClientRect();
    isMouseOverScreen = isWithinScreenBounds(mouseX, mouseY);
    
    // Log these values to see what's happening:
    
});
document.addEventListener('mousedown', (e) => {
    if (!isMouseOverScreen) return;
    console.log("screen clicked");
    const currentTime = Date.now();
    
    if (currentTime - lastScreenClickTime > SCREEN_CLICK_RESET_TIME) {
        screenClickCount = 0;
    }
    
    screenClickSound.currentTime = 0;
    screenClickSound.play().catch(err => console.error('Screen sound failed:', err));
    
    screenClickCount++;
    lastScreenClickTime = currentTime;
    
    if (screenClickCount === SCREEN_CLICK_TARGET) {
        screenClickCount = 0;
        robotController.playSpecialSequence();
    }
});

fetch('data.json')
  .then(response => response.json())
  .then(data => {
    console.log(data);
    // Work with your data here
  })
  .catch(error => console.error('Error:', error));



cashoutButton.addEventListener('click', cashout);
window.addEventListener('load', () => {
    updateWalletPosition(false);
    updateCreditDisplay();
});
lever.src = LEVER_STATIC;
reels.forEach(initializeReel);

// Event listeners
document.querySelector('.lever-container').addEventListener('click', spin);
musicToggle.addEventListener('click', toggleMusic);
