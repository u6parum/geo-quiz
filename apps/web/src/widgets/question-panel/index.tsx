import type { Store } from 'effector';
import { useUnit } from 'effector-react';
import { useState } from 'react';

import type { Answer, Question, OutgoingQuestion, TeamBase } from '@shared/contracts';

import { Card, Button, Input, Badge } from '@ui';

interface QuestionPanelProps {
  $incomingQuestions: Store<Question[]>;
  $outgoingQuestions: Store<OutgoingQuestion[]>;
  $questionsRemaining: Store<Map<string, number>>;
  $teams: Store<TeamBase[]>; // Store команд для выбора получателя
  askQuestion: (params: Pick<Question, 'toTeamId' | 'text'>) => void;
  answerQuestion: (params: Pick<Answer, 'questionId' | 'answer'>) => void;
  isQuestionWindow: boolean;
}

export const QuestionPanel: React.FC<QuestionPanelProps> = ({
  $incomingQuestions,
  $outgoingQuestions,
  $questionsRemaining,
  $teams,
  askQuestion,
  answerQuestion,
  isQuestionWindow,
}) => {
  const incomingQuestions = useUnit($incomingQuestions);
  const outgoingQuestions = useUnit($outgoingQuestions);
  const questionsRemaining = useUnit($questionsRemaining);
  const teams = useUnit($teams);

  const [selectedTeam, setSelectedTeam] = useState<TeamBase['id']>('');
  const [questionText, setQuestionText] = useState('');

  // Сколько вопросов осталось для выбранной команды
  const selectedTeamRemaining = questionsRemaining.get(selectedTeam) || 0;

  const canAsk = isQuestionWindow && selectedTeamRemaining > 0;

  const handleAsk = (e: React.SubmitEvent) => {
    e.preventDefault();

    if (selectedTeam && questionText.trim()) {
      askQuestion({ toTeamId: selectedTeam, text: questionText.trim() });
      setQuestionText('');
    }
  };

  return (
    <Card className="mt-4">
      <h3>Вопросы командам</h3>

      {isQuestionWindow ? (
        <form onSubmit={handleAsk} className="flex flex-col gap-2 mb-4">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">Выберите команду</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({questionsRemaining.get(team.id) || 0} вопроса)
              </option>
            ))}
          </select>

          {selectedTeam && (
            <div className="text-sm text-gray-500">
              Осталось вопросов для {teams.find((t) => t.id === selectedTeam)?.name}: {selectedTeamRemaining}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Ваш вопрос (ответят да/нет)"
              className="flex-1"
              maxLength={200}
            />
            <Button type="submit" size="sm" disabled={!canAsk}>
              Спросить
            </Button>
          </div>
        </form>
      ) : (
        <div className="text-sm text-gray-400">Сейчас нельзя задавать вопросы</div>
      )}

      {/* Таблица счётчиков */}
      <div className="mt-4">
        <div className="font-medium text-gray-600 mb-2">Доступные вопросы:</div>
        {teams.map((team) => (
          <div key={team.id} className="flex justify-between text-sm">
            <span>{team.name}</span>
            <span className="font-mono">{questionsRemaining.get(team.id) || 0}</span>
          </div>
        ))}
      </div>

      {/* Входящие вопросы */}
      {incomingQuestions.length > 0 && (
        <div className="mb-4">
          <div className="font-medium text-gray-600 mb-2">Вам задали вопрос:</div>
          {incomingQuestions.map((question) => (
            <div key={question.id} className="bg-blue-50 p-3 rounded-lg mb-2">
              <div className="text-sm font-medium">От: {question.fromTeamId}</div>
              <div className="text-sm mt-1">{question.text}</div>
              {question.answered ? (
                <Badge variant="success">Отвечено</Badge>
              ) : (
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => answerQuestion({ questionId: question.id, answer: 'yes' })}
                  >
                    Да
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => answerQuestion({ questionId: question.id, answer: 'no' })}
                  >
                    Нет
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Полученные ответы */}
      {outgoingQuestions.length > 0 && (
        <div>
          <div className="font-medium text-gray-600 mb-2">Ответы на ваши вопросы:</div>
          {outgoingQuestions.map((question) => (
            <div key={question.id} className="text-sm text-gray-700">
              {question.text} →{' '}
              {question.status === 'pending' ? '⏳ Ожидание' : question.answer === 'yes' ? '✅ Да' : '❌ Нет'}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
