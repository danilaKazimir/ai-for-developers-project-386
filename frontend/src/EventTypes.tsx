import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getListEventTypesQueryKey, useCreateEventType, useListEventTypes } from './api/generated/calendar';
import { ApiHttpError } from './api/http';
import { CopyGuestLink } from './CopyGuestLink';

export function EventTypeCatalog() {
  const catalog = useListEventTypes();
  return (
    <main className="workspace container" id="main-content" tabIndex={-1}>
      <p className="eyebrow">Общий календарь организатора</p>
      <h1>Типы событий</h1>
      <p className="page-intro">Отправьте гостю ссылку на событие — он выберет удобное время и запишется</p>
      {catalog.isPending && <p role="status">Загружаем типы событий…</p>}
      {catalog.isError && <div role="alert"><p>Не удалось загрузить каталог.</p><button className="button" onClick={() => void catalog.refetch()}>Повторить загрузку</button></div>}
      {catalog.isSuccess && (catalog.data.items.length === 0
        ? <p className="empty-state">Типов событий пока нет. Организатор ещё не добавил встречи.</p>
        : <div className="event-grid">{catalog.data.items.map((type) => (
          <article className="event-card" key={type.id}>
            <p className="event-id">{type.id}</p>
            <h2>{type.name}</h2>
            <p className="event-description">{type.description}</p>
            <p>{type.durationMinutes} минут</p>
            <CopyGuestLink eventTypeId={type.id} />
          </article>
        ))}</div>)}
      <a className="text-link" href="/">Вернуться на главную</a>
    </main>
  );
}

function creationError(error: unknown): string {
  if (error instanceof ApiHttpError) {
    if (error.status === 409) return 'Этот id уже занят. Выберите другой id — остальные данные сохранены.';
    if (error.status === 422) return 'Проверьте поля: id, название, описание и целую длительность от 1 до 540 минут.';
    if (error.status === 503) return 'База данных временно недоступна. Повторите попытку позже.';
  }
  return 'Не удалось получить подтверждение создания. Проверьте каталог перед повторной отправкой.';
}

export function CreateEventType() {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const queryClient = useQueryClient();
  const creation = useCreateEventType({
    mutation: {
      retry: false,
      onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getListEventTypesQueryKey() }); },
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    creation.mutate({ data: { id, name: name.trim(), description, durationMinutes: Number(duration) } });
  }

  return (
    <main className="workspace container" id="main-content" tabIndex={-1}>
      <p className="eyebrow">Управление общим календарём</p>
      <h1>Создать событие</h1>
      <p className="page-intro">Задайте формат встречи и получите публичную ссылку. Все типы используют один календарь: будни, 09:00–18:00, Europe/Moscow.</p>
      <form className="event-form" onSubmit={submit}>
        <label>Id типа события
          <input readOnly={creation.isPending} required minLength={1} maxLength={64} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={id} onChange={(event) => { setId(event.target.value); creation.reset(); }} aria-describedby="id-hint" />
        </label>
        <p id="id-hint" className="field-hint">1–64 строчные латинские буквы или цифры. Между частями допустим один дефис. Id входит в ссылку и не меняется.</p>
        <label>Название
          <input readOnly={creation.isPending} required pattern="\s*\S(?:[\s\S]{0,118}\S)?\s*" title="Название: 1–120 символов без крайних пробелов" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label htmlFor="event-description">Описание</label>
        <textarea readOnly={creation.isPending} id="event-description" maxLength={2000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
        <label>Длительность, минут
          <input readOnly={creation.isPending} type="number" required min={1} max={540} step={1} value={duration} onChange={(event) => setDuration(event.target.value)} />
        </label>
        {creation.isError && <p role="alert" className="form-error">{creationError(creation.error)}</p>}
        <button className="button button-primary" disabled={creation.isPending} type="submit">{creation.isPending ? 'Создаём…' : 'Создать событие'}</button>
      </form>
      {creation.isSuccess && <section className="creation-success" role="status" aria-live="polite">
        <h2>Тип события создан</h2>
        <p>{creation.data.name} · {creation.data.durationMinutes} минут</p>
        <CopyGuestLink key={creation.data.id} eventTypeId={creation.data.id} />
        <p className="public-url">{window.location.origin}/event-types/{creation.data.id}</p>
        <a className="text-link" href="/event-types">Открыть общий каталог</a>
      </section>}
      <a className="text-link" href="/">Вернуться на главную</a>
    </main>
  );
}
