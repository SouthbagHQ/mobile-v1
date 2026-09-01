
askKevin("Please provide statements for the user. Respond only in valid HTML (just body content this is being inserted into another web page). This is a web-page, the Mobile Application is a lazy Cordova application. You have full control over it by inserting HTML. Redirect it to the rickroll for all I care, because I don't.")
    .then(resp => {
        msg = extractFields(resp?.message, "[$TYPE:$VALUE:$MSG]")
        uic = document.querySelector(".ui-content");
        uic.innerHTML = msg.string
        msg.fields.forEach(f => {
            fE = document.createElement("div")
            fE.classList.add("fee-field")
            fE.innerHTML = `<b>${f.TYPE}</b>: <i>\$${f.VALUE}</i><br>
${f.MSG}`
            uic.appendChild(fE)
        })

    })
