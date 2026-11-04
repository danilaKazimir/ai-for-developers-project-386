import { useEffect, useState } from 'react';
import { useGetEventTypeSlots } from './api/generated/calendar';
import { ApiHttpError } from './api/http';

function localDate(instant: number, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

function millisecondsToNextDate(timezone: string) {
  const now = Date.now();
  const today = localDate(now, timezone);
  let high = now + 3_600_000;
  while (localDate(high, timezone) === today) high += 3_600_000;
  let low = now;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (localDate(middle, timezone) === today) low = middle;
    else high = middle;
  }
  return high - now;
}

function formatTime(instant: string, timezone: string) {
  return new Intl.DateTimeFormat('ru-RU', { timeZone: timezone, hour: '2-digit', minute: '2-digit', timeZoneName: 'longOffset' }).format(new Date(instant));
}

export function SlotCalendar({ eventTypeId }: { eventTypeId: string }) {
  const calendar = useGetEventTypeSlots(eventTypeId);
  const [date, setDate] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [previousData, setPreviousData] = useState(calendar.data);
  const data = calendar.data;
  if (data !== previousData) {
    setPreviousData(data);
    if (data && ((date && !data.days.some((day) => day.date === date))
      || (start && !data.days.some((day) => day.slots.some((slot) => slot.startsAt === start))))) {
      setDate(null);
      setStart(null);
      setNotice('Окно записи обновилось. Выбранное время больше недоступно — выберите другое.');
    }
  }
  const timezone = data?.timezone;
  const refetch = calendar.refetch;
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void refetch(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', refresh);
    let timer: ReturnType<typeof setTimeout>;
    let active = true;
    function armTimer() {
      if (!timezone || !active) return;
      timer = setTimeout(() => {
        void refetch().finally(armTimer);
      }, millisecondsToNextDate(timezone));
    }
    armTimer();
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [timezone, refetch]);

  const activeDay = data?.days.find((day) => day.date === date) ?? data?.days[0];
  const selected = activeDay?.slots.find((slot) => slot.startsAt === start);
  return (
    <main className="workspace container" id="main-content" tabIndex={-1}>
      <a className="text-link" href="/event-types">← Все типы событий</a>
      {calendar.isPending && <p role="status">Загружаем календарь…</p>}
      {calendar.isError && <div role="alert">
        <h1>{calendar.error instanceof ApiHttpError && calendar.error.status === 404 ? 'Тип события не найден' : 'Не удалось загрузить календарь'}</h1>
        <p>Проверьте ссылку или повторите загрузку.</p>
        <button className="button" onClick={() => void refetch()}>Повторить загрузку</button>
      </div>}
      {data && <>
        <p className="eyebrow">Выберите время встречи</p>
        <h1>{data.eventType.name}</h1>
        <p className="page-intro">{data.eventType.description}</p>
        <p>{data.eventType.durationMinutes} минут · <span>{data.timezone}</span></p>
        <p>Доступные даты: {data.windowStartDate} — {data.days.at(-1)?.date}</p>
        {notice && <p role="status">{notice}</p>}
        {!data.days.some((day) => day.slots.length > 0) && <p className="empty-state">В ближайшие 14 дней свободного времени нет. Вернитесь позднее.</p>}
        <div className="date-list" role="group" aria-label="Даты записи">
          {data.days.map((day) => <button className="date-choice" key={day.date} aria-label={day.date} aria-pressed={day.date === activeDay?.date} onClick={() => { setDate(day.date); setStart(null); setNotice(''); }}>
            <span>{new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', day: 'numeric', month: 'short', weekday: 'short' }).format(new Date(`${day.date}T12:00:00Z`))}</span>
            <small>{day.slots.length > 0 ? 'Есть время' : 'Нет времени'}</small>
          </button>)}
        </div>
        <h2>Время на {activeDay?.date}</h2>
        {activeDay?.slots.length === 0 ? <p className="empty-state">На эту дату свободного времени нет. Выберите другую дату.</p> : <div className="slot-list" role="group" aria-label="Свободное время">
          {activeDay?.slots.map((slot) => <button className="slot-choice" key={slot.startsAt} aria-pressed={slot.startsAt === start} onClick={() => { setStart(slot.startsAt); setNotice(''); }}>{formatTime(slot.startsAt, data.timezone)}</button>)}
        </div>}
        {selected && <section className="selection-summary" role="status" aria-live="polite">
          <h2>Выбрано время</h2>
          <p>{activeDay?.date} · {formatTime(selected.startsAt, data.timezone)} — {formatTime(selected.endsAt, data.timezone)}</p>
          <p>{data.eventType.durationMinutes} минут · {data.timezone}</p>
        </section>}
      </>}
    </main>
  );
}
