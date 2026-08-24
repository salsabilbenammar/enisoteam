# Hébergement sans carte (Vercel + Render + MySQL gratuit)

Site **toujours accessible**, mais l’API Render **s’endort** après ~15 min sans visite  
→ la 1re ouverture peut prendre 30–60 s.

Les fichiers uploadés (images, CV) peuvent **disparaître** si Render redémarre  
(disque non persistant sur le plan free).

---

## Architecture

```
Navigateur → Vercel (React) → Render (API Node) → db4free / FreeSQL (MySQL)
                    ↑________________|
              VITE_API_URL + CORS
```

| Service | Rôle | Lien |
|---------|------|------|
| **Vercel** | Frontend | https://vercel.com |
| **Render** | Backend API | https://render.com |
| **db4free.net** | MySQL | https://db4free.net |

---

## Étape 1 — MySQL gratuit

> **Important :** n’utilise **pas** FreeSQLDatabase pour ce projet  
> (MySQL **5.5** trop ancien : pas de JSON, timestamps limités, 5 Mo max).

### Utilise plutôt [db4free.net](https://www.db4free.net/) (avec **`.net`**, pas `.tn`)

1. Crée un compte + une base MySQL 8.
2. Note : Host (`db4free.net`), Port `3306`, User, Password, Database name.
3. **Depuis ton PC**, configure `backend/.env` :

```env
DB_HOST=db4free.net
DB_PORT=3306
DB_USER=ton_user
DB_PASSWORD=ton_mot_de_passe
DB_NAME=ton_nom_base
JWT_SECRET=un_secret_long_au_hasard
FRONTEND_URL=http://localhost:5173
```

4. Importe le schéma + migrations **depuis ton PC** :

```powershell
cd "c:\Desktop\eniso team"
copy deploy\nocard\env.backend.example backend\.env
notepad backend\.env
```

Remplis `DB_*` avec les infos db4free, puis :

```powershell
node database\import_sql.js
node database\migrate_production.js
node database\seed_bureau_accounts.js
```

> `import_sql.js` n’a pas besoin du client MySQL installé (uniquement Node).

> db4free : base **de test**, peut être lente ou réinitialisée. Suffisant pour démarrer.

---

## Étape 2 — Backend sur Render

1. Va sur [render.com](https://render.com) → **Sign up with GitHub** (sans carte en général).
2. **New** → **Web Service** → choisis le repo `enisoteam`.
3. Réglages :
   - **Root Directory** : `backend`
   - **Runtime** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Instance type** : Free
4. **Environment** (variables) :

| Key | Value |
|-----|--------|
| `DB_HOST` | host MySQL (ex. `db4free.net`) |
| `DB_PORT` | `3306` |
| `DB_USER` | ton user |
| `DB_PASSWORD` | ton password |
| `DB_NAME` | ton database |
| `JWT_SECRET` | chaîne longue aléatoire |
| `JWT_EXPIRES_IN` | `365d` |
| `FRONTEND_URL` | laisse `https://temp.vercel.app` pour l’instant, tu mettras l’URL Vercel après |
| `SERVE_FRONTEND` | `false` |
| `NODE_ENV` | `production` |

5. **Create Web Service** → attends le déploiement.
6. Note l’URL API, ex. : `https://eniso-team-api.onrender.com`
7. Teste : `https://eniso-team-api.onrender.com/api/health`  
   → doit renvoyer `"status":"ok"` (la 1re fois peut être lente).

---

## Étape 3 — Frontend sur Vercel

1. Va sur [vercel.com](https://vercel.com) → **Import** le même repo GitHub.
2. Réglages :
   - **Root Directory** : `frontend`
   - **Framework Preset** : Vite
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
3. **Environment Variables** :

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://eniso-team-api.onrender.com/api` |

(remplace par **ton** URL Render + `/api`)

4. **Deploy**.
5. Note l’URL du site, ex. : `https://enisoteam.vercel.app`

---

## Étape 4 — Relier CORS

Sur Render → ton service → **Environment** :

```text
FRONTEND_URL=https://enisoteam.vercel.app
```

(remplace par **ton** URL Vercel, sans slash final)

**Save** → Render redéploie.

Sur Vercel, si tu changes l’URL API, rebuild avec la bonne `VITE_API_URL`.

---

## Étape 5 — Checklist

- [ ] `…onrender.com/api/health` → OK
- [ ] Site Vercel s’ouvre
- [ ] Login admin `/admin/login`
- [ ] Changer les mots de passe bureau par défaut
- [ ] (Optionnel) SMTP pour les e-mails recrutement

---

## Mises à jour du code

Après un `git push` sur `main` :
- Render et Vercel **redéploient tout seuls** (si connectés au repo).

---

## Limites à accepter (sans carte)

| Problème | Effet |
|----------|--------|
| Sleep Render | 1re visite lente (~30–60 s) |
| Disque éphémère | Images / CV peuvent disparaître au redémarrage |
| db4free | Pas pour une prod critique à long terme |

Quand tu auras une carte → bascule vers **Oracle Always Free** (guide `deploy/oracle/README.md`) pour un site toujours réactif et des fichiers persistants.

---

## Ordre résumé

```text
1. db4free → créer BDD → import SQL + migrations (PC)
2. Render → backend + variables DB
3. Vercel → frontend + VITE_API_URL
4. Render → FRONTEND_URL = URL Vercel
5. Tester login
```
