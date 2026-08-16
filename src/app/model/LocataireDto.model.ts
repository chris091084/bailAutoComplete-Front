export interface LocataireDto {
  // Absent tant que le locataire n'a pas été enregistré : c'est ce qui
  // distingue une création d'une modification côté LocatairesComponent.
  id?: number;
  nom: string;
  prenom: string;
  telephone: string | null;
  email: string | null;
  // Date de naissance au format « AAAA-MM-JJ », dont la liste tire l'âge
  // affiché. Facultative : rien ne la demande à la génération du bail, elle se
  // saisit depuis la fiche.
  dateNaissance?: string | null;
  // Profession, saisie au formulaire de bail ou sur la fiche. Facultative.
  profession?: string | null;
  // Date d'entrée dans le logement au format « AAAA-MM-JJ ». Reprise par l'API
  // de `result_form.date_from` à la création, modifiable ensuite.
  entree?: string | null;
  // Obligatoire : c'est par l'appartement qu'on remonte à son adresse et à son
  // bailleur. La colonne `appartement_id` est NOT NULL et l'API rejette un
  // locataire sans.
  appartementId: number;
  // Le result_form dont le locataire est issu, d'où vient la date de signature
  // du bail. Facultatif : les fiches créées avant la liaison n'en ont pas.
  resultFormId?: number | null;
  // Renseignés par l'API en lecture seule, jamais renvoyés au serveur.
  appartementNom?: string | null;
  // `result_form.date_from`, au format « AAAA-MM-JJ ».
  dateSignatureContrat?: string | null;
  // Montants du bail signé (`result_form`), repris comme valeurs par défaut de
  // la quittance de loyer. `null` pour les fiches sans result_form rattaché.
  loyerHorsCharges?: number | null;
  charges?: number | null;
  // Date ISO du dernier envoi de la lettre de congé, `null` si aucune n'est
  // partie. Renseignée par l'API, jamais renvoyée au serveur : elle se met à
  // jour par POST /locataire/:id/resiliation.
  resiliationEnvoyeeLe?: string | null;
  // Date de sortie du logement au format « AAAA-MM-JJ », `null` tant que le
  // locataire est en place. Renseignée par l'API, jamais renvoyée au serveur :
  // elle se met à jour par POST/DELETE /locataire/:id/sortie.
  sortie?: string | null;
  // Chambre occupée dans l'appartement, issue du result_form rattaché.
  chambre?: string | null;
  // Code couleur CSS (#RRGGBB) de la chambre, `null` si non renseigné.
  chambreCouleur?: string | null;
}
