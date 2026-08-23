# Hébergement Oracle Cloud (gratuit)

Guide pas à pas pour déployer **ENISO Team** sur une VM **Oracle Cloud Always Free** (Ubuntu).

---

## Vue d’ensemble

```
Internet → Nginx (80/443) → Node/Express :5000 → MySQL local
                              ├── /api
                              ├── /uploads
                              └── frontend/dist (SPA)
```

Tout tourne sur **une seule VM** : uploads persistants, pas de mise en veille.

---

## Étape 1 — Créer le compte et la VM

1. Allez sur [https://cloud.oracle.com](https://cloud.oracle.com) → **Start for free**.
2. Choisissez une région proche (ex. **Frankfurt**, **Paris**, **Milan**).
3. **Compute** → **Instances** → **Create instance** :
   - Nom : `enisoteam`
   - Image : **Ubuntu 22.04** ou **24.04**
   - Shape : **Always Free eligible**
     - **ARM** `VM.Standard.A1.Flex` (4 Go RAM recommandé) — souvent en rupture de capacité
     - **AMD** `VM.Standard.E2.1.Micro` (1 Go RAM) — plus disponible, un peu juste pour le build
   - Réseau : cochez **Assign a public IPv4 address**
   - SSH : générez une paire de clés, **téléchargez la clé privée** (`.key`)
4. **Create**.

---

## Étape 2 — Ouvrir les ports (obligatoire)

Dans Oracle Cloud Console :

1. **Networking** → **Virtual cloud networks** → votre VCN → **Security Lists** → Default Security List.
2. **Add Ingress Rules** :

| Source CIDR | Protocol | Dest. Port |
|-------------|----------|------------|
| `0.0.0.0/0` | TCP | 22 |
| `0.0.0.0/0` | TCP | 80 |
| `0.0.0.0/0` | TCP | 443 |

Sans ça, le site ne sera **pas accessible** depuis Internet.

---

## Étape 3 — Connexion SSH

Récupérez l’**IP publique** de la VM (page Instance).

**Windows (PowerShell) :**

```powershell
ssh -i "C:\chemin\vers\votre-cle.key" ubuntu@VOTRE_IP_PUBLIQUE
```

**Linux / Mac :**

```bash
chmod 600 ~/Downloads/votre-cle.key
ssh -i ~/Downloads/votre-cle.key ubuntu@VOTRE_IP_PUBLIQUE
```

---

## Étape 4 — Installation automatique

Sur le serveur :

```bash
git clone https://github.com/salsabilbenammar/enisoteam.git ~/enisoteam
cd ~/enisoteam
sudo bash deploy/oracle/setup-server.sh
```

Installe : Node 20, MySQL, Nginx, PM2, Certbot, pare-feu, swap 2 Go.

---

## Étape 5 — Base de données MySQL

```bash
cd ~/enisoteam
export DB_NAME=eniso_team
export DB_USER=eniso
export DB_PASS='VotreMotDePasseFort123!'
sudo -E bash deploy/oracle/init-database.sh

mysql -u eniso -p"$DB_PASS" eniso_team < database/eniso_team.sql

node database/migrate_production.js
node database/seed_bureau_accounts.js
```

Pour les migrations, le fichier `backend/.env` doit exister (étape suivante) **ou** exportez temporairement :

```bash
export DB_HOST=localhost DB_USER=eniso DB_PASSWORD="$DB_PASS" DB_NAME=eniso_team
node database/migrate_production.js
```

---

## Étape 6 — Fichier `.env` production

```bash
cp deploy/oracle/env.production.example backend/.env
nano backend/.env
```

Renseignez au minimum :

| Variable | Exemple |
|----------|---------|
| `DB_PASSWORD` | même mot de passe que `DB_PASS` |
| `JWT_SECRET` | chaîne aléatoire longue (32+ caractères) |
| `FRONTEND_URL` | `http://VOTRE_IP` ou `https://votredomaine.com` |

Générer un secret :

```bash
openssl rand -base64 48
```

---

## Étape 7 — Build et démarrage

```bash
cd ~/enisoteam
bash deploy/oracle/deploy.sh
```

Vérification locale :

```bash
curl http://127.0.0.1:5000/api/health
# → {"status":"ok","database":"connected"}
```

PM2 au démarrage du serveur :

```bash
pm2 startup
# Copiez/collez la commande sudo affichée, puis :
pm2 save
```

---

## Étape 8 — Nginx (accès web)

**Avec IP seulement** (test rapide) :

```bash
sudo cp deploy/oracle/nginx-eniso.conf /etc/nginx/sites-available/enisoteam
sudo sed -i "s/VOTRE_DOMAINE/_/g" /etc/nginx/sites-available/enisoteam
sudo ln -sf /etc/nginx/sites-available/enisoteam /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Ouvrez `http://VOTRE_IP` dans le navigateur.

**Avec un nom de domaine** (ex. `enisoteam.tn`) :

1. Chez votre registrar, créez un enregistrement **A** → IP publique Oracle.
2. Remplacez `VOTRE_DOMAINE` dans la config Nginx par votre domaine.
3. HTTPS gratuit :

```bash
sudo certbot --nginx -d votredomaine.com -d www.votredomaine.com
```

Mettez à jour `FRONTEND_URL=https://votredomaine.com` dans `backend/.env`, puis :

```bash
pm2 reload deploy/oracle/ecosystem.config.cjs --update-env
```

---

## Étape 9 — Checklist finale

- [ ] `http(s)://VOTRE_IP/api/health` → OK
- [ ] Page d’accueil du site
- [ ] Login admin `/admin/login`
- [ ] Upload image (formation, événement)
- [ ] Changer les mots de passe bureau par défaut
- [ ] Configurer SMTP (Brevo gratuit : [brevo.com](https://www.brevo.com))

---

## Mises à jour (après un push GitHub)

Sur le serveur :

```bash
cd ~/enisoteam
bash deploy/oracle/deploy.sh
```

---

## Dépannage

### « Connection refused » depuis le navigateur

→ Ports 80/443 non ouverts dans **Oracle Security List** (étape 2).

### `database: disconnected`

→ Vérifiez `backend/.env` et que MySQL tourne : `sudo systemctl status mysql`.

### Build frontend bloqué / out of memory (VM 1 Go)

→ Le script `setup-server.sh` ajoute 2 Go de swap. Relancez :

```bash
cd ~/enisoteam/frontend && npm run build
```

### Uploads / images

→ Dossier persistant : `~/enisoteam/backend/uploads` (ne pas supprimer au redéploiement).

### Logs

```bash
pm2 logs eniso-api
sudo tail -f /var/log/nginx/error.log
```

---

## Coût

**0 €** tant que vous restez dans le tier **Always Free** Oracle (1–2 VM micro + trafic raisonnable).

---

## Fichiers utiles

| Fichier | Rôle |
|---------|------|
| `deploy/oracle/setup-server.sh` | Installation initiale |
| `deploy/oracle/init-database.sh` | Création BDD MySQL |
| `deploy/oracle/deploy.sh` | Build + PM2 |
| `deploy/oracle/nginx-eniso.conf` | Reverse proxy |
| `deploy/oracle/ecosystem.config.cjs` | Config PM2 |
| `deploy/oracle/env.production.example` | Modèle `.env` |
