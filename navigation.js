document.addEventListener('DOMContentLoaded', () => {
const background = document.querySelector('.background');
const destinationsRow = document.querySelector('.destinations-row');
const destinations = document.querySelectorAll('.destination-item');
const hint = document.querySelector('.hint');

// ADDED: Get the audio element
const hoverSound = document.getElementById('hover-sound');

// This prevents the sound from playing multiple times if the user rapidly moves the cursor
// over the same element.
let currentlyHovering = null; 

// Fade out hint on first mouse move
let hintFaded = false;
const fadeHint = () => {
    if (!hintFaded) {
        hint.style.transition = 'opacity 1s';
        hint.style.opacity = '0';
        hintFaded = true;
    }
};

// The main function that updates positions and scales
const handleMouseMove = (e) => {
    fadeHint();

    // 1. NORMALIZE MOUSE POSITION
    // Get mouse position from -1 to 1, with (0,0) being the center
    const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    const mouseY = (e.clientY / window.innerHeight) * 2 - 1;

    // 2. APPLY PARALLAX
    // Read parallax strength from CSS variables
    const bgParallaxX = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--background-parallax-x'));
    const bgParallaxY = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--background-parallax-y'));
    const rowParallaxX = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--row-parallax-x'));
    const rowParallaxY = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--row-parallax-y'));

    // Move background subtly
    background.style.transform = `translate(${-mouseX * bgParallaxX}px, ${mouseY * bgParallaxY}px)`;

    // Move destination row dramatically
    destinationsRow.style.transform = `translate(${-mouseX * rowParallaxX}px, ${mouseY * rowParallaxY}px)`;
    
    // 3. APPLY SCALING TO DESTINATIONS
    const centerScaleMultiplier = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--center-scale-multiplier'));
    
    // Track which item is closest to the cursor for scaling and hover sound
    let closestItem = null;
    let minDistanceFromCursor = Infinity;

    destinations.forEach(dest => {
        // Get the horizontal center of the destination item relative to the viewport
        const rect = dest.getBoundingClientRect();
        const itemCenter = rect.left + rect.width / 2;
        
        // Calculate distance from the CURSOR's horizontal position
        const distanceFromCursor = Math.abs(e.clientX - itemCenter);
        
        // Check for the closest item
        if (distanceFromCursor < minDistanceFromCursor) {
            minDistanceFromCursor = distanceFromCursor;
            closestItem = dest;
        }

        // Map distance to a scale factor. Closer to cursor = larger scale.
        const scaleFactor = distanceFromCursor / (window.innerWidth / 2);
        const scale = Math.max(1, centerScaleMultiplier - scaleFactor * (centerScaleMultiplier - 1));

        dest.style.transform = `scale(${scale})`;
    });
    
    // ADDED: Play sound logic
    if (closestItem && closestItem !== currentlyHovering) {
        // Only play the sound if the item is *physically* close enough to be the 'hovered' one
        // We'll set a threshold, for example, 10% of the screen width from the cursor's X position
        if (minDistanceFromCursor < window.innerWidth * 0.1) { 
            // The 'currentTime = 0' allows the sound to be replayed instantly
            hoverSound.currentTime = 0; 
            // The .play() method returns a Promise, we catch potential errors
            hoverSound.play().catch(e => {
                // This catch prevents an error if the user hasn't interacted with the page yet, 
                // as browsers block autoplay without user gesture.
                console.log("Audio playback blocked by browser policy.", e);
            });
            currentlyHovering = closestItem;
        } else {
            // Reset the currently hovering state if the closest item is too far
            currentlyHovering = null;
        }
    } else if (!closestItem && currentlyHovering) {
        // Reset if the cursor moves off all items (though unlikely in this layout)
        currentlyHovering = null;
    }
};

// Set initial state
const setInitialState = () => {
        handleMouseMove({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 });
};

window.addEventListener('mousemove', handleMouseMove);

// Set the initial scale and position when the page loads
setInitialState();
});

//O - Firebase init and getting token
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getDatabase, ref, get, onChildAdded } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

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

let uid;
const localMode = JSON.parse(localStorage.getItem("localMode"));
const machines = document.querySelectorAll(".unavailable");
let unlocks = {};

async function setUnlocks() {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/get_unlocks", {
        method: "GET",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        }
    });

    const unlocksResponse = await res.json();
    unlocks["slotMachine"] = unlocksResponse.unlocks.slotMachine;
    unlocks["wheelOfFortune"] = unlocksResponse.unlocks.wheelOfFortune;
    unlocks["dices"] = unlocksResponse.unlocks.dices;
}

async function initUnlocks() {
    if (localMode) {
        unlocks = {"slotMachine": true, "wheelOfFortune": true, "dices": true}
    } else {
        await setUnlocks();
    }

    console.log("Unlocks: ", unlocks);

    machines.forEach((machine) => {
        let name;
        const img = machine.querySelector('img');
        if (img) {
            name = img.getAttribute('src').split("/").pop().replace(/_icon\.png$/, '');
        }
        console.log("Checking unlock for: ", name);
        switch (name) {
            case "automat":
                if (unlocks["slotMachine"]) {
                    machine.classList.remove("unavailable");
                    machine.classList.add("destination-item");
                    console.log("Slot machine unlocked");
                    machine.addEventListener("click", () => {
                        window.location.href = "automat.html";
                    })
                }
                break;
            case "wheel":
                if (unlocks["wheelOfFortune"]) {
                    machine.classList.remove("unavailable");
                    machine.classList.add("destination-item");
                    console.log("Wheel of fortune unlocked");
                    machine.addEventListener("click", () => {
                        window.location.href = "wheel.html";
                    })
                }
                break;
            case "dices":
                if (unlocks["dices"]) {
                    machine.classList.remove("unavailable");
                    machine.classList.add("destination-item");
                    console.log("Dices unlocked");
                    machine.addEventListener("click", () => {
                        window.location.href = "dices-hub.html";
                    })
                }
                break;
        }
    });
}

let achWaitingList = [];
let displayingAch = false;
let unlockedAchList;
let achDisplaying = false;

async function getAchInfo() {
    if (achDisplaying) {
        return;
    }

    displayingAch = true;

    const achievement = achWaitingList[0];
    achWaitingList.shift(achievement);
    console.log("Getting achievement info for: ", achievement);

    const snap = await get(ref(db, `/achievementInformation/${achievement}/`));
    const achInformation = snap.val();

    let achImg = achInformation.key() + ".png";
    let achName = achInformation.name;
    let achDescription = achInformation.descrtiption;
    let achValue = achInformation.value

    console.log("Achievement information: ", achName, achDescription, achValue, achImg)

    //Show achievement here
    showAchievement(achName, achDescription, achValue, achImg);
    setTimeout(() => {
        displayingAch = false;
        if (achWaitingList[0]) {
            getAchInfo();
        }
    }, 10000);
}
function showAchievement(achName, achDescription, achValue, achImg) {
    achDisplaying = true;
    const ach = document.getElementById('ach');
    const achicon = document.getElementById('achImg');
    const achname = document.getElementById('achName');
    const achds = document.getElementById('achDescription');
    ach.classList.add("active");
    achicon.src = `main/achievements/${achImg}`;
    ach.backgroundImage = `url('main/achievements/${achValue}.png')`;
    achname.textContent = achName;
    achds.textContent = achDescription;
    setTimeout(() => {
        ach.classList.remove("active");
    }, 7000);
}
async function initWallet() {
    const balanceSnap = await get(ref(db, `/users/${uid}/credits`));
    const balance = balanceSnap.val();
    const walletDisplay = document.querySelector('.wallet-display');
    walletDisplay.textContent = `Wallet: $${balance}`;
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        localStorage.clear();
        window.location.href = 'index.html';
        return;
    }
    uid = user.uid;

    await initUnlocks();
    await initWallet();

    const snap = await get(ref(db, `/users/${uid}/achievements`));
    unlockedAchList = snap.val();
    console.log("Unlocked achievements: ", unlockedAchList);

    onChildAdded(ref(db, `/users/${uid}/achievements`), (achievement) => {
        console.log("Child added: ", achievement.key);
        achWaitingList.push(achievement.key);
        getAchInfo();   
    })
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    signOut(auth);
})

document.getElementById("profileBtn").addEventListener("click", () => {
    window.location.href = "profile.html";
})