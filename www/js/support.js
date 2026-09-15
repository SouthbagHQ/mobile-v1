requireSignIn()

// Support is Online Banking's chat, so the conversation follows you between
// the app and the website.
let history = []
const msgs = document.querySelector(".msgs")

function addMessage(role, html) {
    const el = document.createElement("div")
    el.classList.add(role === "user" ? "user-message" : "kevin-message")
    el.innerHTML = html
    msgs.appendChild(el)
    el.scrollIntoView()
    return el
}

bankingFetch("/api/chat")
    .then(data => {
        history = data.messages || []
        history.forEach(m => addMessage(m.role, escapeHtml(m.content)))
    })
    .catch(() => {})

function send(btn) {
    btn.disabled = true
    let msg = document.querySelector("#message").value
    document.querySelector("#message").value = ""
    history.push({ role: "user", content: msg })
    addMessage("user", escapeHtml(msg))
    let kevinMsg = addMessage("assistant", `<progress></progress><br>
Him is working on your message.<br><small><i>Advertisement</i></small>`)

    bankingFetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
    })
        .then(resp => {
            const content = resp.choices?.[0]?.message?.content || ""
            history.push({ role: "assistant", content })
            kevinMsg.innerHTML = escapeHtml(content)
            kevinMsg.scrollIntoView()
            return bankingFetch("/api/chat", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ messages: history }),
            })
        })
        .catch(error => {
            kevinMsg.innerHTML = escapeHtml(error.message)
        })
        .finally(() => { btn.disabled = false })
}
