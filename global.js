import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot, updateDoc, setDoc, collection, query, where, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";

// --- Helper for non-critical tasks ---
const runWhenIdle = (cb) => {
    if (window.requestIdleCallback) requestIdleCallback(cb);
    else setTimeout(cb, 1);
};

// --- Helper: Get the correct function URL for current environment ---
function getFunctionUrl(name) {
  return `/api/${name}`;
}

// Expose to window for use in inline scripts
window.getFunctionUrl = getFunctionUrl;

// --- 0. AUTO-IMPORT ICONS & FAVICON (Performance: Only if not present) ---
if (!document.querySelector('link[href*="font-awesome"]')) {
    const faLink = document.createElement('link');
    faLink.rel = 'stylesheet';
    faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    faLink.integrity = 'sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==';
    faLink.crossOrigin = 'anonymous';
    faLink.referrerPolicy = 'no-referrer';
    document.head.appendChild(faLink);
}
if (!document.querySelector('link[rel="icon"]')) {
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/svg+xml';
    favicon.href = '/favicon.svg';
    document.head.appendChild(favicon);
}

// --- 0.5 PWA REGISTRATION & "ADD TO HOME SCREEN" LOGIC (Index Page Only) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW reg failed:', err));
    });
}

// Track index visits for PWA prompt logic – only increment on index page
const isIndexPage = window.location.pathname === '/' || window.location.pathname.includes('index.html');
if (isIndexPage) {
    if (!sessionStorage.getItem('index_visited_this_session')) {
        let visits = parseInt(localStorage.getItem('pwa_index_visits') || '0');
        localStorage.setItem('pwa_index_visits', (visits + 1).toString());
        sessionStorage.setItem('index_visited_this_session', 'true');
    }
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    // Only show on the index page
    const isIndex = window.location.pathname === '/' || window.location.pathname.includes('index.html');
    if (!isIndex) return;

    e.preventDefault();
    deferredPrompt = e;
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (isStandalone) return;

    let dismissCount = parseInt(localStorage.getItem('pwa_dismiss_count') || '0');
    let indexVisits = parseInt(localStorage.getItem('pwa_index_visits') || '0');
    
    let threshold = 0;
    if (dismissCount === 1) threshold = 3;
    else if (dismissCount === 2) threshold = 10;
    else if (dismissCount >= 3) threshold = 14;

    if (indexVisits >= threshold) {
        showInstallPromotion();
    }
});

function showInstallPromotion() {
    if (document.getElementById('pwa-install-banner')) return;

    const lang = localStorage.getItem('preferred_language') || 'en';
    const textTitle = lang === 'fr' ? 'Installer Scoralia' : 'Install Scoralia';
    const textSub = lang === 'fr' ? "Ajouter à l'écran d'accueil" : 'Add to home screen for quick access';
    const btnText = lang === 'fr' ? 'Installer' : 'Install';

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'terms-banner';
    banner.style.zIndex = '100000';
    banner.style.bottom = '80px';
    
    banner.innerHTML = `
        <div style="display:flex; align-items:center; gap:15px; flex-grow:1;">
            <div style="width:40px; height:40px; background:var(--gold); border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:bold; color:var(--ink); font-size:1.2rem;">S</div>
            <div style="text-align:left;">
                <div style="font-weight: bold; font-size: 0.95rem; font-family:'Playfair Display', serif;">${textTitle}</div>
                <div style="font-size: 0.8rem; opacity: 0.9;">${textSub}</div>
            </div>
        </div>
        <div style="display:flex; gap:15px; align-items:center;">
            <button class="btn-accept-terms" id="btn-pwa-install">${btnText}</button>
            <button id="btn-pwa-dismiss" style="background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer; opacity:0.7;">&times;</button>
        </div>
    `;
    document.body.appendChild(banner);

    document.getElementById('btn-pwa-install').addEventListener('click', async () => {
        banner.style.display = 'none';
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
        }
    });

    document.getElementById('btn-pwa-dismiss').addEventListener('click', () => {
        banner.style.display = 'none';
        let currentCount = parseInt(localStorage.getItem('pwa_dismiss_count') || '0');
        localStorage.setItem('pwa_dismiss_count', (currentCount + 1).toString());
        localStorage.setItem('pwa_index_visits', '0');
    });
}

window.addEventListener('appinstalled', () => {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'none';
    deferredPrompt = null;
});

// --- 1. INITIALIZE CONFIG (With caching for speed) ---
let config;
const savedConfig = sessionStorage.getItem('scoralia_config');

if (savedConfig) {
    config = JSON.parse(savedConfig);
} else {
    const res = await fetch(getFunctionUrl('config'));
    config = await res.json();
    sessionStorage.setItem('scoralia_config', JSON.stringify(config));
}

const app = getApps().length === 0 ? initializeApp(config.firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// --- EXPOSE FIREBASE TO WINDOW FOR OTHER PAGES ---
window.scoraliaAuth = auth;
window.scoraliaDb = db;
window.scoraliaApp = app;
window.scoraliaOnAuthStateChanged = (callback) => onAuthStateChanged(auth, callback);

// --- HELPER: Convert Cloudinary image URLs to WebP for performance ---
window.optimizeImageUrl = (url) => {
    if (!url) return url;
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
        if (!url.includes('f_auto') && !url.includes('q_auto')) {
            return url.replace('/upload/', '/upload/f_auto,q_auto/');
        }
    }
    return url;
};

// --- FIX: Add title to Firebase Auth iframe for accessibility ---
function setupFirebaseIframeTitleObserver() {
    const observer = new MutationObserver(() => {
        const iframe = document.querySelector('iframe[src*="firebaseapp.com"]');
        if (iframe && !iframe.hasAttribute('title')) {
            iframe.setAttribute('title', 'Firebase Authentication');
            observer.disconnect(); 
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const existingIframe = document.querySelector('iframe[src*="firebaseapp.com"]');
    if (existingIframe && !existingIframe.hasAttribute('title')) {
        existingIframe.setAttribute('title', 'Firebase Authentication');
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFirebaseIframeTitleObserver);
} else {
    setupFirebaseIframeTitleObserver();
}

// =========================================================================
// --- CLOUDFLARE TURNSTILE BOT SHIELD LOGIC ---
// =========================================================================

window.checkBotLimits = async () => {
    const MAX_LISTINGS = 1; 
    const MAX_IMAGES = 20;

    let stats = JSON.parse(localStorage.getItem('scoralia_usage_stats') || '{"listings":0, "images":0, "lastReset":0}');
    const now = Date.now();

    if (now - stats.lastReset > 86400000) {
        stats = { listings: 0, images: 0, lastReset: now };
        localStorage.setItem('scoralia_usage_stats', JSON.stringify(stats));
    }

    if (stats.listings >= MAX_LISTINGS || stats.images >= MAX_IMAGES) {
        return await triggerBotChallenge();
    }
    return true;
};

window.recordActivity = (type) => {
    let stats = JSON.parse(localStorage.getItem('scoralia_usage_stats') || '{"listings":0, "images":0, "lastReset":0}');
    if (!stats.lastReset) stats.lastReset = Date.now();
    if (stats[type] !== undefined) stats[type]++;
    localStorage.setItem('scoralia_usage_stats', JSON.stringify(stats));
};

async function triggerBotChallenge() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'lang-modal-overlay';
        overlay.style.zIndex = '20000';
        overlay.id = 'bot-shield-overlay';
        overlay.innerHTML = `
            <div class="lang-modal" style="padding: 40px 20px;">
                <i class="fas fa-robot fa-3x" style="color:var(--gold); margin-bottom:15px;"></i>
                <h2 style="font-family: 'Playfair Display', serif; color: var(--ink); margin-bottom: 10px;">Security Check</h2>
                <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 25px;">To keep Scoralia safe from bots, please complete this quick verification.</p>
                <div id="turnstile-container" style="display: flex; justify-content: center; margin: 20px 0;"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        const script = document.createElement('script');
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        window.onTurnstileSuccess = async (token) => {
            try {
                const res = await fetch(getFunctionUrl('verify-bot'), {
                    method: 'POST',
                    body: JSON.stringify({ token: token })
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('bot-shield-overlay').remove();
                    localStorage.setItem('scoralia_usage_stats', JSON.stringify({
                        listings: 0, 
                        images: 0, 
                        lastReset: Date.now()
                    }));
                    console.log("Verification successful!");
                    resolve(true);
                } else {
                    alert("Verification failed. Please try again.");
                    window.location.reload();
                }
            } catch (err) {
                console.error("Bot verification error:", err);
                alert("Error connecting to security server. Please try again.");
                window.location.reload();
            }
        };

        script.onload = () => {
            turnstile.render('#turnstile-container', {
                sitekey: '0x4AAAAAAC8mKfhLYButTzAM', 
                callback: window.onTurnstileSuccess,
            });
        };
    });
}
// =========================================================================

// --- 2. TRANSLATION DICTIONARY ---
const translations = {
    "en": {
        "nav_browse": "Browse", "nav_listings": "My Listings", "nav_messages": "Messages", "nav_profile": "My Profile", "nav_hub": "Campus Hub", "nav_activity": "My Activity",
        "btn_login": "Login / Register", "btn_list": "List an Item", "btn_signout": "Sign Out",
        "verified_student": "Verified Student",
        "ban_title": "ACCESS DENIED",
        "ban_text": "This account has been banned.",
        "ban_perm": "Permanent Ban",
        "ban_until": "Banned until: ",
        "tour_title_1": "Welcome to Scoralia!",
        "tour_desc_1": "Your campus marketplace for textbooks and essentials. Buy cheaply, sell quickly, and save money every semester.",
        "tour_title_2": "Trust & Safety",
        "tour_desc_2": "Look for the <span style='color:#2E7D32; font-weight:bold;'><i class='fas fa-graduation-cap'></i> Verified Student</span> badge. It means the user registered with an official college email.",
        "tour_title_3": "Smart Features",
        "tour_desc_3": "Click the bookmark icon on any listing to save it. You can easily find your saved items later in <b>My Profile</b>.",
        "tour_title_4": "Personalize Your Profile",
        "tour_desc_4": "Set your full name and a unique username (e.g., @jhondoe). Add a photo to personalize your account.",
        "tour_full_name_lbl": "Full Name (max 15 letters)",
        "tour_full_name_hint": "Letters only, no spaces",
        "tour_full_name_valid": "✓ Looks good",
        "tour_full_name_invalid": "Only letters, max 15 characters",
        "tour_username_lbl": "Username",
        "tour_username_hint": "Letters, numbers, _ and .",
        "tour_username_invalid": "Invalid characters",
        "tour_username_unavailable": "✗ Already taken",
        "tour_username_available": "✓ Available",
        "tour_username_checking": "Checking...",
        "tour_upload": "Choose Photo",
        "tour_next": "Next",
        "tour_start": "Finish & Explore",
        "tour_saving": "Saving...",
        "warning_title": "Admin Warning",
        "warning_btn": "I Understand",
        "contact": "Contact Us",
        "social_tour_title_1": "Welcome to the Campus Hub!",
        "social_tour_desc_1": "This is where the campus community connects. Share updates, ask questions, and engage with fellow students.",
        "social_tour_title_2": "Post & Share",
        "social_tour_desc_2": "Write what's on your mind in the composer. You can attach images and even link your marketplace listings directly to your post.",
        "social_tour_title_3": "School Feeds",
        "social_tour_desc_3": "Use the filter bar to switch between <strong>Global Campus</strong> (everyone) and <strong>My School</strong> (verified students only). To access your school feed, you need a verified email from your institution.",
        "social_tour_title_4": "Create Your Own Topic",
        "social_tour_desc_4": "Click the <strong>Create Topic</strong> button in the sidebar. Start a discussion about study groups, events, or anything relevant to your campus.",
        "social_tour_gotit": "Got it!"
    },
    "fr": {
        "nav_browse": "Parcourir", "nav_listings": "Mes Annonces", "nav_messages": "Messages", "nav_profile": "Mon Profil", "nav_hub": "Hub Campus", "nav_activity": "Mon Activité",
        "btn_login": "Connexion", "btn_list": "Vendre", "btn_signout": "Déconnexion",
        "verified_student": "Étudiant vérifié",
        "ban_title": "ACCÈS REFUSÉ",
        "ban_text": "Ce compte a été banni.",
        "ban_perm": "Bannissement permanent",
        "ban_until": "Banni jusqu'au : ",
        "tour_title_1": "Bienvenue sur Scoralia !",
        "tour_desc_1": "Votre marché étudiant pour les manuels et articles essentiels. Achetez à bas prix, vendez rapidement et économisez.",
        "tour_title_2": "Confiance et Sécurité",
        "tour_desc_2": "Recherchez le badge <span style='color:#2E7D32; font-weight:bold;'><i class='fas fa-graduation-cap'></i> Étudiant vérifié</span>. Il indique une inscription avec un courriel scolaire officiel.",
        "tour_title_3": "Fonctionnalités",
        "tour_desc_3": "Cliquez sur l'icône de signet pour sauvegarder une annonce. Retrouvez-les facilement dans <b>Mon Profil</b>.",
        "tour_title_4": "Personnalisez votre profil",
        "tour_desc_4": "Définissez votre nom complet et un nom d'utilisateur unique (ex: @jhondoe). Ajoutez une photo pour personnaliser votre compte.",
        "tour_full_name_lbl": "Nom complet (max 15 lettres)",
        "tour_full_name_hint": "Lettres uniquement, sans espaces",
        "tour_full_name_valid": "✓ Parfait",
        "tour_full_name_invalid": "Lettres seulement, max 15 caractères",
        "tour_username_lbl": "Nom d'utilisateur",
        "tour_username_hint": "Lettres, chiffres, _ et .",
        "tour_username_invalid": "Caractères invalides",
        "tour_username_unavailable": "✗ Déjà pris",
        "tour_username_available": "✓ Disponible",
        "tour_username_checking": "Vérification...",
        "tour_upload": "Choisir une photo",
        "tour_next": "Suivant",
        "tour_start": "Terminer & Explorer",
        "tour_saving": "Enregistrement...",
        "warning_title": "Avertissement de l'Administration",
        "warning_btn": "J'ai compris",
        "contact": "Nous contacter",
        "social_tour_title_1": "Bienvenue sur le Hub Campus !",
        "social_tour_desc_1": "C'est l'espace où la communauté étudiante se connecte. Partagez des nouvelles, posez des questions et interagissez avec d'autres étudiants.",
        "social_tour_title_2": "Publier et partager",
        "social_tour_desc_2": "Écrivez ce qui vous passe par la tête dans le composeur. Vous pouvez joindre des images et même lier vos annonces de marché directement à votre publication.",
        "social_tour_title_3": "Flux d'établissement",
        "social_tour_desc_3": "Utilisez le filtre pour basculer entre <strong>Campus Global</strong> (tout le monde) et <strong>Mon école</strong> (étudiants vérifiés seulement). Pour accéder au fil de votre école, vous devez avoir un email scolaire vérifié.",
        "social_tour_title_4": "Créez votre propre sujet",
        "social_tour_desc_4": "Cliquez sur le bouton <strong>Créer un sujet</strong> dans la barre latérale. Lancez une discussion sur les groupes d'étude, les événements ou tout ce qui est pertinent pour votre campus.",
        "social_tour_gotit": "Compris !"
    }
};

window.applyLanguage = (lang) => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) el.textContent = translations[lang][key];
    });
    const footerLinks =[
        { id: 'link-terms', key: 'terms' },
        { id: 'link-privacy', key: 'priv' },
        { id: 'link-safety', key: 'safe' },
        { id: 'link-contact', key: 'contact' }
    ];
    footerLinks.forEach(linkInfo => {
        const el = document.getElementById(linkInfo.id);
        if (el && translations[lang] && translations[lang][linkInfo.key]) {
            el.textContent = translations[lang][linkInfo.key];
        }
    });
    localStorage.setItem('preferred_language', lang);
    document.documentElement.lang = lang;
};

// --- 3. GLOBAL CSS ---
const globalStyle = document.createElement('style');
globalStyle.innerHTML = `
    .header-inner, .header-content { display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 15px !important; flex-direction: row !important; }
    nav { flex-grow: 1; display: flex; justify-content: center; }
    nav ul { display: flex; list-style: none; gap: 28px; padding: 0; margin: 0; align-items: center; }
    nav ul li a { color: rgba(255,255,255,0.75); text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: color 0.2s; white-space: nowrap; }
    nav ul li a:hover { color: #FFFFFF; }
    .header-right { display: flex !important; align-items: center !important; gap: 12px !important; flex-shrink: 0 !important; flex-direction: row !important; }
    .btn { background: linear-gradient(135deg, #C8A96E 0%, #ddb97a 100%) !important; color: #0C1446 !important; border: none !important; padding: 0 18px !important; height: 38px !important; line-height: 38px !important; border-radius: 20px !important; font-weight: bold !important; cursor: pointer !important; transition: all 0.2s !important; font-size: 0.82rem !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; text-decoration: none !important; white-space: nowrap !important; }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(200,169,110,0.3) !important; }
    .btn:disabled { opacity: 0.7; cursor: not-allowed !important; transform: none !important; }
    .profile-menu-container { position: relative; display: flex; align-items: center; z-index: 1001; }
    .profile-avatar { width: 38px; height: 38px; border-radius: 50%; background-color: #1a2a4a; border: 2px solid #C8A96E; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer; overflow: hidden; flex-shrink: 0; }
    .profile-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .dropdown-menu { position: absolute; top: 48px; right: 0; width: 260px; background: white; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); display: none; flex-direction: column; overflow: hidden; color: #333; z-index: 1000; border: 1px solid #eee; }
    .dropdown-menu.show { display: flex; }
    .dropdown-header { padding: 15px; border-bottom: 1px solid #eee; background: #f9f9f9; font-weight: bold; color: #0C1446; font-size: 0.9rem; display: flex; flex-direction: column; gap: 4px; }
    .dropdown-header .display-name { font-weight: 700; }
    .dropdown-header .username { font-size: 0.75rem; color: #666; font-family: monospace; }
    .dropdown-item { padding: 12px 15px; text-decoration: none; color: #333; display: flex; align-items: center; gap: 10px; font-weight: 500; font-size: 0.9rem; transition: background 0.2s; }
    .dropdown-item:hover { background-color: #f4f7fc; color: #2B5C92; }
    
    /* 🔴 MOBILE UNREAD BADGE & ICON CSS HERE */
    .msg-btn-mobile { background: #C8A96E; color: #0C1446; width: 36px; height: 36px; border-radius: 50%; display: none; align-items: center; justify-content: center; text-decoration: none; margin-right: 12px; font-size: 1rem; position: relative; }
    .badge-container { position: relative; display: inline-block; }
    .unread-badge { position: absolute; top: -6px; right: -12px; background-color: #C0392B; color: white; font-size: 0.65rem; font-weight: bold; padding: 2px 5px; border-radius: 10px; display: none; align-items: center; justify-content: center; z-index: 10; min-width: 18px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    .msg-btn-mobile .unread-badge { top: -2px; right: -4px; border: 2px solid #C8A96E; }

    .lang-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(12,20,70,0.85); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px); }
    .lang-modal { background: white; padding: 40px; border-radius: 20px; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
    .lang-btn { display: block; width: 100%; padding: 16px; margin: 12px 0; border: 2px solid #EBF2FA; border-radius: 12px; background: white; font-weight: bold; cursor: pointer; font-size: 1.1rem; transition: all 0.2s; color: #0C1446; }
    .lang-btn:hover { border-color: #C8A96E; background: #fdfaf4; }
    .tour-dot { width: 8px; height: 8px; border-radius: 50%; background: #e0e0e0; transition: 0.3s; }
    .tour-dot.active { background: #C8A96E; width: 24px; border-radius: 10px; }
    .tour-input { width: 100%; padding: 10px 12px; border: 2px solid #eee; border-radius: 8px; margin-bottom: 12px; font-size: 0.95rem; outline: none; transition: border-color 0.2s; text-align: left; font-weight: bold; color: #0C1446; }
    .tour-input:focus { border-color: #C8A96E; }
    .tour-pfp-preview { width: 80px; height: 80px; border-radius: 50%; background: #eee; margin: 0 auto 15px; border: 3px solid #C8A96E; object-fit: cover; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #aaa; overflow: hidden; }
    .tour-pfp-preview img { width: 100%; height: 100%; object-fit: cover; }
    
    /* Tour form classes (ported from login) */
    .field-wrap { margin-bottom: 12px; text-align: left; }
    .field-label { display: block; font-size: 10px; font-weight: 600; letter-spacing: 0.10em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
    .input-status { position: relative; }
    .status-icon { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; pointer-events: none; }
    .status-valid { color: #2E7D32; }
    .status-invalid { color: #e53e3e; }
    .status-checking { color: #C8A96E; }
    .field-hint { font-size: 10px; margin-top: 4px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
    .hint-text { color: var(--text-muted); }
    .hint-error { color: #e53e3e; }

    .terms-banner { position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(12, 20, 70, 0.98); color: #fff; padding: 15px 25px; display: flex; justify-content: center; align-items: center; gap: 25px; z-index: 99999; font-size: 0.85rem; backdrop-filter: blur(10px); border-top: 1px solid rgba(200,169,110,0.3); }
    .btn-accept-terms { background: #C8A96E; color: #0C1446; border: none; padding: 8px 30px; border-radius: 20px; font-weight: 800; cursor: pointer; }
    .desktop-only { display: inline-flex; }
    .mobile-link { display: none; }
    
    .warning-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10050; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px); }
    .warning-modal { background: #fff5f5; border: 2px solid #ef4444; border-radius: 16px; padding: 30px; text-align: center; max-width: 450px; width: 90%; box-shadow: 0 20px 60px rgba(239, 68, 68, 0.2); }
    .warning-modal h2 { color: #b91c1c; font-family: 'Playfair Display', serif; font-size: 1.8rem; margin-bottom: 15px; }
    .warning-modal p { color: #7f1d1d; font-size: 1.05rem; margin-bottom: 25px; line-height: 1.5; }
    .warning-btn { background: #ef4444; color: white; border: none; padding: 12px 30px; border-radius: 30px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s; }
    .warning-btn:hover { background: #dc2626; transform: translateY(-2px); }

    @media (max-width: 767px) {
        nav { display: none !important; }
        .msg-btn-mobile { display: flex; }
        .desktop-only { display: none !important; }
        .mobile-link { display: flex; }
        .terms-banner { flex-direction: column; text-align: center; padding-bottom: max(20px, env(safe-area-inset-bottom)); gap: 12px; }
        .lang-modal { padding: 30px 20px; }
    }
`;
document.head.appendChild(globalStyle);

// --- SCHOOL DOMAIN CHECKER ---
const schoolDomains = {
    "@etu.cegepjonquiere.ca": "Cégep de Jonquière",
    "@cegep-lanaudiere.qc.ca": "Cégep de Lanaudière",
    "@etu.cegep-lanaudiere.qc.ca": "Cégep de Lanaudière",
    "@crosemont.qc.ca": "Cégep de Rosemont",
    "@cmaisonneuve.qc.ca": "Cégep Maisonneuve",
    "@cegepmv.qc.ca": "Cégep Marie-Victorin",
    "@collegeahuntsic.qc.ca": "Collège Ahuntsic",
    "@dawsoncollege.qc.ca": "Dawson College",
    "@usherbrooke.ca": "Université de Sherbrooke",
    "@ulaval.ca": "Université Laval"
};

function getSchoolInfo(email) {
    if (!email) return { isStudent: false, schoolName: null };
    const domain = email.substring(email.lastIndexOf("@")).toLowerCase();
    return schoolDomains[domain]
        ? { isStudent: true, schoolName: schoolDomains[domain] }
        : { isStudent: false, schoolName: null };
}

// --- FUNCTION TO UPDATE USER CONTENT ---
async function updateUserContent(uid, newDisplayName) {
    if (!newDisplayName) return;
    try {
        const listingsQuery = query(collection(db, "listings"), where("posterUid", "==", uid));
        const listingsSnap = await getDocs(listingsQuery);
        const batch = writeBatch(db);
        listingsSnap.forEach(doc => { batch.update(doc.ref, { posterDisplayName: newDisplayName }); });
        await batch.commit();

        const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", uid));
        const chatsSnap = await getDocs(chatsQuery);
        const chatBatch = writeBatch(db);
        chatsSnap.forEach(doc => {
            const data = doc.data();
            const participantInfo = data.participantInfo || {};
            if (participantInfo[uid] !== newDisplayName) {
                participantInfo[uid] = newDisplayName;
                chatBatch.update(doc.ref, { participantInfo });
            }
        });
        await chatBatch.commit();
    } catch (err) { console.error("Error updating user content:", err); }
}
window.updateUserContent = updateUserContent;

// --- STATE & LISTENERS ---
let globalSettings = {};
let currentUserData = null;
let unsubscribeChats = null;

onSnapshot(doc(db, "site_settings", "config"), (docSnap) => {
    if (docSnap.exists()) { globalSettings = docSnap.data(); refreshUI(); }
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        onSnapshot(doc(db, "users", user.uid), async (docSnap) => {
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
                
                if (currentUserData.activeWarning) {
                    showWarningPopup(currentUserData.activeWarning, user.uid);
                }

                if (currentUserData.role === 'banned') { 
                    if (currentUserData.banExpiresAt && currentUserData.banExpiresAt.toDate() < new Date()) {
                        await updateDoc(doc(db, "users", user.uid), { role: 'user', banExpiresAt: null });
                        currentUserData.role = 'user';
                    } else {
                        triggerHardLockdown(currentUserData.banExpiresAt); 
                        return; 
                    }
                }
                
                if (currentUserData.isStudent === undefined && user.email) {
                    const schoolInfo = getSchoolInfo(user.email);
                    await updateDoc(doc(db, "users", user.uid), {
                        isStudent: schoolInfo.isStudent,
                        schoolName: schoolInfo.schoolName
                    });
                    currentUserData.isStudent = schoolInfo.isStudent;
                    currentUserData.schoolName = schoolInfo.schoolName;
                }

                const storedLang = currentUserData.language;
                const localLang = localStorage.getItem('preferred_language');
                if (storedLang && translations[storedLang]) {
                    if (localLang !== storedLang) {
                        localStorage.setItem('preferred_language', storedLang);
                        window.applyLanguage(storedLang);
                    }
                } else if (localLang && translations[localLang]) {
                    await updateDoc(doc(db, "users", user.uid), { language: localLang });
                    currentUserData.language = localLang;
                }

                refreshUI();
                const tourKey = `scoralia_tour_seen_${user.uid}`;
                if (!currentUserData.hasSeenTour && !localStorage.getItem(tourKey)) {
                    showWelcomeTour();
                }
                const socialTourKey = `scoralia_social_tour_seen_${user.uid}`;
                if (!currentUserData.hasSeenSocialTour && !localStorage.getItem(socialTourKey)) {
                    const path = window.location.pathname;
                    if (path.includes('/social.html') || path.includes('/topic.html')) {
                        showSocialTour();
                    }
                }
            } else {
                const schoolInfo = getSchoolInfo(user.email);
                const lang = localStorage.getItem('preferred_language');
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid, 
                    displayName: user.displayName || "", 
                    email: user.email, 
                    role: 'user', 
                    isStudent: schoolInfo.isStudent,
                    schoolName: schoolInfo.schoolName,
                    language: lang || null,
                    createdAt: new Date().toISOString()
                }).catch(console.error);
            }
        });
    } else {
        currentUserData = null;
        refreshUI();
    }
});

function showWarningPopup(warningText, uid) {
    if (document.getElementById('admin-warning-modal')) return;
    const lang = localStorage.getItem('preferred_language') || 'en';
    const t = translations[lang];

    const modal = document.createElement('div');
    modal.id = 'admin-warning-modal';
    modal.className = 'warning-modal-overlay';
    modal.innerHTML = `
        <div class="warning-modal">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 15px;"></i>
            <h2>${t.warning_title}</h2>
            <p>${warningText}</p>
            <button class="warning-btn" id="btn-ack-warning">${t.warning_btn}</button>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btn-ack-warning').onclick = async () => {
        modal.remove();
        await updateDoc(doc(db, "users", uid), { activeWarning: null });
    };
}

function triggerHardLockdown(expireTimestamp) {
    const lang = localStorage.getItem('preferred_language') || 'en';
    const t = translations[lang];
    
    let expiryText = "";
    if (expireTimestamp) {
        const date = expireTimestamp.toDate();
        const dateStr = lang === 'fr' ? date.toLocaleString('fr-CA') : date.toLocaleString('en-US');
        expiryText = `<div style="margin-top:15px; font-size:1.2rem; color:#aaa; font-weight:bold;">${t.ban_until}<br><span style="color:#FFD700;">${dateStr}</span></div>`;
    } else {
        expiryText = `<div style="margin-top:15px; font-size:1.2rem; color:#aaa; font-weight:bold; text-transform:uppercase;">${t.ban_perm}</div>`;
    }

    document.body.innerHTML = `<div style="height:100vh; background:#0C1446; color:#ff4d4d; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif; text-align:center; padding:20px;">
        <i class="fas fa-user-slash fa-4x" style="margin-bottom:20px;"></i>
        <h1 style="font-family:'Playfair Display', serif; font-size: 3rem; margin-bottom: 10px;">${t.ban_title}</h1>
        <p style="font-size: 1.1rem; color: #ccc;">${t.ban_text}</p>
        ${expiryText}
    </div>`;

    setTimeout(() => { signOut(auth).then(() => { window.location.href = '/login.html'; }); }, 5000);
}

function showWelcomeTour() {
    if (window.location.pathname.includes('/login.html')) return;

    const user = auth.currentUser;
    if (!user) return;
    const tourKey = `scoralia_tour_seen_${user.uid}`;
    if (localStorage.getItem(tourKey) === 'true') return;
    if (currentUserData && currentUserData.hasSeenTour) { localStorage.setItem(tourKey, 'true'); return; }
    if (document.querySelector('.lang-modal-overlay')) return;

    const lang = localStorage.getItem('preferred_language') || 'en';
    const t = translations[lang];
    const defaultPfpUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}&backgroundColor=EBF2FA`;
    const existingFullName = currentUserData?.displayName || '';
    const existingUsername = currentUserData?.username || '';

    const isOAuth = user.providerData.some(p => p.providerId === 'microsoft.com' || p.providerId === 'google.com');
    const hasProfileData = existingFullName && existingUsername;
    const skipProfileStep = !isOAuth && hasProfileData;

    const overlay = document.createElement('div');
    overlay.className = 'lang-modal-overlay';
    overlay.style.zIndex = '10005';
    overlay.innerHTML = `
        <div class="lang-modal" style="padding: 40px 30px;">
            <div id="tour-step-1">
                <i class="fas fa-handshake fa-3x" style="color:#C8A96E; margin-bottom:20px;"></i>
                <h2 style="color:#0C1446; margin-bottom:15px; font-family:'Playfair Display', serif;">${t.tour_title_1}</h2>
                <p style="color:#6b84a3; margin-bottom:30px; line-height:1.6; font-size:0.95rem;">${t.tour_desc_1}</p>
                <button class="btn" id="tour-btn-1" style="width:100%;">${t.tour_next}</button>
            </div>
            <div id="tour-step-2" style="display:none;">
                <i class="fas fa-shield-alt fa-3x" style="color:#C8A96E; margin-bottom:20px;"></i>
                <h2 style="color:#0C1446; margin-bottom:15px; font-family:'Playfair Display', serif;">${t.tour_title_2}</h2>
                <p style="color:#6b84a3; margin-bottom:30px; line-height:1.6; font-size:0.95rem;">${t.tour_desc_2}</p>
                <button class="btn" id="tour-btn-2" style="width:100%;">${t.tour_next}</button>
            </div>
            <div id="tour-step-3" style="display:none;">
                <i class="fas fa-bookmark fa-3x" style="color:#C8A96E; margin-bottom:20px;"></i>
                <h2 style="color:#0C1446; margin-bottom:15px; font-family:'Playfair Display', serif;">${t.tour_title_3}</h2>
                <p style="color:#6b84a3; margin-bottom:30px; line-height:1.6; font-size:0.95rem;">${t.tour_desc_3}</p>
                <button class="btn" id="tour-btn-3" style="width:100%;">${skipProfileStep ? t.tour_start : t.tour_next}</button>
            </div>
            ${!skipProfileStep ? `
            <div id="tour-step-4" style="display:none;">
                <div class="tour-pfp-preview" id="tour-pfp-box"><img src="${defaultPfpUrl}"></div>
                <h2 style="color:#0C1446; margin-bottom:10px; font-family:'Playfair Display', serif;">${t.tour_title_4}</h2>
                <p style="color:#6b84a3; margin-bottom:15px; line-height:1.4; font-size:0.85rem;">${t.tour_desc_4}</p>
                
                <div class="field-wrap" style="text-align: left;">
                    <label class="field-label">${t.tour_full_name_lbl}</label>
                    <div class="input-status">
                        <input type="text" id="tour-fullname" class="tour-input" value="${existingFullName}" placeholder="Alex" maxlength="15" autocomplete="name">
                        <span class="status-icon" id="tour-fullname-status"></span>
                    </div>
                    <div class="field-hint" id="tour-fullname-hint">
                        <span class="hint-text">${t.tour_full_name_hint}</span>
                    </div>
                </div>

                <div class="field-wrap" style="text-align: left;">
                    <label class="field-label">${t.tour_username_lbl}</label>
                    <div class="input-status">
                        <input type="text" id="tour-username" class="tour-input" value="${existingUsername}" placeholder="alex_123" maxlength="30" autocomplete="off">
                        <span class="status-icon" id="tour-username-status-icon"></span>
                    </div>
                    <div class="field-hint" id="tour-username-hint">
                        <span class="hint-text" id="tour-username-hint-text">${t.tour_username_hint}</span>
                        <span id="tour-username-availability"></span>
                    </div>
                </div>

                <input type="file" id="tour-file-input" accept="image/*" style="display:none;">
                <label for="tour-file-input" style="display:block; cursor:pointer; color:#2B5C92; font-weight:bold; margin-bottom:20px; text-decoration:underline;">
                    <i class="fas fa-camera"></i> ${t.tour_upload}
                </label>
                
                <div id="tour-final-error" style="color:#d32f2f; font-size:0.85rem; margin-bottom:10px; display:none; text-align:center; font-weight:bold; border: 1px solid #ffcdd2; background: #fef2f2; padding: 8px; border-radius: 6px;"></div>
                
                <button class="btn" id="tour-btn-4" style="width:100%;" disabled>${t.tour_start}</button>
            </div>
            ` : ''}
            <div style="display:flex; justify-content:center; gap:8px; margin-top:25px;" id="tour-dots">
                <div class="tour-dot active" id="dot-1"></div><div class="tour-dot" id="dot-2"></div>
                <div class="tour-dot" id="dot-3"></div>${!skipProfileStep ? '<div class="tour-dot" id="dot-4"></div>' : ''}
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const finishTour = async () => {
        await updateDoc(doc(db, "users", user.uid), { hasSeenTour: true });
        localStorage.setItem(tourKey, 'true');
        overlay.remove();
    };

    document.getElementById('tour-btn-1').onclick = () => {
        document.getElementById('tour-step-1').style.display = 'none'; 
        document.getElementById('tour-step-2').style.display = 'block';
        document.getElementById('dot-1').classList.remove('active'); 
        document.getElementById('dot-2').classList.add('active');
    };
    document.getElementById('tour-btn-2').onclick = () => {
        document.getElementById('tour-step-2').style.display = 'none'; 
        document.getElementById('tour-step-3').style.display = 'block';
        document.getElementById('dot-2').classList.remove('active'); 
        document.getElementById('dot-3').classList.add('active');
    };
    
    const btn3 = document.getElementById('tour-btn-3');
    btn3.onclick = () => {
        if (skipProfileStep) {
            finishTour();
        } else {
            document.getElementById('tour-step-3').style.display = 'none'; 
            document.getElementById('tour-step-4').style.display = 'block';
            document.getElementById('dot-3').classList.remove('active'); 
            document.getElementById('dot-4').classList.add('active');
            
            const nameInput = overlay.querySelector('#tour-fullname');
            const usernameInput = overlay.querySelector('#tour-username');
            if (nameInput.value) nameInput.dispatchEvent(new Event('input'));
            if (usernameInput.value) usernameInput.dispatchEvent(new Event('input'));
        }
    };

    if (!skipProfileStep) {
        const nameInput = overlay.querySelector('#tour-fullname');
        const usernameInput = overlay.querySelector('#tour-username');
        const fullnameStatus = overlay.querySelector('#tour-fullname-status');
        const fullnameHint = overlay.querySelector('#tour-fullname-hint');
        const usernameStatusIcon = overlay.querySelector('#tour-username-status-icon');
        const usernameHintText = overlay.querySelector('#tour-username-hint-text');
        const usernameAvailability = overlay.querySelector('#tour-username-availability');
        const finishBtn = overlay.querySelector('#tour-btn-4');
        const finalError = overlay.querySelector('#tour-final-error');

        let isFullnameValid = false;
        let isUsernameValid = false;
        let usernameTimeout = null;

        function isValidFullName(name) { return /^[A-Za-z]{1,15}$/.test(name); }
        function isValidUsernameFormat(username) { return /^[a-zA-Z0-9_.]{1,30}$/.test(username); }

        function updateSubmitButton() {
            if (finishBtn) finishBtn.disabled = !(isFullnameValid && isUsernameValid);
        }

        function updateFullnameUI() {
            finalError.style.display = 'none';
            nameInput.style.borderColor = '#eee';
            const name = nameInput.value.trim();
            if (!name) {
                fullnameStatus.innerHTML = '';
                fullnameHint.innerHTML = `<span class="hint-text">${t.tour_full_name_hint}</span>`;
                isFullnameValid = false;
            } else if (isValidFullName(name)) {
                fullnameStatus.innerHTML = '<i class="fas fa-check-circle status-valid"></i>';
                fullnameHint.innerHTML = `<span class="hint-text" style="color: #2E7D32;">${t.tour_full_name_valid}</span>`;
                isFullnameValid = true;
            } else {
                fullnameStatus.innerHTML = '<i class="fas fa-times-circle status-invalid"></i>';
                fullnameHint.innerHTML = `<span class="hint-error">${t.tour_full_name_invalid}</span>`;
                isFullnameValid = false;
            }
            updateSubmitButton();
        }

        async function checkUsernameAvailability(username) {
            if (!username || username.length < 1) return false;
            const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
            const snap = await getDocs(q);
            if (snap.empty) {
                usernameStatusIcon.innerHTML = '<i class="fas fa-check-circle status-valid"></i>';
                usernameAvailability.textContent = t.tour_username_available;
                usernameAvailability.style.color = '#2E7D32';
                isUsernameValid = true;
                return true;
            } else {
                usernameStatusIcon.innerHTML = '<i class="fas fa-times-circle status-invalid"></i>';
                usernameAvailability.textContent = t.tour_username_unavailable;
                usernameAvailability.style.color = '#e53e3e';
                isUsernameValid = false;
                return false;
            }
        }

        function updateUsernameUI() {
            finalError.style.display = 'none';
            usernameInput.style.borderColor = '#eee';
            const username = usernameInput.value.trim();
            
            if (!username) {
                usernameStatusIcon.innerHTML = '';
                usernameHintText.textContent = t.tour_username_hint;
                usernameAvailability.textContent = '';
                isUsernameValid = false;
                updateSubmitButton();
                return;
            }

            if (!isValidUsernameFormat(username)) {
                usernameStatusIcon.innerHTML = '<i class="fas fa-times-circle status-invalid"></i>';
                usernameHintText.textContent = t.tour_username_invalid;
                usernameAvailability.textContent = '';
                isUsernameValid = false;
                updateSubmitButton();
                return;
            }

            usernameStatusIcon.innerHTML = '<i class="fas fa-spinner fa-spin status-checking"></i>';
            usernameHintText.textContent = t.tour_username_hint;
            usernameAvailability.textContent = t.tour_username_checking;
            isUsernameValid = false;
            updateSubmitButton();

            if (usernameTimeout) clearTimeout(usernameTimeout);
            usernameTimeout = setTimeout(async () => {
                await checkUsernameAvailability(username);
                updateSubmitButton();
            }, 500);
        }

        nameInput.addEventListener('input', updateFullnameUI);
        usernameInput.addEventListener('input', updateUsernameUI);

        let selectedFile = null;
        const fileInput = overlay.querySelector('#tour-file-input');
        fileInput.onchange = (e) => {
            if (e.target.files[0]) {
                selectedFile = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (ev) => { overlay.querySelector('#tour-pfp-box').innerHTML = `<img src="${ev.target.result}">`; };
                reader.readAsDataURL(selectedFile);
            }
        };

        finishBtn.onclick = async () => {
            finalError.style.display = 'none'; 
            const fullname = nameInput.value.trim();
            const username = usernameInput.value.trim().toLowerCase();
            
            if (!isFullnameValid || !isUsernameValid) {
                finalError.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Please fix errors before continuing.`;
                finalError.style.display = 'block';
                return;
            }
            
            finishBtn.disabled = true; finishBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t.tour_saving}`;

            let finalPhoto = defaultPfpUrl;
            if (selectedFile) {
                try {
                    const signRes = await fetch(getFunctionUrl('sign-upload')).then(r => r.json());
                    const formData = new FormData();
                    formData.append('file', selectedFile); formData.append('api_key', signRes.apiKey);
                    formData.append('timestamp', signRes.timestamp); formData.append('signature', signRes.signature);
                    formData.append('upload_preset', signRes.uploadPreset);
                    const res = await fetch(`https://api.cloudinary.com/v1_1/${signRes.cloudName}/image/upload`, { method: 'POST', body: formData }).then(r => r.json());
                    if (res.secure_url) finalPhoto = res.secure_url;
                } catch (err) { console.error(err); }
            }

            try {
                const oldDisplayName = currentUserData?.displayName || '';
                await updateProfile(user, { displayName: fullname, photoURL: finalPhoto });
                await updateDoc(doc(db, "users", user.uid), { displayName: fullname, username: username, photoURL: finalPhoto, hasSeenTour: true });
                if (fullname !== oldDisplayName) await updateUserContent(user.uid, fullname);
                localStorage.setItem(tourKey, 'true');
                overlay.remove(); refreshUI();
            } catch (err) {
                console.error(err); 
                finalError.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error saving profile. Please try again.`;
                finalError.style.display = 'block';
                finishBtn.disabled = false; finishBtn.textContent = t.tour_start;
            }
        };
    }
}

// --- SOCIAL TOUR ---
window.showSocialTour = () => {
    if (window.location.pathname.includes('/login.html')) return;
    const user = auth.currentUser;
    if (!user) return;
    const socialTourKey = `scoralia_social_tour_seen_${user.uid}`;
    if (localStorage.getItem(socialTourKey) === 'true') return;
    if (currentUserData && currentUserData.hasSeenSocialTour) { localStorage.setItem(socialTourKey, 'true'); return; }
    if (document.querySelector('.lang-modal-overlay')) return;

    const lang = localStorage.getItem('preferred_language') || 'en';
    const t = translations[lang];

    const overlay = document.createElement('div');
    overlay.className = 'lang-modal-overlay';
    overlay.style.zIndex = '10006';
    overlay.innerHTML = `
        <div class="lang-modal" style="padding: 30px 25px;">
            <div id="social-tour-step-1">
                <i class="fas fa-users fa-3x" style="color:#C8A96E; margin-bottom:20px;"></i>
                <h2 style="color:#0C1446; margin-bottom:12px; font-family:'Playfair Display', serif;">${t.social_tour_title_1}</h2>
                <p style="color:#6b84a3; margin-bottom:25px; line-height:1.6; font-size:0.95rem;">${t.social_tour_desc_1}</p>
                <button class="btn" id="social-tour-btn-1" style="width:100%;">${t.tour_next}</button>
            </div>
            <div id="social-tour-step-2" style="display:none;">
                <i class="fas fa-edit fa-3x" style="color:#C8A96E; margin-bottom:20px;"></i>
                <h2 style="color:#0C1446; margin-bottom:12px; font-family:'Playfair Display', serif;">${t.social_tour_title_2}</h2>
                <p style="color:#6b84a3; margin-bottom:25px; line-height:1.6; font-size:0.95rem;">${t.social_tour_desc_2}</p>
                <button class="btn" id="social-tour-btn-2" style="width:100%;">${t.tour_next}</button>
            </div>
            <div id="social-tour-step-3" style="display:none;">
                <i class="fas fa-filter fa-3x" style="color:#C8A96E; margin-bottom:20px;"></i>
                <h2 style="color:#0C1446; margin-bottom:12px; font-family:'Playfair Display', serif;">${t.social_tour_title_3}</h2>
                <p style="color:#6b84a3; margin-bottom:25px; line-height:1.6; font-size:0.95rem;">${t.social_tour_desc_3}</p>
                <button class="btn" id="social-tour-btn-3" style="width:100%;">${t.tour_next}</button>
            </div>
            <div id="social-tour-step-4" style="display:none;">
                <i class="fas fa-plus-circle fa-3x" style="color:#C8A96E; margin-bottom:20px;"></i>
                <h2 style="color:#0C1446; margin-bottom:12px; font-family:'Playfair Display', serif;">${t.social_tour_title_4}</h2>
                <p style="color:#6b84a3; margin-bottom:25px; line-height:1.6; font-size:0.95rem;">${t.social_tour_desc_4}</p>
                <button class="btn" id="social-tour-btn-4" style="width:100%;">${t.social_tour_gotit}</button>
            </div>
            <div style="display:flex; justify-content:center; gap:8px; margin-top:25px;" id="social-tour-dots">
                <div class="tour-dot active" id="social-dot-1"></div><div class="tour-dot" id="social-dot-2"></div>
                <div class="tour-dot" id="social-dot-3"></div><div class="tour-dot" id="social-dot-4"></div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('social-tour-btn-1').onclick = () => {
        document.getElementById('social-tour-step-1').style.display = 'none'; document.getElementById('social-tour-step-2').style.display = 'block';
        document.getElementById('social-dot-1').classList.remove('active'); document.getElementById('social-dot-2').classList.add('active');
    };
    document.getElementById('social-tour-btn-2').onclick = () => {
        document.getElementById('social-tour-step-2').style.display = 'none'; document.getElementById('social-tour-step-3').style.display = 'block';
        document.getElementById('social-dot-2').classList.remove('active'); document.getElementById('social-dot-3').classList.add('active');
    };
    document.getElementById('social-tour-btn-3').onclick = () => {
        document.getElementById('social-tour-step-3').style.display = 'none'; document.getElementById('social-tour-step-4').style.display = 'block';
        document.getElementById('social-dot-3').classList.remove('active'); document.getElementById('social-dot-4').classList.add('active');
    };
    document.getElementById('social-tour-btn-4').onclick = async () => {
        await updateDoc(doc(db, "users", user.uid), { hasSeenSocialTour: true });
        localStorage.setItem(socialTourKey, 'true');
        overlay.remove();
    };
};

function refreshUI() {
    if (currentUserData) updateHeaderToLoggedIn(currentUserData);
    else updateHeaderToLoggedOut();
    
    const langSelected = localStorage.getItem('preferred_language');
    if (!langSelected) showLanguageBanner();
    else { window.applyLanguage(langSelected); showTermsBanner(); }
}

function listenToUnreadMessages(uid) {
    if (unsubscribeChats) unsubscribeChats();
    const q = query(collection(db, "chats"), where("participants", "array-contains", uid));
    unsubscribeChats = onSnapshot(q, (snapshot) => {
        let unreadCount = 0;
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            if (!d.lastMessage || d.lastMessage.trim() === "") return;
            if (d.unreadBy && d.unreadBy.includes(uid)) unreadCount++;
        });
        const deskBadge = document.getElementById('desktop-unread-badge');
        const mobBadge = document.getElementById('mobile-unread-badge');
        if (unreadCount > 0) {
            if (deskBadge) { deskBadge.textContent = unreadCount; deskBadge.style.display = 'flex'; }
            if (mobBadge) { mobBadge.textContent = unreadCount; mobBadge.style.display = 'flex'; }
        } else {
            if (deskBadge) deskBadge.style.display = 'none';
            if (mobBadge) mobBadge.style.display = 'none';
        }
    });
}

function updateHeaderToLoggedIn(userData) {
    if (window.location.pathname.includes('/login.html')) return;
    const lang = localStorage.getItem('preferred_language') || 'en';
    const t = translations[lang];
    const navUl = document.querySelector('nav ul');
    if (navUl) {
        navUl.innerHTML = `
            <li><a href="/search.html">${t.nav_browse}</a></li>
            <li><a href="/my-listings.html">${t.nav_listings}</a></li>
            <li><a href="/social.html">${t.nav_hub}</a></li>
            <li><a href="/activity.html">${t.nav_activity}</a></li>
            <li><a href="/messages.html" class="badge-container">${t.nav_messages}<span class="unread-badge" id="desktop-unread-badge"></span></a></li>
        `;
    }

    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container) return;

    const name = userData.displayName || 'User';
    const username = userData.username ? `@${userData.username}` : '';
    let finalPhotoURL = userData.photoURL;
    if (!finalPhotoURL || finalPhotoURL.includes("googleusercontent.com") || finalPhotoURL.includes("live.com")) {
        finalPhotoURL = `https://api.dicebear.com/7.x/identicon/svg?seed=${userData.uid}&backgroundColor=EBF2FA`;
    }

    container.innerHTML = `
        <button class="btn desktop-only" id="globalListBtn" style="margin-right: 15px;">${t.btn_list}</button>
        <a href="/messages.html" class="msg-btn-mobile"><i class="fas fa-comment-dots"></i><span class="unread-badge" id="mobile-unread-badge"></span></a>
        <div class="profile-menu-container">
            <div class="profile-avatar"><img src="${window.optimizeImageUrl ? window.optimizeImageUrl(finalPhotoURL) : finalPhotoURL}" alt="Profile"></div>
            <div class="dropdown-menu" id="globalDropdown">
                <div class="dropdown-header">
                    <div class="display-name">${name}</div>
                    ${username ? `<div class="username">${username}</div>` : ''}
                </div>
                <a href="/listanitem.html" class="dropdown-item mobile-link" style="color:#2B5C92; font-weight:bold;"><i class="fas fa-plus-circle"></i> ${t.btn_list}</a>
                <a href="/search.html" class="dropdown-item mobile-link"><i class="fas fa-search"></i> ${t.nav_browse}</a>
                <a href="/my-listings.html" class="dropdown-item mobile-link"><i class="fas fa-book"></i> ${t.nav_listings}</a>
                <a href="/social.html" class="dropdown-item mobile-link"><i class="fas fa-users"></i> ${t.nav_hub}</a>
                <a href="/profile.html" class="dropdown-item"><i class="fas fa-user-circle"></i> ${t.nav_profile}</a>
                <a href="/activity.html" class="dropdown-item"><i class="fas fa-history"></i> ${t.nav_activity}</a>
                <a href="#" class="dropdown-item" id="globalLogout" style="color:#ff4d4d; border-top:1px solid #eee;"><i class="fas fa-sign-out-alt"></i> ${t.btn_signout}</a>
            </div>
        </div>
    `;

    const listBtn = document.getElementById('globalListBtn');
    if (listBtn) listBtn.onclick = () => window.location.href = '/listanitem.html';

    const avatar = container.querySelector('.profile-avatar');
    const menu = document.getElementById('globalDropdown');
    if (avatar) avatar.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show'); };
    document.addEventListener('click', () => { if (menu) menu.classList.remove('show'); });

    const logoutBtn = document.getElementById('globalLogout');
    if (logoutBtn) logoutBtn.onclick = (e) => {
        e.preventDefault();
        signOut(auth).then(() => { localStorage.removeItem('scoralia_tour_seen_' + userData.uid); window.location.href = '/index.html'; });
    };

    listenToUnreadMessages(userData.uid);
}

function updateHeaderToLoggedOut() {
    const lang = localStorage.getItem('preferred_language') || 'en';
    const t = translations[lang];
    const navUl = document.querySelector('nav ul');
    if (navUl) {
        navUl.innerHTML = `
            <li><a href="/search.html">${t.nav_browse}</a></li>
            <li><a href="/social.html">${t.nav_hub}</a></li>
        `;
    }

    const container = document.querySelector('.header-right') || document.querySelector('.header-auth-buttons');
    if (!container) return;
    container.innerHTML = `<button class="btn" onclick="window.location.href='/login.html'">${t.btn_login}</button>`;
}

function showLanguageBanner() {
    if (document.getElementById('lang-banner-global')) return;
    const banner = document.createElement('div');
    banner.id = 'lang-banner-global'; 
    banner.className = 'terms-banner';
    banner.style.zIndex = '100000';
    banner.innerHTML = `
        <div style="font-weight: bold; font-family: 'Playfair Display', serif; font-size: 1.1rem;">Welcome / Bienvenue</div>
        <div style="font-size: 0.9rem; opacity: 0.9;">Choose your language / Choisissez votre langue :</div>
        <div style="display: flex; gap: 15px;">
            <button class="btn-accept-terms" id="btn-en">English</button>
            <button class="btn-accept-terms" id="btn-fr">Français</button>
        </div>
    `;
    document.body.appendChild(banner);

    const setLang = async (l) => {
        localStorage.setItem('preferred_language', l);
        window.applyLanguage(l);
        banner.remove();
        showTermsBanner();
        if (auth.currentUser) {
            try {
                await updateDoc(doc(db, "users", auth.currentUser.uid), { language: l });
                if (currentUserData) currentUserData.language = l;
            } catch (e) { console.warn("Could not save language to user document", e); }
        }
    };
    document.getElementById('btn-en').onclick = () => setLang('en');
    document.getElementById('btn-fr').onclick = () => setLang('fr');
}

function showTermsBanner() {
    if (localStorage.getItem('scoralia_terms_accepted') === 'true' || document.getElementById('terms-banner-global') || document.getElementById('lang-banner-global')) return;
    const lang = localStorage.getItem('preferred_language') || 'en';
    const banner = document.createElement('div');
    banner.id = 'terms-banner-global'; banner.className = 'terms-banner';
    const text = lang === 'fr' ? 'En utilisant ce site, vous acceptez nos conditions.' : 'By using this site, you accept our terms.';
    banner.innerHTML = `<div>${text}</div><button class="btn-accept-terms" id="accept-terms-btn">ok</button>`;
    document.body.appendChild(banner);
    document.getElementById('accept-terms-btn').onclick = () => { localStorage.setItem('scoralia_terms_accepted', 'true'); banner.remove(); };
}

document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('.logo');
    if (logo) logo.onclick = () => window.location.href = '/index.html';
});
