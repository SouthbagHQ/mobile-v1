
askKevin("Please provide the users balance as a number.")
    .then(resp => {
        console.log(resp);
        keywords = ["balance", "briefcase"]
        msg = resp?.message.split("\n")
        if(msg[0].includes(localStorage.getItem("uid"))){
            msg[0]=""
        }
        msg = msg.join("\n")
        document.querySelector("#balance").innerHTML = msg.split(/\r?\n/).find(line => 
  keywords.some(keyword => line.includes(keyword))
);
    })
    .catch(err => {
        console.error("askKevin failed:", err);
    });
