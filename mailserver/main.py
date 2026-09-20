import asyncio
import json
import os
import logging
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
import aiosmtplib
from email.message import EmailMessage
from imap_tools import MailBox, AND
from fastapi.middleware.cors import CORSMiddleware

# Logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger("purelymail-api")

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
BASE_EMAIL = "mobileappuser@southbag.cc"
FIXED_TO_EMAIL = "k@internet.online.banking.southbag.v4.customer-access.secure-auth.identity.bank-gateway.prod.apac.onlineservices.secureportal.onlinebanking.southbag.michealsoft.tech"
EMAIL_SUBJECT = "Southbag Mobile Application Request"

# Purelymail Connection Details
SMTP_HOST = "smtp.purelymail.com"
SMTP_PORT = 465
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

    logger.info("Sending email for alias=%s to %s", alias, FIXED_TO_EMAIL)
    logger.debug("SMTP server: %s:%s", SMTP_HOST, SMTP_PORT)
    logger.debug("From address: %s", plus_address)

    msg = EmailMessage()
    msg["From"] = f"Southbag Mobile Banking User: {alias} <{plus_address}>"
    msg["To"] = FIXED_TO_EMAIL
    msg["Subject"] = EMAIL_SUBJECT
    msg.set_content(processed_body)
    print(msg["From"])
    try:
        result = await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=BASE_EMAIL,
            password=EMAIL_PASSWORD,
            use_tls=True,
        )

        logger.info("Email sent successfully for alias=%s", alias)
        logger.debug("SMTP result: %s", result)

        return {"message": "Email sent"}

    except Exception:
        logger.exception("Failed to send email for alias=%s", alias)
        raise


def check_and_trash_email(alias: str):
    plus_address = get_plus_address(alias)

    logger.debug(
        "Checking IMAP for alias=%s (address=%s)",
        alias,
        plus_address,
    )
    logger.debug("IMAP server: %s", IMAP_HOST)

    try:
        with MailBox(IMAP_HOST).login(BASE_EMAIL, EMAIL_PASSWORD) as mailbox:
            logger.debug("IMAP login successful for alias=%s", alias)

            messages = list(
                mailbox.fetch(
                    AND(to=plus_address, from_=FIXED_TO_EMAIL),
                    limit=10,
                    reverse=True,
                )
            )

            logger.debug(
                "IMAP search completed: found %d matching message(s) for alias=%s",
                len(messages),
                alias,
            )

            for msg in messages:
                logger.info(
                    "Found matching email: uid=%s from=%s subject=%r date=%s",
                    msg.uid,
                    msg.from_,
                    msg.subject,
                    msg.date,
                )

                ht = msg.html
                if ht == "":
                    ht = msg.text

                message_data = {
                    "messageFound": True,
                    "message": msg.text,
                    "messageHtml": ht,
                    "from": msg.from_,
                    "subject": msg.subject,
                    "date": (
                        msg.date.isoformat()
                        if msg.date
                        else datetime.now().isoformat()
                    ),
                }

                logger.debug(
                    "Moving message uid=%s to Trash",
                    msg.uid,
                )

                mailbox.move(msg.uid, "Trash")

                logger.info(
                    "Message uid=%s successfully moved to Trash",
                    msg.uid,
                )

                return message_data

    except Exception:
        logger.exception(
            "IMAP check failed for alias=%s address=%s",
            alias,
            plus_address,
        )
        raise

    logger.debug("No matching email found for alias=%s", alias)
    return None


@app.post("/")
async def handle_post(request: Request):
    try:
        logger.debug(
            "Received POST request from %s",
            request.client.host if request.client else "unknown",
        )

        data = await request.json()
        logger.debug("Request data keys: %s", list(data.keys()))

        action = data.get("action")
        logger.info("Handling action=%r", action)

        if action == "send":
            alias = data.get("alias")
            body = data.get("body")

            logger.debug(
                "Send request: alias=%r body_length=%d",
                alias,
                len(body) if body else 0,
            )

            if not alias or not body:
                logger.warning(
                    "Send request missing parameters: alias=%r body_present=%s",
                    alias,
                    bool(body),
                )
                raise HTTPException(
                    status_code=400,
                    detail="Missing required parameters: 'alias' and 'body'",
                )

            result = await send_email(alias, body)
            return JSONResponse({"status": "success", "data": result})

        elif action == "poll":
            alias = data.get("alias")

            logger.info("Starting poll for alias=%r", alias)

            if not alias:
                logger.warning("Poll request missing alias")
                raise HTTPException(
                    status_code=400,
                    detail="Missing required parameter: 'alias'",
                )

            poll_interval_sec = 1
            poll_count = 0

            while True:
                poll_count += 1

                if await request.is_disconnected():
                    logger.info(
                        "Client disconnected during poll for alias=%s after %d checks",
                        alias,
                        poll_count,
                    )
                    return JSONResponse(
                        {
                            "status": "error",
                            "message": "client disconnected",
                        },
                        status_code=499,
                    )

                try:
                    found_msg = await asyncio.to_thread(
                        check_and_trash_email,
                        alias,
                    )

                    if found_msg:
                        logger.info(
                            "Returning found message for alias=%s after %d checks",
                            alias,
                            poll_count,
                        )
                        return JSONResponse(
                            {"status": "success", "data": found_msg}
                        )

                except Exception:
                    # Don't silently kill the polling request.
                    logger.exception(
                        "Error while polling IMAP for alias=%s on poll #%d",
                        alias,
                        poll_count,
                    )

                if poll_count % 10 == 0:
                    logger.debug(
                        "Still polling alias=%s (%d checks)",
                        alias,
                        poll_count,
                    )

                await asyncio.sleep(poll_interval_sec)

        else:
            logger.warning("Unknown action received: %r", action)
            raise HTTPException(
                status_code=400,
                detail=f"Unknown action: '{action}'",
            )

    except HTTPException as err:
        logger.warning(
            "HTTP error %d: %s",
            err.status_code,
            err.detail,
        )
        return JSONResponse(
            {"status": "error", "message": err.detail},
            status_code=err.status_code,
        )

    except json.JSONDecodeError:
        logger.exception("Request contained invalid JSON")
        return JSONResponse(
            {"status": "error", "message": "Invalid JSON"},
            status_code=400,
        )

    except Exception as err:
        logger.exception(
            "Unhandled exception while processing request: %s",
            err,
        )
        return JSONResponse(
            {"status": "error", "message": str(err)},
            status_code=500,
        )
