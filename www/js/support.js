let history = ``
function send(btn) {
    btn.disabled = true
    let msg = document.querySelector("#message").value
    document.querySelector("#message").value = ""
    history += `==== User ====
"""
${msg}
"""
`
    let msgs = document.querySelector(".msgs")
    let userMsg = document.createElement("div")
    userMsg.classList.add("user-message")
    userMsg.innerHTML = msg
    msgs.appendChild(userMsg)
    let kevinMsg = document.createElement("div")
    kevinMsg.classList.add("kevin-message")
    kevinMsg.innerHTML = `<progress></progress><br>
Him is working on your message`
    msgs.appendChild(kevinMsg)
    kevinMsg.scrollIntoView()

    askKevin(history, "This is a message from the Support application")
        .then(resp => {
            history += `==== Kevin ====
"""
${resp?.message}
"""
`
            msg = extractFields(resp?.messageHtml, "[$TYPE:$VALUE:$MSG]")
            kevinMsg.innerHTML = msg.string
            msg.fields.forEach(f => {
                fE = document.createElement("div")
                fE.classList.add("fee-field-in-msg")
                fE.innerHTML = `<b>${f.TYPE}</b>: <i>\$${f.VALUE}</i><br>
${f.MSG}`
                kevinMsg.appendChild(fE)
            })
            kevinMsg.scrollIntoView()
            btn.disabled = false
        })
}