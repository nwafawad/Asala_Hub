'use client';

import React from 'react';
import { HelpCircle, Plus, Trash2 } from 'lucide-react';
import { QuizQuestion } from '@/lib/db';

interface QuizBuilderProps {
  quizQuestions: QuizQuestion[];
  setQuizQuestions: (questions: QuizQuestion[]) => void;
  passingScore: number;
  setPassingScore: (val: number) => void;
  quizTimeLimit: number;
  setQuizTimeLimit: (val: number) => void;
}

export const QuizBuilder: React.FC<QuizBuilderProps> = ({
  quizQuestions,
  setQuizQuestions,
  passingScore,
  setPassingScore,
  quizTimeLimit,
  setQuizTimeLimit,
}) => {
  const addQuizQuestion = () => {
    const newId = `q-${Date.now()}`;
    setQuizQuestions([
      ...quizQuestions,
      {
        id: newId,
        type: 'multiple_choice',
        prompt: 'New Question',
        promptAr: 'سؤال جديد',
        options: [
          { id: `opt-${Date.now()}-1`, text: 'Choice 1', textAr: 'خيار 1', isCorrect: true },
          { id: `opt-${Date.now()}-2`, text: 'Choice 2', textAr: 'خيار 2', isCorrect: false },
        ],
        points: 10,
      },
    ]);
  };

  const removeQuizQuestion = (qId: string) => {
    setQuizQuestions(quizQuestions.filter(q => q.id !== qId));
  };

  const addQuizOption = (qId: string) => {
    setQuizQuestions(
      quizQuestions.map(q => {
        if (q.id !== qId) return q;
        const opts = q.options || [];
        return {
          ...q,
          options: [
            ...opts,
            { id: `opt-${Date.now()}`, text: `Option ${opts.length + 1}`, textAr: `خيار ${opts.length + 1}`, isCorrect: false },
          ],
        };
      })
    );
  };

  const setCorrectOption = (qId: string, optId: string) => {
    setQuizQuestions(
      quizQuestions.map(q => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: (q.options || []).map(opt => ({
            ...opt,
            isCorrect: opt.id === optId,
          })),
        };
      })
    );
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          <span>Interactive Quiz Builder ({quizQuestions.length} Questions)</span>
        </h3>
        <button
          type="button"
          onClick={addQuizQuestion}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Question</span>
        </button>
      </div>

      {/* Quiz Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/20 border border-border">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">Passing Score Percentage (%)</label>
          <input
            type="number"
            min={10}
            max={100}
            value={passingScore}
            onChange={e => setPassingScore(Number(e.target.value))}
            className="px-3.5 py-2 rounded-xl border border-input bg-background text-xs font-mono font-semibold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">Time Limit (Minutes)</label>
          <input
            type="number"
            min={1}
            max={180}
            value={quizTimeLimit}
            onChange={e => setQuizTimeLimit(Number(e.target.value))}
            className="px-3.5 py-2 rounded-xl border border-input bg-background text-xs font-mono font-semibold"
          />
        </div>
      </div>

      {/* Questions List */}
      <div className="flex flex-col gap-5">
        {quizQuestions.map((q, qIndex) => (
          <div key={q.id} className="p-5 rounded-xl border border-border bg-background flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Question #{qIndex + 1}
              </span>
              <button
                type="button"
                onClick={() => removeQuizQuestion(q.id)}
                className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Question Prompt */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={q.prompt}
                onChange={e => {
                  const val = e.target.value;
                  setQuizQuestions(quizQuestions.map(item => (item.id === q.id ? { ...item, prompt: val } : item)));
                }}
                placeholder="Question prompt in English..."
                className="px-3.5 py-2 rounded-xl border border-input bg-background text-xs font-semibold"
              />
              <input
                type="text"
                dir="rtl"
                value={q.promptAr || ''}
                onChange={e => {
                  const val = e.target.value;
                  setQuizQuestions(quizQuestions.map(item => (item.id === q.id ? { ...item, promptAr: val } : item)));
                }}
                placeholder="السؤال بالعربية..."
                className="px-3.5 py-2 rounded-xl border border-input bg-background text-xs font-semibold font-arabic"
              />
            </div>

            {/* Options List */}
            <div className="flex flex-col gap-2 pl-2">
              <label className="text-[11px] font-bold text-muted-foreground">
                Options (Select radio for correct answer)
              </label>
              {(q.options || []).map(opt => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={opt.isCorrect}
                    onChange={() => setCorrectOption(q.id, opt.id)}
                    className="w-4 h-4 text-primary cursor-pointer"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e => {
                      const val = e.target.value;
                      setQuizQuestions(
                        quizQuestions.map(item => {
                          if (item.id !== q.id) return item;
                          return {
                            ...item,
                            options: (item.options || []).map(o => (o.id === opt.id ? { ...o, text: val } : o)),
                          };
                        })
                      );
                    }}
                    placeholder="Option text EN"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-xs"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => addQuizOption(q.id)}
                className="self-start text-[11px] font-bold text-primary hover:underline cursor-pointer pt-1"
              >
                Add Choice Option
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
