export interface TocSection {
  id: string;
  label: string;
  items?: { id: string; label: string }[];
}

interface TableOfContentsProps {
  sections: TocSection[];
}

function scrollToId(id: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
}

export function TableOfContents({ sections }: TableOfContentsProps) {
  return (
    <nav className="toc">
      <p className="toc-heading">Contents</p>
      <ol className="toc-list">
        {sections.map((section, i) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              onClick={scrollToId(section.id)}
              className="toc-link toc-link-section"
            >
              <span className="toc-index">{i + 1}.</span> {section.label}
            </a>
            {section.items && section.items.length > 0 && (
              <ol className="toc-sublist">
                {section.items.map((item, j) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={scrollToId(item.id)}
                      className="toc-link toc-link-item"
                    >
                      <span className="toc-index">
                        {i + 1}.{j + 1}
                      </span>{" "}
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
