/**
 * Export du carnet d'entretien en PDF, pour la revente ou le garage.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { vehicleLabel, Vehicle } from '@/lib/diagnosis';
import type { LogEntry } from '@/lib/store';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

export function logHtml(vehicle: Vehicle, log: LogEntry[]): string {
  const rows = log
    .filter((l) => l.vehicleId === vehicle.id)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (l) =>
        `<tr><td>${esc(new Date(l.date).toLocaleDateString('fr-FR'))}</td><td>${l.mileage ? `${Number(l.mileage).toLocaleString('fr-FR')} km` : ''}</td><td>${esc(l.operation)}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Carnet d'entretien</title>
<style>body{font-family:-apple-system,Roboto,Helvetica,sans-serif;color:#12181E;margin:32px}h1{font-size:22px;margin:0 0 4px}
p{color:#5A6773;margin:0 0 24px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:8px;border-bottom:1px solid #D5DCE2}
th{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#5A6773}footer{margin-top:24px;font-size:11px;color:#5A6773}</style></head>
<body><h1>Carnet d'entretien</h1><p>${esc(vehicleLabel(vehicle))}${vehicle.plate ? ` · ${esc(vehicle.plate)}` : ''}${vehicle.vin ? ` · VIN ${esc(vehicle.vin)}` : ''}</p>
<table><thead><tr><th>Date</th><th>Kilométrage</th><th>Opération</th></tr></thead><tbody>${rows || '<tr><td colspan="3">Aucune opération enregistrée.</td></tr>'}</tbody></table>
<footer>Édité avec Clé de 12 le ${new Date().toLocaleDateString('fr-FR')}. Opérations déclarées par le propriétaire.</footer></body></html>`;
}

export async function exportLog(vehicle: Vehicle, log: LogEntry[]): Promise<void> {
  const html = logHtml(vehicle, log);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Carnet d’entretien', UTI: 'com.adobe.pdf' });
  }
}
