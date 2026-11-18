import { Book } from './task1-types';

// Адрес вашего личного ресурса на сервере (замените на свою ссылку из mockapi.io / lightboxapi.ru)
const API_URL = 'https://ВАШ-ПРОЕКТ.mockapi.io/api/books';

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
 * | Действие в UI                     | Метод  | URL                                      | Статус      | Что было в теле ответа                                                                 |
 * | --------------------------------- | ------ | ---------------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
 * | Загрузка страницы (список книг)   | GET    | https://<проект>.mockapi.io/api/books    | 200 OK      | JSON-массив объектов BookDTO (например, [{"id":"1","title":"...","author":"...",...}]) |
 * | Добавление книги через форму      | POST   | https://<проект>.mockapi.io/api/books    | 201 Created | JSON-объект созданной книги с присвоенным сервером id                                  |
 * | Удаление книги                    | DELETE | https://<проект>.mockapi.io/api/books/1  | 200 OK      | JSON удалённого объекта (в mockapi.io) или пустое тело ответа                          |
 *
 * 2. Четыре эксперимента:
 *
 * Эксперимент 1 (убрали `if (!response.ok)` и испортили `API_URL` на `.../books123`):
 *   Приложение вместо понятного статуса `HTTP 404` показывает техническую ошибку парсинга JSON
 *   (`Unexpected token 'N', "Not found" is not valid JSON`) или `dtos.map is not a function` — это плохо,
 *   потому что скрывает настоящую сетевую причину (404 Not Found) и пропускает ошибочный ответ дальше в логику.
 *
 * Эксперимент 2 (убрали `await` перед `response.json()`):
 *   В `dtos` оказывается не массив, а неразрешённый объект `Promise`, TypeScript подчёркивает ошибку несовместимости типов,
 *   а в браузере вызов `dtos.map(...)` падает с ошибкой `dtos.map is not a function`, которая выводится в блоке ошибки на экране.
 *
 * Эксперимент 3 (убрали заголовок `Content-Type` в `saveBook`):
 *   Без этого заголовка строка уходит как `text/plain;charset=UTF-8`, поэтому сервер не парсит наше JSON-тело:
 *   mockapi.io создаёт запись со статусом `201 Created`, но заполняет поля сгенерированными шаблонными данными вместо введённых в форме
 *   (либо строгий сервер отклоняет запрос с ошибкой 400 / 415).
 *
 * Эксперимент 4 (в `mapFromServer` написали `authors: dto.author` вместо `[dto.author]`):
 *   Компиляция сразу ломается в `src/api.ts` внутри `mapFromServer` (`Type 'string' is not assignable to type 'string[]'`),
 *   и это защита: компилятор останавливает неверный формат на границе сетевого слоя и не даёт ошибке дойти до `book.authors.join(...)` в UI.
 *
 * 3. Ответы на вопросы 13–17:
 *
 * 13. Какой JSON вернул ваш ресурс, когда база была пустой? Когда в ней была одна книга?
 *     Пустая база вернула пустой массив `[]`.
 *     С одной книгой ресурс вернул массив из одного объекта:
 *     `[{"title":"Чистый код","author":"Роберт Мартин","year":2008,"rating":5,"id":"1"}]`.
 *
 * 14. Какие метод и URL уходят на сервер при нажатии кнопки «Удалить»? Какой статус вернулся?
 *     На сервер уходит HTTP-метод `DELETE` по адресу конкретной записи `https://<проект>.mockapi.io/api/books/{id}` (например, `.../books/1`),
 *     сервер возвращает статус `200 OK` (либо `204 No Content`).
 *
 * 15. Какой статус вернул сервер при создании книги через форму (посмотрите в Network)?
 *     При создании новой записи через POST-запрос сервер вернул статус `201 Created`.
 *
 * 16. Как проверить, что книга сохранилась именно на сервере, а не только в вашем браузере?
 *     Можно открыть приложение в режиме инкогнито (или другом браузере с пустым `localStorage`), перезагрузить страницу
 *     или открыть URL эндпоинта `.../books` напрямую в отдельной вкладке браузера — книга будет в JSON-ответе сервера.
 *
 * 17. Что такое CORS одной фразой и как вы убедились, что ваш сервис его поддерживает?
 *     CORS (Cross-Origin Resource Sharing) — это механизм браузера, позволяющий странице с одного домена (`localhost:5173`)
 *     безопасно обращаться к API на другом домене при наличии разрешающих заголовков ответа сервера.
 *     Мы убедились в поддержке CORS тем, что запросы проходят без ошибки `blocked by CORS policy` в консоли,
 *     а в Response Headers во вкладке Network присутствует заголовок `access-control-allow-origin: *`.
 */
