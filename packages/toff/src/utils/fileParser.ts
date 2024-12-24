export type SourceFile = {
  path: string;
  content: string;
};

const filePathRegex =
  /File path:\s*([\w./-]+)\s*\n^```(?:\w*\n)?([\s\S]*?)^```/gm;

export function parseFilesFromLLMResponse(response: string): SourceFile[] {
  const results: SourceFile[] = [];
  let remainingInput = response;

  while (remainingInput.trim() !== "") {
    const match = filePathRegex.exec(remainingInput);
    if (match) {
      const path = match[1]?.trim();
      const content = match[2]?.trim();

      if (path && content) {
        results.push({ path, content });
      }

      remainingInput = remainingInput.substring(match.index + match[0].length);
      filePathRegex.lastIndex = 0;
    } else {
      break;
    }
  }

  return results;
}
