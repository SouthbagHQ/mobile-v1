import asyncio
import json
import os
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
import aiosmtplib
from email.message import EmailMessage
from imap_tools import MailBox, AND
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Purelymail Long Poll API")

# Enable CORS for local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration Variables
BASE_EMAIL = "mobileappuser@southbag.cc"  # Replace with your Purelymail email (e.g. user@yourdomain.com)
FIXED_TO_EMAIL = "k@internet.online.banking.southbag.v4.customer-access.secure-auth.identity.bank-gateway.prod.apac.onlineservices.secureportal.onlinebanking.southbag.michealsoft.tech"
EMAIL_SUBJECT = "Southbag Mobile Application Request"

# Purelymail Connection Details
SMTP_HOST = "smtp.purelymail.com"
SMTP_PORT = 465  # SSL/TLS Port
IMAP_HOST = "imap.purelymail.com"
EMAIL_PASSWORD = os.getenv("email_pwd")


def get_plus_address(alias: str) -> str:
    user, domain = BASE_EMAIL.split("@")
    return f"{user}+{alias}@{domain}"


def sanitize_body(body: str, alias: str) -> str:
    user = BASE_EMAIL.split("@")[0]
    return (
        body.replace(f"{user}+", "")
        .replace(alias, "You")
        .replace(user, "You")
    )


async def send_email(alias: str, body: str):
    user, _ = BASE_EMAIL.split("@")
    plus_address = get_plus_address(alias)
    processed_body = body.replace("#EMAILNAME", user)

    msg = EmailMessage()
    msg["From"] = f"Southbag Mobile Banking User: {alias} <{plus_address}>"
    msg["To"] = FIXED_TO_EMAIL
    msg["Subject"] = EMAIL_SUBJECT
    msg.set_content(processed_body)

    await aiosmtplib.send(
        msg,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        username=BASE_EMAIL,
        password=EMAIL_PASSWORD,
        use_tls=True,
    )
    return {"message": "Email sent"}


def check_and_trash_email(alias: str):
    plus_address = get_plus_address(alias)

    with MailBox(IMAP_HOST).login(BASE_EMAIL, EMAIL_PASSWORD) as mailbox:
        # Search for messages matching destination alias and origin sender
        messages = list(mailbox.fetch(AND(to=plus_address, from_=FIXED_TO_EMAIL), limit=10, reverse=True))

        for msg in messages:
            ht = msg.html
            if ht =="":
                ht = msg.text
            message_data = {
                "messageFound": True,
                "message": msg.text,
                "messageHtml": ht,
                "from": msg.from_,
                "subject": msg.subject,
                "date": msg.date.isoformat() if msg.date else datetime.now().isoformat(),
            }

            # Standard IMAP Trash folder name used by Dovecot/Roundcube
            mailbox.move(msg.uid, "Trash")
            return message_data

    return None


@app.post("/")
async def handle_post(request: Request):
    try:
        data = await request.json()
        action = data.get("action")

        if action == "send":
            alias = data.get("alias")
            body = data.get("body")
            if not alias or not body:
                raise HTTPException(status_code=400, detail="Missing required parameters: 'alias' and 'body'")

            result = await send_email(alias, body)
            return JSONResponse({"status": "success", "data": result})

        elif action == "poll":
            alias = data.get("alias")
            if not alias:
                raise HTTPException(status_code=400, detail="Missing required parameter: 'alias'")

            poll_interval_sec = 1
            while True:
                if await request.is_disconnected():
                    return JSONResponse({"status": "error", "message": "client disconnected"}, status_code=499)

                found_msg = await asyncio.to_thread(check_and_trash_email, alias)
                if found_msg:
                    return JSONResponse({"status": "success", "data": found_msg})

                await asyncio.sleep(poll_interval_sec)

        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: '{action}'")

    except HTTPException as err:
        return JSONResponse({"status": "error", "message": err.detail}, status_code=err.status_code)
    except Exception as err:
        return JSONResponse({"status": "error", "message": str(err)}, status_code=500)
