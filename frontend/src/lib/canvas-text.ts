/** Wrap canvas text without horizontally squeezing it or splitting Telugu clusters. */
export function wrapCanvasText(
  context: Pick<CanvasRenderingContext2D, "measureText">,
  text: string,
  maxWidth: number,
): string[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const result: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) result.push(line);
      line = "";
      for (const { segment } of segmenter.segment(word)) {
        if (line && context.measureText(line + segment).width > maxWidth) {
          result.push(line);
          line = "";
        }
        line += segment;
      }
    }
    result.push(line);
  }
  return result.length ? result : [""];
}
