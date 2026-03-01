// html2canvas chargé à la demande pour ne pas alourdir le bundle initial

/** Génère un texte de rapport journalier partageable */
export function buildReportText(
  totalCarbs: number,
  dailyGoal: number,
  meals: { date: string; carbs: number; details: string; category?: string }[],
): string {
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const status = totalCarbs > dailyGoal ? '⚠️ Quota dépassé' : totalCarbs > dailyGoal * 0.9 ? '🟡 Proche du quota' : '✅ Dans l\'objectif';
  const lines = meals.map(m => {
    const time = new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const label = m.details.length > 40 ? m.details.substring(0, 40) + '…' : m.details;
    return `  • ${time} — ${label} (${m.carbs}g)`;
  });
  return [
    `📊 CarbTracker — ${date}`,
    `Glucides : ${totalCarbs}g / ${dailyGoal}g  ${status}`,
    '',
    lines.length > 0 ? 'Repas :' : 'Aucun repas enregistré.',
    ...lines,
    '',
    'Partagé depuis CarbTracker',
  ].join('\n');
}

/**
 * Partage le rapport journalier.
 * Essaie : PNG via html2canvas → navigator.share(files) → téléchargement PNG → navigator.share(text) → clipboard.
 * Throws 'CLIPBOARD_COPIED' si le presse-papiers est utilisé en dernier recours.
 */
export async function shareReport(
  reportElement: HTMLElement,
  title: string,
  textFallback: string,
): Promise<'shared' | 'downloaded' | 'clipboard'> {
  // ── 1. Capture PNG ────────────────────────────────────────────────────────
  let pngBlob: Blob | null = null;
  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(reportElement, {
      backgroundColor: '#F8FAFC',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    pngBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  } catch {
    /* html2canvas failed — fallback to text */
  }

  if (pngBlob) {
    const filename = `carbtracker-${new Date().toISOString().split('T')[0]}.png`;
    const file = new File([pngBlob], filename, { type: 'image/png' });

    // ── 2a. Share PNG (mobile/PWA) ──────────────────────────────────────────
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title, files: [file] });
      return 'shared';
    }

    // ── 2b. Télécharger PNG (desktop) ───────────────────────────────────────
    const url = URL.createObjectURL(pngBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  }

  // ── 3. Partage texte ───────────────────────────────────────────────────────
  if (navigator.share) {
    try {
      await navigator.share({ title, text: textFallback });
      return 'shared';
    } catch {
      /* user cancelled or not supported */
    }
  }

  // ── 4. Presse-papiers ──────────────────────────────────────────────────────
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(textFallback);
    return 'clipboard';
  }

  return 'clipboard';
}
