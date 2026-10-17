"use client";

import { memo, useMemo, type ComponentProps } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";

import { cn } from "@/lib/utils";

// VS Code Dark+ theme colors for JavaScript
const VSCODE_THEME = {
  keyword: "#569cd6",      // const, function, return, etc.
  builtin: "#4ec9b0",      // Math, console, etc.
  function: "#dcdcaa",     // getRandomPhilosophy, floor, random, log
  string: "#ce9178",       // 'spread hate', etc.
  number: "#b5cea8",       // numbers
  comment: "#6a9955",      // comments
  identifier: "#9cdcfe",   // philosophies, options, index, length, etc.
  punctuation: "#d4d4d4",  // =, ;, ,, (, ), [, ], {, }, etc.
} as const;

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "switch", "case", "break", "continue", "default", "typeof", "instanceof",
  "new", "this", "class", "extends", "import", "export", "from", "as", "try",
  "catch", "finally", "throw", "async", "await", "yield", "void", "delete"
]);

const BUILTINS = new Set([
  "Math", "console", "Array", "Object", "String", "Number", "Boolean",
  "Promise", "JSON", "Date", "RegExp", "Map", "Set", "window", "document"
]);

interface Token {
  text: string;
  color?: string;
}

function tokenizeJavaScript(code: string): Token[] {
  const tokenRegex = /(\/\/.*|\/\*[\s\S]*?\*\/)|('(?:\\'|[^'\r\n])*'|"(?:\\"|[^"\r\n])*")|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*\b)|(\r\n|\r|\n)|([ \t]+)|([^\s\w])/g;
  const tokens: Token[] = [];
  let match: RegExpExecArray | null;
  let lastSignificantToken: string | null = null;

  while ((match = tokenRegex.exec(code)) !== null) {
    const [, comment, str, num, ident, newline, space, punct] = match;

    if (comment !== undefined) {
      tokens.push({ text: comment, color: VSCODE_THEME.comment });
      lastSignificantToken = comment;
    } else if (str !== undefined) {
      tokens.push({ text: str, color: VSCODE_THEME.string });
      lastSignificantToken = str;
    } else if (num !== undefined) {
      tokens.push({ text: num, color: VSCODE_THEME.number });
      lastSignificantToken = num;
    } else if (ident !== undefined) {
      if (KEYWORDS.has(ident)) {
        tokens.push({ text: ident, color: VSCODE_THEME.keyword });
      } else if (BUILTINS.has(ident)) {
        tokens.push({ text: ident, color: VSCODE_THEME.builtin });
      } else {
        const remainder = code.slice(tokenRegex.lastIndex);
        const isFollowedByParen = /^\s*\(/.test(remainder);
        const isFunctionDef = lastSignificantToken === "function";

        if (isFollowedByParen || isFunctionDef) {
          tokens.push({ text: ident, color: VSCODE_THEME.function });
        } else {
          tokens.push({ text: ident, color: VSCODE_THEME.identifier });
        }
      }
      lastSignificantToken = ident;
    } else if (newline !== undefined) {
      tokens.push({ text: newline });
    } else if (space !== undefined) {
      tokens.push({ text: space });
    } else if (punct !== undefined) {
      tokens.push({ text: punct, color: VSCODE_THEME.punctuation });
      lastSignificantToken = punct;
    }
  }

  return tokens;
}

export function HighlightedJsBlock({ code }: { code: string; isIncomplete?: boolean; language?: string; meta?: string }) {
  const tokens = useMemo(() => tokenizeJavaScript(code), [code]);

  return (
    <div className="my-2.5 p-0 bg-transparent border-0 overflow-x-hidden">
      <pre className="m-0 p-0 bg-transparent border-0 overflow-x-hidden font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words">
        <code>
          {tokens.map((token, index) => (
            <span
              key={index}
              style={token.color ? { color: token.color } : undefined}
            >
              {token.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

const jsRendererPlugin = {
  renderers: [
    {
      language: ["javascript", "js"],
      component: HighlightedJsBlock,
    },
  ],
};

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({
    className,
    animated = { animation: "slideUp", duration: 150 },
    controls = false,
    lineNumbers = false,
    plugins,
    linkSafety = { enabled: false },
    ...props
  }: ResponseProps) => {
    const combinedPlugins = useMemo(
      () => ({
        ...jsRendererPlugin,
        ...plugins,
        renderers: [
          ...(jsRendererPlugin.renderers || []),
          ...(plugins?.renderers || []),
        ],
      }),
      [plugins]
    );

    return (
      <Streamdown
        className={cn(
          "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 streamdown-response",
          className
        )}
        animated={animated}
        controls={controls}
        lineNumbers={lineNumbers}
        plugins={combinedPlugins}
        linkSafety={linkSafety}
        {...props}
      />
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.isAnimating === nextProps.isAnimating &&
    prevProps.className === nextProps.className
);

Response.displayName = "Response";

export default Response;
