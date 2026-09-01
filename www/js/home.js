
askKevin("Please provide the users balance as a number.")
    .then(resp => {
        console.log(resp);
        keywords = ["balance", "briefcase"]
        msg = resp?.message.split("\n")
        if (msg[0].includes(localStorage.getItem("v1-uid"))) {
            msg[0] = ""
        }
        msg = msg.join("\n")
        wawa = msg.split(/\r?\n/).find(line =>
            keywords.some(keyword => line.includes(keyword)));
        if (wawa == undefined) {
            wawa = resp.message
        }
        msg = extractFields(wawa, "[$TYPE:$VALUE:$MSG]")
        uic = document.querySelector("#balance");
        uic.innerHTML = msg.string
        msg.fields.forEach(f => {
            fE = document.createElement("div")
            fE.classList.add("fee-field")
            fE.innerHTML = `<b>${f.TYPE}</b>: <i>\$${f.VALUE}</i><br>
${f.MSG}`
            uic.appendChild(fE)
        })
    })
