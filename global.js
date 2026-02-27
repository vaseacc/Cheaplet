import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";

// --- CONFIGURATION ---
const response = await fetch('/.netlify/functions/config');
const config = await response.json();
const app = initializeApp(config.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 1. INJECT GLOBAL STYLES (Avatar, Dropdown, Language Modal) ---
const globalStyle = document.createElement('style');
globalStyle.innerHTML = `
    /* Profile Dropdown Styles */
    .profile-menu-container { position: relative; display: inline-block; }
    
    .profile-avatar {
        width: 40px; height: 40px; border-radius: 50%; 
        background-color: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.8);
        color: white; display: flex; align-items: center; justify-content: center;
        font-weight: bold; font-size: 1.2rem; cursor: pointer; 
        background-size: cover; background-position: center;
        transition: transform 0.2s, border-color 0.2s;
    }
    .profile-avatar:hover { transform: scale(1.05); border-color: #FFD700; }

    .dropdown-menu {
        position: absolute; top: 50px; right: 0; width: 200px;
        background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: none; flex-direction: column; overflow: hidden; 
        color: #333; z-index: 1000; text-align: left;
    }
    .dropdown-menu.show { display: flex; }
    
    .dropdown-header { padding: 15px; border-bottom: 1px solid #eee; background: #f9f9f9; font-weight: bold; color: #2E7D32; font-size: 0.9rem; }
    
    .dropdown-item {
        padding: 12px 15px; text-decoration: none; color: #333; display: flex; align-items: center; gap: 10px; transition: background 0.2s; font-weight: 500;
    }
    .dropdown-item:hover { background-color: #f1f8e9; color: #2E7D32; }

    /* Language Modal Styles */
    .lang-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center; }
    .lang-modal { background: white; padding: 30px; border-radius: 12px; text-align: center; max-width: 400px; width: 90%; }
    .lang-btn { display: block; width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #ddd; border-radius: 8px; background: white; font-weight: bold; cursor: pointer; font-size: 1rem; transition: 0.2s; }
    .lang-btn:hover { border-color: #4CAF50; background: #e8f5e9; color: #2E7D32; }
`;
document.head.appendChild(globalStyle);

// --- 2. AUTH & HEADER UI UPDATER ---
onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        
        // A. Global Ban Check
        const userRef = doc(db, "users", user.uid);
        onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().role === 'banned') {
                if (!window.location.href.includes('LoginInToCheaplet.html')) {
                    signOut(auth).then(() => {
                        alert("You have been banned from Cheaplet.");
                        window.location.href = '/LoginInToCheaplet.html';
                    });
                }
            }
        });

        // B. Update Header UI (Inject Avatar)
        updateHeaderToLoggedIn(user);

    } else {
        updateHeaderToLoggedOut();
    }
});

// --- HELPER: Inject Logged In UI ---
function updateHeaderToLoggedIn(user) {
    // Look for the container. In index.html it's .header-right or .header-auth-buttons
    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container) return;

    // Get display name/photo
    const name = user.displayName || 'User';
    const initial = name.charAt(0).toUpperCase();
    const photoStyle = user.photoURL ? `background-image: url('${user.photoURL}');` : '';
    const content = user.photoURL ? '' : initial;

    // Inject HTML
    container.innerHTML = `
        <!-- Keep 'List Item' button if it exists -->
        <button class="btn" id="globalListBtn" style="margin-right: 15px;">List an Item</button>
        
        <div class="profile-menu-container" id="globalProfileMenu">
            <div class="profile-avatar" style="${photoStyle}">${content}</div>
            <div class="dropdown-menu" id="globalDropdown">
                <div class="dropdown-header">${name}</div>
                <a href="/profile.html" class="dropdown-item"><i class="fas fa-user"></i> My Profile</a>
                <a href="/messages.html" class="dropdown-item"><i class="fas fa-comment-dots"></i> Messages</a>
                <a href="#" class="dropdown-item" id="globalLogout"><i class="fas fa-sign-out-alt"></i> Sign Out</a>
            </div>
        </div>
    `;

    // Re-attach List Button Logic
    document.getElementById('globalListBtn').addEventListener('click', () => {
        window.location.href = '/listanitem.html';
    });

    // Attach Dropdown Logic
    const avatar = container.querySelector('.profile-avatar');
    const menu = document.getElementById('globalDropdown');
    const logoutBtn = document.getElementById('globalLogout');

    avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) menu.classList.remove('show');
    });

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).then(() => window.location.href = '/index.html');
    });
}

// --- HELPER: Inject Logged Out UI ---
function updateHeaderToLoggedOut() {
    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container) return;

    container.innerHTML = `
        <button class="btn" id="globalListBtn">List an Item</button>
        <button class="btn" id="globalLoginBtn" style="margin-left: 10px;">Login / Register</button>
    `;

    document.getElementById('globalListBtn').addEventListener('click', () => {
        alert("Please log in to list an item.");
        window.location.href = '/LoginInToCheaplet.html';
    });

    document.getElementById('globalLoginBtn').addEventListener('click', () => {
        window.location.href = '/LoginInToCheaplet.html';
    });
}

// --- 3. LANGUAGE SETTINGS ---
const settingsRef = doc(db, "site_settings", "config");
onSnapshot(settingsRef, (docSnap) => {
    if (docSnap.exists() && docSnap.data().enableLanguagePrompt === true) {
        checkAndShowLanguagePopup();
    }
});

function checkAndShowLanguagePopup() {
    if (localStorage.getItem('preferred_language')) return;

    const modal = document.createElement('div');
    modal.id = 'lang-modal';
    modal.className = 'lang-modal-overlay';
    modal.innerHTML = `
        <div class="lang-modal">
            <h2 style="color:#2E7D32; margin-bottom:10px;">Welcome / Bienvenue</h2>
            <p style="color:#666; margin-bottom:20px;">Please select your language.<br>Veuillez choisir votre langue.</p>
            <button class="lang-btn" onclick="window.selectLang('en')">English</button>
            <button class="lang-btn" onclick="window.selectLang('fr')">Français</button>
        </div>
    `;
    document.body.appendChild(modal);

    window.selectLang = (lang) => {
        localStorage.setItem('preferred_language', lang);
        document.getElementById('lang-modal').remove();
    };
}
