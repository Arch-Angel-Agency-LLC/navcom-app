/**
 * Reading a pairing code off somebody else's screen.
 *
 * Uses the browser's own `BarcodeDetector` where it exists — Chrome on Android, and Safari
 * from 17. **No decoder is shipped.** A QR decoder is a few hundred kilobytes of image
 * processing, and this app has a device floor of a prepaid Android 8; carrying that for a
 * once-per-friendship interaction is not a trade worth making.
 *
 * Where it does not exist, the paste field is the answer and the screen says so plainly
 * rather than offering a camera button that does nothing.
 */

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

function detector(): BarcodeDetectorCtor | null {
  const ctor = (globalThis as Record<string, unknown>)['BarcodeDetector'];
  return typeof ctor === 'function' ? (ctor as BarcodeDetectorCtor) : null;
}

/** Whether this browser can scan at all. Asked before a camera button is offered. */
export function canScan(): boolean {
  return detector() !== null && typeof navigator !== 'undefined' && !!navigator.mediaDevices;
}

export class ScanError extends Error {}

export interface Scanner {
  /** Resolves with the first code seen, or rejects if it is stopped or fails. */
  found: Promise<string>;
  stop(): void;
}

/**
 * Opens the rear camera and watches for a code.
 *
 * The caller supplies the `<video>`, because a store has no business creating DOM. The
 * stream is stopped on every exit path — a camera left running is both a battery drain and
 * a light on somebody's phone that they did not ask for.
 */
export async function scan(video: HTMLVideoElement): Promise<Scanner> {
  const Ctor = detector();
  if (!Ctor) throw new ScanError('This browser cannot scan codes.');

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
  } catch {
    // Denied, or no camera. Both mean the same thing to the operator: type it instead.
    throw new ScanError('No camera. Paste their code instead.');
  }

  video.srcObject = stream;
  await video.play();

  const barcode = new Ctor({ formats: ['qr_code'] });
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const halt = () => {
    stopped = true;
    if (timer) clearInterval(timer);
    for (const track of stream.getTracks()) track.stop();
    video.srcObject = null;
  };

  const found = new Promise<string>((resolve, reject) => {
    timer = setInterval(() => {
      if (stopped) return;
      barcode
        .detect(video)
        .then((codes) => {
          const first = codes[0]?.rawValue;
          if (!first) return;
          halt();
          resolve(first);
        })
        .catch(() => {
          // A frame that will not decode is the normal case, not an error. Only a stopped
          // scanner is a failure.
        });
    }, 300);
  });

  found.catch(() => halt());
  return { found, stop: halt };
}

/**
 * Pulls a pubkey out of whatever was scanned or pasted.
 *
 * Accepts a bare key, a pairing link, or a link with anything else around it, because a
 * person pasting from a messaging app brings the surrounding text with them.
 */
export function pubkeyFrom(text: string): string | null {
  const match = text.trim().toLowerCase().match(/[0-9a-f]{64}/);
  return match ? match[0] : null;
}
