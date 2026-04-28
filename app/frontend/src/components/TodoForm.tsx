import { useState } from 'react';

type TodoFormProps = {
  onSubmit: (payload: { title: string; description?: string }) => Promise<void>;
};

export function TodoForm({ onSubmit }: TodoFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
      });

      setTitle('');
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="todo-form">
      <label>
        제목
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: Dockerfile 작성"
          maxLength={100}
        />
      </label>

      <label>
        설명
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="작업에 대한 간단한 설명을 입력하세요."
        />
      </label>

      <button type="submit" disabled={isSubmitting || !title.trim()}>
        {isSubmitting ? '생성 중...' : 'Todo 생성'}
      </button>
    </form>
  );
}