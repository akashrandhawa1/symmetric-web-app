import React from "react";

type CoachNoteProps = {
  text: string;
};

export default function CoachNote({ text }: CoachNoteProps) {
  if (!text) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm leading-relaxed text-zinc-100">
      {text}
    </div>
  );
}
