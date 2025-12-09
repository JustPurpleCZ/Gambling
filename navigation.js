document.addEventListener('DOMContentLoaded', () => {
const background = document.querySelector('.background');
const destinationsRow = document.querySelector('.destinations-row');
const destinations = document.querySelectorAll('.destination-item');
const hint = document.querySelector('.hint');

const hoverSound = document.getElementById('hover-sound');

let currentlyHovering = null; 

let hintFaded = false;
const fadeHint = () => {
    if (!hintFaded) {
        hint.style.transition = 'opacity 1s';
        hint.style.opacity = '0';
        hintFaded = true;
    }
};

const handleMouseMove = (e) => {
    fadeHint();

    const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    const mouseY = (e.clientY / window.innerHeight) * 2 - 1;

    const bgParallaxX = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--background-parallax-x'));
    const bgParallaxY = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--background-parallax-y'));
    const rowParallaxX = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--row-parallax-x'));
    const rowParallaxY = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--row-parallax-y'));

    background.style.transform = `translate(${-mouseX * bgParallaxX}px, ${mouseY * bgParallaxY}px)`;
    destinationsRow.style.transform = `translate(${-mouseX * rowParallaxX}px, ${mouseY * rowParallaxY}px)`;
    
    const centerScaleMultiplier = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--center-scale-multiplier'));
    
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
            hoverSound.currentTime = 0; 
            hoverSound.play().catch(e => {
                console.log("Audio playback blocked by browser policy.", e);
            });
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
});

// ============ PARTICLE POP SYSTEM ============
const particleColors = ["#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#F1C40F", "#9B59B6", "#1ABC9C"];
let particles = [];
let animationFrameId = null;

// Inject particle styles
const particleStyle = document.createElement('style');
particleStyle.textContent = `
    .particle {
        position: fixed;
        width: 1.5vh;
        height: 1.5vh;
        pointer-events: none;
        z-index: 9999;
    }
`;
document.head.appendChild(particleStyle);

function createParticlePop(x, y, amount) {
    const initialSpeed = 25;
    const speedVariance = 0.5;

    for (let i = 0; i < amount; i++) {
        const newDiv = document.createElement("div");
        newDiv.classList.add("particle");
        newDiv.style.backgroundColor = particleColors[Math.floor(Math.random() * particleColors.length)];
        newDiv.style.rotate = Math.floor(Math.random() * 360) + 'deg';
        
        const angle = Math.random() * Math.PI * 2;
        const speed = initialSpeed * (0.5 + Math.random() * speedVariance);
        
        const particle = {
            el: newDiv,
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            opacity: 1,
        };
        particles.push(particle);
        document.body.appendChild(newDiv);
    }

    if (!animationFrameId) {
        moveParticles();
    }
}

function moveParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.opacity -= 0.03;
        
        if (p.opacity <= 0) {
            p.el.remove();
            return false;
        }

        p.el.style.left = p.x + 'px';
        p.el.style.top = p.y + 'px';
        p.el.style.opacity = p.opacity;
        return true;
    });

    if (particles.length > 0) {
        animationFrameId = requestAnimationFrame(moveParticles);
    } else {
        animationFrameId = null;
    }
}

function triggerAchievementParticles(number) {
    // Create 3 particle pops at random positions
    for (let i = 0; i < number; i++) {
        setTimeout(() => {
        const randomX = Math.random() * window.innerWidth;
        const randomY = Math.random() * window.innerHeight;
        createParticlePop(randomX, randomY, 50);
        }, i * 200);
        
    }
}

// ============ FIREBASE & GAME LOGIC ============
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getDatabase, ref, get, onChildAdded } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

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
let achDisplaying = false;
let unlockedAchList;
const confetti = new Audio('sound/confetti.mp3'); 

async function getAchInfo() {
    if (achDisplaying) {
        return;
    }

    if (unlockedAchList[achWaitingList[0]]) {
        achWaitingList.shift(achWaitingList[0]);
        return;
    }

    achDisplaying = true;

    const achievement = achWaitingList[0];
    achWaitingList.shift(achievement);
    console.log("Getting achievement info for: ", achievement);

    const snap = await get(ref(db, `/achievementInformation/${achievement}/`));
    const achInformation = snap.val();

    let achImg = achievement + ".png";
    let achName = achInformation.name;
    let achDescription = achInformation.description;
    let achValue = achInformation.value

    console.log("Achievement information: ", achName, achDescription, achValue, achImg)

    showAchievement(achName, achDescription, achValue, achImg);
    setTimeout(() => {
        achDisplaying = false;
        if (achWaitingList[0]) {
            getAchInfo();
        }
    }, 10000);
}

function showAchievement(achName, achDescription, achValue, achImg) {
    const ach = document.getElementById('ach');
    const achicon = document.getElementById('achImg');
    const achname = document.getElementById('achName');
    const achds = document.getElementById('achDescription');
    ach.classList.add("achActive");
    achicon.style.backgroundImage = `url('main/achievements/${achImg}')`;
    ach.style.backgroundImage = `url('main/achievements/${achValue}.png')`;
    achname.textContent = achName;
    achds.textContent = achDescription;
    
    setTimeout(() => {
        confetti.play();
        switch (achValue) {
            case "bronze":
                triggerAchievementParticles(3);
                break;
            case "silver":
                triggerAchievementParticles(6);
                break;
            case "gold":
                triggerAchievementParticles(9);
                break;
        }
    }, 1000);
    
    setTimeout(() => {
        ach.classList.remove("achActive");
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