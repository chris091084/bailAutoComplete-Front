import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Relecture du bail avant son envoi.
 *
 * Un mail parti ne se rattrape pas, et les défauts d'un bail généré sont
 * discrets : le document est donc montré tel que le locataire le recevra —
 * converti en PDF — avec au-dessus ce que le contrôle a relevé. L'aperçu et la
 * pièce jointe sont le même fichier, ce qui est lu est ce qui part.
 */
@Component({
  selector: 'app-apercu-bail-modal',
  imports: [CommonModule],
  templateUrl: './apercu-bail-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./apercu-bail-modal.component.scss'],
})
export class ApercuBailModalComponent implements OnDestroy {
  /** Le bail converti, tel qu'il partira. */
  @Input() set pdf(pdf: Blob | null) {
    this.libererApercu();

    if (pdf) {
      this.urlObjet = URL.createObjectURL(pdf);
      // Angular bloque une URL blob dans un `src` d'iframe sans ce passe-droit :
      // elle vient de nous, pas d'une saisie, rien n'est à assainir.
      this.urlApercu = this.sanitizer.bypassSecurityTrustResourceUrl(
        this.urlObjet,
      );
    }
  }

  @Input() nomFichier = '';
  /** Ce que le contrôle a relevé sur le document ; vide si tout va bien. */
  @Input() anomalies: string[] = [];
  @Input() destinataireNom = '';
  @Input() destinataireEmail: string | null = null;
  /** Un envoi en cours verrouille les boutons sans fermer la modale. */
  @Input() traitementEnCours = false;
  /** Signale que l'annexe manque : le mail ne portera que le bail. */
  @Input() avertissementAnnexe: string | null = null;
  /**
   * L'échec du dernier envoi. Il s'affiche ici et non dans la page : la modale
   * la recouvre, un message posé derrière ne serait jamais lu.
   */
  @Input() messageErreur: string | null = null;

  @Output() envoyer = new EventEmitter<void>();
  @Output() telechargerSeulement = new EventEmitter<void>();
  @Output() annuler = new EventEmitter<void>();

  urlApercu: SafeResourceUrl | null = null;
  /**
   * Cochée par l'utilisateur quand des anomalies sont listées : elles
   * n'interdisent pas l'envoi — un loyer de référence à 0 est parfois exact —
   * mais elles ne doivent pas se traverser sans les avoir lues.
   */
  relectureConfirmee = false;

  /** L'URL brute, à révoquer : `SafeResourceUrl` n'est pas une chaîne. */
  private urlObjet: string | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnDestroy(): void {
    this.libererApercu();
  }

  get peutEnvoyer(): boolean {
    if (this.traitementEnCours || !this.destinataireEmail) {
      return false;
    }

    return this.anomalies.length === 0 || this.relectureConfirmee;
  }

  get raisonEnvoiImpossible(): string | null {
    if (!this.destinataireEmail) {
      return "Aucune adresse email n'est renseignée pour ce locataire : le bail ne peut qu'être téléchargé.";
    }

    if (this.anomalies.length > 0 && !this.relectureConfirmee) {
      return 'Confirmez la relecture pour pouvoir envoyer le bail.';
    }

    return null;
  }

  onEnvoyer() {
    if (this.peutEnvoyer) {
      this.envoyer.emit();
    }
  }

  onTelecharger() {
    if (!this.traitementEnCours) {
      this.telechargerSeulement.emit();
    }
  }

  onAnnuler() {
    if (!this.traitementEnCours) {
      this.annuler.emit();
    }
  }

  private libererApercu() {
    if (this.urlObjet) {
      URL.revokeObjectURL(this.urlObjet);
      this.urlObjet = null;
    }

    this.urlApercu = null;
  }
}
