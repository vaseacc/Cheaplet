import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";

// --- 0. AUTO-IMPORT ICONS & FAVICON ---
if (!document.querySelector('link[href*="font-awesome"]')) {
    const faLink = document.createElement('link');
    faLink.rel = 'stylesheet';
    faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(faLink);
}

if (!document.querySelector('link[rel="icon"]')) {
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/svg+xml';
    favicon.href = '/favicon.svg';
    document.head.appendChild(favicon);
}

// --- 1. INITIALIZE CONFIG ---
const response = await fetch('/.netlify/functions/config');
const config = await response.json();
const app = getApps().length === 0 ? initializeApp(config.firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. TRANSLATION DICTIONARY ---
const translations = {
    "en": { 
        "nav_browse": "Browse", "nav_listings": "My Listings", "nav_messages": "Messages", "nav_profile": "My Profile", 
        "btn_login": "Login / Register", "btn_list": "List an Item", "btn_signout": "Sign Out", 
        "verified_student": "Verified Student",
        "ban_title": "ACCESS DENIED",
        "ban_text": "This account has been permanently banned."
    },
    "fr": { 
        "nav_browse": "Parcourir", "nav_listings": "Mes Annonces", "nav_messages": "Messages", "nav_profile": "Mon Profil", 
        "btn_login": "Connexion", "btn_list": "Vendre", "btn_signout": "Déconnexion", 
        "verified_student": "Étudiant vérifié",
        "ban_title": "ACCÈS REFUSÉ",
        "ban_text": "Ce compte a été définitivement banni."
    }
};

window.applyLanguage = (lang) => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) el.textContent = translations[lang][key];
    });
    localStorage.setItem('preferred_language', lang);
};

// --- 3. GLOBAL CSS (INK & GOLD THEME) ---
const globalStyle = document.createElement('style');
globalStyle.innerHTML = `
    .btn { background: linear-gradient(135deg, #C8A96E 0%, #ddb97a 100%) !important; color: #0C1446 !important; border: none !important; padding: 0 18px !important; height: 38px !important; line-height: 38px !important; border-radius: 20px !important; font-weight: bold !important; cursor: pointer !important; transition: transform 0.2s !important; font-size: 0.85rem !important; display: inline-flex !important; align-items: center; justify-content: center; text-decoration: none !important; }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(200,169,110,0.3) !important; }
    
    .profile-menu-container { position: relative; display: flex; align-items: center; }
    .profile-avatar { width: 40px; height: 40px; border-radius: 50%; background-color: rgba(255,255,255,0.1); border: 2px solid #C8A96E; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer; background-size: cover; background-position: center; }
    
    .dropdown-menu { position: absolute; top: 50px; right: 0; width: 220px; background: white; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); display: none; flex-direction: column; overflow: hidden; color: #333; z-index: 1000; border: 1px solid #eee; }
    .dropdown-menu.show { display: flex; }
    .dropdown-header { padding: 15px; border-bottom: 1px solid #eee; background: #f9f9f9; font-weight: bold; color: #0C1446; font-size: 0.9rem; display: flex; flex-direction: column; gap: 4px; }
    
    .dropdown-item { padding: 12px 15px; text-decoration: none; color: #333; display: flex; align-items: center; gap: 10px; font-weight: 500; font-size: 0.9rem; transition: background 0.2s; }
    .dropdown-item:hover { background-color: #f4f7fc; color: #2B5C92; }
    
    .lang-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(12,20,70,0.85); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px); }
    .lang-modal { background: white; padding: 40px; border-radius: 20px; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
    .lang-btn { display: block; width: 100%; padding: 16px; margin: 12px 0; border: 2px solid #EBF2FA; border-radius: 12px; background: white; font-weight: bold; cursor: pointer; font-size: 1.1rem; transition: all 0.2s; color: #0C1446; }
    .lang-btn:hover { border-color: #C8A96E; background: #fdfaf4; }

    .terms-banner { position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(12, 20, 70, 0.98); color: #fff; padding: 15px 25px; display: flex; justify-content: center; align-items: center; gap: 25px; z-index: 99999; font-size: 0.85rem; backdrop-filter: blur(10px); border-top: 1px solid rgba(200,169,110,0.3); }
    .terms-banner a { color: #C8A96E; text-decoration: none; font-weight: bold; }
    .terms-banner a:hover { text-decoration: underline; }
    .btn-accept-terms { background: #C8A96E; color: #0C1446; border: none; padding: 8px 30px; border-radius: 20px; font-weight: 800; cursor: pointer; transition: transform 0.2s; }
    .btn-accept-terms:hover { transform: scale(1.05); }

    @media (max-width: 767px) {
        .terms-banner { flex-direction: column; text-align: center; padding-bottom: max(20px, env(safe-area-inset-bottom)); gap: 12px; }
    }
`;
document.head.appendChild(globalStyle);

// --- 4. STATE & LISTENERS ---
let globalSettings = {};
let currentUserData = null;

onSnapshot(doc(db, "site_settings", "config"), (docSnap) => {
    if (docSnap.exists()) { globalSettings = docSnap.data(); refreshUI(); }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
                if (currentUserData.role === 'banned') { triggerHardLockdown(); return; }
                if (currentUserData.language) localStorage.setItem('preferred_language', currentUserData.language);
                refreshUI();
            }
        });
    } else { currentUserData = null; refreshUI(); }
});

function triggerHardLockdown() {
    const lang = localStorage.getItem('preferred_language') || 'en';
    document.body.innerHTML = `<div style="height:100vh; background:#0C1446; color:#ff4d4d; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif; text-align:center; padding:20px;">
        <i class="fas fa-user-slash fa-4x" style="margin-bottom:20px;"></i>
        <h1>${translations[lang].ban_title}</h1>
        <p>${translations[lang].ban_text}</p>
    </div>`;
    setTimeout(() => { signOut(auth).then(() => { window.location.href = '/LoginInToCheaplet.html'; }); }, 3000);
}

function refreshUI() {
    if (currentUserData) updateHeaderToLoggedIn(currentUserData);
    else {
        updateHeaderToLoggedOut();
        if (globalSettings.enableLanguagePrompt && !sessionStorage.getItem('lang_picked_this_session')) { 
            showLanguagePopup(); 
        }
    }
    window.applyLanguage(localStorage.getItem('preferred_language') || 'en');
    showTermsBanner();
}

function updateHeaderToLoggedIn(userData) {
    const container = document.querySelector('.header-right');
    if (!container) return;
    const name = userData.displayName || 'User';
    const photoStyle = userData.photoURL ? `background-image: url('${userData.photoURL}');` : '';
    const avatarContent = userData.photoURL ? '' : name.charAt(0).toUpperCase();
    const lang = localStorage.getItem('preferred_language') || 'en';

    container.innerHTML = `
        <div class="profile-menu-container">
            <div class="profile-avatar" style="${photoStyle}">${avatarContent}</div>
            <div class="dropdown-menu" id="globalDropdown">
                <div class="dropdown-header"><span>${name}</span></div>
                <a href="/profile.html" class="dropdown-item"><i class="fas fa-user-circle"></i> ${translations[lang].nav_profile}</a>
                <a href="#" class="dropdown-item" id="globalLogout" style="color:#ff4d4d; border-top:1px solid #eee;"><i class="fas fa-sign-out-alt"></i> ${translations[lang].btn_signout}</a>
            </div>
        </div>
    `;
    
    const avatar = container.querySelector('.profile-avatar');
    const menu = document.getElementById('globalDropdown');
    avatar.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show'); };
    document.addEventListener('click', () => { if(menu) menu.classList.remove('show'); });
    document.getElementById('globalLogout').onclick = (e) => { 
        e.preventDefault();
        signOut(auth).then(() => {
            sessionStorage.clear();
            window.location.href = '/index.html';
        });
    };
}

function updateHeaderToLoggedOut() {
    const container = document.querySelector('.header-right');
    if (!container) return;
    const lang = localStorage.getItem('preferred_language') || 'en';
    container.innerHTML = `<button class="btn" onclick="window.location.href='/LoginInToCheaplet.html'">${translations[lang].btn_login}</button>`;
}

function showLanguagePopup() {
    if (document.getElementById('lang-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'lang-modal'; modal.className = 'lang-modal-overlay';
    modal.innerHTML = `
        <div class="lang-modal">
            <h2 style="color:#0C1446; margin-bottom:10px;">Welcome / Bienvenue</h2>
            <p style="color:#6b84a3; margin-bottom:20px; font-size:0.9rem;">Please select your preferred language.</p>
            <button class="lang-btn" id="btn-en">English</button>
            <button class="lang-btn" id="btn-fr">Français</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Set language and Refresh so index.html detects the change immediately
    document.getElementById('btn-en').onclick = () => { 
        localStorage.setItem('preferred_language', 'en'); 
        sessionStorage.setItem('lang_picked_this_session', 'true'); 
        location.reload(); 
    };
    document.getElementById('btn-fr').onclick = () => { 
        localStorage.setItem('preferred_language', 'fr'); 
        sessionStorage.setItem('lang_picked_this_session', 'true'); 
        location.reload(); 
    };
}

function showTermsBanner() {
    if (localStorage.getItem('cheaplet_terms_accepted') === 'true' || document.getElementById('terms-banner-global') || document.getElementById('lang-modal')) return;
    
    const lang = localStorage.getItem('preferred_language') || 'en';
    const banner = document.createElement('div');
    banner.id = 'terms-banner-global'; banner.className = 'terms-banner';
    
    const textHtml = lang === 'fr' 
        ? `En utilisant ce site, vous acceptez nos <a href="/terms.html">Conditions</a>, notre <a href="/privacy.html">Confidentialité</a> et notre <a href="/safety.html">Sécurité</a>.`
        : `By using this site, you accept our <a href="/terms.html">Terms</a>, <a href="/privacy.html">Privacy</a>, and <a href="/safety.html">Safety</a> guidelines.`;

    banner.innerHTML = `<div>${textHtml}</div><button class="btn-accept-terms" id="accept-terms-btn">ok</button>`;
    document.body.appendChild(banner);
    
    document.getElementById('accept-terms-btn').onclick = () => { 
        localStorage.setItem('cheaplet_terms_accepted', 'true'); 
        banner.remove(); 
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('.logo');
    if (logo) logo.onclick = () => window.location.href = '/index.html';
});
