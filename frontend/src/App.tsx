import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Braces,
  Check,
  ChevronRight,
  CircleHelp,
  Command,
  FlaskConical,
  GitCompareArrows,
  LayoutDashboard,
  LoaderCircle,
  Moon,
  Network,
  Play,
  RotateCcw,
  Sun,
  Terminal,
} from "lucide-react";
import { examples, reference } from "./content";
import { useLocalSetting, useRequest } from "./hooks";
import type { Compilation, Stage } from "./types";
import { ErrorNotice } from "./components/common";

const Workspace = lazy(() =>
  import("./components/Workspace").then((module) => ({
    default: module.Workspace,
  })),
);
const Comparator = lazy(() =>
  import("./components/Comparator").then((module) => ({
    default: module.Comparator,
  })),
);

type Page = "workspace" | "converter" | "simulator" | "comparator" | "learn";
const navigation = [
  { id: "workspace", name: "Workspace", icon: LayoutDashboard },
  { id: "converter", name: "Automata converter", icon: Network },
  { id: "simulator", name: "String simulator", icon: Play },
  { id: "comparator", name: "Regex comparator", icon: GitCompareArrows },
  { id: "learn", name: "Learning reference", icon: BookOpen },
] as const;

export default function App() {
  const [page, setPage] = useState<Page>("workspace");
  const [regex, setRegex] = useState("(a|b)*ab");
  const [stage, setStage] = useState<Stage | "test">("parse");
  const [testInput, setTestInput] = useState<string | undefined>();
  const [theme, setTheme] = useLocalSetting("automatalab-theme", "dark");
  const [recent, setRecent] = useLocalSetting("automatalab-recent", "[]");
  const [online, setOnline] = useState<boolean | null>(null);
  const compile = useRequest<Compilation>("compile");
  useEffect(() => {
    document.documentElement.dataset.theme =
      theme === "light" ? "light" : "dark";
  }, [theme]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then((r) => setOnline(r.ok))
      .catch((e) => {
        if (e.name !== "AbortError") setOnline(false);
      });
    return () => controller.abort();
  }, []);
  let recentExpressions: string[] = [];
  try {
    const parsed = JSON.parse(recent);
    if (Array.isArray(parsed))
      recentExpressions = parsed
        .filter((v): v is string => typeof v === "string")
        .slice(0, 5);
  } catch {
    /* Ignore invalid optional local history. */
  }
  useEffect(() => {
    if (compile.data) {
      setOnline(true);
      setRecent(
        JSON.stringify(
          [
            compile.data.regex,
            ...recentExpressions.filter((r) => r !== compile.data!.regex),
          ].slice(0, 5),
        ),
      );
    }
  }, [compile.data]);
  const choose = (value: string) => {
    setRegex(value);
    compile.reset();
    setTestInput(undefined);
  };
  const navigate = (id: Page) => {
    setPage(id);
    if (id === "converter") setStage("dfa");
    if (id === "simulator") setStage("test");
  };
  const generate = () => {
    void compile.run({ regex });
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("workspace")}
          aria-label="AutomataLab home"
        >
          <span className="brand-mark">
            <Network size={23} />
          </span>
          <span>
            Automata<span className="brand-light">Lab</span>
            <small>PATTERNS INTO POSSIBILITY</small>
          </span>
        </button>
        <div className="sidebar-label">
          LABORATORY <span>01</span>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "nav-item active" : "nav-item"}
              aria-label={item.name}
              title={item.name}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={17} strokeWidth={1.7} />
              <span>{item.name}</span>
              {page === item.id && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-label">
          RECENT EXPRESSIONS <Braces size={13} />
        </div>
        <div className="recent-list">
          {recentExpressions.length ? (
            recentExpressions.map((r) => (
              <button
                key={r}
                onClick={() => {
                  choose(r);
                  navigate("workspace");
                }}
              >
                <span>↳</span>
                <code>{r}</code>
              </button>
            ))
          ) : (
            <p>Your compiled patterns will appear here.</p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="learning-card">
            <span className="tiny-tag">BUILT FOR UNDERSTANDING</span>
            <BookOpen size={22} />
            <h3>The theory, made visible.</h3>
            <p>Explore the algorithms behind every transition.</p>
            <button onClick={() => navigate("learn")}>
              Open learning reference <ArrowRight size={14} />
            </button>
          </div>
          <div className="sidebar-footer">
            <span>
              <span
                className={`status-dot ${online === false ? "offline" : ""}`}
              />
              {online === null
                ? "Connecting…"
                : online
                  ? "Local compiler online"
                  : "Backend offline"}
            </span>
            <small>AutomataLab / v1.0</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <FlaskConical size={16} />
            <span>AutomataLab</span>
            <ChevronRight size={13} />
            <b>{navigation.find((n) => n.id === page)?.name}</b>
          </div>
          <div className="topbar-right">
            <span className="course-tag">COMPILER DESIGN LAB</span>
            <button
              className="icon-button"
              aria-label="Open learning reference"
              title="Learning reference"
              onClick={() => navigate("learn")}
            >
              <CircleHelp size={18} />
            </button>
            <button
              className="icon-button theme-button"
              aria-label={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              title="Switch theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <main id="main">
          <Suspense
            fallback={
              <div className="loading-workspace" role="status">
                <LoaderCircle size={19} className="spin" />
                Opening your workspace…
              </div>
            }
          >
            {page === "comparator" ? (
              <Comparator
                onSimulate={(expression, input) => {
                  setRegex(expression);
                  setTestInput(input);
                  setPage("simulator");
                  setStage("test");
                  void compile.run({ regex: expression });
                }}
              />
            ) : page === "learn" ? (
              <>
                <div className="page-intro">
                  <span className="eyebrow">
                    A field guide to finite automata
                  </span>
                  <h1>
                    Understand every transition<span>.</span>
                  </h1>
                  <p>
                    The ideas behind the workspace, with expressions you can
                    explore yourself.
                  </p>
                </div>
                <div className="reference-grid">
                  {reference.map((item) => (
                    <article className="reference-card" key={item.title}>
                      <span className="section-label">{item.tag}</span>
                      <h2>{item.title}</h2>
                      <p>{item.text}</p>
                      <div className="reference-formula">{item.formula}</div>
                      <p className="small">{item.detail}</p>
                      <button
                        className="text-button"
                        onClick={() => {
                          choose(item.example);
                          setPage("workspace");
                          setStage("parse");
                        }}
                      >
                        Try <code>{item.example}</code>
                        <ArrowRight size={14} />
                      </button>
                    </article>
                  ))}
                </div>
                <div className="reference-foot">
                  Reference explanations describe the algorithms in general.
                  Workspace explanations and diagrams come from the execution of
                  your expression.
                </div>
              </>
            ) : (
              <>
                <div className="page-intro">
                  <div>
                    <span className="eyebrow">
                      <span className="status-dot" /> THE LANGUAGE OF PATTERNS
                    </span>
                    <h1>
                      {page === "simulator"
                        ? "Put your patterns to the test"
                        : page === "converter"
                          ? "Follow every transformation"
                          : "From expression to understanding"}
                      <span>.</span>
                    </h1>
                    <p>
                      Build, explore, and understand finite automata. See the
                      compiler think, one step at a time.
                    </p>
                  </div>
                  <span className="intro-decoration" aria-hidden="true">
                    ƒ
                  </span>
                </div>
                <section className="editor-panel">
                  <div className="editor-heading">
                    <div>
                      <Terminal size={16} />
                      <h2>Regular expression</h2>
                      <span className="tiny-tag">INPUT</span>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => {
                        choose("");
                        setStage("parse");
                      }}
                    >
                      <RotateCcw size={13} />
                      Reset workspace
                    </button>
                  </div>
                  <form
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        if (!compile.loading) generate();
                      }
                    }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      generate();
                    }}
                  >
                    <div
                      className={`regex-field ${compile.error ? "invalid" : ""}`}
                    >
                      <span className="regex-prefix" aria-hidden="true">
                        /
                      </span>
                      <input
                        id="regex"
                        aria-label="Regular expression"
                        aria-describedby="syntax-help"
                        aria-invalid={Boolean(compile.error)}
                        value={regex}
                        maxLength={256}
                        placeholder="Enter a pattern, e.g. (a|b)*ab"
                        autoComplete="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        onChange={(e) => choose(e.target.value)}
                      />
                      <span className="regex-suffix" aria-hidden="true">
                        /
                      </span>
                      <span className="input-language">REGEX</span>
                    </div>
                    <button
                      className="primary-button generate-button"
                      disabled={compile.loading}
                    >
                      {compile.loading ? (
                        <LoaderCircle size={16} className="spin" />
                      ) : (
                        <Play size={15} fill="currentColor" />
                      )}
                      {compile.loading ? "Compiling…" : "Generate automata"}
                      <span
                        className="button-shortcut"
                        title="Ctrl or Command + Enter"
                      >
                        <Command size={10} />↵
                      </span>
                    </button>
                  </form>
                  <ErrorNotice error={compile.error} />
                  {compile.error?.position !== undefined &&
                    compile.error.position !== null &&
                    regex && (
                      <div className="error-source" aria-label="Error position">
                        {Array.from(regex).map((c, i) => (
                          <span
                            key={i}
                            className={
                              i === compile.error?.position
                                ? "error-character"
                                : ""
                            }
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  <div className="editor-meta">
                    <span id="syntax-help">
                      Supports <code>a–z</code> <code>A–Z</code>{" "}
                      <code>0–9</code> <code>|</code> <code>*</code>{" "}
                      <code>( )</code> <code>ε</code>
                      <span className="meta-separator">·</span>Whitespace
                      ignored
                    </span>
                    <span>{regex.length}/256</span>
                  </div>
                  <div className="examples-row">
                    <span>TRY A PATTERN</span>
                    {examples.map((example) => (
                      <button
                        key={example}
                        className={`code-chip ${regex === example ? "selected" : ""}`}
                        onClick={() => choose(example)}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </section>
                {compile.data && (
                  <div className="compile-status" role="status">
                    <span>
                      <Check size={14} /> Compiled successfully
                    </span>
                    <span>
                      Σ = {"{" + compile.data.dfa.alphabet.join(", ") + "}"}
                      <i />
                      ε-NFA <b>{compile.data.counts.nfa}</b>
                      <ArrowRight size={12} />
                      DFA <b>{compile.data.counts.dfa}</b>
                      <ArrowRight size={12} />
                      Minimal <b>{compile.data.counts.minimized}</b>
                    </span>
                  </div>
                )}
                <Workspace
                  compilation={compile.data}
                  stage={stage}
                  setStage={setStage}
                  testInput={testInput}
                />
              </>
            )}
          </Suspense>
          <footer className="main-footer">
            <span>
              <Network size={13} /> AutomataLab <span>Made to make sense.</span>
            </span>
            <span>Deterministic algorithms. Endless curiosity.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
