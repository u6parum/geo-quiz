import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // TODO: отправить на сервер / в Sentry
    console.error('ErrorBoundary:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <h1 className="text-4xl font-bold text-red-500">Что-то пошло не так</h1>
          <p className="mt-4 text-gray-600">Произошла непредвиденная ошибка. Попробуйте обновить страницу.</p>

          {this.state.error && (
            <pre className="mt-4 max-w-xl overflow-auto rounded-lg bg-gray-100 p-4 text-sm text-red-600">
              {this.state.error.message}
            </pre>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 transition"
            >
              Обновить страницу
            </button>
            <Link
              to="/"
              onClick={this.handleReset}
              className="rounded-lg bg-gray-200 px-6 py-3 text-gray-800 hover:bg-gray-300 transition"
            >
              На главную
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
