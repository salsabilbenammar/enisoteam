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
