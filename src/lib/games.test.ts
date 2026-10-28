import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getGames,
    getAllCategories,
    getAllPublishers,
    getAllGameIds,
    getGameById,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategia', description: 'kat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Wydawca Jeden', description: 'wyd' })
        .returning({ id: publishers.id });

    // Wstawiamy tytuły w odwrotnej kolejności alfabetycznej, żeby sprawdzić sortowanie.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Gra ${String(i).padStart(2, '0')}`,
            description: `Opis ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('helpery dostępu do danych o grach', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('zwraca wszystkie gry posortowane po tytule', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Gra 01', 'Gra 02', 'Gra 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategia' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Wydawca Jeden' });
    });

    it('zwraca identyfikatory wszystkich gier posortowane po tytule', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('pobiera pojedynczą grę po id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Gra 01');
    });

    it('zwraca null dla nieistniejącej gry', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    describe('filtrowanie', () => {
        let ids: { categories: number[]; publishers: number[] };

        beforeEach(async () => {
            const cats = await db
                .insert(categories)
                .values([{ name: 'Zręcznościowe' }, { name: 'Strategia' }, { name: 'Logiczne' }])
                .returning({ id: categories.id });
            const pubs = await db
                .insert(publishers)
                .values([{ name: 'Wydawca B' }, { name: 'Wydawca A' }, { name: 'Wydawca C' }])
                .returning({ id: publishers.id });
            const [c1, c2, c3] = cats.map((c) => c.id);
            const [p1, p2, p3] = pubs.map((p) => p.id);
            ids = { categories: [c1, c2, c3], publishers: [p1, p2, p3] };
            await db.insert(games).values([
                { title: 'Alfa', description: 'a', categoryId: c1, publisherId: p1 },
                { title: 'Beta', description: 'b', categoryId: c2, publisherId: p1 },
                { title: 'Gamma', description: 'c', categoryId: c2, publisherId: p2 },
                { title: 'Delta', description: 'd', categoryId: c3, publisherId: p2 },
            ]);
        });

        /**
         * Pobiera tytuły gier dla podanych filtrów.
         *
         * @param filters - Kryteria filtrowania przekazywane do `getGames`.
         * @returns Tytuły w kolejności zwróconej przez helper.
         */
        const titles = async (filters?: Parameters<typeof getGames>[1]): Promise<string[]> =>
            (await getGames(db, filters)).map((g) => g.title);

        it('zwraca wszystkie gry bez filtrów lub z pustymi listami', async () => {
            expect(await titles()).toEqual(['Alfa', 'Beta', 'Delta', 'Gamma']);
            expect(await titles({ categoryIds: [], publisherIds: [] })).toEqual(['Alfa', 'Beta', 'Delta', 'Gamma']);
        });

        it('filtruje po jednej kategorii', async () => {
            expect(await titles({ categoryIds: [ids.categories[1]] })).toEqual(['Beta', 'Gamma']);
        });

        it('filtruje po wielu kategoriach (lub)', async () => {
            expect(await titles({ categoryIds: [ids.categories[0], ids.categories[2]] })).toEqual(['Alfa', 'Delta']);
        });

        it('filtruje po wielu wydawcach (lub)', async () => {
            expect(await titles({ publisherIds: [ids.publishers[0], ids.publishers[1]] })).toEqual([
                'Alfa',
                'Beta',
                'Delta',
                'Gamma',
            ]);
            expect(await titles({ publisherIds: [ids.publishers[1]] })).toEqual(['Delta', 'Gamma']);
        });

        it('łączy filtry kategorii i wydawcy (i)', async () => {
            expect(
                await titles({ categoryIds: [ids.categories[1]], publisherIds: [ids.publishers[1]] }),
            ).toEqual(['Gamma']);
        });

        it('zwraca pustą listę, gdy nic nie pasuje', async () => {
            expect(
                await titles({ categoryIds: [ids.categories[0]], publisherIds: [ids.publishers[1]] }),
            ).toEqual([]);
            expect(await titles({ publisherIds: [ids.publishers[2]] })).toEqual([]);
        });

        it('zwraca kategorie i wydawców posortowanych po nazwie', async () => {
            expect((await getAllCategories(db)).map((c) => c.name)).toEqual(['Logiczne', 'Strategia', 'Zręcznościowe']);
            expect((await getAllPublishers(db)).map((p) => p.name)).toEqual(['Wydawca A', 'Wydawca B', 'Wydawca C']);
        });
    });
});
