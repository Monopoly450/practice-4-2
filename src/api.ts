import { Book } from './task1-types';

// Адрес личного ресурса на сервере
const API_URL = 'https://6afd86772a9c141d36b8a162.mockapi.io/api/books';

// DTO — «транспортный» формат данных: что реально отдаёт сервер
interface BookDTO {
  id: string;
  title: string;
  author: string;
  year?: number;
  rating?: number;
}

// Маппинг: сервер -> приложение
function mapFromServer(dto: BookDTO): Book {
  return {
    id: dto.id,
    title: dto.title,
    authors: [dto.author],
    year: dto.year,
    rating: dto.rating,
  };
}

// Маппинг: приложение -> сервер
function mapToServer(book: Book): BookDTO {
  return {
    id: book.id,
    title: book.title,
    author: book.authors[0] ?? '',
    year: book.year,
    rating: book.rating,
  };
}

// Загрузка книг: настоящий GET-запрос к серверу
export async function fetchBooks(): Promise<Book[]> {
  // 1. Отправляем запрос и получаем «конверт» Response
  const response = await fetch(API_URL);

  // 2. Проверяем статус: 404 и 500 в catch не попадут,
  //    поэтому бросаем ошибку сами
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  // 3. Читаем тело ответа: json() асинхронный, нужен await
  const dtos: BookDTO[] = await response.json();

  // 4. Преобразуем каждый DTO во внутренний формат Book
  return dtos.map(mapFromServer);
}

// Создание книги: POST-запрос одной записи
export async function saveBook(book: Book): Promise<Book> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapToServer(book)),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  // Сервер вернул созданный объект с присвоенным id
  const dto: BookDTO = await response.json();
  return mapFromServer(dto);
}

// Удаление книги: DELETE-запрос по адресу записи
export async function deleteBook(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  // Тело ответа пустое — читать нечего
}

/* ============================================================================
 * ЗАДАНИЕ 2. ТАБЛИЦА ДОКАЗАТЕЛЬСТВ И ЭКСПЕРИМЕНТЫ + ОТВЕТЫ НА ВОПРОСЫ 13–17
 * ============================================================================
 *
 * 1. Таблица доказательств (DevTools -> Network):
 *
 * | Действие в UI                   | Метод  | URL                                                       | Статус      | Что было в теле ответа                                                                   |
 * | ------------------------------- | ------ | --------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
 * | Загрузка страницы (список книг) | GET    | https://6afd86772a9c141d36b8a162.mockapi.io/api/books     | 200 OK      | [{"title":"Чистый код","author":"Роберт Мартин","rating":5,"id":"1","year":2008}]        |
 * | Добавление книги через форму    | POST   | https://6afd86772a9c141d36b8a162.mockapi.io/api/books     | 201 Created | {"title":"Чистый код","author":"Роберт Мартин","rating":5,"id":"1","year":2008}          |
 * | Удаление книги                  | DELETE | https://6afd86772a9c141d36b8a162.mockapi.io/api/books/2   | 200 OK      | {"title":"Тест удаления","author":"Автор","rating":4,"id":"2","year":2020}               |
 *
 * 2. Четыре эксперимента:
 *
 * Эксперимент 1 (убрали `if (!response.ok)` и испортили `API_URL` на `.../books123`):
 *   Сервер вернул 404 со строкой `"Not found"` в JSON, поэтому приложение вместо понятного `HTTP 404` показало
 *   `dtos.map is not a function` — это плохо, так как скрывает реальную сетевую причину (ошибку 404) и пускает невалидные данные в код.
 *
 * Эксперимент 2 (убрали `await` перед `response.json()`):
 *   В `dtos` вместо массива оказался объект `Promise`, TypeScript выдал ошибку типов, а на экране появилась ошибка `dtos.map is not a function`.
 *
 * Эксперимент 3 (убрали заголовок `Content-Type` в `saveBook`):
 *   Книга создалась со статусом `201 Created`, но без `Content-Type: application/json` сервер не распарсил наше тело запроса
 *   и вернул объект со сгенерированными шаблонными значениями (`"title": "title 2"` и т.д.) вместо данных из формы.
 *
 * Эксперимент 4 (в `mapFromServer` написали `authors: dto.author` вместо `[dto.author]`):
 *   Компиляция сломалась прямо в `src/api.ts` в `mapFromServer` (`Type 'string' is not assignable to type 'string[]'`),
 *   и это защита: компилятор перехватывает несовпадение форматов на границе API и не даёт сломать `book.authors.join(...)` в интерфейсе.
 *
 * 3. Ответы на вопросы 13–17:
 *
 * 13. Какой JSON вернул ваш ресурс, когда база была пустой? Когда в ней была одна книга?
 *     Пустая база вернула `[]`.
 *     С одной книгой ресурс вернул: `[{"title":"Чистый код","author":"Роберт Мартин","rating":5,"id":"1","year":2008}]`.
 *
 * 14. Какие метод и URL уходят на сервер при нажатии кнопки «Удалить»? Какой статус вернулся?
 *     Уходит метод `DELETE` на `https://6afd86772a9c141d36b8a162.mockapi.io/api/books/{id}` (например, `.../api/books/2`), вернулся статус `200 OK`.
 *
 * 15. Какой статус вернул сервер при создании книги через форму (посмотрите в Network)?
 *     Сервер вернул статус `201 Created`.
 *
 * 16. Как проверить, что книга сохранилась именно на сервере, а не только в вашем браузере?
 *     Открыть приложение в режиме инкогнито (где пустой `localStorage`), перезагрузить страницу или открыть
 *     `https://6afd86772a9c141d36b8a162.mockapi.io/api/books` напрямую во вкладке браузера и увидеть книгу в JSON.
 *
 * 17. Что такое CORS одной фразой и как вы убедились, что ваш сервис его поддерживает?
 *     CORS — это механизм безопасности браузера, разрешающий веб-странице с одного источника (`localhost:5173`) отправлять запросы
 *     на другой домен только при наличии разрешающих заголовков от сервера.
 *     Поддержка подтверждается тем, что запросы проходят без ошибки CORS в консоли, а в заголовках ответа сервера есть `access-control-allow-origin: *`.
 */
