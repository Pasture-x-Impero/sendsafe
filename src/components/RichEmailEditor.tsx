import { useRef, useEffect, useState, useCallback } from "react";
import { Link2, Sparkles, ChevronDown } from "lucide-react";

interface RichEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  defaultFontFamily?: string;
  placeholder?: string;
}

const FONT_OPTIONS = ["Arial", "Calibri", "Helvetica", "Georgia", "Verdana"] as const;

const SIZE_OPTIONS = [
  { label: "10px", value: "10px" },
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
] as const;

const FIELD_OPTIONS = [
  { label: "Kontaktnavn", value: "{contact_name}" },
  { label: "Selskap", value: "{company}" },
  { label: "Domene", value: "{domene}" },
  { label: "Bransje", value: "{industry}" },
  { label: "E-post", value: "{contact_email}" },
] as const;

const AI_INSTRUCTION = "[Gi AI instrukser for denne delen av teksten]";

const RichEmailEditor = ({
  value,
  onChange,
  defaultFontFamily = "Arial",
  placeholder,
}: RichEmailEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const savedRange = useRef<Range | null>(null);

  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [showFieldMenu, setShowFieldMenu] = useState(false);

  // Initialize content once on mount
  useEffect(() => {
    if (!initialized.current && editorRef.current) {
      const html = value.includes("<") ? value : value.replace(/\n/g, "<br>");
      editorRef.current.innerHTML = html || "";
      initialized.current = true;
    }
  }, [value]);

  const notifyChange = useCallback(() => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }, []);

  const execCmd = useCallback(
    (cmd: string, val?: string) => {
      editorRef.current?.focus();
      document.execCommand(cmd, false, val);
      notifyChange();
    },
    [notifyChange]
  );

  const applyFontFamily = useCallback(
    (font: string) => {
      restoreSelection();
      editorRef.current?.focus();
      document.execCommand("fontName", false, font);
      notifyChange();
    },
    [restoreSelection, notifyChange]
  );

  const applyFontSize = useCallback(
    (size: string) => {
      restoreSelection();
      editorRef.current?.focus();
      document.execCommand("fontSize", false, "7");
      editorRef.current?.querySelectorAll('font[size="7"]').forEach((el) => {
        const span = document.createElement("span");
        span.style.fontSize = size;
        span.innerHTML = (el as HTMLElement).innerHTML;
        el.replaceWith(span);
      });
      notifyChange();
    },
    [restoreSelection, notifyChange]
  );

  const insertLink = useCallback(() => {
    if (!linkUrl || linkUrl === "https://") return;
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand("createLink", false, linkUrl);
    editorRef.current?.querySelectorAll("a:not([target])").forEach((a) => {
      (a as HTMLAnchorElement).target = "_blank";
      (a as HTMLAnchorElement).rel = "noopener noreferrer";
    });
    setShowLinkInput(false);
    setLinkUrl("https://");
    notifyChange();
  }, [linkUrl, restoreSelection, notifyChange]);

  const insertAI = useCallback(() => {
    editorRef.current?.focus();
    document.execCommand(
      "insertHTML",
      false,
      `<span style="color:#7c3aed;background:#f3e8ff;border-radius:3px;padding:0 2px">${AI_INSTRUCTION}</span>`
    );
    notifyChange();
  }, [notifyChange]);

  const insertField = useCallback(
    (field: string) => {
      editorRef.current?.focus();
      document.execCommand(
        "insertHTML",
        false,
        `<span style="color:#0369a1;background:#e0f2fe;border-radius:3px;padding:0 2px">${field}</span>`
      );
      setShowFieldMenu(false);
      notifyChange();
    },
    [notifyChange]
  );

  return (
    <div className="rounded-t-lg border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-accent/30 px-2 py-1.5">
        {/* Font family */}
        <select
          onMouseDown={saveSelection}
          onChange={(e) => applyFontFamily(e.target.value)}
          defaultValue={defaultFontFamily}
          className="rounded border border-border bg-background px-1 py-0.5 text-xs text-foreground focus:outline-none cursor-pointer"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        {/* Font size */}
        <select
          onMouseDown={saveSelection}
          onChange={(e) => applyFontSize(e.target.value)}
          defaultValue="14px"
          className="rounded border border-border bg-background px-1 py-0.5 text-xs text-foreground focus:outline-none cursor-pointer"
        >
          {SIZE_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Bold */}
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("bold");
          }}
          className="rounded px-2 py-0.5 text-sm font-bold text-foreground hover:bg-accent"
          title="Fet"
        >
          B
        </button>

        {/* Italic */}
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("italic");
          }}
          className="rounded px-2 py-0.5 text-sm italic text-foreground hover:bg-accent"
          title="Kursiv"
        >
          I
        </button>

        {/* Underline */}
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("underline");
          }}
          className="rounded px-2 py-0.5 text-sm underline text-foreground hover:bg-accent"
          title="Understreket"
        >
          U
        </button>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Link */}
        <div className="relative">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
              setShowLinkInput((v) => !v);
              setShowFieldMenu(false);
            }}
            className="rounded p-1 text-foreground hover:bg-accent"
            title="Sett inn lenke"
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
          {showLinkInput && (
            <div className="absolute left-0 top-full z-30 mt-1 flex items-center gap-1 rounded-lg border border-border bg-card p-2 shadow-lg">
              <input
                autoFocus
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") insertLink();
                  if (e.key === "Escape") setShowLinkInput(false);
                }}
                className="w-48 rounded border border-border bg-accent/30 px-2 py-1 text-xs focus:border-primary focus:outline-none"
                placeholder="https://"
              />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={insertLink}
                className="rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"
              >
                OK
              </button>
            </div>
          )}
        </div>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* AI instruction */}
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            insertAI();
          }}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-violet-600 bg-violet-100 hover:bg-violet-200 dark:text-violet-300 dark:bg-violet-900/30"
          title="Sett inn AI-instruksjon"
        >
          <Sparkles className="h-3 w-3" /> AI
        </button>

        {/* Field dropdown */}
        <div className="relative">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setShowFieldMenu((v) => !v);
              setShowLinkInput(false);
            }}
            className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-xs font-medium text-sky-600 bg-sky-100 hover:bg-sky-200 dark:text-sky-300 dark:bg-sky-900/30"
            title="Sett inn feltvariabel"
          >
            Felt <ChevronDown className="h-3 w-3" />
          </button>
          {showFieldMenu && (
            <div className="absolute right-0 top-full z-30 mt-1 min-w-[180px] rounded-lg border border-border bg-card p-1 shadow-lg">
              {FIELD_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertField(f.value);
                  }}
                  className="flex w-full items-center justify-between rounded px-3 py-1.5 text-xs text-foreground hover:bg-accent"
                >
                  <span>{f.label}</span>
                  <code className="ml-2 text-muted-foreground">{f.value}</code>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor content area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={notifyChange}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        data-placeholder={placeholder}
        style={{ fontFamily: defaultFontFamily, fontSize: "14px" }}
        className="min-h-[220px] w-full bg-accent/30 px-4 py-3 text-sm text-foreground focus:outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
};

export default RichEmailEditor;
