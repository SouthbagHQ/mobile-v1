function extractFields(text, template) {
    text = text.replaceAll("[[", "[")
    text = text.replaceAll("]]", "]")
    // Extract variable names from the template (e.g., ["TYPE", "VALUE", "MSG"])
    const keys = [...template.matchAll(/\$([A-Z0-9_]+)/g)].map(match => match[1]);

    // Convert template into a regex pattern, escaping special regex characters
    let regexPattern = template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace each $KEY in the pattern with a regex capture group
    keys.forEach(key => {
        regexPattern = regexPattern.replace(`\\$${key}`, '([^:\\]]+)');
    });

    const regex = new RegExp(regexPattern, 'g');
    const fields = [];

    // Find all matches and construct objects
    let match;
    while ((match = regex.exec(text)) !== null) {
        const fieldObj = {};
        keys.forEach((key, index) => {
            const val = match[index + 1];
            // Automatically convert numeric strings to numbers
            fieldObj[key] = !isNaN(val) && val.trim() !== '' ? Number(val) : val;
        });
        fields.push(fieldObj);
    }

    // Remove matched patterns and clean up extra whitespace
    const cleanedString = text.replace(regex, '').replace(/\s+/g, ' ').trim();

    return {
        string: cleanedString,
        fields: fields
    };
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

async function askKevinSend(ask, readersAddedContext = "") {
    const url = "https://script.google.com/macros/s/AKfycbyy-fH053R-fGmKM7rH8NSkqe6FSUIvuIKgKAUZmWhtUHeWQosPLqNmEAk8LvcvnB5z/exec";

    const data = {
        action: "send",
        alias: localStorage.getItem("v1-uid"),
        body: `==== Begin System prompt ===
This request originates from the Official Southbag Mobile Banking application for Androids (iPhones are blocked). This message is on behalf of Mobile Banking User #${localStorage.getItem("v1-uid")}.
Please provide the information as requested to ensure that customers are able to use their Southbag Mobile Application. Failure to do so will involve a penalty. 
The current email is the development environment email.
The user's name is not "#EMAILNAME+${localStorage.getItem("v1-uid")}", it is simply "Southbag Mobile User (${localStorage.getItem("v1-uid")})".
HTML can be used and should.
${readersAddedContext}
==== End System Prompt ====
==== Begin User Message / Application Request (may include previous context) ====
${ask}
==== End User Message / Application Request ====`
    };

    const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return response.json();
}

async function askKevinRecv() {
    const url = "https://script.google.com/macros/s/AKfycbyy-fH053R-fGmKM7rH8NSkqe6FSUIvuIKgKAUZmWhtUHeWQosPLqNmEAk8LvcvnB5z/exec";

    const data = {
        action: "poll",
        alias: localStorage.getItem("v1-uid")
    };

    const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return response.json();
}

async function askKevin(ask, readersAddedContext = "") {
    if (localStorage.getItem("v1-uid") == undefined || localStorage.getItem("v1-uid") == null) {
        localStorage.setItem("v1-uid", "null")
    }
    try {
        await askKevinSend(ask);
    }
    catch {
        return {
            "message": `You.
The user.
Why is your internet broken?
[FEE:20000:Broken Internet]

-K`.replaceAll("\n", "<br>")
        }
    }

    while (true) {
        const resp = await askKevinRecv();
        console.log("Poll response:", resp);
        if (resp?.status === "success" && resp?.data?.messageFound) {
            resp.data.message = resp.data.message.replace(localStorage.getItem("v1-uid"), "You").replace("\n", "<br>")
            return resp.data;
        }

        if (resp?.status === "error") {
            return {
                "message": `You.
The user.
Why is your internet broken?
[FEE:20000:Broken Internet]

-K`.replaceAll("\n", "<br>")
            }
        }

        // Prevent hammering GAS if it returns immediately.
        await sleep(1000);
    }
}
window.addEventListener('resize', autoZoomApp);
window.addEventListener('DOMContentLoaded', autoZoomApp);
function generateRandomString(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
function cAcct() {
    localStorage.setItem("v1-uid", generateRandomString())
    alert("Welcome, your user ID is: " + localStorage.getItem("v1-uid"))
    window.location.href = "home/index.html"
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


if(localStorage.getItem("uid")){
    alert("In preperation for V2 we are restructuring V1 because we can. You will now be logged out and need to create a new ID. This still won't be transferrable.")
    localStorage.clear()
    window.location.reload()
}