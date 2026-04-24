import { useEffect, useRef, useState } from 'react';

interface Props {
  initialNote?: string;
  onSave: (note: string) => void;
  onCancel: () => void;
}

export default function NoteEditor({ initialNote = '', onSave, onCancel }: Props) {
  const [value, setValue] = useState(initialNote);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(value.length, value.length);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function save() {
    onSave(value.trim());
  }

  return (
    <div className="text-sm">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            save();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        rows={3}
        placeholder="Add a note for this spot…"
        className="w-full rounded-md px-3 py-2 outline-none border resize-none"
        style={{
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          borderColor: 'var(--bg-tertiary)',
          fontFamily: 'var(--reading-font-family, inherit)',
        }}
      />
      <div className="flex items-center justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1 text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          className="rounded-md px-3 py-1 text-xs font-medium"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
