import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  input,
  output,
} from '@angular/core';

import { VuePhoto } from '../hors-ligne/photo-locale';

/**
 * Visionneuse plein écran : une photo à la fois, flèches pour passer à la
 * suivante, Échap ou clic sur le fond pour fermer.
 */
@Component({
  selector: 'app-photo-viewer',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div
      class="edl-visionneuse"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="'Photo ' + (index() + 1) + ' sur ' + photos().length"
      (click)="fermer.emit()"
    >
      <button type="button" class="edl-visionneuse__fermer" aria-label="Fermer" (click)="fermer.emit()">
        <svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>

      @if (photo(); as photo) {
        <img class="edl-visionneuse__image" [src]="photo.src" [alt]="'Photo ' + (index() + 1)" (click)="$event.stopPropagation()" />
      }

      @if (photos().length > 1) {
        <button type="button" class="edl-visionneuse__nav edl-visionneuse__nav--precedent" aria-label="Photo précédente" (click)="aller(-1, $event)">‹</button>
        <button type="button" class="edl-visionneuse__nav edl-visionneuse__nav--suivant" aria-label="Photo suivante" (click)="aller(1, $event)">›</button>
      }
    </div>
  `,
  styles: `
    .edl-visionneuse {
      position: fixed;
      inset: 0;
      z-index: 1050;
      display: grid;
      place-items: center;
      background: rgb(0 0 0 / 92%);
    }
    .edl-visionneuse__image {
      max-width: 100vw;
      max-height: 100dvh;
      object-fit: contain;
    }
    .edl-visionneuse__fermer,
    .edl-visionneuse__nav {
      position: absolute;
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border: 0;
      border-radius: 50%;
      background: rgb(255 255 255 / 18%);
      color: #fff;
      font-size: 2rem;
      line-height: 1;
    }
    .edl-visionneuse__fermer { top: 0.75rem; right: 0.75rem; }
    .edl-visionneuse__nav { top: 50%; transform: translateY(-50%); }
    .edl-visionneuse__nav--precedent { left: 0.5rem; }
    .edl-visionneuse__nav--suivant { right: 0.5rem; }
  `,
})
export class PhotoViewerComponent implements OnInit {
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly photos = input.required<VuePhoto[]>();
  readonly index = input.required<number>();
  readonly changer = output<number>();
  readonly fermer = output<void>();

  readonly photo = computed(() => this.photos()[this.index()] ?? null);

  ngOnInit(): void {
    // Le focus entre dans la boîte de dialogue, pour que le clavier y reste.
    queueMicrotask(() =>
      this.hote.nativeElement.querySelector<HTMLElement>('button')?.focus(),
    );
  }

  aller(pas: number, evenement: Event): void {
    evenement.stopPropagation();
    const total = this.photos().length;
    this.changer.emit((this.index() + pas + total) % total);
  }

  @HostListener('document:keydown', ['$event'])
  surTouche(evenement: KeyboardEvent): void {
    if (evenement.key === 'Escape') {
      this.fermer.emit();
    } else if (evenement.key === 'ArrowRight' && this.photos().length > 1) {
      this.aller(1, evenement);
    } else if (evenement.key === 'ArrowLeft' && this.photos().length > 1) {
      this.aller(-1, evenement);
    }
  }
}
