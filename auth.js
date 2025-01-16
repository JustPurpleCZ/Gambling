// auth.js
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Handle form submission
document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        if (isLogin) {
            // Login
            const userCredential = await signInWithEmailAndPassword(auth, username, password);
            console.log('Logged in:', userCredential.user);
        } else {
            // Sign up
            const userCredential = await createUserWithEmailAndPassword(auth, username, password);
            const user = userCredential.user;
            
            // Create user profile in database
            await set(ref(db, 'users/' + user.uid), {
                username: username,
                credits: 1000,
                statistics: {
                    gamesPlayed: 0,
                    wins: 0,
                    losses: 0
                },
                achievements: [],
                lastLogin: Date.now()
            });
        }
        
        // Redirect to game page
        window.location.href = 'game.html';
    } catch (error) {
        console.error(error);
        document.getElementById('errorMessage').textContent = error.message;
    }
});