# Deploying DataScope

Two free accounts, about ten minutes, no credit card. The database lives on
**MongoDB Atlas**; the API and the web app are one **Render** service, so the
demo is a single URL with the API under `/api` — no CORS to configure.

```
https://datascope.onrender.com          -> the app
https://datascope.onrender.com/api/...  -> the API
```

## 1. MongoDB Atlas (5 min)

1. Sign up at <https://cloud.mongodb.com> (free, no card).
2. **Create a project** (any name), then **Build a database** → **M0 / Free**.
   Pick the region closest to you (e.g. Mumbai or Singapore).
3. **Security → Database Access → Add New Database User**
   - username: `datascope`
   - password: click **Autogenerate Secure Password** and copy it
   - role: **Read and write to any database**
4. **Security → Network Access → Add IP Address → Allow access from anywhere**
   (`0.0.0.0/0`). Render's free tier has no fixed outbound IP, so this is
   required.
5. **Clusters → Connect → Drivers**. Copy the connection string; it looks like

   ```
   mongodb+srv://datascope:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```

6. Replace `<password>` with the real password and name the database `datascope`
   before the `?`:

   ```
   mongodb+srv://datascope:REAL_PASSWORD@cluster0.abcde.mongodb.net/datascope?retryWrites=true&w=majority
   ```

   If your password contains `@`, `:` or `/`, percent-encode it
   (`@` becomes `%40`).

## 2. Render (5 min)

1. Sign up at <https://render.com> **with GitHub** (free tier, no card).
2. **New + → Blueprint** → connect the `Vic204/DataScope` repository → **Apply**.
3. Render creates one service, `datascope`, and asks for **MONGODB_URI** — paste
   the string from step 1.6. `JWT_SECRET` is generated for you.
4. Wait for the first build (a few minutes: it installs both halves and bundles
   the web app). The service is ready when **Logs** shows
   `[web] serving the built client from …` and the health check passes.
5. Open the URL Render gives you (usually `https://datascope-xxxx.onrender.com`,
   or rename it under **Settings → Name** to get `https://datascope.onrender.com`).

## 3. Fill it with demo data (once)

The app starts empty. From your machine, point the seed script at Atlas:

```bash
cd server
MONGODB_URI="mongodb+srv://datascope:...@cluster0.abcde.mongodb.net/datascope" npm run seed
```

PowerShell:

```powershell
cd server
$env:MONGODB_URI="mongodb+srv://datascope:...@cluster0.abcde.mongodb.net/datascope"
npm run seed
```

You should see `[seed] stored 4 users, 7 surveys, 8 responses.` Then sign in on
the deployed site as `meera@datascope.dev` / `password123`.

## 4. Check the deploy

| Check | Expected |
| --- | --- |
| `https://<your-url>/api/health` | `{"ok":true,"database":"connected",…}` |
| `https://<your-url>/welcome` | the notebook welcome screen |
| `https://<your-url>/s/<slug>` | a share link opens without signing in |

## Notes

- **Free services sleep.** After ~15 minutes idle, the first request takes
  ~30–60 s to wake the service. Upgrade the service or keep it warm if that
  matters.
- **Redeploys are automatic** — Render rebuilds on every push to `main`.
- **Custom domain**: Render → Settings → Custom Domains.
- **Splitting the front end off** is possible (a Render static site with
  `npm --prefix app run build:web`, publish `dist`, rewrite `/*` to
  `/index.html`), but then the API needs `CORS_ORIGIN` set to the site's URL and
  the client needs `EXPO_PUBLIC_API_URL` set to the API's URL.
- **Never commit** the Atlas password or the Render-generated `JWT_SECRET`.

## Twice-checked details

- `NODE_ENV=production` makes the server refuse the development `JWT_SECRET`,
  serve `app/dist`, and skip the local `mongod` entirely.
- `tsx` is a runtime dependency (there is no build step for the server); it is
  not in `devDependencies` on purpose, because npm skips those in production.
- `mongodb-memory-server` is imported lazily, so a production deploy never needs
  the dev-only mongod binary.
