import { useRouteError, Link, isRouteErrorResponse } from 'react-router-dom';

export const RouteErrorPage = () => {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Неизвестная ошибка';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center  p-6">
      <h1 className="text-4xl font-bold text-red-500">Что-то пошло не так</h1>
      <p className="mt-4 text-gray-600">Произошла непредвиденная ошибка. Попробуйте обновить страницу.</p>

      <pre className="mt-4 max-w-xl overflow-auto rounded-lg bg-gray-100 p-4 text-sm text-red-600">{message}</pre>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Обновить страницу
        </button>
        <Link to="/" className="rounded-lg bg-gray-200 px-6 py-3 text-gray-800 hover:bg-gray-300">
          На главную
        </Link>
      </div>
    </div>
  );
};
