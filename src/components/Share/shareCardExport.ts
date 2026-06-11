// ---------------------------------------------------------------------------
// shareCardExport — html-to-image wrapper + clipboard API.
// Captures the off-screen ShareCard node and downloads / copies as PNG.
// ---------------------------------------------------------------------------

import { toPng } from "html-to-image";

const CARD_W = 1080;
const CARD_H = 1920;

export interface ExportOptions {
  year?: string | number;
}

/**
 * Download the share card as a PNG file.
 * @param node The off-screen ShareCard DOM element.
 * @param options.year The year string for the filename (default: current year).
 */
export async function downloadShareCard(
  node: HTMLElement,
  options: ExportOptions = {},
): Promise<void> {
  const year = options.year ?? new Date().getFullYear();
  const filename = `ai-wrapped-${year}.png`;

  const dataUrl = await toPng(node, {
    width: CARD_W,
    height: CARD_H,
    style: {
      // Ensure the node is rendered at correct size regardless of off-screen state
      transform: "scale(1)",
    },
  });

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

/**
 * Copy the share card image to the clipboard using ClipboardItem + canvas.toBlob.
 * Returns true on success, false if the Clipboard API is unavailable.
 */
export async function copyShareCardToClipboard(
  node: HTMLElement,
): Promise<boolean> {
  if (!("ClipboardItem" in window) || !navigator.clipboard?.write) {
    return false;
  }

  const dataUrl = await toPng(node, {
    width: CARD_W,
    height: CARD_H,
  });

  // Convert data URL to Blob
  const res = await fetch(dataUrl);
  const blob = await res.blob();

  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}
