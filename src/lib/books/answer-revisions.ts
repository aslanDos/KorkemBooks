export type AnswerRevisionStatus = "pending" | "accepted" | "rejected";

export type AnswerRevision = {
  id: string;
  bookId: string;
  questionId: string;
  question: string;
  originalAnswer: string;
  editedAnswer: string;
  status: AnswerRevisionStatus;
  createdAt: string;
  reviewedAt: string | null;
};

export type RevisionDiffPart = { value: string; type: "same" | "added" | "removed" };

function tokenize(value: string) {
  return value.match(/\s+|[^\s]+/gu) ?? [];
}

export function diffAnswerText(original: string, edited: string): RevisionDiffPart[] {
  const before = tokenize(original);
  const after = tokenize(edited);
  if (before.length * after.length > 240_000) {
    let prefix = 0;
    while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1;
    let suffix = 0;
    while (suffix < before.length - prefix && suffix < after.length - prefix && before.at(-1 - suffix) === after.at(-1 - suffix)) suffix += 1;
    const coarse: RevisionDiffPart[] = [
      { type: "same", value: before.slice(0, prefix).join("") },
      { type: "removed", value: before.slice(prefix, before.length - suffix).join("") },
      { type: "added", value: after.slice(prefix, after.length - suffix).join("") },
      { type: "same", value: suffix ? before.slice(-suffix).join("") : "" },
    ];
    return coarse.filter((part) => part.value);
  }

  const lengths = Array.from({ length: before.length + 1 }, () => new Uint16Array(after.length + 1));
  for (let left = before.length - 1; left >= 0; left -= 1) {
    for (let right = after.length - 1; right >= 0; right -= 1) {
      lengths[left][right] = before[left] === after[right]
        ? lengths[left + 1][right + 1] + 1
        : Math.max(lengths[left + 1][right], lengths[left][right + 1]);
    }
  }
  const parts: RevisionDiffPart[] = [];
  const append = (type: RevisionDiffPart["type"], value: string) => {
    const previous = parts.at(-1);
    if (previous?.type === type) previous.value += value;
    else parts.push({ type, value });
  };
  let left = 0;
  let right = 0;
  while (left < before.length || right < after.length) {
    if (left < before.length && right < after.length && before[left] === after[right]) {
      append("same", before[left]); left += 1; right += 1;
    } else if (right < after.length && (left === before.length || lengths[left][right + 1] >= lengths[left + 1][right])) {
      append("added", after[right]); right += 1;
    } else {
      append("removed", before[left]); left += 1;
    }
  }
  return parts;
}
