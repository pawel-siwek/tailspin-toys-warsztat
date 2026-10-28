import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * Zaznacza pole wyboru filtra w wybranej grupie.
 *
 * @param page - Strona Playwright.
 * @param group - Grupa filtrów: kategorie albo wydawcy.
 * @param name - Nazwa kategorii lub wydawcy widoczna przy polu wyboru.
 */
async function checkFilter(page: Page, group: 'category' | 'publisher', name: string): Promise<void> {
  await page.getByTestId(`filter-${group}-group`).getByRole('checkbox', { name }).check();
}

/**
 * Sprawdza, że wskazane karty są niepuste i każda pokazuje jedną z podanych nazw.
 *
 * @param cards - Lokator kart gier.
 * @param testId - `data-testid` elementu z nazwą (kategorii lub wydawcy) na karcie.
 * @param names - Dozwolone nazwy.
 */
async function expectAllCardsShow(cards: Locator, testId: string, names: string[]): Promise<void> {
  const visible = await cards.locator(`[data-testid="${testId}"]`).allTextContents();
  expect(visible.length).toBeGreaterThan(0);
  for (const text of visible) {
    expect(names).toContain(text.trim());
  }
}

test.describe('Filtrowanie gier', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('pokazuje wszystkie gry, gdy żaden filtr nie jest wybrany', async ({ page }) => {
    const total = await page.getByTestId('game-card').count();
    await expect(page.getByTestId('game-card').locator('visible=true')).toHaveCount(total);
    await expect(page.getByTestId('filter-count')).toHaveText(`Wyświetlono ${total} z ${total} gier`);
  });

  test('filtruje po jednej kategorii', async ({ page }) => {
    await checkFilter(page, 'category', 'Strategia');

    const cards = page.getByTestId('game-card').locator('visible=true');
    await expectAllCardsShow(cards, 'game-category', ['Strategia']);
    await expect(page.getByTestId('filter-count')).toContainText(`Wyświetlono ${await cards.count()} z`);
  });

  test('filtruje po wielu kategoriach', async ({ page }) => {
    await checkFilter(page, 'category', 'Strategia');
    await checkFilter(page, 'category', 'Przygoda');

    const cards = page.getByTestId('game-card').locator('visible=true');
    await expectAllCardsShow(cards, 'game-category', ['Strategia', 'Przygoda']);
    const shown = await cards.locator('[data-testid="game-category"]').allTextContents();
    expect(new Set(shown.map((text) => text.trim()))).toEqual(new Set(['Strategia', 'Przygoda']));
  });

  test('filtruje po wielu wydawcach', async ({ page }) => {
    await checkFilter(page, 'publisher', 'CodeForge Studios');
    await checkFilter(page, 'publisher', 'GitHub Games');

    const cards = page.getByTestId('game-card').locator('visible=true');
    await expectAllCardsShow(cards, 'game-publisher', ['CodeForge Studios', 'GitHub Games']);
    const shown = await cards.locator('[data-testid="game-publisher"]').allTextContents();
    expect(new Set(shown.map((text) => text.trim()))).toEqual(new Set(['CodeForge Studios', 'GitHub Games']));
  });

  test('łączy filtry kategorii i wydawcy', async ({ page }) => {
    await checkFilter(page, 'category', 'Akcja');
    await checkFilter(page, 'publisher', 'CodeForge Studios');

    const cards = page.getByTestId('game-card').locator('visible=true');
    await expectAllCardsShow(cards, 'game-category', ['Akcja']);
    await expectAllCardsShow(cards, 'game-publisher', ['CodeForge Studios']);
  });

  test('pokazuje pusty stan, gdy żadna gra nie pasuje', async ({ page }) => {
    await test.step('Usuń kategorię ze wszystkich kart, żeby wymusić brak wyników', async () => {
      await page.getByTestId('game-card').evaluateAll((cards) => {
        cards.forEach((card) => card.setAttribute('data-category-id', ''));
      });
    });

    await test.step('Wybierz kategorię', async () => {
      await checkFilter(page, 'category', 'Strategia');
    });

    await test.step('Sprawdź pusty stan i licznik', async () => {
      await expect(page.getByTestId('empty-state-text')).toHaveText('Żadna gra nie pasuje do wybranych filtrów.');
      await expect(page.getByTestId('games-grid')).toBeHidden();
      await expect(page.getByTestId('filter-count')).toContainText('Wyświetlono 0 z');
    });
  });

  test('przycisk „Wyczyść filtry” przywraca wszystkie gry', async ({ page }) => {
    const total = await page.getByTestId('game-card').count();
    await checkFilter(page, 'category', 'Strategia');
    await expect(page.getByTestId('game-card').locator('visible=true')).not.toHaveCount(total);

    await page.getByTestId('filter-clear').click();

    await expect(page.getByTestId('game-card').locator('visible=true')).toHaveCount(total);
    await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(0);
  });

  test('nie zmienia adresu URL po wybraniu filtrów', async ({ page }) => {
    await checkFilter(page, 'category', 'Strategia');
    await checkFilter(page, 'publisher', 'GitHub Games');

    await expect(page).toHaveURL('/');
  });

  test('obsługuje filtry z klawiatury i pokazuje fokus', async ({ page }) => {
    const firstCategory = page.getByTestId('filter-category-group').getByRole('checkbox').first();

    await firstCategory.focus();
    await expect(firstCategory).toBeFocused();
    await page.keyboard.press('Space');

    await expect(firstCategory).toBeChecked();
    await expect(firstCategory.locator('xpath=ancestor::label')).toHaveClass(/focus-within:ring-2/);
  });
});
