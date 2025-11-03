const token = localStorage.getItem('userToken');

//Check for local mode (testing purporses)
let localMode = false;
if (token && token == 1) {
    localMode = true;
}
async function checkAuth() {
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    //O - validate token
    const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/check_token", {
        method: "GET",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        }
    });

    const tokenValid = await res.json();
    console.log("Token validity response: ", tokenValid);
    if (!tokenValid.tokenValid) {
        console.log("Token valid: ", tokenValid.tokenValid);
        setTimeout(() => {
            localStorage.removeItem("userToken");
            window.location.href = "index.html";
        }, 20000);
    }

    //DEBUG - TOKEN SHENANIGANS
    try {
    const res = await fetch("https://get-balance-gtw5ppnvta-ey.a.run.app", {
        method: "GET",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        }
    });
    const data = await res.json();
    credit = data.balance;
    updateCreditDisplay();
    } catch(err) {console.log(err);}
}

if (!localMode) {
    checkAuth();
} else {
    // In local mode, bypass auth check and set initial credit
    credit = 1000;
    updateCreditDisplay();
}

const logoutButton = document.getElementById('logoutButton');
logoutButton.addEventListener('click', () => {
    localStorage.removeItem('userToken'); // Clear the token
    window.location.href = 'index.html'; // Redirect to login
});

// --- Robot Controller ---
class RobotController {
    constructor(vladImage) {
        this.vlad = vladImage;
        this.speechBubble = document.querySelector('.speech-bubble');
        this.speechText = document.querySelector('.speech-text');
        this.idleGif = "robot/idlefull.gif";
        this.spinGif = "robot/spin.gif";
        this.winGif = "robot/win.gif";
        this.speechTimeout = null;
        this.animationTimeout = null;
    }

    setSpeech(text, highPriority = false) {
        if (this.speechTimeout && !highPriority) {
            return; // Don't interrupt non-priority speech
        }
        
        clearTimeout(this.speechTimeout); // Clear existing speech timeout
        this.speechText.textContent = text;
        this.speechBubble.style.display = 'block';

        this.speechTimeout = setTimeout(() => {
            this.speechBubble.style.display = 'none';
            this.speechTimeout = null;
        }, 3000); // Speech disappears after 3 seconds
    }

    playAnimation(gif, duration) {
        clearTimeout(this.animationTimeout); // Clear existing animation timeout
        this.vlad.src = gif;
        this.animationTimeout = setTimeout(() => {
            this.vlad.src = this.idleGif;
        }, duration);
    }

    playSpinSequence() {
        this.playAnimation(this.spinGif, 4000); // 4-second spin animation
        const speeches = ["Let's see...", "Big money, big money!", "Come on sevens!"];
        this.setSpeech(speeches[Math.floor(Math.random() * speeches.length)]);
    }

    playWinSequence() {
        this.playAnimation(this.winGif, 5000); // 5-second win animation
        const speeches = ["Winner!", "You got it!", "Nice hit!"];
        this.setSpeech(speeches[Math.floor(Math.random() * speeches.length)], true);
    }
    playSpecialSequence() {
        this.playAnimation("robot/special.gif", 5000); // 5-second special animation
        this.setSpeech("!!!", true);
    }
}
const vlad = document.querySelector('.vlad img');
const robotController = new RobotController(vlad);


// --- Game Logic ---
let credit = 0; // Set by checkAuth or local mode
let isSpinning = false;
const SPIN_COST = 10;
const LEVER_STATIC = "main/automat/arm.png";
const LEVER_ANIMATION = "main/automat/arm.gif";
const WIN_SCREEN_SRC = "main/screen/winscreen.gif";
const IDLE_SCREEN_SRC = "main/screen/screen.png";

const lever = document.querySelector('.lever-container img');
const reels = document.querySelectorAll('.reel');
const creditDisplay = document.querySelector('.credit-display');
const walletDisplay = document.querySelector('.wallet-display');
const screen = document.querySelector('.screen img');
const cashoutButton = document.querySelector('.button');

// --- Sound Effects ---
const leverSound = new Audio('sounds/lever.mp3');
const winSound = new Audio('sounds/win.mp3');
const reelStopSound = new Audio('sounds/reel_stop.mp3'); // Example, if you add this
const screenClickSound = new Audio('sounds/click.mp3');
const billSound = new Audio('sounds/bill.mp3');

// --- NEW - Spinning Animation Logic ---
const SYMBOL_NAMES = ['vlad', 'bar', 'cherry', 'dollar', 'gold', 'melon', 'seven'];
const SYMBOL_PATHS = SYMBOL_NAMES.map(name => `main/symbols/${name}.png`);
let spinningIntervals = [null, null, null];
const SPIN_SPEED = 50; // ms between symbol changes
const REEL_STOP_DELAY = 500; // ms between each reel stopping

/**
 * Gets a path to a random symbol image.
 * @returns {string} Path to a random symbol.
 */
function getRandomSymbolPath() {
    return SYMBOL_PATHS[Math.floor(Math.random() * SYMBOL_PATHS.length)];
}

/**
 * Lands a single reel with a short "stutter" animation.
 * @param {number} reelIndex - The index of the reel (0-2).
 * @param {string[]} finalSymbolNames - Array of 3 symbol names (e.g., ['vlad', 'bar', 'cherry']).
 */
function landReel(reelIndex, finalSymbolNames) {
    const reel = reels[reelIndex];
    const symbolElements = reel.querySelectorAll('.symbol');
    const finalPaths = finalSymbolNames.map(name => `main/symbols/${name}.png`);

    // 1. "Almost" state
    setTimeout(() => {
        if (!symbolElements[0] || !symbolElements[1] || !symbolElements[2]) return;
        symbolElements[0].src = getRandomSymbolPath(); // Random
        symbolElements[1].src = finalPaths[0]; // Final symbol 1
        symbolElements[2].src = finalPaths[1]; // Final symbol 2
    }, 100); 

    // 2. Final state
    setTimeout(() => {
        if (!symbolElements[0] || !symbolElements[1] || !symbolElements[2]) return;
        symbolElements[0].src = finalPaths[0];
        symbolElements[1].src = finalPaths[1];
        symbolElements[2].src = finalPaths[2];
        reelStopSound.currentTime = 0;
        reelStopSound.play().catch(e => console.warn("Reel stop sound failed", e));
    }, 200); 
}

/**
 * Stops all reels in sequence and updates the game state.
 * @param {Array<string[]>} finalReels - 3x3 array of symbol names from the server.
 * @param {number} winAmount - The amount won.
 * @param {number} newCredit - The new total credit.
 */
function stopSpinning(finalReels, winAmount, newCredit) {
    // Stop Reel 1
    setTimeout(() => {
        if (spinningIntervals[0]) clearInterval(spinningIntervals[0]);
        landReel(0, finalReels[0]);
    }, 0); 
    
    // Stop Reel 2
    setTimeout(() => {
        if (spinningIntervals[1]) clearInterval(spinningIntervals[1]);
        landReel(1, finalReels[1]);
    }, REEL_STOP_DELAY); 
    
    // Stop Reel 3
    setTimeout(() => {
        if (spinningIntervals[2]) clearInterval(spinningIntervals[2]);
        landReel(2, finalReels[2]);
    }, REEL_STOP_DELAY * 2); 
    
    // Calculate total time for animation
    const finalLandTime = 250; // ms, slightly more than landReel's last timeout
    const totalAnimationTime = (REEL_STOP_DELAY * 2) + finalLandTime;
    
    // After all animations are done, update game state and reset
    setTimeout(() => {
        credit = newCredit;
        updateCreditDisplay();
        checkWin(winAmount); // This handles win sound/animation
        
        // Reset for next spin
        isSpinning = false;
        lever.src = LEVER_STATIC;
        spinningIntervals = [null, null, null];
    }, totalAnimationTime);
}

// --- End of NEW Spinning Logic ---


/**
 * Main function to start the spin.
 * This function is REPLACED with the new animation logic.
 */
async function spin() {
    if (isSpinning) return;
    if (credit < SPIN_COST) {
        robotController.setSpeech("Not enough credits!", true);
        return;
    }

    isSpinning = true;
    credit -= SPIN_COST;
    updateCreditDisplay();
    leverSound.play();
    lever.src = LEVER_ANIMATION;
    robotController.playSpinSequence();

    try {
        // START SPINNING ANIMATION
        reels.forEach((reel, index) => {
            // Clear any leftover interval
            if (spinningIntervals[index]) clearInterval(spinningIntervals[index]);

            const initialSymbols = reel.querySelectorAll('.symbol');
            if (!initialSymbols[0] || !initialSymbols[1] || !initialSymbols[2]) {
                console.error(`Symbols not found for reel ${index}`);
                return; // Skip this reel if symbols aren't there
            }
            initialSymbols[0].src = getRandomSymbolPath();
            initialSymbols[1].src = getRandomSymbolPath();
            initialSymbols[2].src = getRandomSymbolPath();
            
            spinningIntervals[index] = setInterval(() => {
                const symbols = reel.querySelectorAll('.symbol');
                // Check if symbols exist before accessing src
                if (symbols[0] && symbols[1] && symbols[2]) {
                    symbols[2].src = symbols[1].src;
                    symbols[1].src = symbols[0].src;
                    symbols[0].src = getRandomSymbolPath();
                } else {
                    // Failsafe: stop interval if symbols are gone
                    if (spinningIntervals[index]) clearInterval(spinningIntervals[index]);
                }
            }, SPIN_SPEED);
        });

        let data;
        if (localMode) {
            // Simulate local data
            const symbols = ['vlad', 'bar', 'cherry', 'dollar', 'gold', 'melon', 'seven'];
            const win = Math.random() > 0.8;
            const winAmount = win ? 100 : 0;
            data = {
                reels: [
                    [symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]],
                    [symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]],
                    [symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]]
                ],
                winAmount: winAmount,
                newCredit: credit + winAmount
            };
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            // Real fetch
            const res = await fetch("https://spin-reels-gtw5ppnvta-ey.a.run.app", {
                method: "POST",
                headers: {
                    "Authorization": token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ cost: SPIN_COST })
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Server error: ${res.status} - ${errorText}`);
            }
            data = await res.json();
        }

        // Call the new stop function.
        // This replaces updateReels, credit update, checkWin, etc.
        stopSpinning(data.reels, data.winAmount, data.newCredit);

    } catch (error) {
        console.error("Spin failed:", error);
        robotController.setSpeech("Spin error! Try again.", true);
        
        // Stop all spinning intervals
        spinningIntervals.forEach((interval, index) => {
            if (interval) clearInterval(interval);
            spinningIntervals[index] = null;
        });
        
        // Reset state
        isSpinning = false;
        lever.src = LEVER_STATIC;
        credit += SPIN_COST; // Refund spin
        updateCreditDisplay();
    } 
    // The 'finally' block is GONE. Its logic is now in stopSpinning.
}


/**
 * Updates the src attribute of all 9 symbols.
 * @param {Array<string[]>} newReels - 3x3 array of symbol names (e.g., 'vlad').
 */
function updateReels(newReels) {
    reels.forEach((reel, reelIndex) => {
        const symbols = reel.querySelectorAll('.symbol');
        symbols.forEach((symbol, symbolIndex) => {
            const symbolName = newReels[reelIndex][symbolIndex];
            symbol.src = `main/symbols/${symbolName}.png`;
        });
    });
}

function checkWin(winAmount) {
    if (winAmount > 0) {
        robotController.playWinSequence();
        winSound.play();
        screen.src = WIN_SCREEN_SRC;
        // Reset screen to idle after win animation
        setTimeout(() => {
            screen.src = IDLE_SCREEN_SRC;
        }, 5000); // Match win GIF duration
    }
}

function updateCreditDisplay() {
    creditDisplay.textContent = `Credits: ${credit}`;
}

function initializeReel(reel) {
    const symbols = reel.querySelectorAll('.symbol');
    symbols.forEach(symbol => {
        symbol.src = "main/symbols/vlad.png";
    });
}
async function cashout() {
    if (isSpinning) {
        robotController.setSpeech("Wait until the spin finishes!", true);
        return;
    }
    if (credit <= 0) {
        robotController.setSpeech("No credits to cash out.", true);
        return;
    }

    try {
        const res = await fetch("https://cashout-gtw5ppnvta-ey.a.run.app", {
            method: "POST",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ amount: credit })
        });
        if (!res.ok) {
            throw new Error(`Server error: ${res.status}`);
        }
        const data = await res.json();
        
        robotController.setSpeech(`Cashed out ${credit}!`, true);
        credit = 0;
        updateCreditDisplay();
        wallet.balance = data.newWalletBalance;
        updateWalletDisplay();
        updateAvailableBills(); // Update bill availability after cashing out

    } catch (error) {
        console.error("Cashout failed:", error);
        robotController.setSpeech("Cashout failed. Try again.", true);
    }
}

// --- Wallet Logic ---
const walletContainer = document.querySelector('.wallet');
let isWalletOpen = false;
let wallet = {
    balance: 1000, // This will be updated by checkAuth
    bills: [
        { value: 1, img: "main/wallet/bill1.png" },
        { value: 5, img: "main/wallet/bill5.png" },
        { value: 10, img: "main/wallet/bill10.png" },
        { value: 20, img: "main/wallet/bill20.png" },
        { value: 50, img: "main/wallet/bill50.png" },
        { value: 100, img: "main/wallet/bill100.png" }
    ]
};

function updateWalletDisplay() {
    walletDisplay.textContent = `Wallet: $${wallet.balance}`;
}

function initializeWallet() {
    walletContainer.innerHTML = ''; // Clear
    const walletImg = document.createElement('img');
    walletImg.src = "main/wallet/wallet.png";
    walletImg.classList.add('wallet-icon');
    walletContainer.appendChild(walletImg);

    walletImg.addEventListener('click', toggleWallet);

    wallet.bills.reverse().forEach(bill => {
        const billImg = document.createElement('img');
        billImg.src = bill.img;
        billImg.classList.add('bill', `bill-${bill.value}`);
        billImg.dataset.value = bill.value;
        billImg.addEventListener('click', () => deposit(bill.value));
        walletContainer.appendChild(billImg);
    });
    wallet.bills.reverse(); // Put back in order
    
    updateWalletDisplay();
}

function toggleWallet() {
    isWalletOpen = !isWalletOpen;
    walletContainer.classList.toggle('open');
    if(isWalletOpen) {
        updateAvailableBills();
    }
}

function updateAvailableBills() {
    const bills = walletContainer.querySelectorAll('.bill');
    let hasNotes = false;
    bills.forEach(billEl => {
        const value = parseInt(billEl.dataset.value);
        if (wallet.balance >= value) {
            billEl.classList.remove('unavailable');
            billEl.classList.add('transferrable');
            hasNotes = true;
        } else {
            billEl.classList.add('unavailable');
            billEl.classList.remove('transferrable');
        }
    });
    if (hasNotes) {
        walletContainer.classList.add('has-notes');
    } else {
        walletContainer.classList.remove('has-notes');
    }
}

async function deposit(amount) {
    if (isSpinning) {
        robotController.setSpeech("Wait for the spin to finish!", true);
        return;
    }
    if (wallet.balance < amount) {
        robotController.setSpeech("Not enough money!", true);
        return;
    }

    try {
        const res = await fetch("https://deposit-gtw5ppnvta-ey.a.run.app", {
            method: "POST",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ amount: amount })
        });
        if (!res.ok) {
            throw new Error(`Server error: ${res.status}`);
        }
        const data = await res.json();

        billSound.play();
        wallet.balance = data.newWalletBalance;
        credit = data.newCreditBalance;
        updateWalletDisplay();
        updateCreditDisplay();
        updateAvailableBills();

    } catch (error) {
        console.error("Deposit failed:", error);
        robotController.setSpeech("Deposit failed. Try again.", true);
    }
}


// --- Screen Click Logic (Easter Egg) ---
let screenClickCount = 0;
let lastScreenClickTime = 0;
const SCREEN_CLICK_RESET_TIME = 2000; // 2 seconds
const SCREEN_CLICK_TARGET = 5; // 5 clicks
let isMouseOverScreen = false;
let mouseX = 0;
let mouseY = 0;

function isWithinScreenBounds(x, y) {
    const screenEl = document.querySelector('.screen');
    if (!screenEl) return false;
    const rect = screenEl.getBoundingClientRect();
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
    isMouseOverScreen = isWithinScreenBounds(mouseX, mouseY);
});
document.addEventListener('mousedown', (e) => {
    if (!isMouseOverScreen) return;
    
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

// --- Initial Setup ---
cashoutButton.addEventListener('click', cashout);
lever.addEventListener('click', spin); // This is now the new async spin
window.addEventListener('load', () => {
    initializeWallet();
    updateCreditDisplay(); // Initial display
    updateWalletDisplay(); // Initial display
    // Wallet balance will be set by checkAuth or local mode
});
lever.src = LEVER_STATIC;
reels.forEach(initializeReel);
