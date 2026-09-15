# Southbag Mobile V1
Version One of the Southbag Mobile Banking app.

It is a mobile client for Southbag Banking. Kevin wanted the app to be very secure and etc. ~All actions in the app are emailed to Kevin for processing. Please allow 2-5 Business minutes.~ You now sign in with [Southbag Identity](https://identity.southbag.cc) and the app talks to [Southbag Online Banking](https://banking.southbag.cc) directly, so your balance, statement, transfers and support chat are the same ones as on the website. Kevin has been let go.

In true Southbag Banking Department fashion, we pride ourselves in building annoying UX. You can find the Desktop version of Southbag Banking [here](http://internet.online.banking.southbag.v4.customer-access.secure-auth.identity.bank-gateway.prod.apac.onlineservices.secureportal.onlinebanking.southbag.michealsoft.tech)

This could work on iOS but it is android only because Kevin said so.

# Screenshots
| <img height="500" alt="Screenshot from 2026-09-01 20-47-05" src="https://github.com/user-attachments/assets/c3b75cbc-ed61-48ca-b592-5b941f3ff9f4" /> | <img height="500" alt="Screenshot from 2026-09-01 20-47-45" src="https://github.com/user-attachments/assets/3601fc70-b251-4676-9d40-801e600d15f9" /> | <img height="500" alt="Screenshot from 2026-09-01 20-48-36" src="https://github.com/user-attachments/assets/0e3746ba-ea98-4f20-b693-72fa9666df53" /> | <img height="500" alt="Screenshot from 2026-09-01 20-48-57" src="https://github.com/user-attachments/assets/9fe292af-1898-482f-8353-aa0a146fdd35" /> |
|-|-|-|-|
| <img height="500" alt="Screenshot from 2026-09-01 20-48-19" src="https://github.com/user-attachments/assets/d3b0eb5c-dd51-4bda-87d6-ada33d52eb3c" /> | | | |

# Tech Stack
- Cordova for the app itself
- Vibecoded JQuery Mobile UI clone (JQ Mobile UI was too opinionated) (only the css itself was vibecoded)
- ~Google Apps Script and Gmail for back end communication~ ~now replaced with python backend~ now replaced with no backend: Southbag Identity (OAuth code + PKCE) and the Online Banking API
- Southbag AI
- Javascript

# How it is put together
- `www/` is the whole app. `static.yml` builds it with `cordova build browser` and publishes it to GitHub Pages at https://southbaghq.github.io/mobile-v1/.
- The Android app does **not** bundle `www/`. `config.xml` points its WebView at the GitHub Pages URL, and `android-build.yml` swaps `www/` for a one-line loader before building, so pushing to `main` updates the installed app too.
- Sign in: `www/js/globals.js` runs the OAuth authorization code + PKCE flow against `identity.southbag.cc` as a public client and lands on `www/callback.html`. Set `IDENTITY_CLIENT_ID` to a client registered on Identity's developer page; while it is empty the app registers itself on first sign-in (one client per device, with a consent screen).
- Data: every page calls `banking.southbag.cc/api/*` through `bankingFetch()` with the Identity access token as a bearer token. Banking opens an account the first time it sees a new customer.
- Local dev: `cordova run browser` serves `www/` on `http://localhost:8000`; that origin is allowed by both Identity and Banking.

(c) Southbag LLC, 0000

_Solutions made for you._

# AI usage

used to make the UI kit (I forgot about this earlier sorry!) and also the mailserver + tester (server was previously a Vibecoded google app script, ported it to python with the help of Gemini, i did not feel like doing that myself loll)

wallpaper shuffler was done using AI too

---

https://lore.southbag.cc/



