import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";

// --- CONFIGURATION ---
// You must fetch your config here just like other pages
const response = await fetch('/.netlify/functions/config');
const config = await response.json();
const app = initializeApp(config.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 1. GLOBAL BAN CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        
        // Real-time listener for Ban status
        onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().role === 'banned') {
                // If we are currently on the Banned page, don't loop
                if (!window.location.href.includes('LoginInToCheaplet.html')) {
                    signOut(auth).then(() => {
                        alert("You have been banned from Cheaplet.");
                        window.location.href = '/LoginInToCheaplet.html';
                    });
                }
            }
        });
    }
});

// --- 2. GLOBAL SETTINGS CHECK (Language Popup) ---
const settingsRef = doc(db, "site_settings", "config");

onSnapshot(settingsRef, (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Check if Language Prompt is Enabled by Admin
        if (data.enableLanguagePrompt === true) {
            checkAndShowLanguagePopup();
        } else {
            // If admin disabled it, ensure it's hidden
            const existingModal = document.getElementById('lang-modal');
            if (existingModal) existingModal.remove();
        }
    }
});

function checkAndShowLanguagePopup() {
    // Check if user already chose a language
    if (localStorage.getItem('preferred_language')) return;

    // Inject CSS
    const style = document.createElement('style');
    style.innerHTML = `
        .lang-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 10000;
            display: flex; justify-content: center; align-items: center;
        }
        .lang-modal {
            background: white; padding: 30px; border-radius: 12px;
            text-align: center; max-width: 400px; width: 90%;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        }
        .lang-btn {
            display: block; width: 100%; padding: 12px; margin: 10px 0;
            border: 2px solid #ddd; border-radius: 8px;
            background: white; font-weight: bold; cursor: pointer;
            font-size: 1rem; transition: 0.2s;
        }
        .lang-btn:hover { border-color: #4CAF50; background: #e8f5e9; color: #2E7D32; }
    `;
    document.head.appendChild(style);

    // Inject HTML
    const modal = document.createElement('div');
    modal.id = 'lang-modal';
    modal.className = 'lang-modal-overlay';
    modal.innerHTML = `
        <div class="lang-modal">
            <h2 style="color:#2E7D32; margin-bottom:10px;">Welcome to Cheaplet</h2>
            <p style="color:#666; margin-bottom:20px;">Please select your language / Veuillez choisir votre langue</p>
            <button class="lang-btn" onclick="window.setLang('en')">English</button>
            <button class="lang-btn" onclick="window.setLang('fr')">Français</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Global function to handle click
    window.setLang = (lang) => {
        localStorage.setItem('preferred_language', lang);
        document.getElementById('lang-modal').remove();
        alert(lang === 'en' ? "Language set to English" : "Langue définie sur Français");
        // Here you would add logic to actually translate the page later
    };
}
