// cspell:words samesite

export function getCookie(name: string): string | undefined {
  const prefix = `${name}=`;

  const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith(prefix));

  return entry ? decodeURIComponent(entry.slice(prefix.length)) : undefined;
}

export function setCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365;

  if (value === '') {
    document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
  } else {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
  }
}
