import { expect, test } from '@playwright/test';

test('организатор переходит к созданию календаря и возвращается на главную', async ({ page }) => {
  await page.goto('/');
  const hero = page.getByRole('region', { name: 'Договоритесь о звонке без лишней переписки', exact: true });
  await expect(hero.getByRole('heading', { level: 1 })).toBeVisible();
  await hero.getByRole('link', { name: 'Создать календарь', exact: true }).click();

  await expect(page).toHaveURL('/calendars/new');
  await expect(page.getByText('Функция в разработке', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Вернуться на главную', exact: true }).click();

  await expect(page).toHaveURL('/');
  await expect(hero.getByRole('heading', { level: 1 })).toBeVisible();
});

test('организатор может пройти основной сценарий с клавиатуры', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Перейти к содержимому', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();

  await page.keyboard.press('Tab');
  const hero = page.getByRole('region', { name: 'Договоритесь о звонке без лишней переписки', exact: true });
  await expect(hero.getByRole('link', { name: 'Создать календарь', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/calendars/new');

  for (let step = 0; step < 3; step += 1) await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Вернуться на главную', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/');
});

test('страницу создания календаря можно открыть напрямую и обновить', async ({ page }) => {
  await page.goto('/calendars/new');
  await expect(page.getByText('Функция в разработке', { exact: true })).toBeVisible();

  await page.reload();

  await expect(page).toHaveURL('/calendars/new');
  await expect(page.getByRole('heading', { level: 1, name: 'Создание календаря скоро появится', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Вернуться на главную', exact: true })).toBeVisible();
});

test('главная и заглушка работают без API и не запрашивают его', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });
  await page.route('**/api/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Договоритесь о звонке без лишней переписки', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Создать календарь', exact: true }).first().click();
  await expect(page.getByText('Функция в разработке', { exact: true })).toBeVisible();

  expect(apiRequests).toEqual([]);
});

test('кнопки в навигации и внизу главной ведут к созданию календаря', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Основная навигация', exact: true })
    .getByRole('link', { name: 'Создать календарь', exact: true }).click();
  await expect(page).toHaveURL('/calendars/new');
  await expect(page.getByText('Функция в разработке', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Вернуться на главную', exact: true }).click();
  await page.getByRole('region', { name: 'Встречи начинаются с удобного времени', exact: true })
    .getByRole('link', { name: 'Создать календарь', exact: true }).click();
  await expect(page).toHaveURL('/calendars/new');
  await expect(page.getByText('Функция в разработке', { exact: true })).toBeVisible();
});

test('пример страницы записи показывает длительность и часовой пояс без элементов записи', async ({ page }) => {
  await page.goto('/');
  const example = page.getByRole('figure').filter({ hasText: 'Пример страницы записи' });

  await expect(example.getByText('Пример страницы записи', { exact: true })).toBeVisible();
  await expect(example.getByText('30 минут', { exact: true })).toBeVisible();
  await expect(example.getByText('Europe/Moscow · UTC+3', { exact: true })).toBeVisible();
  await expect(example.getByRole('table', { name: 'Ноябрь 2026', exact: true })).toBeVisible();
  await expect(example.getByRole('button')).toHaveCount(0);
  await expect(example.getByRole('link')).toHaveCount(0);
});

for (const width of [320, 390]) {
  test(`организатор может пользоваться страницами при ширине ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const hero = page.getByRole('region', { name: 'Договоритесь о звонке без лишней переписки', exact: true });
    await expect(hero.getByRole('heading', { level: 1 })).toBeInViewport({ ratio: 1 });
    const landingWidth = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    expect(landingWidth.content).toBeLessThanOrEqual(landingWidth.viewport);

    await hero.getByRole('link', { name: 'Создать календарь', exact: true }).click();
    await expect(page.getByText('Функция в разработке', { exact: true })).toBeVisible();
    const placeholderWidth = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    expect(placeholderWidth.content).toBeLessThanOrEqual(placeholderWidth.viewport);

    await page.getByRole('link', { name: 'Вернуться на главную', exact: true }).click();
    await expect(page).toHaveURL('/');
    await expect(hero.getByRole('heading', { level: 1 })).toBeVisible();
  });
}

test('по адресу старой диагностики нет диагностической страницы', async ({ page }) => {
  await page.goto('/status');
  await expect(page.getByRole('heading', { level: 1, name: 'Такой страницы нет', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Проверить подключение', exact: true })).toHaveCount(0);

  await page.getByRole('link', { name: 'Вернуться на главную', exact: true }).click();
  await expect(page).toHaveURL('/');
});
