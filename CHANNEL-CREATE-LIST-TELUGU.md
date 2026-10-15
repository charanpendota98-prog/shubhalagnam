# 📱 CHANNEL CREATE LIST — ఇది చూసి ఒక్కొక్కటి create చేయండి

**మొత్తం 64 configured listings** — setup చేసే ముందు operator ownership/access ని స్వతంత్రంగా నిర్ధారించండి.
ఈ registry external availability లేదా bot permissions ను తనిఖీ చేయదు. Username పని చేయకపోతే ఆపి, owner-approved replacement ను verify చేయండి; ఊహించి alternate వాడకండి.

ప్రతి channel కి: **Name copy → configured username check → Description paste → bot permissions verify**

## ⚡ ఒక్కో channel ki 4 నిమిషాలు (phone lo)
1. Telegram → ☰ → **New Channel** → Name (క్రింద టేబుల్ నుంచి copy) → **Public** → Username (copy)
2. Description paste (kit file లో ఉంది — `channel-kits/<key>.md`) → Create
3. Do not add the bot as an administrator by default. Posting is disabled unless an exact destination is configured and owner-approved; only then grant the minimum permissions required.
4. `--apply` is a separate, mutating setup operation; it may change metadata, upload artwork, create an invite, send, and pin. It is not a smoke test and needs explicit operator approval.

## 🌊 Wave 1 — మొదటి దశ (వెంటనే చేయండి) (16 listings)

| # | Name (copy) | Configured username (verify first) | Routing flag (not uptime) |
|---|---|---|---|
| 1 | `📢 మన వివాహ Official \| మన వివాహ — TS-AP` | `@TSAP_MATRIMONY` | No posting destination configured |
| 2 | `👰 AP Brides \| ఆంధ్రా వధువులు` | `@APBRIDE` | No posting destination configured |
| 3 | `🤵 AP Grooms \| ఆంధ్రా వరులు` | `@APGROOM1` | No posting destination configured |
| 4 | `👰 TS Brides \| తెలంగాణ వధువులు` | `@TSBRIDE` | No posting destination configured |
| 5 | `🤵 TS Grooms \| తెలంగాణ వరులు` | `@TSGROOM1` | No posting destination configured |
| 6 | `👰 Kamma Brides \| కమ్మ వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 7 | `🤵 Kamma Grooms \| కమ్మ వరులు` | `Not configured; do not guess` | No posting destination configured |
| 8 | `👰 Kapu • Balija • Telaga Brides \| కాపు • బలిజ • తెలగ వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 9 | `🤵 Kapu • Balija • Telaga Grooms \| కాపు • బలిజ • తెలగ వరులు` | `Not configured; do not guess` | No posting destination configured |
| 10 | `👰 Reddy Brides \| రెడ్డి వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 11 | `🤵 Reddy Grooms \| రెడ్డి వరులు` | `Not configured; do not guess` | No posting destination configured |
| 12 | `👰 Christian Brides \| Christian వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 13 | `🤵 Christian Grooms \| Christian వరులు` | `Not configured; do not guess` | No posting destination configured |
| 14 | `🕉️ Hindu Matrimony \| హిందూ వివాహాలు` | `Not configured; do not guess` | No posting destination configured |
| 15 | `👰 Muslim Brides \| Muslim వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 16 | `🤵 Muslim Grooms \| Muslim వరులు` | `Not configured; do not guess` | No posting destination configured |

### Wave-1 operator checks (only after confirming exact ownership/access)

`--check` makes explicit read-only Telegram API calls; it is not a message-delivery test. Review results before any separate setup mutation.

```bash
read -rsp 'Bot token: ' BOT_TOKEN && export BOT_TOKEN; echo
python setup_channels.py --check --wave 1
# After separate, explicit approval only: python setup_channels.py --apply --wave 1
unset BOT_TOKEN
```

## 🌊 Wave 2 — రెండో దశ (18 listings)

| # | Name (copy) | Configured username (verify first) | Routing flag (not uptime) |
|---|---|---|---|
| 1 | `🌍 NRI Telugu Matrimony \| విదేశీ సంబంధాలు` | `Not configured; do not guess` | No posting destination configured |
| 2 | `👰 Brahmin Brides \| బ్రాహ్మణ వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 3 | `🤵 Brahmin Grooms \| బ్రాహ్మణ వరులు` | `Not configured; do not guess` | No posting destination configured |
| 4 | `👰 Madiga Brides \| మాదిగ వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 5 | `🤵 Madiga Grooms \| మాదిగ వరులు` | `Not configured; do not guess` | No posting destination configured |
| 6 | `👰 Mala Brides \| మాల వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 7 | `🤵 Mala Grooms \| మాల వరులు` | `Not configured; do not guess` | No posting destination configured |
| 8 | `👰 Munnuru Kapu Brides \| మున్నూరు కాపు వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 9 | `🤵 Munnuru Kapu Grooms \| మున్నూరు కాపు వరులు` | `Not configured; do not guess` | No posting destination configured |
| 10 | `👰 Velama Brides \| వెలమ వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 11 | `🤵 Velama Grooms \| వెలమ వరులు` | `Not configured; do not guess` | No posting destination configured |
| 12 | `👰 Viswabrahmana (Viswakarma) Brides \| విశ్వబ్రాహ్మణ వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 13 | `🤵 Viswabrahmana (Viswakarma) Grooms \| విశ్వబ్రాహ్మణ వరులు` | `Not configured; do not guess` | No posting destination configured |
| 14 | `👰 Arya Vysya • Komati Brides \| వైశ్య • కోమటి వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 15 | `🤵 Arya Vysya • Komati Grooms \| వైశ్య • కోమటి వరులు` | `Not configured; do not guess` | No posting destination configured |
| 16 | `👰 Yadava • Golla Brides \| యాదవ • గొల్ల వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 17 | `🤵 Yadava • Golla Grooms \| యాదవ • గొల్ల వరులు` | `Not configured; do not guess` | No posting destination configured |
| 18 | `💍 Second Marriage \| రెండో పెళ్లి` | `Not configured; do not guess` | No posting destination configured |

## 🌊 Wave 3 — మూడో దశ (30 listings)

| # | Name (copy) | Configured username (verify first) | Routing flag (not uptime) |
|---|---|---|---|
| 1 | `👰 Goud Brides \| గౌడ వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 2 | `🤵 Goud Grooms \| గౌడ వరులు` | `Not configured; do not guess` | No posting destination configured |
| 3 | `👰 Kummari Brides \| కుమ్మరి వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 4 | `🤵 Kummari Grooms \| కుమ్మరి వరులు` | `Not configured; do not guess` | No posting destination configured |
| 5 | `👰 Kuruma Brides \| కురుమ వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 6 | `🤵 Kuruma Grooms \| కురుమ వరులు` | `Not configured; do not guess` | No posting destination configured |
| 7 | `👰 Lambada • Banjara (ST) Brides \| లంబాడ • బంజార వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 8 | `🤵 Lambada • Banjara (ST) Grooms \| లంబాడ • బంజార వరులు` | `Not configured; do not guess` | No posting destination configured |
| 9 | `👰 Mudiraj • Tenugollu Brides \| ముదిరాజ • తెనుగొల్ల వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 10 | `🤵 Mudiraj • Tenugollu Grooms \| ముదిరాజ • తెనుగొల్ల వరులు` | `Not configured; do not guess` | No posting destination configured |
| 11 | `👰 Other BC Communities Brides \| ఇతర BC కులాలు వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 12 | `🤵 Other BC Communities Grooms \| ఇతర BC కులాలు వరులు` | `Not configured; do not guess` | No posting destination configured |
| 13 | `👰 Other SC Communities Brides \| ఇతర SC కులాలు వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 14 | `🤵 Other SC Communities Grooms \| ఇతర SC కులాలు వరులు` | `Not configured; do not guess` | No posting destination configured |
| 15 | `💍 Other ST Communities Matrimony \| ఇతర ST కులాలు — వధువులు + వరులు` | `Not configured; do not guess` | No posting destination configured |
| 16 | `👰 Padmashali • Devanga (Weavers) Brides \| పద్మశాలి • దేవాంగ వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 17 | `🤵 Padmashali • Devanga (Weavers) Grooms \| పద్మశాలి • దేవాంగ వరులు` | `Not configured; do not guess` | No posting destination configured |
| 18 | `👰 Perika Brides \| పెరిక వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 19 | `🤵 Perika Grooms \| పెరిక వరులు` | `Not configured; do not guess` | No posting destination configured |
| 20 | `👰 Rajaka Brides \| రజక వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 21 | `🤵 Rajaka Grooms \| రజక వరులు` | `Not configured; do not guess` | No posting destination configured |
| 22 | `👰 Raju • Kshatriya Brides \| రాజు • క్షత్రియ వధువులు` | `Not configured; do not guess` | No posting destination configured |
| 23 | `🤵 Raju • Kshatriya Grooms \| రాజు • క్షత్రియ వరులు` | `Not configured; do not guess` | No posting destination configured |
| 24 | `🤝 Bureau / Broker Network \| బ్రోకర్ల నెట్‌వర్క్` | `Not configured; do not guess` | No posting destination configured |
| 25 | `♿ Differently-Abled \| ప్రత్యేక సామర్థ్యం` | `Not configured; do not guess` | No posting destination configured |
| 26 | `🩺 Doctors & Teachers Matrimony \| వైద్యులు + ఉపాధ్యాయులు` | `Not configured; do not guess` | No posting destination configured |
| 27 | `🚨 Fraud Alerts \| మోసం జాగ్రత్త` | `Not configured; do not guess` | No posting destination configured |
| 28 | `🏛️ Govt Jobs Matrimony \| ప్రభుత్వ ఉద్యోగులు` | `Not configured; do not guess` | No posting destination configured |
| 29 | `💻 Software Matrimony \| సాఫ్ట్‌వేర్ ఉద్యోగులు` | `Not configured; do not guess` | No posting destination configured |
| 30 | `🏆 Success Stories \| విజయ గాథలు` | `Not configured; do not guess` | No posting destination configured |

## 🎯 ముఖ్యమైన సూచనలు

- Wave sizes and usernames above come from the registry; they are not proof of an existing public channel.
- Do not send messages or enable automatic publishing until the operator verifies the exact destination and access.
- `--check` performs explicit read-only Telegram API requests only when an operator supplies a real bot token; it does not prove future availability or delivery.
- `--apply` is mutating and can send/pin a welcome message. It is not a smoke test and requires separate, explicit operator approval.
