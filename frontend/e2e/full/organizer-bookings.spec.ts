import { expect, test } from '@playwright/test';

test('полный цикл двух типов и приватный общий список с выходом и обновлением', async ({ page, request, browser }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const suffix = Date.now();
  const types = [`list-long-${suffix}`, `list-short-${suffix}`];
  await page.goto('/organizer/event-types/new');
  await page.getByLabel('Ключ управления').fill('playwright-only-key');
  for (const [index, id] of types.entries()) {
    await page.getByLabel('Id типа события').fill(id);
    await page.getByLabel('Название', { exact: true }).fill(`Формат ${index + 1} ${suffix}`);
    await page.getByLabel('Длительность, минут').fill(index === 0 ? '60' : '30');
    await page.getByRole('button', { name: 'Создать тип события', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Тип события создан');
  }
  await page.getByRole('link', { name: 'Предстоящие встречи', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Предстоящие встречи', exact: true })).toBeVisible();
  await expect(page.getByLabel('Ключ управления')).toHaveValue('playwright-only-key');
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  for (const [index, id] of types.entries()) {
    const availability = await (await request.get(`/api/event-types/${id}/slots`)).json();
    const day = availability.days.find((entry: { slots: unknown[] }) => entry.slots.length > 0);
    await guest.goto('/event-types');
    await guest.getByRole('article').filter({ hasText: id }).getByRole('link').click();
    await guest.getByRole('button', { name: day.date, exact: true }).click();
    await guest.getByRole('group', { name: 'Свободное время' }).getByRole('button').first().click();
    await guest.getByLabel('Ваше имя').fill(`Гость ${index + 1}`);
    await guest.getByLabel('Email').fill(`list-${index}-${suffix}@example.com`);
    await guest.getByLabel('Комментарий').fill(`Личный комментарий ${index + 1}`);
    await guest.getByRole('button', { name: 'Подтвердить запись' }).click();
    await expect(guest.getByRole('heading', { name: 'Встреча подтверждена' })).toBeVisible();
    await expect(guest.locator('body')).not.toContainText(`list-${1 - index}-${suffix}@example.com`);
  }
  await page.getByRole('button', { name: 'Обновить встречи' }).focus();
  await page.keyboard.press('Enter');
  for (const [index] of types.entries()) {
    const row = page.getByRole('article').filter({ hasText: `list-${index}-${suffix}@example.com` });
    await expect(row).toContainText(`Формат ${index + 1} ${suffix}`);
    await expect(row).toContainText(`Гость ${index + 1}`);
    await expect(row).toContainText(`Личный комментарий ${index + 1}`);
    await expect(row).toContainText('Europe/Moscow');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('Ключ управления').fill('wrong');
  await page.getByRole('button', { name: 'Показать встречи' }).click();
  await expect(page.getByRole('alert')).toContainText('Ключ управления не подошёл');
  await expect(page.locator('body')).not.toContainText(`list-0-${suffix}@example.com`);
  await page.getByLabel('Ключ управления').fill('playwright-only-key');
  await page.getByRole('button', { name: 'Показать встречи' }).click();
  await expect(page.locator('body')).toContainText(`list-0-${suffix}@example.com`);
  await page.getByRole('button', { name: 'Забыть ключ' }).click();
  await expect(page.getByLabel('Ключ управления')).toHaveValue('');
  await expect(page.locator('body')).not.toContainText(`list-0-${suffix}@example.com`);
  await page.goBack();
  await page.goForward();
  await expect(page.locator('body')).not.toContainText(`list-0-${suffix}@example.com`);
  await page.reload();
  await expect(page.getByLabel('Ключ управления')).toHaveValue('');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('playwright-only-key');
  await guestContext.close();
});

test('приватные встречи скрыты после отказа и поздний ответ не восстанавливает их после выхода', async ({ page, request }) => {
  const id = `private-${Date.now()}`;
  expect((await request.post('/api/organizer/event-types', {
    headers: { Authorization: 'Bearer playwright-only-key' },
    data: { id, name: id, description: '', durationMinutes: 30 },
  })).status()).toBe(201);
  const availability = await (await request.get(`/api/event-types/${id}/slots`)).json();
  const slot = availability.days.flatMap((day: { slots: { startsAt: string }[] }) => day.slots)[0];
  expect((await request.post('/api/bookings', { data: { eventTypeId: id, startsAt: slot.startsAt, guest: { name: 'Приватный гость', email: `${id}@example.com` } } })).status()).toBe(201);
  await page.goto('/organizer/bookings');
  await page.getByLabel('Ключ управления').fill('playwright-only-key');
  await page.getByRole('button', { name: 'Показать встречи' }).click();
  await expect(page.locator('body')).toContainText(`${id}@example.com`);
  await page.route('**/api/organizer/bookings', async (route) => {
    const denied = await route.fetch({ headers: { Authorization: 'Bearer wrong' } });
    await route.fulfill({ response: denied });
  });
  await page.getByRole('button', { name: 'Обновить встречи' }).click();
  await expect(page.getByRole('alert')).toContainText('Ключ управления не подошёл');
  await expect(page.locator('body')).not.toContainText(`${id}@example.com`);
  await page.unroute('**/api/organizer/bookings');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let captured!: () => void;
  const started = new Promise<void>((resolve) => { captured = resolve; });
  await page.route('**/api/organizer/bookings', async (route) => {
    const response = await route.fetch();
    captured();
    await gate;
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Повторить загрузку' }).click();
  await started;
  await expect(page.getByRole('status')).toContainText('Загружаем встречи');
  await page.getByRole('button', { name: 'Забыть ключ' }).click();
  release();
  await expect(page.getByLabel('Ключ управления')).toHaveValue('');
  await page.getByRole('link', { name: 'Создать тип события', exact: false }).click();
  await page.getByRole('link', { name: 'Предстоящие встречи', exact: true }).click();
  await expect(page.locator('body')).not.toContainText(`${id}@example.com`);
  await expect(page.getByLabel('Ключ управления')).toHaveValue('');
});

test('пустой список, ошибка загрузки и неоднозначное локальное время', async ({ page }) => {
  let state: 'empty' | 'error' | 'repeated' = 'empty';
  await page.route('**/api/organizer/bookings', async (route) => {
    if (state === 'error') return route.fulfill({ status: 503, json: { code: 'DATABASE_UNAVAILABLE', message: 'Unavailable' } });
    const base = { eventType: { id: 'repeated', name: 'Повторённый час', description: '', durationMinutes: 30 }, timezone: 'America/New_York', guest: { name: 'Гость', email: 'guest@example.com', comment: '' } };
    await route.fulfill({ json: { items: state === 'empty' ? [] : [
      { ...base, id: '00000000-0000-4000-8000-000000000001', startsAt: '2026-11-01T05:00:00Z', endsAt: '2026-11-01T05:30:00Z' },
      { ...base, id: '00000000-0000-4000-8000-000000000002', startsAt: '2026-11-01T06:00:00Z', endsAt: '2026-11-01T06:30:00Z' },
    ] } });
  });
  await page.goto('/organizer/bookings');
  await page.getByLabel('Ключ управления').fill('test-key');
  await page.getByRole('button', { name: 'Показать встречи' }).click();
  await expect(page.locator('body')).toContainText('Предстоящих встреч пока нет');
  state = 'error';
  await page.getByRole('button', { name: 'Обновить встречи' }).click();
  await expect(page.getByRole('alert')).toContainText('Не удалось загрузить встречи');
  state = 'repeated';
  await page.getByRole('button', { name: 'Повторить загрузку' }).click();
  const rows = page.getByRole('article');
  await expect(rows.nth(0)).toContainText('GMT-04:00');
  await expect(rows.nth(1)).toContainText('GMT-05:00');
});
