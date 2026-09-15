requireSignIn()

bankingFetch("/api/account")
    .then(account => {
        uic = document.querySelector(".ui-content");
        uic.innerHTML = `<h1>Statement</h1><h3>Balance: ${money(account.balance)}</h3>`
        if (!account.transactions.length) {
            uic.innerHTML += `<p>Suspiciously, nothing has happened yet.</p>`
        }
        account.transactions.forEach(item => uic.appendChild(transactionElement(item)))
    })
    .catch(error => {
        document.querySelector(".ui-content").innerHTML = `<h1>Statement</h1><p><i>${escapeHtml(error.message)}</i></p>`
    })
