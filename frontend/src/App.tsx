const createCalendarPath = '/calendars/new';

const iconPaths = {
  calendar: <><path d="M8 2v4m8-4v4M3 10h18" /><rect x="3" y="4" width="18" height="17" rx="3" /><path d="m8 15 3 3 5-5" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  link: <><path d="m10 13 4-4m-6 6-1 1a4.2 4.2 0 0 1-6-6l4-4a4.2 4.2 0 0 1 6 0m2 2 1-1a4.2 4.2 0 0 1 6 6l-4 4a4.2 4.2 0 0 1-6 0" transform="translate(1 1)" /></>,
  check: <path d="m5 12 4 4L19 6" />,
};

function Icon({ name, className = '' }: { name: keyof typeof iconPaths; className?: string }) {
  return (
    <svg className={`icon ${className}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {iconPaths[name]}
    </svg>
  );
}

function Brand() {
  return (
    <a className="brand" href="/" aria-label="Календарь звонков — на главную">
      <span className="brand-mark"><Icon name="calendar" /></span>
      <span>Календарь звонков</span>
    </a>
  );
}

function CreateCalendarLink({ className = '' }: { className?: string }) {
  return (
    <a className={`button button-primary ${className}`} href={createCalendarPath}>
      Создать календарь <Icon name="arrow" />
    </a>
  );
}

const exampleWeeks = [
  [null, null, null, null, null, null, 1],
  [2, 3, 4, 5, 6, 7, 8],
  [9, 10, 11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20, 21, 22],
  [23, 24, 25, 26, 27, 28, 29],
  [30, null, null, null, null, null, null],
];

function CalendarPreview() {
  return (
    <figure className="calendar-preview">
      <figcaption><span className="caption-line" /> Пример страницы записи</figcaption>
      <div className="preview-window">
        <div className="meeting-summary">
          <div className="example-organizer"><span className="avatar" aria-hidden="true">А</span> Анна · Организатор</div>
          <h2>Давайте познакомимся</h2>
          <p>Обсудим вашу задачу и наметим следующие шаги.</p>
          <div className="meeting-details">
            <span><Icon name="clock" /> 30 минут</span>
            <span><Icon name="globe" /> Europe/Moscow · UTC+3</span>
          </div>
        </div>
        <div className="example-schedule">
          <div className="example-month">
            <table className="month-grid">
              <caption>Ноябрь 2026</caption>
              <thead>
                <tr>{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <th key={day} scope="col">{day}</th>)}</tr>
              </thead>
              <tbody>
                {exampleWeeks.map((week, row) => (
                  <tr key={row}>
                    {week.map((day, column) => (
                      <td key={column}>
                        {day !== null && (
                          <span className={day === 12 ? 'example-day selected-day' : day < 12 || column > 4 ? 'example-day muted-day' : 'example-day'}>
                            {day}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="example-times">
            <p className="example-date">12 ноября</p>
            <p className="example-times-label">Свободное время</p>
            <div className="time-list">
              {['10:00', '11:30', '14:00'].map((time) => <span className="example-time" key={time}>{time}</span>)}
            </div>
          </div>
        </div>
      </div>
      <p className="preview-note"><Icon name="check" /> Гости видят только свободное время</p>
    </figure>
  );
}

const steps = [
  { icon: 'calendar', title: 'Задайте удобное время', description: 'Укажите даты, интервалы, длительность встреч и часовой пояс. Из этого сложится ваш календарь.' },
  { icon: 'link', title: 'Поделитесь ссылкой', description: 'Отправьте гостям одну ссылку в мессенджере или любым другим удобным способом.' },
  { icon: 'check', title: 'Гость выбирает время', description: 'Гость записывается на свободный слот. После подтверждения это время становится недоступно другим.' },
] as const;

function LandingPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <section className="hero container" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="small-line" /> Меньше сообщений. Больше встреч.</p>
          <h1 id="hero-title">Договоритесь о звонке <span>без лишней переписки</span></h1>
          <p className="hero-description">Вы задаёте свободное время и отправляете ссылку. Гости сами выбирают подходящий момент для встречи.</p>
          <CreateCalendarLink />
          <p className="registration-note"><Icon name="check" /> Без регистрации для вас и ваших гостей</p>
        </div>
        <CalendarPreview />
      </section>

      <section className="how-section" id="how-it-works" aria-labelledby="how-title">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Как это работает</p>
            <h2 id="how-title">Одна ссылка вместо<br />долгих согласований</h2>
            <p>От свободного времени до встречи — три простых шага.</p>
          </div>
          <ol className="steps" role="list">
            {steps.map((step, index) => (
              <li key={step.title}>
                <div className="step-top"><span className="step-icon"><Icon name={step.icon} /></span><span className="step-number" aria-hidden="true">0{index + 1}</span></div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="closing-section container" aria-labelledby="closing-title">
        <div className="closing-callout">
          <div>
            <p className="eyebrow">Время для самого важного</p>
            <h2 id="closing-title">Встречи начинаются<br />с удобного времени</h2>
            <p>Соберите свободные часы в календарь. Остальное — по ссылке.</p>
          </div>
          <CreateCalendarLink />
        </div>
      </section>
    </main>
  );
}

const messagePages = {
  create: {
    title: 'Создание календаря — Календарь звонков',
    icon: 'calendar',
    eyebrow: 'Функция в разработке',
    heading: 'Создание календаря скоро появится',
    description: 'Здесь можно будет задать доступное время и получить ссылку для записи гостей. Мы ещё работаем над этой возможностью.',
  },
  notFound: {
    title: 'Страница не найдена — Календарь звонков',
    icon: 'link',
    eyebrow: 'Страница не найдена',
    heading: 'Такой страницы нет',
    description: 'Возможно, в адресе опечатка или ссылка больше не актуальна. Начните с главной страницы.',
  },
} as const;

type MessagePageContent = (typeof messagePages)[keyof typeof messagePages];

function MessagePage({ content }: { content: MessagePageContent }) {
  return (
    <main className="message-page container" id="main-content" tabIndex={-1}>
      <section className="message-card" aria-labelledby="message-title">
        <span className="message-icon"><Icon name={content.icon} /></span>
        <p className="eyebrow">{content.eyebrow}</p>
        <h1 id="message-title">{content.heading}</h1>
        <p>{content.description}</p>
        <a className="button button-primary" href="/">Вернуться на главную <Icon name="arrow" /></a>
      </section>
    </main>
  );
}

export function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const isHomePage = pathname === '/';
  const messagePage = pathname === createCalendarPath ? messagePages.create : messagePages.notFound;

  return (
    <div className="app">
      <title>{isHomePage ? 'Календарь звонков — встречи без лишней переписки' : messagePage.title}</title>
      <a className="skip-link" href="#main-content">Перейти к содержимому</a>
      <header className="site-header container">
        <Brand />
        {isHomePage && <nav aria-label="Основная навигация"><a className="how-link" href="#how-it-works">Как это работает</a><CreateCalendarLink className="header-button" /></nav>}
      </header>
      {isHomePage ? <LandingPage /> : <MessagePage content={messagePage} />}
      <footer className="site-footer container"><span>Календарь звонков</span><p>Больше времени на разговор.</p></footer>
    </div>
  );
}

