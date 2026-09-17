import type { FC, SubmitEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '@ui';
import { register } from '@features/auth';

export const RegisterPage: FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError('');

    try {
      await register({ email, fullName, phone, password });
      navigate('/dashboard');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message ?? 'Ошибка регистрации');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center ">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Регистрация</h1>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="ФИО"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Иванов Иван Иванович"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="player@example.com"
            required
          />
          <Input
            label="Телефон"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 900 000 00 00"
            required
          />
          <Input
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Минимум 6 символов"
            minLength={6}
            required
          />

          <Button type="submit" size="lg" className="w-full mt-2">
            Зарегистрироваться
          </Button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-4">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Войти
          </Link>
        </p>
      </Card>
    </div>
  );
};
