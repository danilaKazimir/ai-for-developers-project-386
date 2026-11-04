import { expect, test } from '@playwright/test';

test('организатор создаёт два типа, гость видит каталог, ключ не сохраняется', async ({ page }) => {
  const suffix = Date.now().toString();
  await page.goto('/calendars/new');
  await page.getByLabel('Ключ управления').fill('playwright-only-key');
  for (const [id, name, duration] of [[`b-review-${suffix}`, 'Разбор проекта', '60'], [`a-intro-${suffix}`, 'Знакомство', '45']]) {
    await page.getByLabel('Id типа события').fill(id);
    await page.getByLabel('Название', { exact: true }).fill(name);
    await page.getByLabel('Описание', { exact: true }).fill('Обсудим вашу задачу');
    await page.getByLabel('Длительность, минут').fill(duration);
    await page.getByRole('button', { name: 'Создать тип события', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Тип события создан');
    await expect(page.getByRole('link', { name: 'Публичная ссылка на тип' })).toHaveAttribute('href', `/event-types/${id}`);
  }
  await page.reload();
  await expect(page.getByLabel('Ключ управления')).toHaveValue('');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('playwright-only-key');
  await page.getByRole('link', { name: 'Каталог', exact: true }).click();
  const intro = page.getByRole('article').filter({ hasText: `a-intro-${suffix}` });
  const review = page.getByRole('article').filter({ hasText: `b-review-${suffix}` });
  await expect(intro.getByRole('heading', { name: 'Знакомство' })).toBeVisible();
  await expect(intro).toContainText('45 минут');
  await expect(review).toContainText('60 минут');
  await page.reload();
  await expect(intro).toBeVisible();
  expect(page.url()).not.toContain('playwright-only-key');
});

test('ошибки ключа и повторного id сохраняют введённые поля', async ({ page, request }) => {
  const id = `duplicate-${Date.now()}`;
  const existing = await request.post('/api/organizer/event-types', {
    headers: { Authorization: 'Bearer playwright-only-key' },
    data: { id, name: 'Существующий тип', description: '', durationMinutes: 30 },
  });
  expect(existing.status()).toBe(201);
  await page.goto('/organizer/event-types/new');
  await page.getByLabel('Ключ управления').fill('wrong');
  await page.getByLabel('Id типа события').fill(id);
  await page.getByLabel('Название', { exact: true }).fill('Новое название');
  await page.getByLabel('Описание', { exact: true }).fill('Сохранить описание');
  await page.getByRole('button', { name: 'Создать тип события', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Ключ управления не подошёл');
  await page.getByLabel('Ключ управления').fill('playwright-only-key');
  await page.getByRole('button', { name: 'Создать тип события', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Этот id уже занят');
  await expect(page.getByLabel('Название', { exact: true })).toHaveValue('Новое название');
  await expect(page.getByLabel('Описание', { exact: true })).toHaveValue('Сохранить описание');
  await page.getByLabel('Id типа события').fill(`${id}-new`);
  await page.getByRole('button', { name: 'Создать тип события', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Тип события создан');
  await page.getByRole('button', { name: 'Забыть ключ', exact: true }).click();
  await expect(page.getByLabel('Ключ управления')).toHaveValue('');
});

test('форма доступна с клавиатуры на мобильной ширине', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/calendars/new');
  await page.getByLabel('Ключ управления').focus();
  await page.keyboard.type('playwright-only-key');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Id типа события')).toBeFocused();
  await page.keyboard.type(`keyboard-${Date.now()}`);
  await page.keyboard.press('Tab');
  await page.keyboard.type('Keyboard meeting');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Description');
  await page.keyboard.press('Tab');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('45');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Создать тип события', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Тип события создан');
  const widths = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(widths[0]).toBeLessThanOrEqual(widths[1]);
});

test('граница названия применяется после удаления крайних пробелов', async ({ page }) => {
  await page.goto('/calendars/new');
  await page.getByLabel('Ключ управления').fill('playwright-only-key');
  await page.getByLabel('Id типа события').fill(`name-limit-${Date.now()}`);
  await page.getByLabel('Название', { exact: true }).fill(`  ${'n'.repeat(120)}  `);
  await page.getByRole('button', { name: 'Создать тип события', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(`${'n'.repeat(120)} · 30 минут`);
});
