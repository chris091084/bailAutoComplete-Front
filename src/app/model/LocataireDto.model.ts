export interface LocataireDto {
  // Absent tant que le locataire n'a pas été enregistré : c'est ce qui
  // distingue une création d'une modification côté LocatairesComponent.
  id?: number;
  nom: string;
  prenom: string;
  telephone: string | null;
  email: string | null;
  appartementId: number | null;
  // Renseigné par l'API en lecture seule, jamais renvoyé au serveur.
  appartementNom?: string | null;
}
