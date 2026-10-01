/** The chips plus whatever is still typed in the box, so nothing is silently dropped on save. */
export function withTypedTag(tags: string[], input: string): string[] {
  const typed = input.trim().toLowerCase();
  return typed && !tags.includes(typed) ? [...tags, typed] : tags;
}
