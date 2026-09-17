import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center ">
    <h1 className="text-6xl font-bold text-gray-300">404</h1>
    <p className="mt-4 text-xl text-gray-600">Страница не найдена</p>
    <Link to="/" className="mt-6 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 transition">
      На главную
    </Link>
  </div>
);
