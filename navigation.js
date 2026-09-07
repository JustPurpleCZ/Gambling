// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCmZPkDI0CRrX4_OH3-xP9HA0BYFZ9jxiE",
    authDomain: "gambling-goldmine.firebaseapp.com",
    databaseURL: "https://gambling-goldmine-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "gambling-goldmine",
    storageBucket: "gambling-goldmine.appspot.com",
    messagingSenderId: "159900206701",
    appId: "1:159900206701:web:01223c4665df6f7377a164"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Helper function to safely trigger curtain transition or fallback navigation
function navigateWithCurtain(targetUrl) {
    if (typeof window.triggerCurtainTransition === 'function') {
        window.triggerCurtainTransition(targetUrl);
    } else {
        window.location.href = targetUrl;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const background = document.querySelector('.background');
    const destinationsRow = document.querySelector('.destinations-row');
    const hint = document.querySelector('.hint');
    const hoverSound = document.getElementById('hover-sound');

    let currentlyHovering = null; 
    let hintFaded = false;

    const fadeHint = () => {
        if (!hintFaded && hint) {
            hint.style.transition = 'opacity 1s';
            hint.style.opacity = '0';
            hintFaded = true;
        }
    };

    const handleMouseMove = (e) => {
        fadeHint();

        // Dynamically fetch active items so unlocked machines work with parallax/scaling
        const destinations = document.querySelectorAll('.destination-item');

        const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        const mouseY = (e.clientY / window.innerHeight) * 2 - 1;

        const bgParallaxX = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--background-parallax-x')) || 0;
        const bgParallaxY = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--background-parallax-y')) || 0;
        const rowParallaxX = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--row-parallax-x')) || 0;
        const rowParallaxY = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--row-parallax-y')) || 0;

        if (background) background.style.transform = `translate(${-mouseX * bgParallaxX}px, ${mouseY * bgParallaxY}px)`;
        if (destinationsRow) destinationsRow.style.transform = `translate(${-mouseX * rowParallaxX}px, ${mouseY * rowParallaxY}px)`;
        
        const centerScaleMultiplier = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--center-scale-multiplier')) || 1.1;
        
        let closestItem = null;
        let minDistanceFromCursor = Infinity;

        destinations.forEach(dest => {
            const rect = dest.getBoundingClientRect();
            const itemCenter = rect.left + rect.width / 2;
            const distanceFromCursor = Math.abs(e.clientX - itemCenter);
            
            if (distanceFromCursor < minDistanceFromCursor) {
                minDistanceFromCursor = distanceFromCursor;
                closestItem = dest;
            }

            const scaleFactor = distanceFromCursor / (window.innerWidth / 2);
            const scale = Math.max(1, centerScaleMultiplier - scaleFactor * (centerScaleMultiplier - 1));
            dest.style.transform = `scale(${scale})`;
        });
        
        if (closestItem && closestItem !== currentlyHovering) {
            if (minDistanceFromCursor < window.innerWidth * 0.1) { 
                if (hoverSound) {
                    hoverSound.currentTime = 0; 
                    hoverSound.play().catch(err => {
                        console.log("Audio playback blocked by browser policy.", err);
                    });
                }
                currentlyHovering = closestItem;
            } else {
                currentlyHovering = null;
            }
        } else if (!closestItem && currentlyHovering) {
            currentlyHovering = null;
        }
    };

    const setInitialState = () => {
        handleMouseMove({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    setInitialState();

    // Logout button setup
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.clear();
            signOut(auth).then(() => {
                navigateWithCurtain('index.html');
            });
        });
    }
});

// Declarations
let uid;
const localMode = JSON.parse(localStorage.getItem("localMode"));
const machines = document.querySelectorAll(".unavailable");
let unlocks = {};

// Fetch Unlocks from Cloud Function
async function setUnlocks() {
    try {
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
    } catch (err) {
        console.error("Failed to fetch unlocks:", err);
    }
}

// Unlock destinations based on account access
async function initUnlocks() {
    if (localMode) {
        unlocks = {"slotMachine": true, "wheelOfFortune": true, "dices": true};
    } else {
        await setUnlocks();
    }

    machines.forEach((machine) => {
        let name;
        const img = machine.querySelector('img');
        if (img) {
            name = img.getAttribute('src').split("/").pop().replace(/_icon\.png$/, '');
        }

        switch (name) {
            case "automat":
                if (unlocks["slotMachine"]) {
                    machine.classList.remove("unavailable");
                    machine.classList.add("destination-item");
                    machine.addEventListener("click", () => {
                        navigateWithCurtain("automat.html");
                    });
                }
                break;
            case "wheel":
                if (unlocks["wheelOfFortune"]) {
                    machine.classList.remove("unavailable");
                    machine.classList.add("destination-item");
                    machine.addEventListener("click", () => {
                        navigateWithCurtain("wheel.html");
                    });
                }
                break;
            case "dices":
                if (unlocks["dices"]) {
                    machine.classList.remove("unavailable");
                    machine.classList.add("destination-item");
                    machine.addEventListener("click", () => {
                        navigateWithCurtain("dices-hub.html");
                    });
                }
                break;
        }
    });
}

// Initialize wallet balance
async function initWallet() {
    const balanceSnap = await get(ref(db, `/users/${uid}/credits`));
    const balance = balanceSnap.val();
    const walletDisplay = document.querySelector('.wallet-display');
    if (walletDisplay) {
        walletDisplay.textContent = `Wallet: $${balance ?? 0}`;
    }
}

// Authentication check & main initialization
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        localStorage.clear();
        navigateWithCurtain('index.html');
        return;
    }
    uid = user.uid;

    await initUnlocks();
    await initWallet();
});