import mathJaxComponent from "mathjax/tex-svg-nofont.js?raw";

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
const MATHJAX_SCRIPT_ID = "mathjax-component";

export async function typesetMath(element: HTMLElement): Promise<void> {
  try {
    await ensureMathJax();

    const mathJax = (window as MathJaxWindow).MathJax;
    if (!mathJax?.typesetPromise) {
      throw new Error("MathJax did not expose typesetPromise");
    }

    mathJax?.texReset?.();
    mathJax?.typesetClear?.([element]);
    await mathJax.typesetPromise([element]);
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
      loader: {
        paths: {
          mathjax: "/mathjax",
        },
      },
      tex: {
        inlineMath: [["\\(", "\\)"]],
        displayMath: [["\\[", "\\]"]],
        processEscapes: true,
      },
      svg: {
        scale: 1,
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

    mathJaxReady = loadMathJaxScript().then(async () => {
      await mathJaxWindow.MathJax?.startup?.promise;
    });
  }

  await mathJaxReady;
}

function loadMathJaxScript(): Promise<void> {
  const existingScript = document.getElementById(MATHJAX_SCRIPT_ID);
  if (existingScript) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = MATHJAX_SCRIPT_ID;
    script.textContent = mathJaxComponent;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("MathJax script failed to load"));
    document.head.appendChild(script);
    resolve();
  });
}
