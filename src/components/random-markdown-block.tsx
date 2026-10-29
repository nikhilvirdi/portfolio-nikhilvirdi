"use client";

import { useState, useEffect, useRef } from "react";
import { Response } from "@/components/ai/response";
import { TerminalExpertise } from "./TerminalExpertise";
// import { EasterEggHeatmap } from "./EasterEggHeatmap";

export const content = `Hi lol supp?  
This is a very random markdown written by me for no purpose.

| Name | Role | Age | Hometown |
|------|------|-----|----------|
| Nikhil Virdi | CS Undergrad | 20 | J&K |

Inspiration  
*Idle engineers tend to become politicians, so there is a certain social value in keeping engineers busy.* — Nikhil Virdi

some random code
\`\`\`javascript
const philosophies = [
  'grind hard',
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

// Previous artwork section (preserved so it can be restored later):
// some piece of random art from me:
// ![some piece of random art from me](/art/pieceOfArt.jpeg)

export const page2Content = `i write docs tooo, wanna read ?  
dw i'll be releasing them sooon.

**NP-hardness** [https://en.wikipedia.org/wiki/NP-hardness](https://en.wikipedia.org/wiki/NP-hardness)

me in real world:

![me in real world](/realNik.png)

btw yk I run ![Riyasat-e-Duggar logo](/socials/riyasat_e_duggar.svg) Riyasat-e-Duggar, a page about the history, culture, and identity of my home region.

you can use this terminal to know more about my CS expertise:`;

export const page3Content = ``;
// Temporarily commented out:
// this is my github heatmap, ik it is already there in github activity but i want it here also

// Natural progressive chunks preserving GFM tables and code blocks while streaming words
const CHUNKS = [
  "Hi ", "lol ", "supp?  \n",
  "This ", "is ", "a ", "very ", "random ", "markdown ", "written ", "by ", "me ", "for ", "no ", "purpose.\n\n",
  "| Name | Role | Age | Hometown |\n|------|------|-----|----------|\n",
  "| Nikhil Virdi | CS Undergrad | 20 | J&K |\n\n",
  "Inspiration  \n",
  "*Idle ", "engineers ", "tend ", "to ", "become ", "politicians, ", "so ", "there ", "is ", "a ", "certain ", "social ", "value ", "in ", "keeping ", "engineers ", "busy.* ", "— Nikhil Virdi\n\n",
  "some ", "random ", "code\n",
  "```javascript\n",
  "const philosophies = [\n",
  "  'grind hard',\n",
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

const PAGE_2_CHUNKS = [
  "i ", "write ", "docs ", "tooo, ", "wanna ", "read ?  \n",
  "dw ", "i'll ", "be ", "releasing ", "them ", "sooon.\n\n",
  "**NP-hardness** ", "[https://en.wikipedia.org/wiki/NP-hardness](https://en.wikipedia.org/wiki/NP-hardness)\n\n",
  // Previous artwork chunks (preserved so they can be restored later):
  // "some ", "piece ", "of ", "random ", "art ", "from ", "me:\n\n",
  // "![some piece of random art from me](/art/pieceOfArt.jpeg)\n\n",
  "me ", "in ", "real ", "world:\n\n",
  "![me in real world](/realNik.png)\n\n",
  "btw ", "yk ", "I ", "run ", "![Riyasat-e-Duggar logo](/socials/riyasat_e_duggar.svg) ", "Riyasat-e-Duggar, ",
  "a ", "page ", "about ", "the ", "history, ", "culture, ", "and ", "identity ", "of ", "my ", "home ", "region.\n\n",
  "you ", "can ", "use ", "this ", "terminal ", "to ", "know ", "more ", "about ", "my ", "CS ", "expertise:"
  // Temporarily commented out:
  // "this ", "is ", "my ", "github ", "heatmap, ", "ik ", "it ", "is ", "already ", "there ", "in ", "github ", "activity ", "but ", "i ", "want ", "it ", "here ", "also\n"
];

const PAGE_3_CHUNKS: string[] = [];

export interface RandomMarkdownBlockProps {
  isOpen?: boolean;
  page?: 1 | 2 | 3;
  className?: string;
  onPage1Complete?: () => void;
}

export function RandomMarkdownBlock({
  isOpen = true,
  page = 1,
  className = "",
  onPage1Complete,
}: RandomMarkdownBlockProps) {
  const [displayedContent, setDisplayedContent] = useState<string>("");
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const timerRef = useRef<number | null>(null);
  const completeTimeoutRef = useRef<number | null>(null);
  const streamedPagesRef = useRef<{ 1: boolean; 2: boolean; 3: boolean }>({ 1: false, 2: false, 3: false });
  const onPage1CompleteRef = useRef(onPage1Complete);

  useEffect(() => {
    onPage1CompleteRef.current = onPage1Complete;
  }, [onPage1Complete]);

  useEffect(() => {
    // Clear any active streaming timer or completion timeout
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (completeTimeoutRef.current !== null) {
      window.clearTimeout(completeTimeoutRef.current);
      completeTimeoutRef.current = null;
    }

    if (!isOpen) {
      setDisplayedContent("");
      setIsAnimating(false);
      streamedPagesRef.current = { 1: false, 2: false, 3: false };
      return;
    }

    const currentTargetContent =
      page === 1 ? content : page === 2 ? page2Content : page3Content;
    const currentChunks =
      page === 1 ? CHUNKS : page === 2 ? PAGE_2_CHUNKS : PAGE_3_CHUNKS;

    // If this page was already streamed during this session, show immediately
    if (streamedPagesRef.current[page]) {
      setDisplayedContent(currentTargetContent);
      setIsAnimating(false);
      if (page === 1) {
        onPage1CompleteRef.current?.();
      }
      return;
    }

    // Reset and start progressive reveal
    setDisplayedContent("");
    setIsAnimating(true);
    let index = 0;
    let accumulated = "";

    timerRef.current = window.setInterval(() => {
      if (index < currentChunks.length) {
        accumulated += currentChunks[index];
        setDisplayedContent(accumulated);
        index += 1;
      } else {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        streamedPagesRef.current[page] = true;
        setIsAnimating(false);

        if (page === 1) {
          completeTimeoutRef.current = window.setTimeout(() => {
            onPage1CompleteRef.current?.();
          }, 150);
        }
      }
    }, 35);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (completeTimeoutRef.current !== null) {
        window.clearTimeout(completeTimeoutRef.current);
        completeTimeoutRef.current = null;
      }
      if (accumulated.length > 0) {
        streamedPagesRef.current[page] = true;
      }
    };
  }, [isOpen, page]);

  return (
    <div className={className}>
      <Response isAnimating={isAnimating}>
        {displayedContent}
      </Response>
      {page === 2 && (
        <TerminalExpertise />
      )}
      {/* {page === 2 && (
        <EasterEggHeatmap />
      )} */}
    </div>
  );
}

export default RandomMarkdownBlock;
