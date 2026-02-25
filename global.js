import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";

// --- CONFIGURATION ---
const response = await fetch('/.netlify/functions/config');
const config = await response.json();
const app = initializeApp(config.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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

// --- APPLY LANGUAGE FUNCTION ---
window.applyLanguage = (lang) => {
    // 1. Update Text Content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });

    // 2. Update Placeholders (inputs)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });
    
    // Save preference
    localStorage.setItem('preferred_language', lang);
};

// --- INIT LANGUAGE ON LOAD ---
const savedLang = localStorage.getItem('preferred_language');
if (savedLang) {
    window.applyLanguage(savedLang);
}

// --- 1. GLOBAL BAN CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
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
    }
});

// --- 2. GLOBAL SETTINGS CHECK (Language Popup) ---
const settingsRef = doc(db, "site_settings", "config");

onSnapshot(settingsRef, (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.enableLanguagePrompt === true) {
            checkAndShowLanguagePopup();
        } else {
            const existingModal = document.getElementById('lang-modal');
            if (existingModal) existingModal.remove();
        }
    }
});

function checkAndShowLanguagePopup() {
    if (localStorage.getItem('preferred_language')) return;

    const style = document.createElement('style');
    style.innerHTML = `
        .lang-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center; }
        .lang-modal { background: white; padding: 30px; border-radius: 12px; text-align: center; max-width: 400px; width: 90%; }
        .lang-btn { display: block; width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #ddd; border-radius: 8px; background: white; font-weight: bold; cursor: pointer; font-size: 1rem; transition: 0.2s; }
        .lang-btn:hover { border-color: #4CAF50; background: #e8f5e9; color: #2E7D32; }
    `;
    document.head.appendChild(style);

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
        window.applyLanguage(lang); // Apply immediately
        document.getElementById('lang-modal').remove();
    };
}
