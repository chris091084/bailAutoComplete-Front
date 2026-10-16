import { ElementDto, EtatDesLieuxDto } from './etat-des-lieux.model';

/** Jeux de données des tests : un élément et un document complets, surchargeables. */
export function creerElement(surcharge: Partial<ElementDto> = {}): ElementDto {
  return {
    id: 'el-1',
    nom: 'Murs',
    ordre: 0,
    etatBailleur: 'BON',
    commentaireBailleur: null,
    etatLocataire: null,
    commentaireLocataire: null,
    dateModifLocataire: null,
    statutValidation: 'a_verifier',
    updatedAt: '2026-10-15T10:00:00.000Z',
    photos: [],
    ...surcharge,
  };
}

export function creerDocument(
  surcharge: Partial<EtatDesLieuxDto> = {},
  elements: ElementDto[] = [
    creerElement({ id: 'el-1', nom: 'Murs' }),
    creerElement({ id: 'el-2', nom: 'Sols', ordre: 1 }),
  ],
): EtatDesLieuxDto {
  return {
    id: 'edl-1',
    type: 'sortie',
    statut: 'draft',
    dateCreation: '2026-10-15T09:00:00.000Z',
    dateSignature: null,
    referenceDisponible: true,
    infos: { adresse: '1 rue Test', chauffage: 'Gaz (collectif)', clesRemises: null },
    locataire: { prenom: 'Léa', nom: 'Testeur' },
    bailleur: { nom: 'Bailleur Test', email: 'b@test.fr', telephone: '0102030405' },
    lienExpireLe: '2026-11-15T09:00:00.000Z',
    conservationAnnees: 3,
    pieces: [{ id: 'p-1', nom: 'Chambre 4', ordre: 0, elements }],
    ...surcharge,
  };
}
