import Editor from '@monaco-editor/react';

export default function CodeEditor({ value, onChange, language = 'python', height = '400px', readOnly = false }) {
  const monacoLangMap = {
    python: 'python',
    java: 'java',
    cpp: 'cpp',
    javascript: 'javascript',
  };

  return (
    <div className="w-full h-full overflow-hidden rounded-lg border border-cera-border">
      <Editor
        height={height}
        language={monacoLangMap[language] || 'python'}
        value={value}
        onChange={(val) => onChange?.(val || '')}
        theme="vs-dark"
        options={{
          readOnly,
          fontSize: 14,
          fontFamily: 'JetBrains Mono, monospace',
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          tabSize: 4,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
