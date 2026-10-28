import { describe, it, expect } from 'vitest';
import { matchesFilters, type FilterableGame } from './filters';

const game: FilterableGame = { categoryId: 1, publisherId: 10 };

describe('matchesFilters', () => {
    it.each([
        ['brak filtrów', {}, true],
        ['puste listy', { categoryIds: [], publisherIds: [] }, true],
        ['pasująca kategoria', { categoryIds: [1, 2] }, true],
        ['niepasująca kategoria', { categoryIds: [2] }, false],
        ['pasujący wydawca', { publisherIds: [10, 11] }, true],
        ['niepasujący wydawca', { publisherIds: [11] }, false],
        ['pasująca kombinacja', { categoryIds: [1], publisherIds: [10] }, true],
        ['pasująca kategoria, niepasujący wydawca', { categoryIds: [1], publisherIds: [11] }, false],
    ])('zwraca wynik dla przypadku: %s', (_name, filters, expected) => {
        expect(matchesFilters(game, filters)).toBe(expected);
    });

    it('odrzuca grę bez kategorii, gdy filtr kategorii jest ustawiony', () => {
        expect(matchesFilters({ categoryId: null, publisherId: 10 }, { categoryIds: [1] })).toBe(false);
    });
});
