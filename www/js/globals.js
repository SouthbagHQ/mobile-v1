function extractFields(text, template) {
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

    document.body.style.zoom = idealZoom*0.95;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function askKevinSend(ask) {
    const url = "https://script.google.com/macros/s/AKfycbyy-fH053R-fGmKM7rH8NSkqe6FSUIvuIKgKAUZmWhtUHeWQosPLqNmEAk8LvcvnB5z/exec";

    const data = {
        action: "send",
        alias: localStorage.getItem("uid"),
        body: `Hello Kevin,
Southbag Banking official mobile application here on behalf of User ${localStorage.getItem("uid")}.
${ask}
Please provide the information as requested to ensure that customers are able to use their Southbag Mobile Application. Failure to do so will involve a penalty. 
The current email is the development environment email.
The user's name is not "novafox69420+${localStorage.getItem("uid")}", it is simply "Southbag Mobile User (${localStorage.getItem("uid")})".
Thanks,
Southbag Banking Mobile Application`
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
        alias: localStorage.getItem("uid")
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

async function askKevin(ask) {
    if( localStorage.getItem("uid") == undefined ||  localStorage.getItem("uid") == null){
        localStorage.setItem("uid","null")
    }
    await askKevinSend(ask);

    while (true) {
        const resp = await askKevinRecv();
        console.log("Poll response:", resp);
        if (resp?.status === "success" && resp?.data?.messageFound) {
            resp.data.message = resp.data.message.replace(localStorage.getItem("uid"),"You").replace("\n","<br>")
            return resp.data;
        }

        if (resp?.status === "error") {
            throw new Error(resp.message || "GAS returned an error");
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
function cAcct(){
    localStorage.setItem("uid",generateRandomString())
    alert("Welcome, your user ID is: "+localStorage.getItem("uid"))
    window.location.href = "home.html"
}
