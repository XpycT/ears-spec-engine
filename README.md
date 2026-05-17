# EARS Spec Engine

**EARS Spec-Driven Development** — генерация требований в нотации EARS (Easy Approach to Requirements Syntax), документов дизайна и задач с отслеживанием зависимостей. Вдохновлено [Kiro Spec-Driven Development](https://x.com/mari0_zechner/status/1851757146489209018).

[![npm](https://img.shields.io/npm/v/ears-spec-engine)](https://www.npmjs.com/package/ears-spec-engine)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PI Package](https://img.shields.io/badge/pi-package-blueviolet)](https://pi.dev/packages/ears-spec-engine)

```bash
pi install npm:ears-spec-engine
```

## Возможности

Расширение добавляет в **pi** три инструмента и четыре команды для полного SDD-воркфлоу:

### 🛠️ Инструменты (LLM)

| Инструмент | Назначение |
|-----------|------------|
| `ears_validate` | Валидация EARS-грамматики: проверяет, что требования следуют UPPERCASE-правилам |
| `ears_analyze` | Анализ требований на логические конфликты, двусмысленности и неполноту |
| `ears_analyze_deps` | Анализ зависимостей задач с построением волн выполнения |

### ⌨️ Команды (пользовательские)

| Команда | Назначение |
|---------|------------|
| `/ears:quick-plan` | Быстрый трек: уточнения + генерация всех 3 документов за один проход |
| `/ears:spec` | Фаза 1: генерация EARS-требований из описания фичи |
| `/ears:analyze` | Анализ существующих требований (из файла или состояния) |
| `/ears:design` | Фаза 2: генерация дизайн-документа |
| `/ears:tasks` | Фаза 3: декомпозиция на задачи с зависимостями |
| `/ears:status` | Текущее состояние spec-движка |

### 🧩 Вложенный скилл

Расширение автоматически регистрирует скилл `ears-spec`, доступный через `/ears-spec`.

## Установка

```bash
# Глобальная установка
pi install npm:ears-spec-engine

# Локальная в проект
pi install -l npm:ears-spec-engine
```

## Использование

### Быстрый старт (все фазы за один раз)

```
/ears:quick-plan <описание фичи>
```

### Пошаговый режим

1. **Требования**: `/ears:spec <описание фичи>` — генерация user stories + EARS acceptance criteria
2. **Дизайн**: `/ears:design` — архитектура, модели, API, ошибки
3. **Задачи**: `/ears:tasks` — декомпозиция с зависимостями и волнами выполнения

### Проверка состояния

```
/ears:status
```

## Пример

Для `/ears:spec user authentication` вы получите структуру:

```
.ears-spec/user-authentication/
├── requirements.md    # User stories + EARS acceptance criteria
├── design.md          # Architecture, data flow, diagrams
└── tasks.md           # Implementation tasks with dependencies
```

### Пять паттернов EARS

| Паттерн | Шаблон | Пример |
|---------|--------|--------|
| **Ubiquitous** | `THE SYSTEM SHALL <response>` | `THE SYSTEM SHALL hash passwords using bcrypt with cost factor 12.` |
| **Event-Driven** | `WHEN <trigger>, the SYSTEM SHALL <response>` | `WHEN a payment webhook is received, the SYSTEM SHALL verify the HMAC signature.` |
| **State-Driven** | `WHILE <state>, the SYSTEM SHALL <response>` | `WHILE the system is in maintenance mode, the SYSTEM SHALL return HTTP 503.` |
| **Optional** | `WHERE <feature>, the SYSTEM SHALL <response>` | `WHERE the enterprise SSO module is enabled, the SYSTEM SHALL validate tokens against SAML IdP.` |
| **Complex** | `<condition>, the SYSTEM SHALL <response>` | `WITHIN 500ms of receiving a query, the SYSTEM SHALL return ranked results.` |

### Ключевые правила

- ✅ **SHALL** — обязательно (не `should`, `will`, `must`)
- ✅ **UPPERCASE** ключевые слова: `WHEN`, `WHILE`, `WHERE`, `WITHIN`, `THE SYSTEM SHALL`
- ❌ Запрещены: `appropriate`, `timely`, `efficient`, `user-friendly`, `properly`, `various`

## Разработка

```bash
# Клонировать
git clone git@github.com:XpycT/ears-spec-engine.git
cd ears-spec-engine

# Установка зависимостей
npm install

# Запуск тестов
npm test
```

Все тесты используют встроенный `node:test`:

```
npm test
# 68 тестов — 12 suites, all pass
```

## Архитектура

```
ears-spec-engine/
├── index.ts           # Точка входа расширения (регистрация инструментов и команд)
├── lib/
│   ├── types.ts       # TypeScript-типы
│   ├── ears.ts        # EARS-валидация, конфликты, анализ
│   └── templates.ts   # Шаблоны документов и анализ зависимостей
├── skills/
│   └── ears-spec/
│       └── SKILL.md   # Вложенный скилл
├── package.json
├── tsconfig.json
└── README.md
```

## Для чего это нужно

Spec-Driven Development с EARS-нотацией позволяет:

1. **Писать тестируемые требования** — формальная грамматика исключает двусмысленность
2. **Автоматически проверять качество** — инструменты валидируют грамматику, находят конфликты и пробелы
3. **Планировать разработку** — задачи с зависимостями и волнами выполнения
4. **Трассировать требования** — каждая задача привязана к ID требования

## Лицензия

MIT
