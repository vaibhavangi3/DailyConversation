import type { LeaderboardEntry } from '../types/api';

export function providerLabel(provider: string): string {
  if (provider === 'OpenAI') return 'ChatGPT';
  if (provider === 'Google') return 'Gemini';
  if (provider === 'Anthropic') return 'Claude';
  return provider;
}

export function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatDay(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

export function formatMinutes(minutes: number): { hours: number; mins: string } {
  const hours = Math.floor(minutes / 60);
  const mins = String(minutes % 60).padStart(2, '0');
  return { hours, mins };
}

export function leaderboardMetric(item: LeaderboardEntry, sort: string): string {
  if (sort === 'latest') return formatDate(item.importedAt);
  if (sort === 'input_tokens') return `${item.inputTokens.toLocaleString()} in tokens`;
  if (sort === 'output_tokens') return `${item.outputTokens.toLocaleString()} out tokens`;
  if (sort === 'effort') return `${item.effortScore}/100 effort`;
  return `${item.estimatedMinutes} min`;
}
