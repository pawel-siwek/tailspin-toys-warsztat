import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import GameCard from './GameCard.astro';
import type { Game } from '../types/game';

function makeGame(overrides: Partial<Game> = {}): Game {
    return {
        id: 1,
        title: 'Code Quest',
        description: 'Opis gry',
        publisher: { id: 1, name: 'Wydawca' },
        category: { id: 1, name: 'Kategoria' },
        starRating: 4.5,
        ...overrides,
    };
}

async function renderCard(game: Game): Promise<string> {
    const container = await AstroContainer.create();
    return container.renderToString(GameCard, { props: { game } });
}

function getRatingText(html: string): string {
    const match = html.match(/data-testid="game-card-rating"[^>]*>([\s\S]*?)<\/p>/);
    expect(match).not.toBeNull();
    return (match?.[1] ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

describe('GameCard', () => {
    it('pokazuje gwiazdki i ocenę w skali do 5, gdy ocena istnieje', async () => {
        const text = getRatingText(await renderCard(makeGame({ starRating: 4.5 })));
        expect(text).toBe('★★★★½4.5 / 5');
    });

    it('pokazuje „Brak oceny”, gdy ocena to null', async () => {
        const text = getRatingText(await renderCard(makeGame({ starRating: null })));
        expect(text).toBe('Brak oceny');
    });

    it('przycina ocenę spoza zakresu do 5', async () => {
        const text = getRatingText(await renderCard(makeGame({ starRating: 7 })));
        expect(text).toBe('★★★★★5.0 / 5');
    });
});
