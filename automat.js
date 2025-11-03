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

    const balanceData = await res.json();
    console.log("Balance data: ", balanceData);

    if (balanceData.error) {
        console.log("Error fetching balance: ", balanceData.error);
        if(balanceData.error == "Token expired") {
            localStorage.removeItem("userToken");
            window.location.href = "index.html";
        }
    } else {
        creditAmount = balanceData.balance;
        updateCreditDisplay();
    }
} catch (error) {
    console.error("Error in balance fetch: ", error);
}

    //--------------------------
    
    if (localMode) {
        console.log("Local mode active");
        creditAmount = 100;
        updateCreditDisplay();
    }
}

if (!localMode) {
    checkAuth();
}

// --- NEW SLOT MACHINE LOGIC ---

// Configuration
const IMG_HEIGHT_VH = 11.7; // Must match .reel-strip img height in CSS
const SPIN_IMAGES_COUNT = 30; // Number of "blur" images to spin past
const REEL_IMAGES = [
    'main/slots/frukt1.png',
    'main/slots/frukt2.png',
    'mainJslots/frukt3.png',
    'main/slots/frukt4.png',
    'main/slots/frukt5.png',
    'main/slots/frukt6.png',
    'main/slots/frukt7.png',
    'main/slots/frukt8.png'
];

// DOM Elements
const lever = document.querySelector('.lever-image');
const LEVER_STATIC = 'main/automat/arm1.png';
const LEVER_ACTIVE = 'main/automat/arm2.png';
const creditDisplay = document.querySelector('.credit-display');
const cashoutButton = document.querySelector('.button');
const winScreen = document.querySelector('.win-screen');
const winAmountEl = document.querySelector('.win-amount');
const walletDisplay = document.querySelector('.wallet-display');
const walletButton = document.querySelector('.wallet');
const walletOverlay = document.querySelector('.wallet-overlay');
const closeWalletButton = document.querySelector('.close-wallet');

// NEW: Get reel strips
const reelStrips = [
    document.getElementById('reel-strip-1'),
    document.getElementById('reel-strip-2'),
    document.getElementById('reel-strip-3')
];

// Game State
let creditAmount = 0;
let isSpinning = false;
let walletAmount = 1000; // Example, should be fetched

// Robot Controller Placeholder
const robotController = {
    playLeverPull: () => console.log("Robot: Lever pulled"),
    playReaction: (winnings) => {
        if (winnings > 50) console.log("Robot: BIG WIN!");
        else if (winnings > 0) console.log("Robot: Nice win.");
        else console.log("Robot: Better luck next time.");
    },
    playSpecialSequence: () => console.log("Robot: Special sequence!")
};

// Audio
const leverSound = new Audio('main/sounds/lever.mp3');
const winSound = new Audio('main/sounds/win.mp3');
const bigWinSound = new Audio('main/sounds/bigwin.mp3');
const noWinSound = new Audio('main/sounds/nowin.mp3');
const screenClickSound = new Audio('main/sounds/click.mp3');

/**
 * NEW: Initializes all reel strips, populating them with images.
 * This creates a long vertical strip of images for each reel.
 * The first SPIN_IMAGES_COUNT images are for the "blur" effect.
 * The last 3 images are placeholders for the *actual* result.
 */
function initializeReels() {
    reelStrips.forEach(strip => {
        strip.innerHTML = ''; // Clear existing content

        // 1. Add "blur" images
        for (let i = 0; i < SPIN_IMAGES_COUNT; i++) {
            const img = document.createElement('img');
            img.src = REEL_IMAGES[Math.floor(Math.random() * REEL_IMAGES.length)];
            // Set height and width from JS to ensure consistency
            img.style.height = `${IMG_HEIGHT_VH}vh`;
            img.style.width = `${IMG_HEIGHT_VH}vh`;
            strip.appendChild(img);
        }

        // 2. Add 3 "result" placeholder images
        for (let i = 0; i < 3; i++) {
            const img = document.createElement('img');
            img.src = REEL_IMAGES[0]; // Default placeholder
            img.style.height = `${IMG_HEIGHT_VH}vh`;
            img.style.width = `${IMG_HEIGHT_VH}vh`;
            strip.appendChild(img);
        }

        // 3. Set initial position (at the top)
        strip.style.transition = 'none';
        strip.style.transform = 'translateY(0vh)';
    });
}

/**
 * Updates the credit display text.
 */
function updateCreditDisplay() {
    creditDisplay.textContent = `Credits: ${creditAmount}`;
}

/**
 * Shows the win screen with the specified amount.
 */
function showWin(amount) {
    winAmountEl.textContent = `$${amount}`;
    winScreen.classList.add('show');
    
    if (amount > 50) {
        bigWinSound.play().catch(err => console.error('Big win sound failed:', err));
    } else {
        winSound.play().catch(err => console.error('Win sound failed:', err));
    }

    setTimeout(() => {
        winScreen.classList.remove('show');
    }, 3000); // Hide after 3 seconds
}

/**
 * Fetches the current balance from the server.
 */
async function getBalance() {
    if (localMode) {
        creditAmount = 100;
        updateCreditDisplay();
        return;
    }
    try {
        const res = await fetch("https://get-balance-gtw5ppnvta-ey.a.run.app", {
            method: "GET",
            headers: { "Authorization": token, "Content-Type": "application/json" }
        });
        const data = await res.json();
        if (data.balance !== undefined) {
            creditAmount = data.balance;
            updateCreditDisplay();
        } else {
            console.error("Error fetching balance:", data.error);
        }
    } catch (error) {
        console.error("Failed to fetch balance:", error);
    }
}


/**
 * NEW: Rewritten spinReels function
 * This function now coordinates the CSS animation with the backend request.
 * 1. Resets reels to the top.
 * 2. Starts the backend request (fetch).
 * 3. Starts the CSS animation (which has a fixed duration).
 * 4. Awaits the backend data and *silently* updates the 'landing' images
 * (at the end of the reel strip) while they are not visible.
 * 5. Awaits the CSS animation to finish.
 * 6. Once BOTH are done, updates the final credits and state.
 */
async function spinReels() {
    if (isSpinning) return;

    if (creditAmount < 1) {
        console.log("Not enough credits");
        robotController.playReaction(-1); // Play a 'no money' reaction
        return;
    }

    isSpinning = true;
    creditAmount -= 1; // Debit locally first
    updateCreditDisplay(); // Show debit immediately

    leverSound.currentTime = 0;
    leverSound.play().catch(err => console.error('Lever sound failed:', err));

    // 1. Prepare Reels for Spin
    reelStrips.forEach(strip => {
        strip.style.transition = 'none'; // Remove transition for instant reset
        strip.style.transform = 'translateY(0vh)'; // Reset to top

        // Force browser reflow to apply the reset immediately
        void strip.offsetWidth; 

        // Repopulate "blur" images for a different random spin each time
        for (let i = 0; i < SPIN_IMAGES_COUNT; i++) {
            strip.children[i].src = REEL_IMAGES[Math.floor(Math.random() * REEL_IMAGES.length)];
        }
    });

    // 2. Start Fetch Request (store the promise)
    const spinPromise = fetch("https://spin-reels-gtw5ppnvta-ey.a.run.app", {
        method: "POST",
        headers: { "Authorization": token, "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount: 1 })
    }).then(res => res.json());

    // 3. Start Spin Animation (and create a promise that resolves when anim ends)
    let longestAnimTime = 0;
    const animationPromise = new Promise(resolve => {
        // Use requestAnimationFrame to ensure styles are applied *after* the reset
        requestAnimationFrame(() => {
            reelStrips.forEach((strip, index) => {
                const delay = index * 200; // Staggered stop (0ms, 200ms, 400ms)
                const animDuration = 4000 + delay; // Base 4s spin + delay
                if (animDuration > longestAnimTime) {
                    longestAnimTime = animDuration;
                }

                // Apply the transition
                strip.style.transition = `transform ${animDuration}ms cubic-bezier(0.33, 1, 0.68, 1)`;
                
                // Calculate the final Y position
                // We want to land on the last 3 images, which start at index SPIN_IMAGES_COUNT
                const finalY = -(SPIN_IMAGES_COUNT * IMG_HEIGHT_VH);
                strip.style.transform = `translateY(${finalY}vh)`;
            });

            // Set a timeout to resolve the promise when the *longest* animation finishes
            setTimeout(resolve, longestAnimTime);
        });
    });

    // 4. Handle DB Response (await it)
    try {
        const data = await spinPromise; // Wait for DB response

        if (data.error) {
            console.error("Error from spin API:", data.error);
            throw new Error(data.error); // Will be caught by catch block
        }

        // DB result is back! Silently update the "landing" images.
        // This happens *while* the animation is still running.
        const finalSlots = data.slots; // 9-image array
        
        // Map 9-item array to 3 columns (Top, Middle, Bottom)
        // Col 1: [0], [3], [6]
        // Col 2: [1], [4], [7]
        // Col 3: [2], [5], [8]

        const strip1 = reelStrips[0];
        const strip2 = reelStrips[1];
        const strip3 = reelStrips[2];

        // Update the last 3 images of each strip
        strip1.children[SPIN_IMAGES_COUNT + 0].src = finalSlots[0];
        strip1.children[SPIN_IMAGES_COUNT + 1].src = finalSlots[3];
        strip1.children[SPIN_IMAGES_COUNT + 2].src = finalSlots[6];

        strip2.children[SPIN_IMAGES_COUNT + 0].src = finalSlots[1];
        strip2.children[SPIN_IMAGES_COUNT + 1].src = finalSlots[4];
        strip2.children[SPIN_IMAGES_COUNT + 2].src = finalSlots[7];

        strip3.children[SPIN_IMAGES_COUNT + 0].src = finalSlots[2];
        strip3.children[SPIN_IMAGES_COUNT + 1].src = finalSlots[5];
        strip3.children[SPIN_IMAGES_COUNT + 2].src = finalSlots[8];

        // 5. Wait for *both* animation AND db result
        await animationPromise; // Wait for spin to physically stop

        // 6. Both are done. Update UI with final data.
        creditAmount = data.newCredit; // Sync credit amount with server
        updateCreditDisplay();
        robotController.playReaction(data.winnings);

        if (data.winnings > 0) {
            showWin(data.winnings);
        } else {
            noWinSound.play().catch(err => console.error('No win sound failed:', err));
        }

        isSpinning = false;
        
    } catch (error) {
        console.error("Spin failed:", error);
        // An error occurred (e.g., fetch failed or API returned error)
        // We still wait for the animation to finish to avoid jank.
        await animationPromise; 
        isSpinning = false;
        
        // Re-fetch balance to ensure we are in sync after a failed spin
        getBalance(); 
    }
}


/**
 * Handles the cashout process.
 */
async function cashout() {
    if (isSpinning) return;
    if (creditAmount <= 0) {
        console.log("No credits to cash out");
        return;
    }

    console.log("Cashing out:", creditAmount);
    if (localMode) {
        walletAmount += creditAmount;
        creditAmount = 0;
        updateCreditDisplay();
        updateWalletDisplay();
        updateAvailableBills();
        return;
    }

    try {
        const res = await fetch("https://cash-out-gtw5ppnvta-ey.a.run.app", {
            method: "POST",
            headers: { "Authorization": token, "Content-Type": "application/json" },
            body: JSON.stringify({ amount: creditAmount })
        });
        const data = await res.json();
        if (data.newBalance !== undefined) {
            creditAmount = 0;
            walletAmount = data.newBalance;
            updateCreditDisplay();
            updateWalletDisplay();
            updateAvailableBills();
            console.log("Cashout successful. New wallet balance:", walletAmount);
        } else {
            console.error("Error cashing out:", data.error);
        }
    } catch (error) {
        console.error("Failed to cash out:", error);
    }
}

// --- Wallet and Menu Logic (mostly unchanged) ---

function updateWalletDisplay() {
    walletDisplay.textContent = `Wallet: $${walletAmount}`;
}

function initializeWallet() {
    if (localMode) {
        walletAmount = 1000;
        updateWalletDisplay();
        updateAvailableBills();
        return;
    }
    
    // Fetch wallet balance
    fetch("https://get-wallet-balance-gtw5ppnvta-ey.a.run.app", {
        method: "GET",
        headers: { "Authorization": token }
    })
    .then(res => res.json())
    .then(data => {
        if (data.balance !== undefined) {
            walletAmount = data.balance;
            updateWalletDisplay();
            updateAvailableBills();
        } else {
            console.error("Error fetching wallet balance:", data.error);
        }
    })
    .catch(error => console.error("Failed to fetch wallet balance:", error));
}

function updateAvailableBills() {
    document.querySelectorAll('.bill').forEach(bill => {
        const value = parseInt(bill.dataset.value, 10);
        if (walletAmount >= value) {
            bill.classList.add('transferrable');
            bill.classList.remove('unavailable');
        } else {
            bill.classList.remove('transferrable');
            bill.classList.add('unavailable');
        }
    });
}

async function transferToCredits(amount) {
    if (walletAmount < amount) {
        console.log("Not enough money in wallet");
        return;
    }

    console.log(`Transferring ${amount} to credits...`);
    if (localMode) {
        walletAmount -= amount;
        creditAmount += amount;
        updateWalletDisplay();
        updateCreditDisplay();
        updateAvailableBills();
        return;
    }

    try {
        const res = await fetch("https://transfer-to-credits-gtw5ppnvta-ey.a.run.app", {
            method: "POST",
            headers: { "Authorization": token, "Content-Type": "application/json" },
            body: JSON.stringify({ amount: amount })
        });
        const data = await res.json();
        if (data.newCreditBalance !== undefined && data.newWalletBalance !== undefined) {
            walletAmount = data.newWalletBalance;
            creditAmount = data.newCreditBalance;
            updateWalletDisplay();
            updateCreditDisplay();
            updateAvailableBills();
            console.log("Transfer successful.");
        } else {
            console.error("Error transferring:", data.error);
        }
    } catch (error) {
        console.error("Failed to transfer:", error);
    }
}

walletButton.addEventListener('click', () => {
    walletOverlay.classList.add('show');
    // Check if wallet has any bills
    if (document.querySelector('.bill.transferrable')) {
        walletOverlay.classList.add('has-notes');
    } else {
        walletOverlay.classList.remove('has-notes');
    }
});

closeWalletButton.addEventListener('click', () => {
    walletOverlay.classList.remove('show');
});

document.querySelectorAll('.bill.transferrable').forEach(bill => {
    bill.addEventListener('click', () => {
        const value = parseInt(bill.dataset.value, 10);
        if (walletAmount >= value) {
            transferToCredits(value);
        }
    });
});
walletOverlay.addEventListener('click', (e) => {
    if (e.target.classList.contains('bill')) {
        const value = parseInt(e.target.dataset.value, 10);
        if (e.target.classList.contains('transferrable')) {
            transferToCredits(value);
        }
    }
});

// Menu options
const optionButtons = document.querySelectorAll('.option-btn');
const menuTextContents = document.querySelectorAll('.menu-text-content');

optionButtons.forEach(button => {
    button.addEventListener('click', () => {
        const option = button.dataset.option;
        let contentToShow = '';

        if (option === '3') contentToShow = 'rules';
        if (option === '4') contentToShow = 'invest';
        // Add cases for 1 and 2 if you have content for them

        menuTextContents.forEach(content => {
            if (content.dataset.content === contentToShow) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    });
});
// Set "rules" as default
document.querySelector('.menu-text-content[data-content="rules"]').classList.add('active');


// --- Event Listeners ---

lever.addEventListener('click', () => {
    if (isSpinning) return;
    lever.src = LEVER_ACTIVE;
    robotController.playLeverPull(); // Play robot animation

    // Animate lever back
    setTimeout(() => {
        lever.src = LEVER_STATIC;
    }, 1000); 

    // Call the new async spin function
    spinReels();
});

// Screen click easter egg (unchanged)
let screenClickCount = 0;
let lastScreenClickTime = 0;
const SCREEN_CLICK_RESET_TIME = 2000; // 2 seconds
const SCREEN_CLICK_TARGET = 10; // 10 clicks
let isMouseOverScreen = false;
let mouseX = 0;
let mouseY = 0;

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

cashoutButton.addEventListener('click', cashout);

document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('userToken');
    window.location.href = 'index.html';
});


// --- Initialization ---

window.addEventListener('load', () => {
    initializeWallet();
    updateWalletPosition(false); // This function seems missing, but I'll leave it
    updateCreditDisplay();
    updateAvailableBills();
});

// This function seems to be missing in the original, so I'm adding a placeholder
function updateWalletPosition(isDown) {
    // console.log("Updating wallet position:", isDown);
}

lever.src = LEVER_STATIC;

// NEW: Call the new reel initializer
initializeReels();

// REMOVED:
// const reels = document.querySelectorAll('.reel');
// reels.forEach(initializeReel);
// function initializeReel(reel) { ... }
