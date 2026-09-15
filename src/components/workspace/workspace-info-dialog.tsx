"use client";

import { useRef } from "react";
import { Info } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

const notes = [
  "Необязательно отвечать на каждый вопрос. Для завершения достаточно заполнить не менее 50% — вопросы без ответа в книгу не попадут.",
  "Когда закончите работу над историями, нажмите «Отправить на редактуру».",
  "Обычно заполнение занимает 2–4 часа. Для удобства рекомендуем работать с ноутбука.",
  "Старайтесь писать подробно, живо и эмоционально — так ваши истории получатся выразительнее.",
];

export function WorkspaceInfoDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return <>
    <button className="workspace-info-button" type="button" aria-label="Важная информация о заполнении книги" title="Важная информация" onClick={() => dialogRef.current?.showModal()}>
      <Info size={18} aria-hidden="true" />
    </button>
    <Dialog className="workspace-info-dialog" panelClassName="workspace-info-dialog__panel" ref={dialogRef} title="Важная информация" eyebrow="Перед началом" closeIconSize={19}>
      <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul>
    </Dialog>
  </>;
}
