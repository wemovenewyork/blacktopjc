import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import { Share, Platform } from 'react-native';
import { Game } from '@/types';
import { format } from 'date-fns';

export function getGameDeepLink(gameId: string): string {
  return Linking.createURL(`game/${gameId}`);
}

export function getGameWebLink(shareToken: string): string {
  return `https://blacktopjc.app/game/${shareToken}`;
}

export async function shareGame(game: Game & { court?: any }) {
  const courtName = game.court?.name ?? 'Jersey City';
  const time = format(new Date(game.scheduled_at), 'EEE MMM d, h:mm a');
  const link = getGameWebLink(game.share_token);

  const message = `🏀 Join my pickup run!\n\n${game.format} @ ${courtName}\n${time}\nELO: ${game.elo_band}\n\n${link}`;

  try {
    await Share.share({ message, url: link });
  } catch (err) {
    console.warn('Share failed:', err);
  }
}

export function getWhatsAppLink(message: string): string {
  const encoded = encodeURIComponent(message);
  return `whatsapp://send?text=${encoded}`;
}
