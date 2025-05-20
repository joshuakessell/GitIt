import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  javascript,
  typescript,
  python,
  java,
  csharp,
  go,
  ruby,
  php,
  rust,
  swift,
  kotlin,
  c,
  cpp,
} from 'react-syntax-highlighter/dist/esm/languages/prism';

// Register all languages for syntax highlighting
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('ruby', ruby);
SyntaxHighlighter.registerLanguage('php', php);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('swift', swift);
SyntaxHighlighter.registerLanguage('kotlin', kotlin);
SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('cpp', cpp);

createRoot(document.getElementById("root")!).render(<App />);
