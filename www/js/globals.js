VERSION = [2,0,0]

// Southbag Mobile has no backend. It signs in with Southbag Identity directly
// (OAuth authorization code + PKCE, public client) and talks to Southbag Online
// Banking with the resulting access token.
const IDENTITY = "https://identity.southbag.cc";
const BANKING = "https://banking.southbag.cc";
// Register the app once on the Identity developer page and paste the client id
// here. Leave it empty and the app registers itself on first sign-in instead
// (one client per device, and Identity asks for consent each time).
const IDENTITY_CLIENT_ID = "";
const SCOPES = "openid profile email offline_access";

// Where the app lives. Works from GitHub Pages, `cordova run browser`, and the
// Android app, which bundles www/ and serves it from https://localhost.
const APP_ROOT = new URL("../", document.currentScript.src).href;
const REDIRECT_URI = APP_ROOT + "callback.html";

const store = {
    get: key => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } },
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    remove: key => localStorage.removeItem(key),
};

function isSignedIn() {
    return store.get("v1-auth")?.access_token != null;
}

// `top`, not `window`: these also run inside the toolbar iframe.
function requireSignIn() {
    if (!isSignedIn()) window.top.location.href = APP_ROOT + "index.html";
}

function signOut() {
    ["v1-auth", "v1-user", "v1-uid", "v1-pkce"].forEach(store.remove);
    window.top.location.href = APP_ROOT + "index.html";
}

function currentUser() {
    return store.get("v1-user") || {};
}

function randomString(bytes = 32) {
    const array = crypto.getRandomValues(new Uint8Array(bytes));
    return btoa(String.fromCharCode(...array)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function sha256(text) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

// Identity allows unauthenticated dynamic client registration, so with no
// hardcoded client id the app registers itself and remembers the result.
async function clientId() {
    if (IDENTITY_CLIENT_ID) return IDENTITY_CLIENT_ID;
    const cached = store.get("v1-client");
    if (cached?.redirect_uri === REDIRECT_URI) return cached.client_id;

    const response = await fetch(IDENTITY + "/api/auth/oauth2/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            client_name: "Southbag Mobile",
            redirect_uris: [REDIRECT_URI],
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
            token_endpoint_auth_method: "none",
            scope: SCOPES,
        }),
    });
    const registered = await response.json();
    if (!response.ok || !registered.client_id) {
        throw new Error(registered.error_description || registered.error || "Identity client registration failed");
    }
    store.set("v1-client", { client_id: registered.client_id, redirect_uri: REDIRECT_URI });
    return registered.client_id;
}

async function signIn() {
    const verifier = randomString();
    const state = randomString(16);
    store.set("v1-pkce", { verifier, state });

    const target = new URL(IDENTITY + "/api/auth/oauth2/authorize");
    target.search = new URLSearchParams({
        response_type: "code",
        client_id: await clientId(),
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
        state,
        code_challenge: await sha256(verifier),
        code_challenge_method: "S256",
    });
    window.location.href = target;
}

async function tokenRequest(params) {
    const response = await fetch(IDENTITY + "/api/auth/oauth2/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: await clientId(), ...params }),
    });
    const tokens = await response.json();
    if (!response.ok || !tokens.access_token) {
        throw new Error(tokens.error_description || tokens.error || "Token request failed");
    }
    store.set("v1-auth", {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || store.get("v1-auth")?.refresh_token,
        expires_at: Date.now() + (tokens.expires_in || 3600) * 1000,
    });
}

// callback.html lands here with ?code=&state= from Identity.
async function finishSignIn() {
    const params = new URLSearchParams(window.location.search);
    const pkce = store.get("v1-pkce");
    store.remove("v1-pkce");
    if (params.get("error")) throw new Error(params.get("error_description") || params.get("error"));
    if (!params.get("code") || !pkce || params.get("state") !== pkce.state) {
        throw new Error("Sign-in did not come back the way it left");
    }
    await tokenRequest({
        grant_type: "authorization_code",
        code: params.get("code"),
        redirect_uri: REDIRECT_URI,
        code_verifier: pkce.verifier,
    });
    const account = await bankingFetch("/api/account");
    store.set("v1-user", account.user);
    store.set("v1-uid", account.user.id);
}

async function refreshTokens() {
    const refresh_token = store.get("v1-auth")?.refresh_token;
    if (!refresh_token) return false;
    try {
        await tokenRequest({ grant_type: "refresh_token", refresh_token });
        return true;
    } catch {
        return false;
    }
}

// Calls Southbag Online Banking with the Identity access token. Refreshes once
// on 401; if that fails too, the session is gone and the user signs in again.
async function bankingFetch(path, options = {}, retry = true) {
    const auth = store.get("v1-auth");
    if (!auth?.access_token) {
        signOut();
        throw new Error("Not signed in");
    }
    const response = await fetch(BANKING + path, {
        ...options,
        headers: {
            ...(options.headers || {}),
            "authorization": "Bearer " + auth.access_token,
        },
    });
    if (response.status === 401) {
        if (retry && await refreshTokens()) return bankingFetch(path, options, false);
        signOut();
        throw new Error("Signed out");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Southbag broke");
    return data;
}

function money(cents) {
    return "$" + (Number(cents || 0) / 100).toFixed(2);
}

// Banking's balance and transactions are in cents.
function transactionElement(item) {
    const fE = document.createElement("div");
    fE.classList.add("fee-field");
    fE.innerHTML = `<b>${escapeHtml(item.kind)}</b>: <i>${money(item.amount)}</i><br>
${escapeHtml(item.description)}<br><small>${new Date(item.created_at).toLocaleString()}</small>`;
    return fE;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}

function autoZoomApp() {
    const baseWidth = 375;
    const baseHeight = 667;
    const widthRatio = window.innerWidth / baseWidth;
    const heightRatio = window.innerHeight / baseHeight;

    const idealZoom = Math.max(1, Math.min(widthRatio, heightRatio));

    document.body.style.zoom = idealZoom * 0.95;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
window.addEventListener('resize', autoZoomApp);
window.addEventListener('DOMContentLoaded', autoZoomApp);
window.addEventListener('DOMContentLoaded', applyRandomWallpaperOrder);

function shuffleArray(values) {
    const array = [...values];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function applyRandomWallpaperOrder() {
    const indexStylesheet = document.querySelector('link[href$="css/index.css"]');
    if (!indexStylesheet) return;

    const wallpaperBasePath = new URL("../img/loaders/", indexStylesheet.href).href;
    const wallpaperOrder = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const stepSize = 100 / wallpaperOrder.length;
    const keyframeBlocks = wallpaperOrder.map((wallpaper, index) => {
        const start = Number((index * stepSize).toFixed(2));
        const end = Number((((index + 1) * stepSize) - 0.01).toFixed(2));
        return `${start}%, ${end}% { background-image: url(${wallpaperBasePath}${wallpaper}.png); }`;
    });

    const randomWallpaperStyle = document.createElement("style");
    randomWallpaperStyle.id = "random-wallpaper-order";
    randomWallpaperStyle.textContent = `@keyframes loadingBackgroundCycle { ${keyframeBlocks.join(" ")} }`;
    document.head.appendChild(randomWallpaperStyle);
    document.documentElement.style.backgroundImage = `url(${wallpaperBasePath}${wallpaperOrder[0]}.png)`;
}

function fitFrameHeight(iframe) {
    // Set the height of the iframe to match its internal body height
    iframe.style.height = iframe.contentDocument.documentElement.getBoundingClientRect().height + 'px';
}

if (localStorage.getItem("darkmode") == "yes please give me dark mode thank you") {
    document.documentElement.classList.add("dark")
}
function darkMode() {
    localStorage.setItem("darkmode", localStorage.getItem("darkmode") == "yes please give me dark mode thank you" ? "no i want to be blind" : "yes please give me dark mode thank you");
    if (localStorage.getItem("darkmode") == "yes please give me dark mode thank you") {
        document.documentElement.classList.add("dark")
    }
    else {
        document.documentElement.classList.remove("dark")

    }
}


const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

if (isIOS) {
    alert("iPhones are stinky\n- K")
    try {
        if (window.navigator && window.navigator.app && typeof window.navigator.app.exitApp === 'function') {
            window.navigator.app.exitApp();
        }
        else {
            window.close();
        }

        setTimeout(() => {
            if (!window.closed) {
                window.location.href = "about:blank";
            }
        }, 100);

    } catch (error) {
        window.location.href = "about:blank";
    }
}


// V1 accounts were a random string kept in localStorage. Southbag Identity
// replaces them; the old key is only ever set without an access token.
if (localStorage.getItem("uid") || (localStorage.getItem("v1-uid") && !isSignedIn())) {
    alert("Southbag Mobile now uses Southbag Identity. Your old device-only account is gone. Sorry, not sorry.")
    localStorage.clear()
    window.location.reload()
}
