import { HttpErrorResponse } from '@angular/common/http';

/**
 * Traduit un échec HTTP en une phrase affichable. Le message de l'API est
 * repris quand elle en donne un : c'est lui qui dit ce qui manque, là où le
 * statut seul laisserait l'utilisateur deviner.
 *
 * `contexte` décrit l'action qui a échoué (« Le bail n'a pas pu être généré »)
 * et se suffit à lui-même : une erreur sans détail exploitable reste lisible.
 */
export function messageErreurHttp(erreur: unknown, contexte: string): string {
  if (!(erreur instanceof HttpErrorResponse)) {
    // Une exception levée pendant le remplissage du document, par exemple : son
    // message technique n'apprendrait rien, le contexte suffit.
    return `${contexte}. Réessayez, et si le problème persiste signalez-le.`;
  }

  if (erreur.status === 0) {
    return `${contexte} : le serveur est injoignable. Vérifiez votre connexion puis réessayez.`;
  }

  if (erreur.status === 401 || erreur.status === 403) {
    return `${contexte} : votre session a expiré, reconnectez-vous.`;
  }

  const detail =
    typeof erreur.error?.message === 'string' ? erreur.error.message : null;

  return detail
    ? `${contexte} : ${detail}`
    : `${contexte} (erreur ${erreur.status}).`;
}
