const themeScript = `
  try {
    const savedTheme = localStorage.getItem("shambooks-theme");
    const systemTheme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = savedTheme || systemTheme;
  } catch (_) {}
`;

/** Applies the theme before React hydration to prevent a light-theme flash. */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
