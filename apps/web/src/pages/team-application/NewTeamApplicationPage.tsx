import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnit } from 'effector-react';
import { submitApplication, $myApplication } from '@features/team-application';
import { Button, Card, Input } from '@ui';

interface HintForm {
  group: number;
  text: string;
}

export const NewTeamApplicationPage = () => {
  const navigate = useNavigate();
  const myApplication = useUnit($myApplication);

  const [teamName, setTeamName] = useState('');
  const [landmarkName, setLandmarkName] = useState('');
  const [description, setDescription] = useState('');
  const [hints, setHints] = useState<HintForm[]>([
    { group: 1, text: '' },
    { group: 1, text: '' },
    { group: 2, text: '' },
    { group: 2, text: '' },
    { group: 3, text: '' },
    { group: 3, text: '' },
  ]);
  const [error, setError] = useState('');

  // Если заявка уже есть — редирект
  if (myApplication) {
    navigate('/application');
    return null;
  }

  const updateHint = (index: number, value: string) => {
    setHints((prev) => prev.map((h, i) => (i === index ? { ...h, text: value } : h)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (hints.some((h) => !h.text.trim())) {
      setError('Все подсказки должны быть заполнены');
      return;
    }

    try {
      await submitApplication({
        teamName,
        landmarkName,
        description,
        hints,
      });
      navigate('/application');
    } catch (err: any) {
      setError(err.message ?? 'Ошибка отправки заявки');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Заявка на команду</h1>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-600">{error}</div>}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Название команды" value={teamName} onChange={(e) => setTeamName(e.target.value)} required />

          <Input
            label="Достопримечательность"
            value={landmarkName}
            onChange={(e) => setLandmarkName(e.target.value)}
            placeholder="Что загадывает ваша команда"
            required
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Описание</label>
            <textarea
              className="rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <h3 className="font-medium mb-2">Подсказки</h3>
            {[1, 2, 3].map((group) => (
              <div key={group} className="mb-3">
                <div className="text-sm text-gray-500 mb-1">Группа {group}</div>
                <div className="flex flex-col gap-2">
                  {hints
                    .map((h, i) => ({ h, i }))
                    .filter(({ h }) => h.group === group)
                    .map(({ h, i }) => (
                      <Input
                        key={i}
                        value={h.text}
                        onChange={(e) => updateHint(i, e.target.value)}
                        placeholder={`Подсказка ${i + 1}`}
                        required
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>

          <Button type="submit" size="lg" className="w-full">
            Отправить заявку
          </Button>
        </form>
      </Card>
    </div>
  );
};
