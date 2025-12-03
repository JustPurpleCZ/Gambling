import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getDatabase, ref, get, set, onDisconnect } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCmZPkDI0CRrX4_OH3-xP9HA0BYFZ9jxiE",
    authDomain: "gambling-goldmine.firebaseapp.com",
    databaseURL: "https://gambling-goldmine-default-rtdb.europe-west1.firebasedatabase.app", // Add this line
    projectId: "gambling-goldmine",
    storageBucket: "gambling-goldmine.appspot.com", // Fix this line
    messagingSenderId: "159900206701",
    appId: "1:159900206701:web:01223c4665df6f7377a164"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const localMode = JSON.parse(localStorage.getItem('localMode'));

async function checkAuth() {
    const user = await new Promise(resolve => {
        const unsub = onAuthStateChanged(auth, (u) => {
            unsub();
            resolve(u);
        });
    });

    if (!user) {
        //window.location.href = 'index.html';
        return;
    }

    if (!localMode) {
        onDisconnect(ref(db, `/users/${user.uid}/slotMachine/lastOnline`)).set(Math.floor(Date.now() / 1000));
    }

    try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch("https://get-balance-gtw5ppnvta-ey.a.run.app", {
        method: "GET",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        }
    });

    localBalance = await res.json();
    console.log("Fetched balance:", localBalance);
    } catch (e) {
        console.log("Error fetching balance:", e);
        setTimeout(() => {
            //window.location.href = "index.html";
        }, 5000);
        return;
    }
    
    if (!localBalance) {
        console.log("NO BALANCE, LOGGING OUT");
        setTimeout(() => {
            //window.location.href = "index.html";
        }, 5000);
        return;
    }
}

// Get user data
let localBalance;
let userData;

// O - Exit function (formerly logout)
function logout() {
    window.location.href = "navigation.html";
}
const symbolImages = [
    'icon/1.png',
    'icon/raiden.png',
    'icon/3.png',
    'icon/4.png',
    'icon/1.png'
];
const symbolWinAmounts = {
    'icon/1.png': 'main/screen/low.png',
    'icon/raiden.png': 'main/screen/mid.png',
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
    //CLOUDFUNCTIONHERE
    
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
const SYMBOL_HEIGHT = 14;
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
let walletBalance = 0;
let playerCredit = 0;
let betAmount = 5;
const displayDiv = document.querySelector('.credit-display');


async function initializeWallet() {
    if (!localMode) {
        await checkAuth();

        if (!localBalance) {
            console.log("NO LOCAL BALANCE, LOGGING OUT")
            await localBalance;
            console.log(localBalance)
            setTimeout(() => {
            //window.location.href = 'index.html';
            return;
            }, 10000);
            
        }
        walletBalance = localBalance.walletBalance;
        playerCredit = localBalance.creditBalance;
        updateAvailableBills();
        updateCreditDisplay();

    } else {
        console.log("LOCAL MODE, INITIALISING WALLET WITH DEFAULT VALUES")
        walletBalance = 500;
        playerCredit = 100;
        updateAvailableBills();
        updateCreditDisplay();
    }
}

function updateCreditDisplay() {
    if (!displayDiv.classList.contains('showing-win')) {
        displayDiv.textContent = `Credit:$${playerCredit}`;
    }
}
async function openDoor() {
    doorStack.style.transition = 'transform 1s ease-out';
    doorStack.style.transform = 'translateY(-100%)';
    
    // Move wallet up as door opens
    updateWalletPosition(true);
    
    return new Promise(resolve => {
        setTimeout(() => {
            doorStack.style.visibility = 'hidden';
            doorStack.style.transform = 'translateY(0)';
            doorStack.style.transition = 'none';
            doorStack.style.bottom = '5vh';
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
    
    // Clean up any remaining notes in the door

    
    // Reset states
    enableWalletNoteTransfer(false);
    isProcessingCashout = false;
    
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
    // Remove any existing credit display
    const existingDisplay = document.querySelector('.credit-display');
    if (existingDisplay) {
        existingDisplay.remove();
    }
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
        symbol.style.top = `${i * SYMBOL_HEIGHT - 14}vh`;
        symbol.style.transition = 'none';
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
            if (!noteInterval) {
                noteInterval = setInterval(() => {
                    if (isMusicPlaying) {
                        const note = new MusicNote(noteContainer);
                        musicNotes.push(note);
                    }
                }, 300);
            }
            
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

//DEBUG - NOW ONLY VISUAL, WIN CHECKING IS A CLOUDFUNCTION
function checkWin() {
    const middleRow = getSymbolsAtPosition(1);
    if (middleRow.every(symbol => symbol === middleRow[0])) {
        const winningSymbol = middleRow[0].split('/').pop();
        const baseSymbol = `icon/${winningSymbol}`;
        
        const topRow = getSymbolsAtPosition(0);
        const bottomRow = getSymbolsAtPosition(2);
        
        let winAmount;
        
        if (topRow.every(symbol => symbol === topRow[0]) && 
            bottomRow.every(symbol => symbol === bottomRow[0])) {
            winAmount = 9999;
            displayDiv.textContent = `JACKPOT:$${winAmount}!`;
            playWinSound('giant');
        } else {
            if (baseSymbol === 'icon/4.png') {
                winAmount = 250;
                displayDiv.textContent = `BIG WIN: $${winAmount}!`;
                playWinSound('big');
            } else if (baseSymbol === 'icon/raiden.png' || baseSymbol === 'icon/3.png') {
                winAmount = 50;
                displayDiv.textContent = `WIN: $${winAmount}!`;
                playWinSound('mid');
            } else {
                winAmount = 5;
                displayDiv.textContent = `WIN: $${winAmount}!`;
                playWinSound('low');
            }
        }
        
        displayDiv.classList.add('showing-win');
        
        // Reset display after 5 seconds
        setTimeout(() => {
            displayDiv.classList.remove('showing-win');
            updateCreditDisplay();
        }, 5000);
        
        return true;
    }
    updateCreditDisplay();
    return false;
}
let canSpin, spinPositions, newCredit;
let reel1stopIndex = 0;
let reel2stopIndex = 0;
let reel3stopIndex = 0;

function animateReelSimple(reel, reelIndex, totalSymbolsToSpin, finalSymbols) {
    return new Promise(resolve => {
        const symbols = Array.from(reel.children);
        let symbolsPassed = 0;
        const speed = 4; // vh per frame
        
        // Create random symbols array + winning symbols at the end
        const symbolQueue = [];
        
        // Add random symbols
        for (let i = 0; i < totalSymbolsToSpin; i++) {
            symbolQueue.push(symbolImages[Math.floor(Math.random() * symbolImages.length)]);
        }
        
        // Add winning symbols at the end (top, middle, bottom for this reel)
        symbolQueue.push(finalSymbols[reelIndex]); // top (0vh)
        symbolQueue.push(finalSymbols[reelIndex + 3]); // middle (14vh)
        symbolQueue.push(finalSymbols[reelIndex + 6]); // bottom (28vh)
        
        let queueIndex = 0;
        let allWinningSymbolsPlaced = false;
        let framesSinceAllPlaced = 0;
        const ALIGNMENT_FRAMES = 20; // Number of frames to wait for natural alignment
        
        function animate() {
            symbols.forEach(symbol => {
                let top = parseFloat(symbol.style.top);
                const previousTop = top;
                top += speed;
                
                // Play tick sound when passing center
                if ((previousTop < SYMBOL_HEIGHT && top >= SYMBOL_HEIGHT) ||
                    (previousTop > SYMBOL_HEIGHT && top <= SYMBOL_HEIGHT)) {
                    playTickSound();
                }
                
                // When symbol goes off screen, wrap it and assign next symbol from queue
                if (top >= SYMBOL_HEIGHT * (VISIBLE_SYMBOLS + 1)) {
                    top -= SYMBOL_HEIGHT * TOTAL_SYMBOLS;
                    const img = symbol.querySelector('img');
                    
                    if (queueIndex < symbolQueue.length) {
                        img.src = symbolQueue[queueIndex];
                        queueIndex++;
                        symbolsPassed++;
                        
                        // Check if we just placed the last winning symbol
                        if (queueIndex === symbolQueue.length) {
                            allWinningSymbolsPlaced = true;
                        }
                    }
                }
                
                symbol.style.top = `${top}vh`;
            });
            
            // Once all winning symbols are placed, wait a few frames then stop
            if (allWinningSymbolsPlaced) {
                framesSinceAllPlaced++;
                
                // After a short delay, check for alignment and force stop if needed
                if (framesSinceAllPlaced >= ALIGNMENT_FRAMES) {
                    // Find symbols with winning images
                    const winningImages = [
                        finalSymbols[reelIndex],
                        finalSymbols[reelIndex + 3],
                        finalSymbols[reelIndex + 6]
                    ];
                    
                    const winningSymbolElements = symbols.filter(symbol => {
                        const imgSrc = symbol.querySelector('img').src;
                        return winningImages.some(winImg => imgSrc.includes(winImg.split('/').pop()));
                    });
                    
                    if (winningSymbolElements.length >= 3) {
                        const positions = winningSymbolElements.map(s => parseFloat(s.style.top)).sort((a, b) => a - b);
                        const targetPositions = [0, SYMBOL_HEIGHT, SYMBOL_HEIGHT * 2]; // 0vh, 14vh, 28vh
                        
                        // Snap to exact positions
                        symbols.forEach(symbol => {
                            const top = parseFloat(symbol.style.top);
                            
                            // Find closest target position
                            const distances = targetPositions.map(target => Math.abs(top - target));
                            const closestIndex = distances.indexOf(Math.min(...distances));
                            
                            // Snap if within reasonable range
                            if (distances[closestIndex] < SYMBOL_HEIGHT * 0.6) {
                                symbol.style.transition = 'top 0.15s ease-out';
                                symbol.style.top = `${targetPositions[closestIndex]}vh`;
                            } else {
                                // Position is too far, keep it where it is
                                symbol.style.transition = 'top 0.15s ease-out';
                                symbol.style.top = `${top}vh`;
                            }
                        });
                        
                        setTimeout(() => {
                            symbols.forEach(symbol => {
                                symbol.style.transition = 'none';
                            });
                            resolve();
                        }, 150);
                        return;
                    }
                }
            }
            
            requestAnimationFrame(animate);
        }
        
        requestAnimationFrame(animate);
    });
}
async function spin() {
    if (isSpinning) {
        shakeLever();
        shakeSound();
        return;
    }
    if (tutorialActive && tutorialWaitingForAction && tutorialStep === 4) {
        robotController.tutorialActionCompleted();
    }
    if (playerCredit < betAmount) {
        shakeLever();
        shakeSound();
        noSound();
        return;
    }
    
    isSpinning = true;
    playerCredit -= betAmount;
    updateCreditDisplay();
    playLeverSound();
    playLeverAnimation();
    
    //Send cloud spin request
    if (!localMode) {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/spin", {
            method: "POST",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            },
        });

        const data = await res.json();
        console.log("Spin result:", data)

        if (!data.valid) {
            initializeWallet();
            isSpinning = false;
            return;
        }

        let finalSymbols = [];
        let finalNumbers = Object.values(data.winSlots);

        finalNumbers.forEach(number => {
            switch (number) {
                case 1:
                    finalSymbols.push('icon/3.png');
                    break;
                case 2:
                    finalSymbols.push('icon/raiden.png');
                    break;
                case 3:
                    finalSymbols.push('icon/4.png');
                    break;
                case 4:
                    finalSymbols.push('icon/1.png');
                    break;
            }
        });

        // Create spinning animation with winning symbols at the end
        const spinPromises = Array.from(reels).map((reel, reelIndex) => {
            // Reel 1: base amount, Reel 2: +10, Reel 3: +25 (10+15)
            const extraSymbols = reelIndex * 10 + (reelIndex === 2 ? 15 : 0);
            const totalSymbols = 20 + extraSymbols;
            // Add 1 extra symbol for reel 3 to compensate
            const adjustedTotal = reelIndex === 2 ? totalSymbols + 1 : totalSymbols;
            return animateReelSimple(reel, reelIndex, adjustedTotal, finalSymbols);
        });

        await Promise.all(spinPromises);
        checkWin()
        playerCredit += data.winAmount;
        updateCreditDisplay();
        
        isSpinning = false;
    } else {
        console.log("LOCAL MODE, SIMULATING SPIN RESULT")
        console.log("Spin result: none")

        let finalSymbols = [];
        let finalNumbers = [1, 1, 1, 1, 1, 1, 1, 1, 1];

        finalNumbers.forEach(number => {
            switch (number) {
                case 1:
                    finalSymbols.push('icon/3.png');
                    break;
                case 2:
                    finalSymbols.push('icon/raiden.png');
                    break;
                case 3:
                    finalSymbols.push('icon/4.png');
                    break;
                case 4:
                    finalSymbols.push('icon/1.png');
                    break;
            }
        });

        // Create spinning animation with winning symbols at the end
        const spinPromises = Array.from(reels).map((reel, reelIndex) => {
            // Reel 1: base amount, Reel 2: +10, Reel 3: +25 (10+15)
            const extraSymbols = reelIndex * 10 + (reelIndex === 2 ? 15 : 0);
            const totalSymbols = 20 + extraSymbols;
            return animateReelSimple(reel, reelIndex, totalSymbols, finalSymbols);
        });

        await Promise.all(spinPromises);
        checkWin();

        isSpinning = false;
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
async function pickupNote(note) {
    if (note.dataset.isAnimating) return;
    note.dataset.isAnimating = 'true';
    
    // Play sound
    pickupSound.currentTime = 0;
    pickupSound.play().catch(error => {
        console.log('Sound play failed:', error);
    });
    
    // Get the value of the note and add it to wallet balance
    const noteValue = parseInt(note.src.match(/\/(\d+)\.png/)[1]);

    //DEBUG - CASH OUT
    if (!localMode) {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/cash_out", {
            method: "POST",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ Amount: noteValue })
        });
                    
        const data = await res.json();

        if (!data.valid) {
            console.log("CASH OUT FAILED");
        } else {
            walletBalance += noteValue;
        }
        updateAvailableBills();
    } else {
        console.log("LOCAL MODE, SIMULATING CASH OUT")
        walletBalance += noteValue;
        updateAvailableBills();
    }
    
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
    flyingNote.style.transform = 'translate(0, 0)';
    
    // Remove the original note
    note.remove();
    
    // Add the new note to the body
    document.body.appendChild(flyingNote);
    
    // Calculate positions
    const targetX = walletRect.left - noteRect.left + (walletRect.width / 5);
    const aboveWalletY = walletRect.top - noteRect.top - 300;
    const finalY = walletRect.top - noteRect.top * 1.01;
    
    flyingNote.offsetHeight;
    
    requestAnimationFrame(() => {
        flyingNote.style.transition = 'transform 0.3s ease-out';
        flyingNote.style.transform = `translate(${targetX}px, ${aboveWalletY}px)`;
        
        flyingNote.addEventListener('transitionend', function dropDown() {
            flyingNote.removeEventListener('transitionend', dropDown);
            
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
let isOutputting = false;

async function cashout() {
    if (tutorialActive && tutorialWaitingForAction && tutorialStep === 2) {
        robotController.tutorialActionCompleted();
    }
    if (isSpinning || isProcessingCashout || isOutputting) return;
    isProcessingCashout = true;

    buttonImage.src = BUTTON_PRESSED;
    clickSound.play().catch(error => {
        console.log('Sound play failed:', error);
    });
    await new Promise(resolve => setTimeout(resolve, 200));
    buttonImage.src = BUTTON_NORMAL;

    // Check if door is open (we're in deposit mode)
    if (isDoorOpen) {
        isProcessingCashout = true;
        isOutputting = true;
        // Get all notes in the door and save their values before closing
        const notes = Array.from(door.querySelectorAll('.banknote'));
        const noteValues = notes.map(note => parseInt(note.src.match(/\/(\d+)\.png/)[1]));
        
        // Close the door first

        closeDoor();
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for door close animation
        // Now process the saved note values - isProcessingCashout still true during this
        if (noteValues.length > 0) {
            for (const value of noteValues) {
                // Play collection sound
                const pickupSound = new Audio('sound/cashout.mp3');
                pickupSound.play().catch(error => {
                    console.log('Sound play failed:', error);
                });
                // Add to credit
                //DEBUG - SEND CASH IN CLOUD REQUEST
                if (!localMode) {
                    const token = await auth.currentUser.getIdToken();
                    const res = await fetch("https://cash-in-gtw5ppnvta-ey.a.run.app", {
                        method: "POST",
                        headers: {
                            "Authorization": token,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ amount: value })
                    });
                    
                    const data = await res.json();
                    if (!data.valid) {
                        console.log("CASH IN FAILED");
                    } else {
                        playerCredit += value;
                        updateCreditDisplay();
                    }
                } else {
                    console.log("LOCAL MODE, SIMULATING CASH IN")
                    playerCredit += value;
                    updateCreditDisplay();
                }
                // Wait before next note
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        enableWalletNoteTransfer(false);
        // Only set isProcessingCashout to false after all notes are processed
        notes.forEach(note => note.remove());
        isProcessingCashout = false;
        isOutputting = false;
        return;
    }
    else if (playerCredit === 0) {
        await openDoor();
        isDoorOpen = true;
        enableWalletNoteTransfer(true);
        isProcessingCashout = false;
        return;
    }
    else if(playerCredit > 0 && !isDoorOpen && !isOutputting){
    // Normal cashout process remains the same
    const notesToDispense = calculateNotes(playerCredit);
    playerCredit = 0;
    updateCreditDisplay();
    
    updateWalletPosition(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    notesAwaitingPickup = notesToDispense.length;
    for (let i = 0; i < notesToDispense.length; i++) {
        await spawnNote(notesToDispense[i]);
        await new Promise(resolve => setTimeout(resolve, 540));
    }
    
    await openDoor();
    isDoorOpen = true;
    }
}
async function collectNote(note) {
    return new Promise(resolve => {
        const value = parseInt(note.src.match(/\/(\d+)\.png/)[1]);
        
        // Play collection sound
        const pickupSound = new Audio('sound/cashout.mp3');
        pickupSound.volume = 0.6;
        pickupSound.play().catch(error => {
            console.log('Sound play failed:', error);
        });
        
        // Add to credit
        playerCredit += value;
        updateCreditDisplay();
        
        // Remove the note
        note.remove();
        
        setTimeout(resolve, 300); // Delay before next note
    });
}
function enableWalletNoteTransfer(enable) {
    const bills = document.querySelectorAll('.bill');
    bills.forEach(bill => {
        if (!bill.classList.contains('unavailable')) {
            bill.classList.toggle('transferrable', enable);
        }
    });
}
async function transferNoteFromWallet(bill) {
    if (!isDoorOpen) return;
    
    const value = parseInt(bill.dataset.value);
    if (value > walletBalance) return;
    
    // Deduct from wallet and update database
    walletBalance -= value;
    updateAvailableBills();
    
    // Rest of your existing animation code
    const billRect = bill.getBoundingClientRect();
    const doorRect = door.getBoundingClientRect();
    
    // Create flying bill element
    const flyingBill = document.createElement('img');
    flyingBill.src = `money/${value}.png`;
    flyingBill.style.position = 'fixed';
    flyingBill.style.width = bill.offsetWidth + 'px';
    flyingBill.style.height = bill.offsetHeight + 'px';
    flyingBill.style.left = `${billRect.left}px`;
    flyingBill.style.top = `${billRect.top}px`;
    flyingBill.style.zIndex = '100';
    flyingBill.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Add to body for the animation
    document.body.appendChild(flyingBill);
    
    // Calculate target position
    const targetX = doorRect.left + (doorRect.width * 0.15); // 17.5% from left to match door position
    const targetY = doorRect.top + (doorRect.height * 0.21); // 10% from top
    
    // Force reflow
    flyingBill.offsetHeight;
    
    // Start animation to door position
    flyingBill.style.transform = `translate(${targetX - billRect.left}px, ${targetY - billRect.top}px)`;

    
    // Wait for animation to complete then create the final note in the door
    await new Promise(resolve => {
        flyingBill.addEventListener('transitionend', () => {
            // Remove the flying bill
            flyingBill.remove();
            
            // Create the final note in the door
            const note = document.createElement('img');
            note.src = `money/${value}.png`;
            note.className = 'banknote';
            note.style.position = 'absolute';
            note.style.width = '65%';
            note.style.left = '15%';
            note.style.bottom = '2vh';
            note.style.zIndex = '1';
            
            door.appendChild(note);
            
            notesAwaitingPickup++;
            resolve();
        }, { once: true });
    });
    if (tutorialActive && tutorialWaitingForAction && tutorialStep === 3 && isDoorOpen) {
        // Wait a bit to ensure the note animation completes
        setTimeout(() => {
            robotController.tutorialActionCompleted();
        }, 600);
    }
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
    ACTIVE_RIGHT: {
        position: '110vh',
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
let tutorialActive = false;
let tutorialStep = 0;
let tutorialWaitingForAction = false;
let hasCompletedTutorial = false;

const snap = await get(ref(db, `/users/${uid}/slotMachine/tutorialCompleted`))
if (snap.val() == true) {
    hasCompletedTutorial = true;
}

const TUTORIAL_SEQUENCE = {
    STEPS: [
        {
            id: 'intro',
            sound: 'robot/dialogue/part1.mp3', // You'll need to add these audio files
            animations: [
                { gif: 'robot/talk2.gif', duration: 2300 },
                { gif: 'robot/talk2end.gif', duration: 250 },
                { gif: 'robot/speakstart.gif', duration: 250 },
                { gif: 'robot/talk.gif', duration: 5800 },
                { gif: 'robot/talkend.gif', duration: 250 }
            ],
            waitFor: null
        },
        {
            id: 'point_wallet',
            sound: 'robot/dialogue/part2.mp3',
            animations: [
                { gif: 'robot/pointswitchalt.gif', duration: 250 },
                { gif: 'robot/pointalt.gif', duration: 20 }
            ],
            pointTo: 'wallet',
            waitFor: 'wallet_hover'
        },
        {
            id: 'point_cashout',
            sound: 'robot/dialogue/part3.mp3',
            animations: [
                { gif: 'robot/pointendalt.gif', duration: 250 },
                { gif: 'robot/idle.gif', duration: 4000 },
                { gif: 'robot/pointswitch.gif', duration: 250 },
                { gif: 'robot/point.gif', duration: 20 }
            ],
            pointTo: 'cashout',
            waitFor: 'cashout_pressed'
        },
        {
            id: 'wait_deposit',
            sound: 'robot/dialogue/part4.mp3',
            animations: [
                { gif: 'robot/speakstart.gif', duration: 250 },
                { gif: 'robot/talk.gif', duration: 2500 },
                { gif: 'robot/talkend.gif', duration: 250 },
                { gif: 'robot/idle.gif', duration: 20 }
            ],
            pointTo: null,
            waitFor: 'money_deposited'
        },
        {
            id: 'point_lever',
            sound: 'robot/dialogue/part5.mp3',
            animations: [
                { gif: 'robot/speakstart.gif', duration: 250 },
                { gif: 'robot/talk.gif', duration: 2000 },
                { gif: 'robot/talkend.gif', duration: 250 },
                { gif: 'robot/pointswitchalt.gif', duration: 250 },
                { gif: 'robot/pointalt.gif', duration: 20 }
            ],
            pointTo: 'lever',
            waitFor: 'lever_pulled'
        },
        {
            id: 'conclusion',
            sound: 'robot/dialogue/part6.mp3',
            animations: [
                { gif: 'robot/speakstart.gif', duration: 250 },
                { gif: 'robot/talk.gif', duration: 6000 },
                { gif: 'robot/talkend.gif', duration: 600 }
            ],
            pointTo: null,
            waitFor: null
        }
    ]
};
// Define dialogue sequences with their corresponding animations
const DIALOGUE_SEQUENCES = [
    {
        id: 'motivation',
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
        id: 'wise',
        sound: 'robot/dialogue/moudro.mp3',
        animations: [
            { gif: 'robot/speakstart.gif', duration: 250 },
            { gif: 'robot/talk.gif', duration: 2000 },
            { gif: 'robot/talkswitch2.gif', duration: 250 },
            { gif: 'robot/sing.gif', duration: 4500 },
            { gif: 'robot/singend.gif', duration: 600 }
        ]
    },
    {
        id: 'ninety_nine',
        sound: 'robot/dialogue/99.wav',
        animations: [
            { gif: 'robot/speakstart.gif', duration: 250 },
            { gif: 'robot/talk.gif', duration: 4000 },
            { gif: 'robot/talkend.gif', duration: 600 }
        ]
    },
    {
        id: 'investment',
        sound: 'robot/dialogue/investice.mp3',
        animations: [
            { gif: 'robot/speakstart.gif', duration: 250 },
            { gif: 'robot/talk.gif', duration: 2000 },
            { gif: 'robot/talkend.gif', duration: 600 }
        ]
    }
];

// Sequences that are triggered by specific actions
const MANUAL_SEQUENCES = {
    chances: {
        id: 'chances_info',
        sound: 'robot/dialogue/chances.mp3',
        animations: [
            { gif: 'robot/speakstart.gif', duration: 250 },
            { gif: 'robot/talk.gif', duration: 1500 },
            { gif: 'robot/idle.gif', duration: 1100 },
            { gif: 'robot/speakstart.gif', duration: 250 },
            { gif: 'robot/talk.gif', duration: 3500 },
            { gif: 'robot/talkswitch.gif', duration: 300 },
            { gif: 'robot/talk2.gif', duration: 3000 },
            { gif: 'robot/speakstart.gif', duration: 300 },
            { gif: 'robot/talk.gif', duration: 1600 },
            { gif: 'robot/talkend.gif', duration: 300 },
            { gif: 'robot/idle.gif', duration: 3000 }
        ]
    },
    stats: {
        id: 'stats_info',
        sound: 'robot/dialogue/stats_info.mp3',
        animations: [
            { gif: 'robot/speakstart.gif', duration: 250 },
            { gif: 'robot/talk.gif', duration: 3000 },
            { gif: 'robot/talkend.gif', duration: 600 }
        ]
    },
    screen_special: {
        id: 'special',
        sound: 'robot/dialogue/do not the glass.mp3',
        animations: [
            { gif: 'robot/speakstart.gif', duration: 250 },
            { gif: 'robot/talk.gif', duration: 2500 },
            { gif: 'robot/talkend.gif', duration: 600 },
            { gif: 'robot/idle.gif', duration: 2000 }
        ]
    },
    radio_special: {
        id: 'radio_special',
        sound: 'robot/dialogue/stop.mp3',
        animations: [
            { gif: 'robot/idle.gif', duration: 1000 }
        ]
    }
};
const POINT_POSITIONS = {
    wallet: { rotation: '205',left: '-5vh', type: '-1'},
    cashout: { rotation: '340',left: '-25vh', type: '1'},
    lever: { rotation: '165',left: '-5vh', type: '-1' }
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
        this.shortIdleSound = new Audio('robot/dialogue/doporuceni.mp3');
        this.longIdleSound = new Audio('robot/dialogue/HATE.mp3');
        this.idleCheckInterval = null;
        this.idleTimer = 0;
        this.hasPlayedShortSound = false;
        this.hasPlayedLongSound = false;
        this.hand = document.querySelector('.robot-hand');
        this.tutorialResolve = null;
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
            btn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent event bubbling
                const option = e.target.dataset.option;
                
                if (option === 'close') {
                    await this.closeOptionsAndReturn();
                    return;
                }
                
                // Handle first two buttons
                if (option === '1') {
                    await this.handleOptionSequence('invest');
                } else if (option === '2') {
                    await this.handleOptionSequence('rules');
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
        this.startIdleTimer();
    }
    
    async handleOptionSequence(option) {
        const menu = this.optionsMenu;
        const hideableButtons = menu.querySelectorAll('.option-button-container.hideable');
        const textContent = menu.querySelector(`.menu-text-content[data-content="${option}"]`);
        
        // Hide menu first
        menu.style.bottom = '-50vh';
        await this.delay(500);
        
        // Hide only the first two buttons
        hideableButtons.forEach(button => button.classList.add('hidden'));
        textContent.classList.add('active');
        
        // Show menu again
        menu.style.bottom = '0vh';
        
        // Play appropriate robot sequence
        const sequence = option === 'invest' ? 
            MANUAL_SEQUENCES.chances : 
            MANUAL_SEQUENCES.stats;
        
        await this.playDialogueSequence(sequence);
    }
    async closeOptionsAndReturn() {
        this.stopIdleTimer();
        
        // Reset menu to original state
        const menu = this.optionsMenu;
        const hideableButtons = menu.querySelectorAll('.option-button-container.hideable');
        const textContents = menu.querySelectorAll('.menu-text-content');
        
        menu.classList.remove('active');
        hideableButtons.forEach(button => button.classList.remove('hidden'));
        textContents.forEach(content => content.classList.remove('active'));
        
        await this.returnToIdle();
        this.isInActiveState = false;
    
        // Make sure the menu is visually hidden
        menu.style.bottom = '-50vh';
    }

    async handleClick() {
        if (this.isAnimating || this.optionsMenu.classList.contains('active')) return;
        this.isAnimating = true;
    
        try {
            await this.growthSequence();
            await this.transformAndReturn();
            // Get random sequence from DIALOGUE_SEQUENCES
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
    startIdleTimer() {
        this.idleTimer = 0;
        this.hasPlayedShortSound = false;
        this.hasPlayedLongSound = false;
        
        // Clear any existing interval
        if (this.idleCheckInterval) {
            clearInterval(this.idleCheckInterval);
        }
        
        // Start new interval
        this.idleCheckInterval = setInterval(() => {
            this.idleTimer++;
            
            // Check for 30 seconds
            if (this.idleTimer === 30 && !this.hasPlayedShortSound) {
                this.shortIdleSound.play().catch(err => console.error('Short idle sound failed:', err));
                this.hasPlayedShortSound = true;
            }
            
            // Check for 120 seconds
            if (this.idleTimer === 120 && !this.hasPlayedLongSound) {
                this.longIdleSound.play().catch(err => console.error('Long idle sound failed:', err));
                this.hasPlayedLongSound = true;
            }
        }, 1000); // Check every second
    }
    stopIdleTimer() {
        if (this.idleCheckInterval) {
            clearInterval(this.idleCheckInterval);
            this.idleCheckInterval = null;
        }
        this.idleTimer = 0;
        this.hasPlayedShortSound = false;
        this.hasPlayedLongSound = false;
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
        
        // Only play idle sound if it's a random dialogue sequence
        const isRandomDialogue = DIALOGUE_SEQUENCES.some(seq => seq.id === sequence.id);
        if (isRandomDialogue) {
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
            await this.playDialogueSequence(MANUAL_SEQUENCES.screen_special);
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
            await this.playDialogueSequence(MANUAL_SEQUENCES.radio_special);
            await this.returnToIdle();
        } catch (error) {
            console.error('Radio special sequence failed:', error);
        } finally {
            this.isAnimating = false;
            this.isInActiveState = false;
        }
    }
    showHand(position) {
        if (!position || !POINT_POSITIONS[position]) {
            this.hideHand();
            return;
        }

        const pos = POINT_POSITIONS[position];
        this.hand.style.rotate = pos.rotation + 'deg';
        this.hand.style.left = pos.left;
        this.hand.style.transform = 'scaleY(' + pos.type + ')';
        this.hand.classList.add('visible');
    }

    hideHand() {
        this.hand.classList.remove('visible');
    }

    async playTutorialStep(step) {
        const sequence = TUTORIAL_SEQUENCE.STEPS[step];
        
        // Play dialogue and animations
        // Special handling for intro step - exit left and return from right
        
        this.dialogueAudio.src = sequence.sound;
        this.robot.src = sequence.animations[0].gif;
        await this.delay(200);
        if (step === 2) {
            await this.exitLeftAndReturnRight();
        }
        
        // Special handling for lever step - exit right and return from left
        if (step === 4) {
            await this.exitRightAndReturnLeft();
        }
        const audioPromise = this.dialogueAudio.play()
            .catch(err => console.error('Audio playback failed:', err));
        
        for (const animation of sequence.animations) {
            this.robot.src = animation.gif;
            await this.delay(animation.duration);
        }
        
        await audioPromise;
        
        
        
        // Show hand if needed
        if (sequence.pointTo) {
            this.showHand(sequence.pointTo);
        } else {
            this.hideHand();
        }
        
        // Wait for action if needed
        if (sequence.waitFor) {
            tutorialWaitingForAction = true;
            await new Promise(resolve => {
                this.tutorialResolve = resolve;
            });
            tutorialWaitingForAction = false;
            this.hideHand();
        }
    }
    async exitLeftAndReturnRight() {
        // Slide out to the left
        this.container.style.transition = 'left 0.5s ease-out';
        this.container.style.left = '-80vh';
        await this.delay(500);
        
        // Reposition offscreen to the right (no transition)
        this.container.style.transition = 'none';
        this.container.style.left = '100vw';
        
        // Force reflow
        this.container.offsetHeight;
        
        // Slide in from the right to the right position
        this.container.style.transition = 'left 0.5s ease-out';
        this.container.style.left = ROBOT_STATES.ACTIVE_RIGHT.position;
        await this.delay(500);
    }

    async exitRightAndReturnLeft() {
        // Slide out to the right
        this.container.style.transition = 'left 0.5s ease-out';
        this.container.style.left = '100vw';
        await this.delay(500);
        
        // Reposition offscreen to the left (no transition)
        this.container.style.transition = 'none';
        this.container.style.left = '-80vh';
        
        // Force reflow
        this.container.offsetHeight;
        
        // Slide in from the left to the left position
        this.container.style.transition = 'left 0.5s ease-out';
        this.container.style.left = ROBOT_STATES.ACTIVE.position;
        await this.delay(500);
    }
    tutorialActionCompleted() {
        if (this.tutorialResolve) {
            this.tutorialResolve();
            this.tutorialResolve = null;
        }
    }

    async startTutorial() {
        if (tutorialActive || hasCompletedTutorial) return;
        
        tutorialActive = true;
        this.isAnimating = true;
        
        try {
            // Move robot to active position
            await this.growthSequence();
            await this.transformAndReturn();
            
            // Play through all tutorial steps
            for (let i = 0; i < TUTORIAL_SEQUENCE.STEPS.length; i++) {
                tutorialStep = i;
                await this.playTutorialStep(i);
            }
            
            // Return to idle
            await this.returnToIdle();
            hasCompletedTutorial = true;
            
            // Save tutorial completion
            if (!localMode) {
                set(ref(db, `/users/${uid}/slotMachine/tutorialCompleted`), true);
            }
            
        } catch (error) {
            console.error('Tutorial failed:', error);
        } finally {
            tutorialActive = false;
            this.isAnimating = false;
            this.isInActiveState = false;
            this.hideHand();
        }
    }
}
function updateWalletPosition(hasNotes = false) {
    const walletElement = document.querySelector('.wallet');
    // Add the has-notes class if there are notes OR we're in deposit mode
    if (hasNotes || isDoorOpen) {
        walletElement.classList.add('has-notes');
    } else {
        walletElement.classList.remove('has-notes');
    }
}
function updateAvailableBills() {
    const bills = document.querySelectorAll('.bill');
    const walletDisplay = document.querySelector('.wallet-display');
    
    // Update wallet display
    walletDisplay.textContent = `Wallet: $${walletBalance}`;
    
    bills.forEach(bill => {
        const value = parseInt(bill.dataset.value);
        if (value <= walletBalance) {
            bill.classList.remove('unavailable');
        } else {
            bill.classList.add('unavailable');
        }
    });
}
document.querySelectorAll('.bill').forEach(bill => {
    bill.addEventListener('click', () => {
        const value = parseInt(bill.dataset.value);
        
        // Only allow transfer if bill is available and we're in deposit mode (door open)
        if (bill.classList.contains('transferrable') && value <= walletBalance && isDoorOpen) {
            transferNoteFromWallet(bill);
            
            // Play money sound
            const pickupSound = new Audio('sound/note.mp3');
            pickupSound.play().catch(error => {
                console.log('Sound play failed:', error);
            });
        } else if (!isDoorOpen) {
            // If door is closed, play wrong sound to indicate invalid action
            wrong.currentTime = 0;
            wrong.play().catch(error => {
                console.log('Sound play failed:', error);
            });
        }
    });
});

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
wallet.addEventListener('mouseenter', () => {
    if (tutorialActive && tutorialWaitingForAction && tutorialStep === 1) {
        robotController.tutorialActionCompleted();
    }
});
cashoutButton.addEventListener('click', cashout);
window.addEventListener('load', () => {
    initializeWallet();
    updateWalletPosition(false);
    updateCreditDisplay();
    updateAvailableBills();
    if (!localMode) {
        hasCompletedTutorial = localStorage.getItem('tutorialCompleted') === 'true';
    }

    if (!hasCompletedTutorial) {
        setTimeout(() => {
            robotController.startTutorial();
        }, 1000);
    }
});
lever.src = LEVER_STATIC;
reels.forEach(initializeReel);

// Event listeners
document.querySelector('.lever-container').addEventListener('click', spin);
musicToggle.addEventListener('click', toggleMusic);
document.getElementById('logoutButton').addEventListener('click', logout);