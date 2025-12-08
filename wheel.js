import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

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

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        localStorage.clear();
        window.location.href = 'index.html';
        return;
    }
    uid = user.uid;
});

// DOM element references
const wheel = document.getElementById('wheel');
const highlight = document.getElementById('highlight');
const wheelContainer = document.getElementById('wheelContainer');
const resultText = document.getElementById('resultText');
const arrow = document.querySelector('.arrow');
const tv = document.querySelector('.tv');
const bg = document.querySelector('.dimming');
const tvVideo = document.getElementById('screen');
const clickSound = new Audio('sound/click.mp3'); 

// State variables
let rotation = 0;
let isDragging = false;
let angularVelocity = 0;
const friction = 0.99;
let startAngle = 0;
let animationFrameId;
let wheelResult;

// --- NEW: State variables for the arrow's "kick" animation ---
let arrowTilt = 0;
const arrowDamping = 0.9;
let lastKnownSegment = 0;

// --- Interaction Logic ---

function getEventAngle(event) {
    const rect = wheelContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return Math.atan2(clientY - centerY, clientX - centerX);
}

function onDragStart(event) {
    console.log("Drag start");
    if (angularVelocity == 0) {
        event.preventDefault();
        isDragging = true;
        cancelAnimationFrame(animationFrameId);
        startAngle = getEventAngle(event) - (rotation * Math.PI / 180);
        angularVelocity = 0;
        wheel.style.transition = 'none';
    } else {
        console.log("Velocity: ", Math.abs(angularVelocity));
    }
}

function onDragMove(event) {
    if (!isDragging) return;
    event.preventDefault();
    const currentEventAngle = getEventAngle(event);
    const newRotationDegrees = (currentEventAngle - startAngle) * (180 / Math.PI);
    const deltaRotation = newRotationDegrees - rotation;
    angularVelocity = deltaRotation;
    rotation = newRotationDegrees;
    wheel.style.transform = `rotate(${rotation}deg)`;
}

function onDragEnd(event) {
    console.log("Drag end");
    if (!isDragging) return;
    isDragging = false;
    wheel.style.transition = '';
    lastKnownSegment = Math.floor(rotation / 45);
    if (Math.abs(angularVelocity) < 50 && isDragging) angularVelocity = 50;
    startFreeSpin();
}

async function getWheelResult() {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch("https://wheel-spin-gtw5ppnvta-ey.a.run.app", {
        method: "GET",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        }
    });

    const data = await res.json();
    console.log(data);

    if (data.success) {
        wheelResult = data.finalSlot;
    }
}

// --- TV Animation Logic ---

function activateTV() {
    // Add active class to TV
    tv.classList.add('active');
    bg.classList.add('active');
    // Pick a random video (1-4)
    const randomVideo = Math.floor(Math.random() * 4) + 1;
    
    // Small delay before changing video
    setTimeout(() => {
        tvVideo.src = `main/wheel/ads/${randomVideo}.mp4`;
        tvVideo.load();
        tvVideo.play();
        
        // When video ends, switch to static gif and remove active class
        tvVideo.onended = () => {
            tvVideo.src = '';
            tvVideo.load();
            setTimeout(() => {
                tv.classList.remove('active');
                bg.classList.remove('active');
            }, 1000);
        };
    }, 4000);
}

// --- Animation Logic ---
function startFreeSpin() {
    console.log("Free spin start");
    cancelAnimationFrame(animationFrameId);

    if (Math.abs(angularVelocity) < 10 || Math.abs(angularVelocity) > 50) {
        console.log("Velocity too low or high, setting to 10");
        angularVelocity = 10;
    }

    getWheelResult();

    const spin = () => {
        rotation += angularVelocity;

        if (Math.abs(angularVelocity) > 0.4 || calculateResult() == wheelResult) {
            angularVelocity *= friction;
        }

        wheel.style.transform = `rotate(${rotation}deg)`;
        
        const currentSegment = Math.floor(rotation / 45);
        if (currentSegment !== lastKnownSegment) {
            const speed = Math.abs(angularVelocity);
            const direction = Math.sign(angularVelocity);
            
            const kickStrength = Math.min(60, 15 + speed * 5);
            arrowTilt = -direction * kickStrength;
            clickSound.currentTime = 0;
            clickSound.play();
            lastKnownSegment = currentSegment;
        }
        
        arrowTilt *= arrowDamping;
        arrow.style.transform = `rotate(${arrowTilt}deg)`;

        // Check if the wheel has stopped
        if (Math.abs(angularVelocity) < 0.05) {
            cancelAnimationFrame(animationFrameId);
            arrow.style.transform = 'rotate(0deg)';
            angularVelocity = 0;
            
            const result = calculateResult();
            const finalAngle = (rotation % 360 + 360) % 360;
            
            // Check if NOT in segment 0 (0-45 degrees)
            // Segment 0 is when finalAngle is between 0 and 45
            if (wheelResult != 8) {
                console.log("Landed on segment other than 0, activating TV");
                activateTV();
            } else {
                console.log("Landed on segment 0 (0-45 degrees), no TV activation");
            }
        } else {
            animationFrameId = requestAnimationFrame(spin);
        }
    };
    animationFrameId = requestAnimationFrame(spin);
}

// --- Result Calculation ---

function calculateResult() {
    //fix final slot calculation HERE
    const finalAngle = (rotation % 360 + 360) % 360 - 25;
    const segmentIndex = Math.floor(((finalAngle + 22.5) % 360) / 45);
    const result = 8 - segmentIndex;
    return result;
}

// --- Event Listeners ---
highlight.addEventListener('mousedown', onDragStart);
document.addEventListener('mousemove', onDragMove);
document.addEventListener('mouseup', onDragEnd);
highlight.addEventListener('touchstart', onDragStart);
document.addEventListener('touchmove', onDragMove);
document.addEventListener('touchend', onDragEnd);