function tfer(){
    uic = document.querySelector(".ui-content");
    e = document.querySelector("#email")
    a = document.querySelector("#ammount")
    uic.innerHTML = `<h1>Sending</h1><progress>`
    askKevin(`Please send \$${a.value} to ${e.value}`) .then(resp => {
        msg = extractFields(resp?.message, "[$TYPE:$VALUE:$MSG]")
        uic.innerHTML=`<h1>Transfer Reciept</h1><h2>Transfer to ${e.value} of \$${a.value}</h2><hr>`
        uic.innerHTML += msg.string
        msg.fields.forEach(f => {
            fE = document.createElement("div")
            fE.classList.add("fee-field")
            fE.innerHTML = `<b>${f.TYPE}</b>: <i>\$${f.VALUE}</i><br>
${f.MSG}`
            uic.appendChild(fE)
        })
        uic.innerHTML+=`<hr><br><a href="transfer.html"><h1>&lt;&lt; Back</h1></a>`

    })
    .catch(err => {
        document.querySelector(".ui-content").innerHTML = "askKevin failed:" + err
    });
}