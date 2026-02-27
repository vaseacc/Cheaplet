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


// --- TRANSLATION DICTIONARY ---
const translations = {
    "en": {
        "nav_home": "Home",
        "nav_listings": "My Listings",
        "nav_messages": "Messages",
        "nav_profile": "My Profile",
        "btn_login": "Login / Register",
        "btn_logout": "Logout",
        "btn_list": "List an Item",
        "hero_title": "Great Finds, Unbeatable Prices.",
        "hero_sub": "Cheaplet is the online marketplace for smart savings. Discover secondhand books, clearance, and giveaway items in your area.",
        "btn_browse": "Start Browsing",
        "title_tags": "Popular Tags",
        "loading_tags": "Loading popular tags...",
        "search_placeholder": "Search listings...",
        "title_listings": "Featured Listings",
        "loading_listings": "Loading...",
        "no_listings": "No listings found.",
        "how_title": "How It Works",
        "step_1_title": "Create an Account",
        "step_1_text": "Quickly sign up for free to start buying and selling.",
        "step_2_title": "Post Your Item",
        "step_2_text": "Snap some photos, add tags, and list in minutes.",
        "step_3_title": "Connect & Sell",
        "step_3_text": "Message with buyers securely and arrange a sale.",
        "footer_about": "About Cheaplet",
        "footer_support": "Support",
        "footer_legal": "Legal"
    },
    "fr": {
        "nav_home": "Accueil",
        "nav_listings": "Mes Annonces",
        "nav_messages": "Messages",
        "nav_profile": "Mon Profil",
        "btn_login": "Connexion / Inscription",
        "btn_logout": "Déconnexion",
        "btn_list": "Vendre un article",
        "hero_title": "Super trouvailles, prix imbattables.",
        "hero_sub": "Cheaplet est le marché en ligne pour des économies intelligentes. Découvrez des livres d'occasion et des articles en liquidation dans votre région.",
        "btn_browse": "Commencer à naviguer",
        "title_tags": "Tags Populaires",
        "loading_tags": "Chargement des tags...",
        "search_placeholder": "Rechercher des annonces...",
        "title_listings": "Annonces en vedette",
        "loading_listings": "Chargement...",
        "no_listings": "Aucune annonce trouvée.",
        "how_title": "Comment ça marche",
        "step_1_title": "Créer un compte",
        "step_1_text": "Inscrivez-vous gratuitement pour commencer à acheter et vendre.",
        "step_2_title": "Publiez votre article",
        "step_2_text": "Prenez des photos, ajoutez des tags et publiez en quelques minutes.",
        "step_3_title": "Connectez et Vendez",
        "step_3_text": "Discutez avec les acheteurs en toute sécurité et organisez la vente.",
        "footer_about": "À propos de Cheaplet",
        "footer_support": "Support",
        "footer_legal": "Légal"
    }
};

window.applyLanguage = (lang) => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) el.textContent = translations[lang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key]) el.placeholder = translations[lang][key];
    });
    localStorage.setItem('preferred_language', lang);
};

const savedLang = localStorage.getItem('preferred_language');
if (savedLang) window.applyLanguage(savedLang);


// --- STATE VARIABLES ---
let globalSettings = {};
let currentUser = null;

// --- LISTEN FOR SETTINGS ---
const settingsRef = doc(db, "site_settings", "config");
onSnapshot(settingsRef, (docSnap) => {
    if (docSnap.exists()) {
        globalSettings = docSnap.data();
        
        // 1. Language Popup Check
        if (globalSettings.enableLanguagePrompt === true) {
            checkAndShowLanguagePopup();
        } else {
            const existingModal = document.getElementById('lang-modal');
            if (existingModal) existingModal.remove();
        }

        // 2. Global Header Injection Check
        if (globalSettings.enableGlobalHeader === true && currentUser) {
            updateHeaderToLoggedIn(currentUser);
        } else if (globalSettings.enableGlobalHeader === true && !currentUser) {
            updateHeaderToLoggedOut();
        }
    }
});


// --- AUTH LISTENER ---
onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        currentUser = user;
        
        // A. Global Ban Check
        const userRef = doc(db, "users", user.uid);
        onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().role === 'banned') {
                if (!window.location.href.includes('LoginInToCheaplet.html')) {
                    signOut(auth).then(() => {
                        alert(savedLang === 'fr' ? "Vous avez été banni." : "You have been banned.");
                        window.location.href = '/LoginInToCheaplet.html';
                    });
                }
            }
        });

        // B. Update Header if enabled
        if (globalSettings.enableGlobalHeader) {
            updateHeaderToLoggedIn(user);
        }

    } else {
        currentUser = null;
        if (globalSettings.enableGlobalHeader) {
            updateHeaderToLoggedOut();
        }
    }
});

// --- HELPER: Inject Logged In UI ---
function updateHeaderToLoggedIn(user) {
    // Finds the container (supports all your pages)
    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container) return;

    // Prevent duplicate injection
    if (container.querySelector('#globalProfileMenu')) return;

    const name = user.displayName || 'User';
    const initial = name.charAt(0).toUpperCase();
    const photoStyle = user.photoURL ? `background-image: url('${user.photoURL}');` : '';
    const content = user.photoURL ? '' : initial;

    container.innerHTML = `
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

    document.getElementById('globalListBtn').addEventListener('click', () => { window.location.href = '/listanitem.html'; });

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

    // Prevent duplicate injection
    if (container.querySelector('#globalLoginBtn')) return;

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

function checkAndShowLanguagePopup() {
    if (localStorage.getItem('preferred_language')) return;

    // Prevent multiple modals
    if (document.getElementById('lang-modal')) return;

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
        window.applyLanguage(lang);
        document.getElementById('lang-modal').remove();
    };
}
