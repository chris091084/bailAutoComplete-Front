export enum AppartementNameEnum {
  FILATURE_4D = 'Filature 4D',
  CHATEAU_GAILLARD_17B = '17B Chateau Gaillard',
  RUE_RENE = 'Rue René',
  FILATURE_3G = 'Filature 3G',
  CHATEAU_GAILLARD_53A = '53A Chateau Gaillard',
}

export enum BailTypeEnum {
  MOBILITE = 'Mobilité',
  ETUDIANT = 'Etudiant',
  INDETERMINER = 'Indéterminé',
}

/**
 * Le cycle de vie d'une fiche locataire, du bail généré au départ du logement.
 * Contrairement aux enums ci-dessus, les valeurs ne sont pas des libellés : ce
 * sont celles que stocke et attend l'API (`GET /locataire?etat=…`), elles
 * doivent rester identiques à l'énumération `EtatLocataire` du backend.
 */
export enum EtatLocataireEnum {
  /** Le bail est généré, rien n'est signé : la fiche attend une signature. */
  CANDIDAT = 'candidat',
  /** Le bail est signé : quittances, congé et sortie deviennent possibles. */
  LOCATAIRE = 'locataire',
  /** Le logement est quitté. La date du départ est dans `sortie`. */
  SORTI = 'sorti',
}
