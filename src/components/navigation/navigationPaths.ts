const internalOrigin = "https://trpg.invalid";

export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  if ([...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return null;

  const { origin, pathname, search, hash } = new URL(value, internalOrigin);
  if (origin !== internalOrigin || pathname.startsWith("//")) return null;
  return `${pathname}${search}${hash}`;
}

export function withOrigin(destination: string, origin: string | null | undefined): string {
  const safeOrigin = safeInternalPath(origin);
  if (!safeOrigin) return destination;

  const target = new URL(destination, internalOrigin);
  target.searchParams.set("from", safeOrigin);
  return `${target.pathname}${target.search}${target.hash}`;
}

export function readOrigin(search: string): string | null {
  return safeInternalPath(new URLSearchParams(search).get("from"));
}

function safeAuthDestination(value: string | null | undefined): string | null {
  const target = safeInternalPath(value);
  if (!target) return null;
  try {
    const pathname = decodeURI(new URL(target, internalOrigin).pathname);
    return /^\/(login|register)\/?$/i.test(pathname) ? null : target;
  } catch {
    return null;
  }
}

export function authPath(route: "/login" | "/register", next: string | null | undefined): string {
  const target = safeAuthDestination(next);
  return target ? `${route}?${new URLSearchParams({ next: target })}` : route;
}

export function authDestination(value: string | null | undefined): string {
  return safeAuthDestination(value) ?? "/teams";
}

export function characterListPath(page: number): string {
  return page > 1 ? `/characters?page=${page}` : "/characters";
}

export function readCharacterListPage(search: string): number {
  const page = Number(new URLSearchParams(search).get("page"));
  return Number.isSafeInteger(page) && page > 1 ? page : 1;
}

export function characterParent(search: string, mayOpenDashboard: boolean): string | null {
  const origin = readOrigin(search);
  if (!origin) return null;
  const url = new URL(origin, internalOrigin);
  const pathname = url.pathname.replace(/\/$/, "");
  if (pathname === "/teams" || (pathname === "/dashboard" && mayOpenDashboard)) return pathname;
  if (pathname === "/characters") return characterListPath(readCharacterListPage(url.search));
  if (/^\/teams\/(?!create$)[^/]+$/i.test(pathname)) {
    return withOrigin(pathname, mayOpenDashboard && readOrigin(url.search) === "/dashboard" ? "/dashboard" : null);
  }
  return null;
}

type CharacterModule = "light-book" | "deck";

export function characterPath(slug: string, parent?: string | null, module?: CharacterModule): string {
  return withOrigin(`/characters/${encodeURIComponent(slug)}${module ? `#${module}` : ""}`, parent);
}

export function characterToolReturn(search: string, mayOpenDashboard: boolean, module: CharacterModule, expectedSlug?: string): string | null {
  const origin = readOrigin(search);
  if (!origin) return null;

  const { pathname, search: parentSearch } = new URL(origin, internalOrigin);
  const segment = /^\/characters\/([^/]+)\/?$/i.exec(pathname)?.[1];
  if (!segment) return null;
  try {
    const slug = decodeURIComponent(segment);
    if (slug.toLowerCase() === "new" || slug.includes("/") || (expectedSlug && slug !== expectedSlug)) return null;
    return characterPath(slug, characterParent(parentSearch, mayOpenDashboard), module);
  } catch {
    return null;
  }
}
