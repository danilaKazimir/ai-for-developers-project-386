import { useGetHealth } from './api/generated/calendar';
import { ApiHttpError } from './api/http';

export function App() {
  const health = useGetHealth();
  let message = 'Проверяем соединение с сервером и базой данных…';
  if (health.isSuccess) message = 'Сервер и база данных доступны.';
  if (health.isError) {
    message = health.error instanceof ApiHttpError && health.error.status === 503
      ? 'Сервер доступен, но соединение с базой данных отсутствует.'
      : 'Не удалось связаться с сервером. Проверьте, что он запущен.';
  }

  return (
    <main className="page">
      <header className="brand"><span className="brand-icon" aria-hidden="true">К</span> Календарь звонков</header>
      <section className="card" aria-labelledby="title">
        <p className="eyebrow">СРЕДА РАЗРАБОТКИ</p>
        <h1 id="title">Начало положено</h1>
        <p className="intro">Здесь появится запись на встречи. Пока проверим, что приложение готово к работе.</p>
        <div className={`connection ${health.isSuccess ? 'success' : health.isError ? 'error' : ''}`} role="status" aria-live="polite">
          <span className="indicator" aria-hidden="true" />
          <p>{message}</p>
        </div>
        <button type="button" disabled={health.isFetching} onClick={() => { void health.refetch(); }}>
          {health.isFetching ? 'Проверяем…' : 'Проверить подключение'}
        </button>
      </section>
      <footer>Каркас приложения · версия 0.1.0</footer>
    </main>
  );
}

