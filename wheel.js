// DOM element references
const wheel = document.getElementById('wheel');
const highlight = document.getElementById('highlight');
const wheelContainer = document.getElementById('wheelContainer');
const resultText = document.getElementById('resultText');
const arrow = document.querySelector('.arrow');
const clickSound = new Audio('sound/click.mp3'); 

// State variables
let rotation = 0;
let isDragging = false;
let angularVelocity = 0;
const friction = 0.994;
let startAngle = 0;
let animationFrameId;
let wheelResult;

// --- NEW: State variables for the arrow's "kick" animation ---
let arrowTilt = 0;
const arrowDamping = 0.9; // How quickly the arrow settles. Higher is slower (0.0 to 1.0).
let lastKnownSegment = 0; // Used to detect when a divider is crossed.

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
    // Reset the segment tracker when a new spin starts
    lastKnownSegment = Math.floor(rotation / 45);
    if (Math.abs(angularVelocity) < 50 && isDragging) angularVelocity = 50;
    startFreeSpin();
}

async function getWheelResult() {
    setTimeout(() => {
        wheelResult = 8;
        console.log("Wheel result set from cloud");
    }, 3000);
}

// --- Animation Logic ---
function startFreeSpin() {
    console.log("Free spin start");
    cancelAnimationFrame(animationFrameId);

    if (Math.abs(angularVelocity) < 10 || Math.abs(angularVelocity) > 50) {
        console.log("Velocity too low, setting to 10");
        angularVelocity = 10;
    }

    getWheelResult();

    const spin = () => {
        // Update wheel rotation
        rotation += angularVelocity;

        if (Math.abs(angularVelocity) > 0.25 || calculateResult() == wheelResult) {
            angularVelocity *= friction;
        }

        wheel.style.transform = `rotate(${rotation}deg)`;
        
        // --- COMPLETELY REVISED ARROW ANIMATION LOGIC ---

        // 1. Check if a divider has been crossed
        const currentSegment = Math.floor(rotation / 45);
        if (currentSegment !== lastKnownSegment) {
            const speed = Math.abs(angularVelocity);
            const direction = Math.sign(angularVelocity);
            
            // 2. Give the arrow a "kick". The kick is stronger at higher speeds.
            // This creates a snappy reaction when fast and a gentle nudge when slow.
            const kickStrength = Math.min(60, 15 + speed * 5); // Capped at 60 degrees
            
            // The kick is always against the direction of the wheel's motion.
            arrowTilt = -direction * kickStrength;
            clickSound.currentTime = 0;
            clickSound.play();
            // 3. Update our tracker
            lastKnownSegment = currentSegment;
        }
        
        // 4. On every frame, apply damping to make the arrow settle back to center.
        // This creates the smooth "decay" animation.
        arrowTilt *= arrowDamping;
        
        // Apply the final transform to the arrow
        arrow.style.transform = `rotate(${arrowTilt}deg)`;

        // Check if the wheel has stopped
        if (Math.abs(angularVelocity) < 0.05) {
            cancelAnimationFrame(animationFrameId);
            arrow.style.transform = 'rotate(0deg)'; // Ensure it's perfectly centered when stopped
            angularVelocity = 0;
            calculateResult();
        } else {
            animationFrameId = requestAnimationFrame(spin);
        }
    };
    animationFrameId = requestAnimationFrame(spin);
}

// --- Result Calculation ---

function calculateResult() {
    const finalAngle = (rotation % 360 + 360) % 360;
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