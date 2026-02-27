import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";

// --- 1. INITIALIZE CONFIG ---
const response = await fetch('/.netlify/functions/config');
const config = await response.json();
const app = initializeApp(config.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. GLOBAL CSS INJECTION ---
const globalStyle = document.createElement('style');
globalStyle.innerHTML = `
    /* Profile Dropdown Styles */
    .profile-menu-container { position: relative; display: inline-block; }
    
    .profile-avatar {
        width: 40px; height: 40px; border-radius: 50%; 
        background-color: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.8);
        color: white; display: flex; align-items: center; justify-content: center;
        font-weight: bold; font-size: 1.1rem; cursor: pointer; 
        background-size: cover; background-position: center;
        transition: transform 0.2s, border-color 0.2s;
    }
    .profile-avatar:hover { transform: scale(1.05); border-color: #FFD700; }

    .dropdown-menu {
        position: absolute; top: 50px; right: 0; width: 180px;
        background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: none; flex-direction: column; overflow: hidden; 
        color: #333; z-index: 1000; text-align: left;
    }
    .dropdown-menu.show { display: flex; }
    
    .dropdown-header { padding: 12px 15px; border-bottom: 1px solid #eee; background: #f9f9f9; font-weight: bold; color: #2E7D32; font-size: 0.85rem; }
    
    .dropdown-item {
        padding: 10px 15px; text-decoration: none; color: #333; display: flex; align-items: center; gap: 10px; transition: background 0.2s; font-weight: 500; font-size: 0.9rem;
    }
    .dropdown-item:hover { background-color: #f1f8e9; color: #2E7D32; }

    /* Language Modal Styles */
    .lang-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center; }
    .lang-modal { background: white; padding: 30px; border-radius: 12px; text-align: center; max-width: 400px; width: 90%; }
    .lang-btn { display: block; width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #ddd; border-radius: 8px; background: white; font-weight: bold; cursor: pointer; font-size: 1rem; transition: 0.2s; }
    .lang-btn:hover { border-color: #4CAF50; background: #e8f5e9; color: #2E7D32; }
`;
document.head.appendChild(globalStyle);

// --- 3. TRANSLATION DICTIONARY ---
const translations = {
    "en": {
        "nav_browse": "Browse",
        "nav_listings": "My Listings",
        "nav_messages": "Messages",
        "btn_login": "Login / Register",
        "btn_list": "List an Item"
    },
    "fr": {
        "nav_browse": "Parcourir",
        "nav_listings": "Mes Annonces",
        "nav_messages": "Messages",
        "btn_login": "Connexion",
        "btn_list": "Vendre"
    }
};

window.applyLanguage = (lang) => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) el.textContent = translations[lang][key];
    });
    localStorage.setItem('preferred_language', lang);
};

// --- 4. STATE & LISTENERS ---
let globalSettings = {};
let currentUser = null;

// Listen for Site Settings (Admin toggle for header injection)
onSnapshot(doc(db, "site_settings", "config"), (docSnap) => {
    if (docSnap.exists()) {
        globalSettings = docSnap.data();
        if (globalSettings.enableLanguagePrompt && !localStorage.getItem('preferred_language')) {
            showLanguagePopup();
        }
        refreshUI();
    }
});

// Auth Listener
onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        currentUser = user;
        // Live Ban Check
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists() && docSnap.data().role === 'banned') {
                signOut(auth).then(() => {
                    alert("Account Banned.");
                    window.location.href = '/LoginInToCheaplet.html';
                });
            }
        });
    } else {
        currentUser = null;
    }
    refreshUI();
});

// --- 5. UI REFRESH ENGINE ---
function refreshUI() {
    if (globalSettings.enableGlobalHeader === false) return;
    
    if (currentUser) {
        updateHeaderToLoggedIn(currentUser);
    } else {
        updateHeaderToLoggedOut();
    }
    
    const savedLang = localStorage.getItem('preferred_language') || 'en';
    window.applyLanguage(savedLang);
}

// --- LOGGED IN (DESKTOP OPTIMIZED) ---
function updateHeaderToLoggedIn(user) {
    // A. Main Navbar (Browse, My Listings, Messages - No Home)
    const navUl = document.querySelector('nav ul');
    if (navUl) {
        navUl.innerHTML = `
            <li><a href="/search.html" data-i18n="nav_browse">Browse</a></li>
            <li><a href="/my-listings.html" data-i18n="nav_listings">My Listings</a></li>
            <li><a href="/messages.html" data-i18n="nav_messages">Messages</a></li>
        `;
    }

    // B. Header Right (List Button + Profile Circle)
    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container || container.querySelector('#globalProfileMenu')) return;

    const name = user.displayName || 'User';
    const initial = name.charAt(0).toUpperCase();
    const photoStyle = user.photoURL ? `background-image: url('${user.photoURL}');` : '';
    const avatarContent = user.photoURL ? '' : initial;

    container.innerHTML = `
        <button class="btn" id="globalListBtn" style="margin-right: 15px;" data-i18n="btn_list">List an Item</button>
        
        <div class="profile-menu-container" id="globalProfileMenu">
            <div class="profile-avatar" style="${photoStyle}">${avatarContent}</div>
            <div class="dropdown-menu" id="globalDropdown">
                <div class="dropdown-header">${name}</div>
                <a href="/profile.html" class="dropdown-item"><i class="fas fa-user"></i> My Profile</a>
                <a href="#" class="dropdown-item" id="globalLogout" style="color:#d32f2f;"><i class="fas fa-sign-out-alt"></i> Sign Out</a>
            </div>
        </div>
    `;

    // Listeners
    document.getElementById('globalListBtn').onclick = () => window.location.href = '/listanitem.html';
    
    const avatar = container.querySelector('.profile-avatar');
    const menu = document.getElementById('globalDropdown');
    
    avatar.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show'); };
    document.addEventListener('click', () => menu.classList.remove('show'));
    
    document.getElementById('globalLogout').onclick = (e) => {
        e.preventDefault();
        signOut(auth).then(() => window.location.href = '/index.html');
    };
}

// --- LOGGED OUT ---
function updateHeaderToLoggedOut() {
    const navUl = document.querySelector('nav ul');
    if (navUl) navUl.innerHTML = `<li><a href="/search.html" data-i18n="nav_browse">Browse</a></li>`;

    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container || container.querySelector('#globalLoginBtn')) return;

    container.innerHTML = `
        <button class="btn" id="globalListBtn" data-i18n="btn_list">List an Item</button>
        <button class="btn" id="globalLoginBtn" style="margin-left: 10px;" data-i18n="btn_login">Login / Register</button>
    `;

    document.getElementById('globalListBtn').onclick = () => {
        alert("Please log in to list an item.");
        window.location.href = '/LoginInToCheaplet.html';
    };
    document.getElementById('globalLoginBtn').onclick = () => window.location.href = '/LoginInToCheaplet.html';
}

// --- LANGUAGE POPUP ---
function showLanguagePopup() {
    if (document.getElementById('lang-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'lang-modal';
    modal.className = 'lang-modal-overlay';
    modal.innerHTML = `
        <div class="lang-modal">
            <h2 style="color:#2E7D32; margin-bottom:10px;">Welcome / Bienvenue</h2>
            <p style="color:#666; margin-bottom:20px;">Please select your language.</p>
            <button class="lang-btn" onclick="setLang('en')">English</button>
            <button class="lang-btn" onclick="setLang('fr')">Français</button>
        </div>
    `;
    document.body.appendChild(modal);
    window.setLang = (l) => { window.applyLanguage(l); modal.remove(); };
}

// Logo home redirect helper
document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.style.cursor = 'pointer';
        logo.onclick = () => window.location.href = '/index.html';
    }
});
