/**
 * Symptom rows carry an id so React can key them.
 *
 * They are editable text inputs that can be deleted from the middle of the
 * list; with an index key React reuses a row's component for whatever moves
 * into that position, which drags focus and IME state onto the wrong field.
 */
export type SymptomLine = { id: string; text: string };

let counter = 0;

export function newSymptomLine(text = ""): SymptomLine {
  counter += 1;
  return { id: `symptom-${Date.now().toString(36)}-${counter}`, text };
}

export function symptomLinesFrom(texts: string[]): SymptomLine[] {
  return texts.length > 0 ? texts.map((t) => newSymptomLine(t)) : [newSymptomLine()];
}

/** Trimmed, non-empty texts — what gets saved. */
export function symptomTexts(lines: SymptomLine[]): string[] {
  return lines.map((l) => l.text.trim()).filter(Boolean);
}
