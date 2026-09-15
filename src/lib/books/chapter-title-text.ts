// Display-only typography: the user's stored title stays unchanged.
export function formatChapterTitle(title: string) {
  return title.replace(/(?<!\S)(и|а|в|во|к|ко|с|со|у|о|об|от|до|на|по|за|из|не)[ \t]+(?=\S)/giu, "$1\u00a0");
}
