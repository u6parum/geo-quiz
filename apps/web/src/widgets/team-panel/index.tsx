import { useState } from 'react';
import type { Store } from 'effector';
import { useUnit } from 'effector-react';

import type { Guess, Hint } from '@shared/contracts';

import { Card, Button, Input, Badge } from '@ui';

interface TeamPanelProps {
  teamId: string;
  teamName: string;
  $revealedHints: Store<Hint[]>;
  $isCompleted: Store<boolean>;
  $earnedScore: Store<number>;
  $guessHistory: Store<Guess[]>;
  submitGuess: (text: string) => void;
}

export const TeamPanel: React.FC<TeamPanelProps> = ({
  teamName,
  $revealedHints,
  $isCompleted,
  $earnedScore,
  $guessHistory,
  submitGuess,
}) => {
  const hints = useUnit($revealedHints);
  const isCompleted = useUnit($isCompleted);
  const earnedScore = useUnit($earnedScore);
  const history = useUnit($guessHistory);

  const [guess, setGuess] = useState('');

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();

    if (guess.trim()) {
      submitGuess(guess.trim());
      setGuess('');
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg">Загадка: {teamName}</h3>
        {isCompleted ? (
          <Badge variant="success">+{earnedScore} очков</Badge>
        ) : (
          <Badge variant="warning">Не разгадано</Badge>
        )}
      </div>

      {/* Подсказки */}
      <div className="space-y-2 mb-4">
        {hints.map((hint) => (
          <div key={hint.id} className="text-sm  p-2 rounded">
            <span className="font-medium text-gray-500">[{hint.group}]</span> {hint.text}
          </div>
        ))}
        {hints.length === 0 && <div className="text-sm text-gray-400 italic">Подсказки пока не открыты</div>}
      </div>

      {/* Поле ввода */}
      {!isCompleted && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Ваша догадка..."
            className="flex-1"
          />
          <Button type="submit" size="sm">
            Ответить
          </Button>
        </form>
      )}

      {/* История попыток */}
      {history.length > 0 && (
        <div className="mt-3 text-sm">
          <div className="font-medium text-gray-600 mb-1">Попытки:</div>
          {history.map((guess: Guess, index: number) => (
            <div key={index} className="text-gray-500">
              {guess.text} — {guess.isCorrect ? '✅' : '❌'}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
