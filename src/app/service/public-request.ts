import { HttpContextToken } from '@angular/common/http';

/**
 * Marque une requête destinée à une route PUBLIQUE de l'API (le lien d'état des
 * lieux du locataire, qui s'authentifie par son jeton). L'intercepteur
 * d'authentification la laisse alors telle quelle : ni cookie de session, ni
 * tentative de rafraîchissement, ni redirection vers /login sur un 401 (un lien
 * expiré n'a rien à voir avec une session expirée).
 */
export const PUBLIC_REQUEST = new HttpContextToken<boolean>(() => false);
