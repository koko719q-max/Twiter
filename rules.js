let isSlovenian = false;

const TERMS_EN = `
TERMS OF SERVICE

1. Acceptance of Terms
By using this application, you accept all rules and future updates.

2. Eligibility
You must be at least 13 years old or have parental permission.

3. User Responsibilities
You are responsible for all actions performed under your account.

4. Prohibited Behavior
- No hacking, exploiting, or cheating
- No bots or automation without permission
- No spam or abuse
- No harassment or hate speech
- No illegal activity

5. Account Security
You are responsible for keeping your login secure.

6. Content Rules
You may not upload harmful, illegal, or inappropriate content.

7. Fair Use
Do not overload, spam, or disrupt the system.

8. Data Usage
We may store data to improve the service.

9. Moderation Rights
We can remove content or ban users at any time.

10. Updates
Rules may change at any time without notice.

11. Termination
We may suspend or ban accounts violating rules.

12. Disclaimer
Service is provided "as is" without warranty.

13. Liability
We are not responsible for any damages or losses.

14. Contact
Contact support if you have issues.

Last updated: June 2026

— Signed by:
Matej Marinšek
`;

const TERMS_SI = `
POGOJI UPORABE

1. Sprejem pogojev
Z uporabo te aplikacije se strinjate z vsemi pravili.

2. Upravičenost
Uporabnik mora biti star najmanj 13 let ali imeti dovoljenje staršev.

3. Odgovornost uporabnika
Odgovorni ste za vse svoje dejavnosti v aplikaciji.

4. Prepovedano vedenje
- Hekanje, izkoriščanje ali goljufanje
- Boti ali avtomatizacija brez dovoljenja
- Spam ali zloraba sistema
- Nadlegovanje ali sovražni govor
- Nezakonite dejavnosti

5. Varnost računa
Odgovorni ste za varnost svojega računa.

6. Vsebina
Ni dovoljeno nalagati škodljive ali nezakonite vsebine.

7. Poštena uporaba
Ne smete preobremenjevati ali motiti sistema.

8. Podatki
Lahko zbiramo podatke za izboljšanje storitve.

9. Moderiranje
Lahko odstranimo vsebino ali banamo uporabnike.

10. Posodobitve
Pravila se lahko spremenijo kadarkoli.

11. Prekinitev
Račun lahko kadarkoli ukinemo.

12. Odpoved odgovornosti
Storitev je na voljo "kot je".

13. Odgovornost
Ne odgovarjamo za škodo ali izgube.

14. Kontakt
Kontaktirajte podporo.

Zadnja posodobitev: junij 2026

— Podpis:
Matej Marinšek
`;

const box = document.getElementById("rulesText");
const status = document.getElementById("status");

box.textContent = TERMS_EN;

// ── LANGUAGE TOGGLE ───────────────────────────────
window.toggleLanguage = function () {
  isSlovenian = !isSlovenian;

  box.style.opacity = 0;

  setTimeout(() => {
    box.textContent = isSlovenian ? TERMS_SI : TERMS_EN;
    box.style.opacity = 1;
  }, 150);
};

// ── ACCEPT RULES ──────────────────────────────────
window.acceptRules = function () {
  localStorage.setItem("rulesAccepted", "true");
  typeStatus("Accepted ✔");

  setTimeout(() => {
    window.location.href = "index.html";
  }, 900);
};

// ── DENY RULES (REDIRECT TO rulesno.html) ──────────
window.denyRules = function () {
  localStorage.setItem("rulesAccepted", "false");
  typeStatus("Access denied");

  setTimeout(() => {
    window.location.href = "rulesno.html";
  }, 900);
};

// ── STATUS ANIMATION ──────────────────────────────
function typeStatus(text) {
  status.textContent = "";
  let i = 0;

  const interval = setInterval(() => {
    status.textContent += text[i];
    i++;
    if (i >= text.length) clearInterval(interval);
  }, 40);
}