requireSignIn()

document.querySelector("#welcome-name").textContent = currentUser().name || currentUser().email || "customer"

bankingFetch("/api/account")
    .then(account => {
        store.set("v1-user", account.user)
        document.querySelector("#balance").innerHTML = `Balance: ${money(account.balance)}`
    })
    .catch(error => {
        document.querySelector("#balance").innerHTML = `<i>${escapeHtml(error.message)}</i>`
    })
