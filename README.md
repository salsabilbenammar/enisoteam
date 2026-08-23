# ENISO Team — Club Robotique

Site web public + espace d'administration pour le club robotique **ENISO Team**.

## Stack

- **Frontend** : React (Vite) + React Router + Axios
- **Backend** : Node.js + Express (API REST)
- **BDD** : MySQL (XAMPP / phpMyAdmin)
- **Auth** : JWT + bcrypt

## Prérequis

- [Node.js](https://nodejs.org/) 18+
- [XAMPP](https://www.apachefriends.org/) (Apache + MySQL)

## 1. Base de données

1. Démarrez **Apache** et **MySQL** dans le panneau XAMPP.
2. Ouvrez [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
3. Importez le fichier `database/eniso_team.sql`.

En ligne de commande (mot de passe root souvent vide sous XAMPP) :

```powershell
C:\xampp\mysql\bin\mysql.exe -u root < "database\eniso_team.sql"
```

### Compte admin de test

| Champ | Valeur |
|-------|--------|
| Email admin | `eniso.teamm@gmail.com` |
| Mot de passe admin | `Bexenisoteam` |
| Email membre (test) | `membre@eniso-team.tn` |
| Mot de passe membre | `membre123` |

| Page | URL |
|------|-----|
| Connexion membre | `/login` |
| Connexion admin | `/admin/login` |

> **Formations** et **Coin RH** sont réservés aux membres inscrits (et aux admins).
> Les comptes membres se gèrent dans **Admin → Membres**.
> Un membre n’a jamais accès à `/admin`.
> **Projets** : catalogue + `/mes-projets` (étapes) + publication auto à 100 % (`/projets` → Réalisations). Docs d’étapes réservés aux membres. Migrations : `migrate_project_steps.js`, `migrate_project_step_documents.js`, `migrate_project_publish.js`.

## 2. Backend

```powershell
cd backend
copy .env.example .env
npm install
npm run dev
```

API disponible sur [http://localhost:5000](http://localhost:5000)  
Health check : [http://localhost:5000/api/health](http://localhost:5000/api/health)

Variables utiles dans `backend/.env` :

- `DB_USER` / `DB_PASSWORD` / `DB_NAME` — connexion MySQL
- `JWT_SECRET` — secret de signature des tokens
- `FRONTEND_URL` — origine CORS (`http://localhost:5173`)

## 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Site : [http://localhost:5173](http://localhost:5173)

## Structure des routes API

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/login` | Non | Connexion admin |
| GET | `/api/auth/me` | Oui | Profil admin |
| GET/POST/PUT/DELETE | `/api/club-info` | Écriture | À propos |
| GET/POST/PUT/DELETE | `/api/board` | Écriture | Bureau |
| GET/POST/PUT/DELETE | `/api/trainings` | Écriture | Formations |
| GET/POST/PUT/DELETE | `/api/events` | Écriture | Événements |
| GET/POST/PUT/DELETE | `/api/announcements` | Écriture | Annonces |
| GET/POST/PUT/DELETE | `/api/recruitment/offers` | Écriture | Offres RH |
| POST | `/api/recruitment/applications` | Non | Candidature (+ CV) |
| GET/DELETE | `/api/recruitment/applications` | Oui | Gestion candidatures |

Les fichiers uploadés sont servis sous `/uploads/...`.

## Modules

1. **À propos** — contenu dynamique (`club_info`)
2. **Bureau** — membres + photos
3. **Formations** — CRUD
4. **Événements** — CRUD + images + statut
5. **Annonces** — fil trié par date
6. **Recrutement** — offres + formulaire public + CV
7. **Admin** — login JWT + dashboard protégé

## Dépannage

### phpMyAdmin : « target machine actively refused it »

MySQL n’est pas démarré. Dans XAMPP Control Panel → **Start** sur MySQL.

### API `database: disconnected`

Vérifiez que MySQL tourne, que la base `eniso_team` existe, et que `backend/.env` correspond à vos identifiants XAMPP.

### CORS / login échoue

Assurez-vous que le backend écoute sur le port 5000 et le frontend sur 5173, avec `FRONTEND_URL=http://localhost:5173`.

## 4. Hébergement (production)

Pour que **toutes** les fonctionnalités marchent en ligne (API, images, SPA, mails, rôles bureau) :

### A. Base de données

1. Importez `database/eniso_team.sql` **ou** utilisez une base déjà existante.
2. Sur une base existante, lancez les migrations critiques :

```powershell
node database/migrate_production.js
node database/seed_bureau_accounts.js
```

### B. Backend (`backend/.env`)

Copiez `backend/.env.example` → `.env` et renseignez au minimum :

| Variable | Production |
|----------|------------|
| `DB_*` | Identifiants MySQL de l’hébergeur |
| `JWT_SECRET` | Secret long et unique |
| `FRONTEND_URL` | URL publique du site, ex. `https://votredomaine.com` (une seule URL pour les e-mails) |
| `SMTP_*` | Requis pour les mails recrutement / paiements |

### C. Build frontend + démarrage

**Option recommandée — même serveur (Express sert le site) :**

```powershell
cd frontend
npm install
npm run build
cd ..\backend
npm install
npm start
```

Si `frontend/dist` existe, Express sert le site + `/api` + `/uploads` sur le même port (`PORT`, souvent 5000).  
Ne pas définir `VITE_API_URL` (le frontend utilise `/api` en relatif).

**Option alternative — reverse proxy (Nginx / cPanel / Apache) :**

- `/` → fichiers de `frontend/dist` (fallback SPA → `index.html`)
- `/api` et `/uploads` → Node (`localhost:5000`)
- Build sans `VITE_API_URL`, ou avec `VITE_API_URL=https://votredomaine.com/api` si l’API est sur un autre domaine

### D. Checklist post-déploiement

- [ ] `GET /api/health` → `{ "status": "ok", "database": "connected" }`
- [ ] Images / CV : dossier `backend/uploads` **persistant** (ne pas l’effacer au redéploiement)
- [ ] Login admin `/admin/login` + modules (prospection, formations + affiche, audience événements)
- [ ] Changer les mots de passe bureau par défaut après `seed_bureau_accounts.js`
- [ ] Mails : `FRONTEND_URL` = URL réelle (sinon liens de réservation pointent vers localhost)

### E. API séparée (domaine différent)

```powershell
# frontend/.env.production
VITE_API_URL=https://api.votredomaine.com/api
```

Puis `npm run build`. Sur le backend : `FRONTEND_URL=https://votredomaine.com` et CORS autorisera cette origine.

## 5. Oracle Cloud (gratuit — recommandé)

Guide complet pas à pas : **[deploy/oracle/README.md](deploy/oracle/README.md)**

Résumé :

1. Créer une VM Ubuntu **Always Free** sur [cloud.oracle.com](https://cloud.oracle.com)
2. Ouvrir les ports **22, 80, 443** (Security List)
3. `git clone` → `sudo bash deploy/oracle/setup-server.sh`
4. MySQL + `backend/.env` + import SQL + migrations
5. `bash deploy/oracle/deploy.sh`
6. Nginx + Certbot (HTTPS)
