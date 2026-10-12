<<<<<<< HEAD
# ParkWise – Smart City Parking Finder & Booking (MERN)

Guests can browse everything without logging in. Login is required only to **book, pay, check in, view bookings and use favorites**.

```
parkwise/
├── README.md
├── server/                  <- Node + Express + MongoDB API
│   ├── .env.example         <- copy to .env
│   ├── server.js  app.js
│   ├── config/  models/  controllers/  routes/
│   ├── middleware/  services/  utils/
│   ├── seed/seed.js         <- demo data loader
│   └── tests/ (unit + integration)
└── client/                  <- React (Vite) frontend
    ├── index.html  vite.config.js
    └── src/ components/ pages/ context/ hooks/ services/ styles/ utils/
```

## 1. Install the required software (Windows)

| Software | Version | Link |
|---|---|---|
| Node.js (LTS) | 20.19+ or 22 LTS | https://nodejs.org |
| MongoDB Community Server | 7.x or 8.x | https://www.mongodb.com/try/download/community |
| VS Code | any | https://code.visualstudio.com |

Check in a terminal: `node -v` and `npm -v`.

## 2. Database – you do NOT create it by hand

MongoDB creates the database `parkwise` and all collections automatically the first time data is saved (the seed script does this).

**Option A – Local MongoDB**
1. Install MongoDB Community Server. Keep "Install MongoDB as a Service" ticked (it starts automatically). Installing MongoDB Compass (the GUI) is optional and useful to look at your data.
2. Your connection string is already the default: `mongodb://127.0.0.1:27017/parkwise`.

**Option B – MongoDB Atlas (cloud)**
1. Create a free account at https://cloud.mongodb.com → create a free **M0** cluster.
2. *Database Access* → add a user (username + password).
3. *Network Access* → add your current IP (or `0.0.0.0/0` for a class project only).
4. *Connect → Drivers* → copy the connection string and put your database name in it, e.g.
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/parkwise?retryWrites=true&w=majority`
   (If the password has special characters like `@`, URL-encode them.)

## 3. Razorpay TEST keys

1. Sign up at https://dashboard.razorpay.com (free, no business verification is needed for test mode).
2. Switch the dashboard toggle to **Test Mode**.
3. *Account & Settings → API Keys → Generate Test Key*. Copy the **Key Id** (`rzp_test_...`) and **Key Secret** (shown once).
4. Test payments: use Razorpay's test cards/UPI (https://razorpay.com/docs/payments/payments/test-card-details/). Typical test card: `4111 1111 1111 1111`, any future expiry, any CVV, and any OTP on the test bank page. Use `success@razorpay` as a test UPI ID. No real money moves.

> Payments cannot work without valid Razorpay credentials. Everything else (browsing, slots, login) works without them.

## 4. Configure the backend

Open a terminal **in the `server` folder** (VS Code: right-click `server` → *Open in Integrated Terminal*):

```powershell
cd server
copy .env.example .env
```

Open `server/.env` and set:
- `JWT_SECRET` – any long random text. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `MONGO_URI` – leave as is for local MongoDB, or paste your Atlas string.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` – your **test** keys.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` – the admin login you want (change the default!).
- Leave `RAZORPAY_WEBHOOK_SECRET` empty for now (see section 8).

## 5. Install and run – backend

In the `server` folder:

```powershell
npm install
npm run seed      # creates demo cities, attractions, parking, slots + admin user
npm run dev       # starts the API on http://localhost:5000
```
Check http://localhost:5000/api/health → `{"ok":true,...}`

## 6. Install and run – frontend

Open a **second** terminal in the `client` folder:

```powershell
cd client
npm install
npm run dev       # opens http://localhost:5173
```
(Only if your API is not on port 5000: `copy .env.example .env` in `client` and edit `VITE_API_URL`.)

## 7. Demo logins (created by the seed script)

| Role | Email | Password |
|---|---|---|
| Admin | value of `SEED_ADMIN_EMAIL` (default `admin@parkwise.local`) | value of `SEED_ADMIN_PASSWORD` (default `ChangeMe@12345`) |
| User | `user@parkwise.local` | `User@12345` (development only) |

Running `npm run seed` again **wipes and recreates** cities, attractions, parking, bookings, payments and favorites (users are kept).

## 8. Optional: webhooks (for delayed payment confirmations)

The normal flow (checkout → server verifies signature) works on localhost with no webhook. To also test webhooks you need a public URL, e.g. with ngrok: `ngrok http 5000`. Then in Razorpay *Dashboard → Webhooks → Add*:
- URL: `https://<your-ngrok>.ngrok-free.app/api/payments/webhook`
- Secret: any text; put the same text in `RAZORPAY_WEBHOOK_SECRET` in `.env` and restart the server
- Events: `payment.captured`, `order.paid`, `payment.failed`

## 9. End-to-end test (manual)

1. **Guest browsing** – open http://localhost:5173 *without logging in*. Browse Cities → Indore → C21 Mall → parking → open the map and "Directions".
2. **Search** – search "Raj" on Attractions; filter by category; search a city.
3. **Slot grid** – open a parking location, pick vehicle/date/time. Green = available, red = occupied, blue = reserved, grey = unavailable. Select a slot → **Book now**.
4. **Login only now** – you are sent to *Log in*; log in (or register). You return to the review page with the same slot, date and time.
5. **Pay** – *Continue to payment* → *Pay* → Razorpay test window → use a test card → you land on the confirmation page with reference, QR code and print button.
6. **Failed / cancelled payment** – in the Razorpay window close it, or use Razorpay's failure test card; you can retry while the hold timer runs. Let the timer run out → the slot is released and the booking becomes *Expired*.
7. **Two users, one slot** – open two browsers (or one normal + one private window), log in as two users, pick the *same* slot and time, and press "Continue to payment" on both. Only one gets the slot; the other sees "just reserved".
8. **Check-in** – set the booking start to within 15 minutes of now (book for the current hour) → *Check in* page → enter reference → *Check in*, later *Check out*.
9. **Cancel** – *My bookings → booking → Cancel* (free until 2 hours before start). Refunds are manual (see Admin → Payments).
10. **Admin** – log in as admin → *Admin*: add a city/attraction/parking, add areas and slots, change prices, view bookings, payments, users.
11. **Permissions** – as a normal user visit `/admin` (redirected); as a guest visit `/my-bookings` (sent to login).

## 10. Automated tests

```powershell
cd server
npm test                    # unit tests: pricing, signatures, operating hours (no database needed)
npm run seed
npm run test:integration    # needs MongoDB: concurrent booking, hold expiry, duplicate payment callbacks
```

## 11. How the important rules are enforced

- **Auth** – JWT in `Authorization` header; every protected route re-checks the token and loads the user; admin routes also require `role === 'admin'`. Public registration can only create normal users; admins come from the seed script or from another admin.
- **No double booking** – before creating a booking the server takes a short per-slot lock (atomic `findOneAndUpdate`), then checks for overlapping confirmed bookings or unexpired holds *for the requested time range*, then creates the booking. Works on a normal standalone MongoDB (no transactions needed).
- **Payment amount** – always calculated on the server from stored prices (integer paise). The browser never sends a price.
- **Payment confirmation** – only after the server verifies Razorpay's HMAC-SHA256 signature (checkout) or webhook signature (raw body). Both paths are idempotent: repeated callbacks never create duplicates.
- **Holds** – unpaid bookings hold a slot for `HOLD_MINUTES` (default 10). A background job marks stale holds *Expired* every minute, and expired holds never block availability anyway.
- **Late payment** – if money arrives after the hold expired, the booking is re-confirmed only if the slot is still free; otherwise the payment is flagged **Refund due** for the admin.
- **Refunds** – never automatic. Admin refunds in the Razorpay dashboard, then records it in Admin → Payments.
- **Demo data** – all seeded parking is labelled *Demo data* (`verified: false`). Slot occupancy is operator-managed; nothing is detected automatically. Replace with real data via the admin panel.

## 12. Troubleshooting

| Problem | Fix |
|---|---|
| `Missing required environment variables` | You forgot `copy .env.example .env` in `server`, or `.env` lacks `MONGO_URI`/`JWT_SECRET`. |
| `Could not connect to MongoDB` | Start the MongoDB service (Windows: *Services → MongoDB Server → Start*) or fix the Atlas string / IP allow-list / URL-encode the password. |
| Frontend shows "Cannot reach the server" | Backend is not running on port 5000, or `CLIENT_URL` in `server/.env` doesn't match the frontend address (default `http://localhost:5173`). Restart the server after editing `.env`. |
| `npm run seed` hangs | MongoDB isn't running. |
| "Razorpay is not configured" | Put real **test** keys in `server/.env` and restart the server. |
| Razorpay "Authentication failed" | Key Id/Secret mismatch or you used live keys with test mode. Regenerate test keys. |
| Port 5000 busy | Change `PORT` in `server/.env` and set `VITE_API_URL` in `client/.env`. |
| Map tiles empty | Needs internet access to OpenStreetMap tiles. |
| Images are random photos | Seed uses placeholder pictures (picsum.photos). Edit the image URL in the admin panel. |
| `npm test` finds no tests | Use Node 22 LTS (globs in `node --test`). |
| Booking says "outside operating hours" | Pick a time inside the opening hours shown on the parking page (IST). |
=======
# smartparking
Smart Parking across india.
>>>>>>> 8d49a203c23ace747e0017ace61f3a71a2a573c1
