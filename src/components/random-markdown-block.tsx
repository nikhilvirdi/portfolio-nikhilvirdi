"use client";

import { useState, useEffect, useRef } from "react";
import { Response } from "@/components/ai/response";

export const content = `Hi lol supp?
This is a very random markdown written by me for no purpose.

| Name | Role | Age |
|------|------|-----|
| Nikhil Virdi | CS Undergrad | 20 |

Inspiration  
*Idle engineers tend to become politicians, so there is a certain social value in keeping engineers busy.* — Nikhil Virdi

some random code
\`\`\`javascript
const philosophies = [
  'spread hate',
  'be kind',
  'larp is life',
  'wh0 cares i ball',
  'life is good',
];

function getRandomPhilosophy(options) {
  const index = Math.floor(Math.random() * options.length);
  return options[index];
}

const philosophy = getRandomPhilosophy(philosophies);
console.log(philosophy);
\`\`\`

schro's equation:
$$i\\hbar \\frac{\\partial}{\\partial t} \\Psi(x,t) = \\hat{H} \\Psi(x,t)$$
`;

// Natural progressive chunks preserving GFM tables and code blocks while streaming words
const CHUNKS = [
  "Hi ", "lol ", "supp?\n",
  "This ", "is ", "a ", "very ", "random ", "markdown ", "written ", "by ", "me ", "for ", "no ", "purpose.\n\n",
  "| Name | Role | Age |\n|------|------|-----|\n",
  "| Nikhil Virdi | CS Undergrad | 20 |\n\n",
  "Inspiration  \n",
  "*Idle ", "engineers ", "tend ", "to ", "become ", "politicians, ", "so ", "there ", "is ", "a ", "certain ", "social ", "value ", "in ", "keeping ", "engineers ", "busy.* ", "— Nikhil Virdi\n\n",
  "some ", "random ", "code\n",
  "```javascript\n",
  "const philosophies = [\n",
  "  'spread hate',\n",
  "  'be kind',\n",
  "  'larp is life',\n",
  "  'wh0 cares i ball',\n",
  "  'life is good',\n",
  "];\n\n",
  "function getRandomPhilosophy(options) {\n",
  "  const index = Math.floor(Math.random() * options.length);\n",
  "  return options[index];\n",
  "}\n\n",
  "const philosophy = getRandomPhilosophy(philosophies);\n",
  "console.log(philosophy);\n",
  "```\n\n",
  "schro's ", "equation:\n",
  "$$i\\hbar \\frac{\\partial}{\\partial t} \\Psi(x,t) = \\hat{H} \\Psi(x,t)$$\n"
];

export interface RandomMarkdownBlockProps {
  isOpen?: boolean;
  className?: string;
}

export function RandomMarkdownBlock({
  isOpen = true,
  className = "",
}: RandomMarkdownBlockProps) {
  const [displayedContent, setDisplayedContent] = useState<string>("");
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any active streaming timer
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!isOpen) {
      setDisplayedContent("");
      setIsAnimating(false);
      return;
    }

    // Reset and start progressive reveal
    setDisplayedContent("");
    setIsAnimating(true);
    let index = 0;
    let accumulated = "";

    timerRef.current = window.setInterval(() => {
      if (index < CHUNKS.length) {
        accumulated += CHUNKS[index];
        setDisplayedContent(accumulated);
        index += 1;
      } else {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsAnimating(false);
      }
    }, 35);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen]);

  return (
    <div className={className}>
      <Response isAnimating={isAnimating}>
        {displayedContent}
      </Response>
    </div>
  );
}

export default RandomMarkdownBlock;
