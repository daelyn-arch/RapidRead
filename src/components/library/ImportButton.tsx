import { useRef, useState, useCallback } from 'react';

interface Props {
  onFileSelected: (file: File) => void;
  importing: boolean;
}

export default function ImportButton({ onFileSelected, importing }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  }, [onFileSelected]);

  return (
    <div
      className="border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer"
      style={{
        borderColor: dragOver ? 'var(--accent)' : 'var(--bg-tertiary)',
        backgroundColor: dragOver ? 'var(--bg-secondary)' : 'transparent',
      }}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".epub,.txt"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = '';
        }}
      />

      {importing ? (
        <div style={{ color: 'var(--text-secondary)' }}>
          <div className="animate-spin w-8 h-8 border-2 border-current border-t-transparent rounded-full mx-auto mb-2" />
          Importing...
        </div>
      ) : (
        <div style={{ color: 'var(--text-secondary)' }}>
          <svg className="w-10 h-10 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <p className="font-medium">Import a book</p>
          <p className="text-sm mt-1">Drop .epub or .txt file here, or click to browse</p>
        </div>
      )}
    </div>
  );
}
