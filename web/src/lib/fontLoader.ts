/**
 * Lazy loads Noto Sans Devanagari font when Hindi is selected per U0-03.
 */
export function setDocumentLanguage(lang: "en" | "hi") {
  if (typeof document === "undefined") return;

  document.documentElement.lang = lang;

  if (lang === "hi") {
    document.body.classList.add("lang-hi");

    const linkId = "noto-sans-devanagari-font";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  } else {
    document.body.classList.remove("lang-hi");
  }
}
