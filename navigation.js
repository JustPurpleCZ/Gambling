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

//O - unlocked places checking
const machines = document.querySelectorAll(".unavailable");
const token = localStorage.getItem("userToken");
let unlocks = {};

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
        console.log("Token invalid");
        setTimeout(() => {
            localStorage.removeItem("userToken");
            window.location.href = "index.html";
        }, 5000);
    }
}

async function setUnlocks() {
    const res = await fetch("https://europe-west3-gambling-goldmine.cloudfunctions.net/get_unlocks", {
        method: "GET",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        }
    });

    const unlocksResponse = await res.json();
    console.log(unlocksResponse);
    unlocks["slotMachine"] = unlocksResponse.unlocks.slotMachine;
    unlocks["wheelOfFortune"] = unlocksResponse.unlocks.wheelOfFortune;
    unlocks["dices"] = unlocksResponse.unlocks.dices;
    console.log(unlocks);
    console.log(unlocks["slotMachine"]);
    console.log(unlocks.slotMachine);
}

async function initUnlocks() {
    if (!token) {
        localStorage.removeItem("userToken");
        window.location.href = "index.html";
    } else if (token == 1) {
        unlocks = {"slotMachine": true, "wheelOfFortune": true, "dices": false}
        console.log("local mode");
    } else {
        await setUnlocks();
    }

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
                        //window.location.href = "wheel.html";
                        console.log("no wheel page yet");
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

checkAuth();
initUnlocks();

function logout() {
    localStorage.removeItem("userToken");
    window.location.href = "index.html";
}

window.addEventListener("keydown", (key) => {
    if (key.key === "l") {
        logout();
    }
})