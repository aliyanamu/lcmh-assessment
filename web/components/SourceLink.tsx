// The provenance atom. Every carbon figure renders one of these — a deep link to the
// exact source PDF page (source-pdfs/<file>#page=N). No figure ships without it.
export default function SourceLink({ file, page }: { file: string; page: number }) {
  const href = `/source-pdfs/${encodeURIComponent(file)}#page=${page}`;
  return (
    <a className="src" href={href} target="_blank" rel="noreferrer" title={`${file} — page ${page}`}>
      p.{page} ↗
    </a>
  );
}
