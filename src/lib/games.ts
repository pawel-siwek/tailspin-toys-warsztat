import { and, asc, eq, inArray, type SQL } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Category, Game, GameFilters, Publisher } from '../types/game';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/**
 * Gry posortowane po tytule, opcjonalnie przefiltrowane po kategoriach i wydawcach.
 * W obrębie jednej grupy obowiązuje „lub”, a grupy łączy „i”.
 * Pusta lub nieustawiona lista oznacza brak filtra w danej grupie.
 *
 * @param db - Klient bazy danych.
 * @param filters - Kryteria filtrowania; domyślnie brak filtrów.
 * @returns Gry spełniające kryteria, posortowane po tytule.
 */
export async function getGames(db: Database, filters: GameFilters = {}): Promise<Game[]> {
    const conditions: SQL[] = [];
    if (filters.categoryIds?.length) {
        conditions.push(inArray(games.categoryId, filters.categoryIds));
    }
    if (filters.publisherIds?.length) {
        conditions.push(inArray(games.publisherId, filters.publisherIds));
    }
    const rows = await baseGamesQuery(db)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * Wszystkie gry posortowane po tytule.
 *
 * @param db - Klient bazy danych.
 * @returns Wszystkie gry.
 */
export async function getAllGames(db: Database): Promise<Game[]> {
    return getGames(db);
}

/**
 * Wszystkie kategorie posortowane po nazwie.
 *
 * @param db - Klient bazy danych.
 * @returns Kategorie w skróconej postaci.
 */
export async function getAllCategories(db: Database): Promise<Category[]> {
    return db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name));
}

/**
 * Wszyscy wydawcy posortowani po nazwie.
 *
 * @param db - Klient bazy danych.
 * @returns Wydawcy w skróconej postaci.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    return db.select({ id: publishers.id, name: publishers.name }).from(publishers).orderBy(asc(publishers.name));
}

/** Identyfikatory wszystkich gier posortowane po tytule. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** Pojedyncza gra po id albo null, gdy nie istnieje. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
