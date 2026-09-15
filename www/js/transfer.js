requireSignIn()

function tfer(){
    uic = document.querySelector(".ui-content");
    e = document.querySelector("#email")
    a = document.querySelector("#ammount")
    const cents = Math.round(Number(a.value) * 100)
    if (!e.value || !Number.isSafeInteger(cents) || cents <= 0) {
        alert("Southbag needs a real email and a real amount of money.")
        return
    }
    uic.innerHTML = `<h1>Sending</h1><progress>`
    // Banking records transfers as a negative amount in cents; the recipient is
    // whoever you say they are. This is Southbag.
    bankingFetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: -cents, kind: "transfer", description: `Transfer to ${e.value}` }),
    }).then(resp => {
        uic.innerHTML=`<h1>Transfer Reciept</h1><h2>Transfer to ${escapeHtml(e.value)} of ${money(cents)}</h2><hr>
<p>New balance: ${money(resp.balance)}</p>`
        uic.innerHTML+=`<hr><br><a href="index.html"><h1>&lt;&lt; Back</h1></a>`
    }).catch(error => {
        uic.innerHTML=`<h1>Transfer Failed</h1><p>${escapeHtml(error.message)}</p><hr><br><a href="index.html"><h1>&lt;&lt; Back</h1></a>`
    })
}
