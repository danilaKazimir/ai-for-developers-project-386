import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'America/Los_Angeles' });

for (const conflict of [false, true]) {
  test(conflict ? 'занятый после выбора слот даёт конфликт и сохраняет контакты для повторной записи' : 'гость проходит из каталога к подтверждённой встрече', async ({ page, request }) => {
    const id = `booking-${Date.now()}`;
    expect((await request.post('/api/organizer/event-types', {
      headers: { Authorization: 'Bearer playwright-only-key' },
      data: { id, name: `Встреча ${id}`, description: 'Обсудим проект', durationMinutes: 30 },
    })).status()).toBe(201);
    const calendar = await (await request.get(`/api/event-types/${id}/slots`)).json();
    const day = calendar.days.find((entry: { slots: unknown[] }) => entry.slots.length > 0);
    const selected = day.slots[0];
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/event-types');
    await page.getByRole('article').filter({ hasText: id }).getByRole('link').click();
    await page.getByRole('button', { name: day.date, exact: true }).click();
    await page.getByRole('group', { name: 'Свободное время' }).getByRole('button').first().click();
    await page.getByLabel('Ваше имя').fill('Анна');
    await page.getByLabel('Email').fill('anna@example.com');
    await page.getByLabel('Комментарий').fill('Обсудить детали');
    if (conflict) {
      expect((await request.post('/api/bookings', { data: {
        eventTypeId: id, startsAt: selected.startsAt,
        guest: { name: 'Другой гость', email: 'other@example.com' },
      } })).status()).toBe(201);
    }
    await page.getByRole('button', { name: 'Подтвердить запись' }).click();
    if (conflict) {
      await expect(page.getByRole('alert')).toContainText('Это время уже заняли. Выберите другой слот');
      await expect(page.getByRole('heading', { name: 'Выбрано время' })).toHaveCount(0);
      await expect(page.getByLabel('Ваше имя')).toHaveValue('Анна');
      await expect(page.getByLabel('Email')).toHaveValue('anna@example.com');
      await expect(page.getByLabel('Комментарий')).toHaveValue('Обсудить детали');
      const refreshed = await (await request.get(`/api/event-types/${id}/slots`)).json();
      const next = refreshed.days.find((entry: { slots: unknown[] }) => entry.slots.length > 0);
      await page.getByRole('button', { name: next.date, exact: true }).click();
      await page.getByRole('group', { name: 'Свободное время' }).getByRole('button').first().click();
      await page.getByRole('button', { name: 'Подтвердить запись' }).click();
    }
    await expect(page.getByRole('heading', { name: 'Встреча подтверждена' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText(`Встреча ${id}`);
    await expect(page.getByRole('status')).toContainText('Europe/Moscow');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
