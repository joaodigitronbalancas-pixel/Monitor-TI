export function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return 'Nunca';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return 'agora mesmo';
  if (diffSec < 60) return `há ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin}m`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `há ${diffHour}h`;
  const diffDays = Math.floor(diffHour / 24);
  return `há ${diffDays}d`;
}

export function getUsageColor(percent: number): {
  bar: string;
  text: string;
  badge: string;
} {
  if (percent >= 90) {
    return {
      bar: 'bg-red-500',
      text: 'text-red-400 font-bold',
      badge: 'bg-red-950/60 text-red-400 border border-red-800/40',
    };
  }
  if (percent >= 75) {
    return {
      bar: 'bg-amber-500',
      text: 'text-amber-400 font-semibold',
      badge: 'bg-amber-950/60 text-amber-400 border border-amber-800/40',
    };
  }
  return {
    bar: 'bg-stone-300',
    text: 'text-stone-300',
    badge: 'bg-stone-800 text-stone-300 border border-stone-700',
  };
}
