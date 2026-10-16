import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import SignaturePad from 'signature_pad';

/** Largeur maximale de la signature exportée : assez nette, bien en dessous du plafond serveur (200 Ko). */
const LARGEUR_EXPORT_MAX = 800;

/**
 * Zone de signature au doigt ou à la souris (librairie `signature_pad`).
 *
 * Émet `signatureChange` à chaque trait terminé : une image PNG (URL de données)
 * à envoyer au serveur, ou `null` quand la zone est vide ou effacée.
 */
@Component({
  selector: 'app-signature-pad',
  templateUrl: './signature-pad.component.html',
  styleUrl: './signature-pad.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SignaturePadComponent implements AfterViewInit, OnDestroy {
  readonly signatureChange = output<string | null>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private pad: SignaturePad | null = null;
  private observateur: ResizeObserver | null = null;

  readonly vide = signal(true);

  ngAfterViewInit(): void {
    const canvas = this.canvas().nativeElement;
    this.pad = new SignaturePad(canvas, { penColor: '#0a2a6b', minWidth: 0.8, maxWidth: 2.6 });
    this.ajusterTaille();

    this.pad.addEventListener('endStroke', () => this.notifier());

    // Un canvas redimensionné s'efface : on garde le tracé, et on le redessine.
    if (typeof ResizeObserver !== 'undefined') {
      this.observateur = new ResizeObserver(() => this.ajusterTaille());
      this.observateur.observe(canvas);
    }
  }

  ngOnDestroy(): void {
    this.observateur?.disconnect();
    this.pad?.off();
  }

  effacer(): void {
    this.pad?.clear();
    this.vide.set(true);
    this.signatureChange.emit(null);
  }

  /**
   * Adapte la résolution du canvas à l'écran (pixels réels, pas CSS) pour un
   * trait net sur mobile, sans en conserver une définition inutilement lourde.
   */
  private ajusterTaille(): void {
    const canvas = this.canvas().nativeElement;
    const ratio = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    const largeur = canvas.offsetWidth;
    const hauteur = canvas.offsetHeight;
    if (!largeur || !hauteur) {
      return;
    }
    if (canvas.width === Math.round(largeur * ratio) && canvas.height === Math.round(hauteur * ratio)) {
      return;
    }

    const trace = this.pad?.toData() ?? [];
    canvas.width = Math.round(largeur * ratio);
    canvas.height = Math.round(hauteur * ratio);
    canvas.getContext('2d')?.scale(ratio, ratio);
    this.pad?.clear();
    this.pad?.fromData(trace);
  }

  private notifier(): void {
    const vide = this.pad?.isEmpty() ?? true;
    this.vide.set(vide);
    this.signatureChange.emit(vide ? null : this.exporter());
  }

  /** PNG transparent, ramené à 800 px de large maximum. */
  private exporter(): string {
    const source = this.canvas().nativeElement;
    if (source.width <= LARGEUR_EXPORT_MAX) {
      return source.toDataURL('image/png');
    }

    const echelle = LARGEUR_EXPORT_MAX / source.width;
    const reduit = document.createElement('canvas');
    reduit.width = LARGEUR_EXPORT_MAX;
    reduit.height = Math.max(1, Math.round(source.height * echelle));
    reduit.getContext('2d')?.drawImage(source, 0, 0, reduit.width, reduit.height);
    return reduit.toDataURL('image/png');
  }
}
