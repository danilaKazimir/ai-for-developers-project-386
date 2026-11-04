import { useState, type FormEvent } from 'react';
import { useListOrganizerBookings } from './api/generated/calendar';
import { ApiHttpError } from './api/http';
import { useOrganizerAccess } from './organizer-access';

function formatMoment(instant: string, timezone: string) {
  return new Intl.DateTimeFormat('ru-RU', { timeZone: timezone, year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'longOffset' }).format(new Date(instant));
}

export function OrganizerBookings() {
  const { token, revision, changeToken } = useOrganizerAccess();
  const [requestedRevision, setRequestedRevision] = useState<number | null>(token ? revision : null);
  const enabled = Boolean(token) && requestedRevision === revision;
  const meetings = useListOrganizerBookings({
    request: { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    query: {
      queryKey: ['/api/organizer/bookings', revision], enabled, retry: false,
      gcTime: 0, staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: true,
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestedRevision(revision);
    if (enabled) void meetings.refetch();
  }
  const denied = meetings.error instanceof ApiHttpError && meetings.error.status === 401;
  return (
    <main className="workspace container" id="main-content" tabIndex={-1}>
      <p className="eyebrow">Управление общим календарём</p>
      <h1>Предстоящие встречи</h1>
      <p className="page-intro">Все типы в одном списке. Уже начавшиеся встречи скрыты. Время указано в часовом поясе календаря.</p>
      <form className="event-form" onSubmit={submit}>
        <label>Ключ управления<input type="password" autoComplete="off" required value={token} onChange={(event) => { setRequestedRevision(null); changeToken(event.target.value); }} aria-describedby="key-hint" /></label>
        <p id="key-hint" className="field-hint">После обновления страницы введите ключ заново.</p>
        <button className="button button-primary" type="submit" disabled={meetings.isFetching}>Показать встречи</button>
        <button className="text-link" type="button" onClick={() => { setRequestedRevision(null); changeToken(''); }}>Забыть ключ</button>
      </form>
      {enabled && meetings.isFetching && <p role="status">Загружаем встречи…</p>}
      {enabled && meetings.isError && <div role="alert"><p>{denied ? 'Ключ управления не подошёл. Проверьте его и повторите отправку.' : 'Не удалось загрузить встречи. Повторите загрузку.'}</p><button className="button" onClick={() => void meetings.refetch()}>Повторить загрузку</button></div>}
      {enabled && meetings.isSuccess && <>
        <button className="button" disabled={meetings.isFetching} onClick={() => void meetings.refetch()}>Обновить встречи</button>
        {meetings.data.items.length === 0 ? <p className="empty-state">Предстоящих встреч пока нет.</p> : <div className="meeting-list">{meetings.data.items.map((booking) => <article className="event-card" key={booking.id}>
          <h2>{booking.eventType.name}</h2>
          <p>{booking.eventType.id} · {booking.eventType.durationMinutes} минут</p>
          <p>Начало: <time dateTime={booking.startsAt}>{formatMoment(booking.startsAt, booking.timezone)}</time></p>
          <p>Окончание: <time dateTime={booking.endsAt}>{formatMoment(booking.endsAt, booking.timezone)}</time></p>
          <p>{booking.timezone}</p>
          <p>Гость: {booking.guest.name}</p>
          <p>Email: <a href={`mailto:${booking.guest.email}`}>{booking.guest.email}</a></p>
          <p className="event-description">Комментарий: {booking.guest.comment || '—'}</p>
        </article>)}</div>}
      </>}
    </main>
  );
}
