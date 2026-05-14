import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, input, output, signal} from '@angular/core';

/**
 * Countdown banner used during quiz play (and any future preview /
 * exam summary). The parent owns the source of truth — typically the
 * backend-issued ``ended_at`` ISO timestamp on the active quiz — and
 * passes it in via the ``endedAt`` input. The component:
 *
 * - re-renders every second while the quiz is active;
 * - applies a danger style under ``dangerThresholdSeconds``
 *   (default: 30 s);
 * - emits ``expired`` exactly once when the deadline is crossed,
 *   leaving the parent free to handle auto-submit / redirect.
 *
 * No timer fires when ``endedAt`` is null/invalid or ``active``
 * is false — useful for review mode where the deadline is in the
 * past but we still want the same visual frame.
 */
@Component({
  selector: 'app-quiz-countdown',
  imports: [],
  templateUrl: './quiz-countdown.html',
  styleUrl: './quiz-countdown.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizCountdownComponent implements OnInit {
  readonly endedAt = input<string | null | undefined>(null);
  readonly active = input<boolean>(true);
  readonly labelRemaining = input<string>('');
  readonly labelAutoClosing = input<string | null>(null);
  readonly autoClosing = input<boolean>(false);
  readonly dangerThresholdSeconds = input<number>(30);

  readonly expired = output<void>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly remainingSeconds = signal<number | null>(null);
  private intervalId: number | null = null;
  private didEmitExpired = false;

  readonly display = computed<string>(() => {
    const value = this.remainingSeconds();
    if (value === null) {
      return '--:--';
    }
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = value % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  });

  readonly danger = computed<boolean>(() => {
    const value = this.remainingSeconds();
    if (value === null) {
      return false;
    }
    return value <= this.dangerThresholdSeconds();
  });

  readonly visible = computed<boolean>(() => {
    const ended = this.endedAt();
    return this.active() && typeof ended === 'string' && ended.length > 0;
  });

  constructor() {
    // Inputs may change at runtime (e.g. the parent reloads the quiz
    // session after an autosave). Recompute the deadline + timer
    // whenever the relevant inputs flip.
    effect(() => {
      const ended = this.endedAt();
      const active = this.active();
      this.clearInterval();
      this.didEmitExpired = false;
      if (!active || !ended) {
        this.remainingSeconds.set(null);
        return;
      }
      this.tick(ended);
      this.intervalId = window.setInterval(() => this.tick(ended), 1000);
    });
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.clearInterval());
  }

  private tick(endedAt: string): void {
    const target = Date.parse(endedAt);
    if (!Number.isFinite(target)) {
      this.remainingSeconds.set(null);
      this.clearInterval();
      return;
    }
    const seconds = Math.max(0, Math.ceil((target - Date.now()) / 1000));
    this.remainingSeconds.set(seconds);
    if (seconds <= 0 && !this.didEmitExpired) {
      this.didEmitExpired = true;
      this.clearInterval();
      this.expired.emit();
    }
  }

  private clearInterval(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
