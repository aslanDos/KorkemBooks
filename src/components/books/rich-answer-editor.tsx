"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, Redo2, Underline, Undo2 } from "lucide-react";
import type { AnswerFormat, AnswerMarkType } from "@/lib/books/types";

export const EMPTY_ANSWER_FORMAT: AnswerFormat = { version: 1, marks: [] };

export function RichAnswerEditor({ value, format, readOnly = false, onChange }: { value: string; format: AnswerFormat; readOnly?: boolean; onChange: (value: string, format: AnswerFormat) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialContentRef = useRef({ value, format });

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.innerHTML = answerToHtml(initialContentRef.current.value, initialContentRef.current.format);
  }, []); // The editor is keyed by question, so initial content is applied once per answer.

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = serializeEditor(editor);
    onChange(next.text, next.format);
  };

  const run = (command: "bold" | "italic" | "underline" | "undo" | "redo") => {
    if (readOnly) return;
    editorRef.current?.focus();
    document.execCommand(command);
    emitChange();
  };

  return <div className="rich-answer-editor">
    <div className="rich-answer-toolbar" role="toolbar" aria-label="Форматирование ответа">
      <ToolbarButton label="Жирный" disabled={readOnly} onRun={() => run("bold")}><Bold size={16} /></ToolbarButton>
      <ToolbarButton label="Курсив" disabled={readOnly} onRun={() => run("italic")}><Italic size={16} /></ToolbarButton>
      <ToolbarButton label="Подчёркивание" disabled={readOnly} onRun={() => run("underline")}><Underline size={16} /></ToolbarButton>
      <span className="rich-answer-toolbar__divider" aria-hidden="true" />
      <ToolbarButton label="Отменить" disabled={readOnly} onRun={() => run("undo")}><Undo2 size={16} /></ToolbarButton>
      <ToolbarButton label="Повторить" disabled={readOnly} onRun={() => run("redo")}><Redo2 size={16} /></ToolbarButton>
    </div>
    <div
      ref={editorRef}
      className="rich-answer-editor__field"
      contentEditable={!readOnly}
      role="textbox"
      aria-multiline="true"
      aria-label="Ответ"
      data-placeholder="Расскажите свою историю…"
      suppressContentEditableWarning
      onInput={emitChange}
      onBlur={emitChange}
      onPaste={(event) => {
        if (readOnly) return;
        event.preventDefault();
        document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
      }}
    />
  </div>;
}

function ToolbarButton({ label, disabled, onRun, children }: { label: string; disabled: boolean; onRun: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={onRun}>{children}</button>;
}

export function RichAnswerText({ text, format }: { text: string; format: AnswerFormat }) {
  const boundaries = new Set([0, text.length]);
  for (const mark of format.marks) {
    boundaries.add(Math.max(0, Math.min(text.length, mark.from)));
    boundaries.add(Math.max(0, Math.min(text.length, mark.to)));
  }
  const points = [...boundaries].sort((a, b) => a - b);
  return <>{points.slice(0, -1).map((from, index) => {
    const to = points[index + 1];
    const marks = format.marks.filter((mark) => mark.from < to && mark.to > from).map((mark) => mark.type);
    return <span key={`${from}-${to}`} className={marks.map((mark) => `answer-mark--${mark}`).join(" ") || undefined}>{text.slice(from, to)}</span>;
  })}</>;
}

function answerToHtml(text: string, format: AnswerFormat) {
  const boundaries = new Set([0, text.length]);
  for (const mark of format.marks) {
    boundaries.add(Math.max(0, Math.min(text.length, mark.from)));
    boundaries.add(Math.max(0, Math.min(text.length, mark.to)));
  }
  const points = [...boundaries].sort((a, b) => a - b);
  return points.slice(0, -1).map((from, index) => {
    const to = points[index + 1];
    const marks = format.marks.filter((mark) => mark.from < to && mark.to > from).map((mark) => mark.type);
    let html = escapeHtml(text.slice(from, to)).replaceAll("\n", "<br>");
    if (marks.includes("underline")) html = `<u>${html}</u>`;
    if (marks.includes("italic")) html = `<i>${html}</i>`;
    if (marks.includes("bold")) html = `<b>${html}</b>`;
    return html;
  }).join("");
}

function serializeEditor(root: HTMLElement): { text: string; format: AnswerFormat } {
  let text = "";
  const marks: AnswerFormat["marks"] = [];
  const append = (value: string, activeMarks: Set<AnswerMarkType>) => {
    if (!value) return;
    const from = text.length;
    text += value.replace(/\u00a0/g, " ");
    for (const type of activeMarks) marks.push({ type, from, to: text.length });
  };
  const walk = (node: Node, inherited: Set<AnswerMarkType>) => {
    if (node.nodeType === Node.TEXT_NODE) { append(node.textContent ?? "", inherited); return; }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "BR") { append("\n", inherited); return; }
    const active = new Set(inherited);
    const tag = node.tagName;
    if (tag === "B" || tag === "STRONG" || node.style.fontWeight === "bold" || Number(node.style.fontWeight) >= 600) active.add("bold");
    if (tag === "I" || tag === "EM" || node.style.fontStyle === "italic") active.add("italic");
    if (tag === "U" || node.style.textDecoration.includes("underline")) active.add("underline");
    const startsAt = text.length;
    node.childNodes.forEach((child) => walk(child, active));
    if ((tag === "DIV" || tag === "P") && startsAt !== text.length && !text.endsWith("\n") && node.nextSibling) append("\n", inherited);
  };
  root.childNodes.forEach((node) => walk(node, new Set()));
  return { text, format: { version: 1, marks: mergeMarks(marks).filter((mark) => mark.to > mark.from) } };
}

function mergeMarks(marks: AnswerFormat["marks"]) {
  const sorted = [...marks].sort((a, b) => a.type.localeCompare(b.type) || a.from - b.from || a.to - b.to);
  return sorted.reduce<AnswerFormat["marks"]>((result, mark) => {
    const previous = result.at(-1);
    if (previous?.type === mark.type && mark.from <= previous.to) previous.to = Math.max(previous.to, mark.to);
    else result.push({ ...mark });
    return result;
  }, []);
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
