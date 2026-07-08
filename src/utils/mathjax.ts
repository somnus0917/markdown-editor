type MathJaxApi = {
  startup?: {
    promise?: Promise<void>;
    typeset?: boolean;
  };
  typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
  typesetClear?: (elements?: HTMLElement[]) => void;
  texReset?: () => void;
};

type MathJaxWindow = Window & {
  MathJax?: MathJaxApi & Record<string, unknown>;
};

let mathJaxReady: Promise<void> | null = null;

export async function typesetMath(element: HTMLElement): Promise<void> {
  try {
    await ensureMathJax();

    const mathJax = (window as MathJaxWindow).MathJax;
    mathJax?.texReset?.();
    mathJax?.typesetClear?.([element]);
    await mathJax?.typesetPromise?.([element]);
  } catch (error) {
    console.error("MathJax render failed", error);
  }
}

async function ensureMathJax(): Promise<void> {
  const mathJaxWindow = window as MathJaxWindow;

  if (mathJaxWindow.MathJax?.typesetPromise) {
    return;
  }

  if (!mathJaxReady) {
    mathJaxWindow.MathJax = {
      tex: {
        inlineMath: [["\\(", "\\)"]],
        displayMath: [["\\[", "\\]"]],
        processEscapes: true,
      },
      options: {
        skipHtmlTags: [
          "script",
          "noscript",
          "style",
          "textarea",
          "pre",
          "code",
        ],
      },
      startup: {
        typeset: false,
      },
    };

    mathJaxReady = import("mathjax/tex-chtml.js").then(async () => {
      await mathJaxWindow.MathJax?.startup?.promise;
    });
  }

  await mathJaxReady;
}
