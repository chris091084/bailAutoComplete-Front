# Documentation Déploiement Frontend - BailAutoComplete

## Stack technique

- **Framework** : Angular 19
- **Hébergement** : Vercel (gratuit)
- **CI/CD** : Vercel (intégré avec GitHub)

---

## Architecture de déploiement

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│    Frontend     │ ──── │    Backend      │ ──── │   PostgreSQL    │
│    (Vercel)     │      │    (Koyeb)      │      │    (Render)     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
     Angular              Spring Boot              PostgreSQL
```

---

## Fichiers de configuration

### 1. environment.ts (développement local)

Chemin : `src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080'
};
```

### 2. environment.prod.ts (production)

Chemin : `src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://relative-ammamaria-mundus09-e11bb300.koyeb.app'
};
```

### 3. proxy.conf.json (proxy local)

Ce fichier permet de rediriger les appels `/api` vers le backend local.

```json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug",
    "pathRewrite": {
      "^/api": ""
    }
  }
}
```

---

## Configuration des services Angular

### Exemple de service avec environnement

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RequestService {
  private apiUrl = `${environment.apiUrl}/`;

  constructor(private http: HttpClient) {}

  getAppartements(): Observable<AppartementDto[]> {
    return this.http.get<AppartementDto[]>(`${this.apiUrl}appartement`);
  }

  addAppartement(appartement: AppartementDto): Observable<AppartementDto> {
    return this.http.post<AppartementDto>(
      `${this.apiUrl}appartement`,
      appartement
    );
  }

  // ... autres méthodes
}
```

### Points importants

- **En local** : Angular utilise `environment.ts` → `http://localhost:8080`
- **En production** : Angular utilise `environment.prod.ts` → URL Koyeb
- Le proxy (`proxy.conf.json`) n'est utilisé qu'en développement local

---

## Déploiement sur Vercel

### Étapes

1. Créer un compte sur **vercel.com** (connexion GitHub)
2. Cliquer sur **Add New...** → **Project**
3. Sélectionner le repo frontend Angular
4. Vercel détecte Angular automatiquement
5. Vérifier les paramètres de build :

| Champ | Valeur |
|-------|--------|
| Framework Preset | Angular |
| Build Command | `ng build --configuration=production` |
| Output Directory | `dist/nom-du-projet/browser` |

6. Cliquer sur **Deploy**

### URL finale

```
https://bail-auto-complete-front.vercel.app
```

---

## CI/CD automatique

À chaque `git push` sur la branche `master` :
1. Vercel détecte le changement
2. Build automatique (`ng build --configuration=production`)
3. Déploiement automatique
4. Preview URL pour chaque branche

---

## Connexion Frontend ↔ Backend

### Comment ça marche

1. **En local** :
   - Frontend : `http://localhost:4200`
   - Backend : `http://localhost:8080`
   - Le proxy redirige `/api/*` vers le backend

2. **En production** :
   - Frontend : `https://bail-auto-complete-front.vercel.app`
   - Backend : `https://relative-ammamaria-mundus09-e11bb300.koyeb.app`
   - Pas de proxy, l'URL complète est utilisée

### Configuration CORS côté Backend

Le backend doit autoriser les requêtes venant du frontend. Variable d'environnement sur Koyeb :

```
CORS_ORIGIN=https://bail-auto-complete-front.vercel.app
```

---

## Commandes utiles

### Build de production en local

```bash
ng build --configuration=production
```

### Vérifier le build

```bash
ls dist/nom-du-projet/browser/
```

### Lancer en mode dev avec proxy

```bash
ng serve --proxy-config proxy.conf.json
```

---

## Troubleshooting

### Erreur 404 sur les appels API

1. Vérifier l'URL dans `environment.prod.ts`
2. Vérifier que le service utilise `environment.apiUrl`
3. Vérifier qu'il n'y a pas de `/api` en trop (le backend n'a pas ce préfixe)

### Erreur CORS 403 Forbidden

1. Vérifier que `CORS_ORIGIN` est configuré sur le backend (Koyeb)
2. L'URL doit être exacte, sans `/` à la fin :
   - ✅ `https://bail-auto-complete-front.vercel.app`
   - ❌ `https://bail-auto-complete-front.vercel.app/`

### Le build Vercel échoue

1. Vérifier les logs de build sur Vercel
2. S'assurer que le projet build en local : `ng build --configuration=production`
3. Vérifier le Output Directory

### Les appels API vont vers localhost en production

Le fichier `environment.prod.ts` n'est pas utilisé. Vérifier :
1. Que le fichier existe dans `src/environments/`
2. Que le build utilise `--configuration=production`
3. Que le service importe depuis `environment` (pas `environment.prod`)

---

## Limitations du plan gratuit Vercel

- Déploiements illimités
- Bande passante : 100 GB/mois
- Builds : 6000 minutes/mois
- Pas de mise en veille (toujours actif)

---

## Structure des URLs

| Environnement | Frontend | Backend |
|---------------|----------|---------|
| Local | `http://localhost:4200` | `http://localhost:8080` |
| Production | `https://bail-auto-complete-front.vercel.app` | `https://relative-ammamaria-mundus09-e11bb300.koyeb.app` |
