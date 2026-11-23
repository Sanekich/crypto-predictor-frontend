import './lab.css';

type LabCard = { href: string; eyebrow: string; title: string; description: string; status: string; accent: string };

const cards: LabCard[] = [
  { href: '#/tests', eyebrow: 'VALIDATION', title: 'Тесты', description: 'Обучение и проверка старых моделей, walk-forward и regime reports.', status: 'контроль качества', accent: 'blue' },
  { href: '#/barrier', eyebrow: 'NEW LOGIC', title: 'Новая логика', description: 'Barrier-модели: что наступит первым — заметный рост или падение.', status: 'shadow-модели', accent: 'green' },
  { href: '#/volatility', eyebrow: 'VOLATILITY', title: 'Волатильность', description: 'Будет ли сильное движение в ближайшие часы — и текущий прогноз.', status: 'фильтр для сигналов', accent: 'purple' },
  { href: '#/euphoria', eyebrow: 'SENTIMENT', title: 'Эйфория и паника', description: 'Индекс перекоса толпы и что было после крайностей.', status: 'исследование', accent: 'amber' },
  { href: '#/ideas', eyebrow: 'RESEARCH LAB', title: 'Идеи', description: 'State-aware модели, shock detection, новости и будущие эксперименты.', status: 'план экспериментов', accent: 'amber' },
];

export default function LabPage() {
  return <main className="lab-page"><section className="lab-hero"><div><p className="eyebrow">ИССЛЕДОВАТЕЛЬСКАЯ ЛАБОРАТОРИЯ</p><h1>Проверяй новые идеи отдельно</h1><p>Здесь находятся все разделы обучения и экспериментов. Production-прогнозы остаются на вкладке «Обзор», а новые модели не заменяют старые автоматически.</p></div><span className="lab-badge">shadow only</span></section><section className="lab-grid">{cards.map((card) => <a className={`lab-card ${card.accent}`} href={card.href} key={card.href}><div className="lab-card-top"><span>{card.eyebrow}</span><b>Открыть →</b></div><h2>{card.title}</h2><p>{card.description}</p><small>{card.status}</small></a>)}</section><section className="lab-rules"><div><strong>Production защищён</strong><span>Эксперименты не меняют текущие прогнозы и registry старых моделей.</span></div><div><strong>Сначала метрики</strong><span>Каждый challenger проверяется по baseline, walk-forward и cost-aware результатам.</span></div><div><strong>Можно сравнивать</strong><span>История версий и карточки новых моделей доступны внутри соответствующих разделов.</span></div></section></main>;
}
