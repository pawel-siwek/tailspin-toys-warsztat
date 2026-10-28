import type { GameFilters } from '../types/game';

/** Identyfikatory kategorii i wydawcy gry potrzebne do filtrowania. */
export interface FilterableGame {
    /** Identyfikator kategorii albo null, gdy gra jej nie ma. */
    categoryId: number | null;
    /** Identyfikator wydawcy albo null, gdy gra go nie ma. */
    publisherId: number | null;
}

/**
 * Sprawdza, czy gra spełnia filtry. Reguły są takie same jak w `getGames`:
 * „lub” w obrębie grupy, „i” między grupami, pusta lista oznacza brak filtra.
 *
 * @param game - Identyfikatory kategorii i wydawcy gry.
 * @param filters - Wybrane kryteria filtrowania.
 * @returns `true`, gdy gra spełnia wszystkie ustawione filtry.
 */
export function matchesFilters(game: FilterableGame, filters: GameFilters): boolean {
    const { categoryIds = [], publisherIds = [] } = filters;
    const categoryOk = categoryIds.length === 0 || (game.categoryId !== null && categoryIds.includes(game.categoryId));
    const publisherOk = publisherIds.length === 0 || (game.publisherId !== null && publisherIds.includes(game.publisherId));
    return categoryOk && publisherOk;
}
