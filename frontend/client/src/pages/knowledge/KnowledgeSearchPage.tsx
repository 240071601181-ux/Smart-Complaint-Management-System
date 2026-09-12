import { useState } from "react";
import { FileText, Search } from "lucide-react";
import { Button, Card } from "@/components/app/ui";
import { useToast } from "@/layouts/AppLayout";
import { useSearchKnowledgeMutation } from "@/api/hooks/useKnowledge";
import type { SearchKnowledgeInput } from "@/api/types";
import { getUserMessage } from "@/api/errors";

function excerpt(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/**
 * Phase 14C-9 — knowledge search backed by POST /api/v1/knowledge/search.
 * Sends the query plus only supported optionals (topK, documentId when set).
 * Similarity scores render verbatim from the backend; no vector math here.
 * documentId is forwarded only when entered — never silently broadened.
 */
export default function KnowledgeSearchPage() {
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [topK, setTopK] = useState("5");
  const [inputError, setInputError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<SearchKnowledgeInput | null>(null);
  const searchMutation = useSearchKnowledgeMutation();

  const runSearch = (input: SearchKnowledgeInput) => {
    setInputError(null);
    setLastInput(input);
    searchMutation.mutate(input, {
      onSuccess: (result) => notify(`Search complete — ${result.totalResults} chunk${result.totalResults === 1 ? "" : "s"}`),
    });
  };

  const handleSearch = () => {
    if (searchMutation.isPending) return; // prevent duplicate submissions
    if (!query.trim()) {
      setInputError("Enter a search query.");
      return;
    }
    const input: SearchKnowledgeInput = { query: query.trim(), topK: Number(topK) };
    if (documentId.trim()) input.documentId = documentId.trim();
    runSearch(input);
  };

  const result = searchMutation.data ?? null;
  const showTable = searchMutation.isPending || result !== null || searchMutation.isError;

  return (
    <>
      <div className="page-heading">
        <div><p className="lede">Ask the logistics intelligence layer.</p></div>
      </div>
      <Card className="table-card">
        <div className="toolbar">
          <div className="search-field"><Search size={16} /><input value={query} onChange={(e) => { setQuery(e.target.value); setInputError(null); }} placeholder="Search documents, rates, policies…" /></div>
          <div className="filter-row">
            <input
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              placeholder="Document ID (optional)"
              title="Restrict search to one document. Leave empty to search all documents."
              style={{ height: 28, padding: "0 9px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--panel-2)", fontSize: 10, color: "#96a3b1", width: 170 }}
            />
            <select value={topK} onChange={(e) => setTopK(e.target.value)} title="Max results">
              <option value="3">Top 3</option>
              <option value="5">Top 5</option>
              <option value="10">Top 10</option>
            </select>
            <Button icon={Search} variant="primary" onClick={handleSearch} disabled={searchMutation.isPending}>
              {searchMutation.isPending ? "Searching…" : "Search"}
            </Button>
          </div>
        </div>
        {inputError && <p style={{ color: "#f87171", fontSize: 10, padding: "0 17px 12px" }}>{inputError}</p>}
        {showTable && (
          <div className="table-wrap">
            {searchMutation.isPending && <p className="lede" style={{ padding: "18px 17px" }}>Searching the knowledge base…</p>}
            {searchMutation.isError && (
              <div style={{ padding: "18px 17px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ color: "#f87171", fontSize: 11 }}>
                  {getUserMessage(searchMutation.error instanceof Error ? searchMutation.error : new Error("Something went wrong."))}
                </span>
                {lastInput && (
                  <Button variant="secondary" onClick={() => runSearch(lastInput)} disabled={searchMutation.isPending}>Retry</Button>
                )}
              </div>
            )}
            {result && result.totalResults === 0 && (
              <p className="lede" style={{ padding: "18px 17px" }}>
                No chunks matched “{result.query}”{lastInput?.documentId ? ` in document ${lastInput.documentId}` : ""}. Try different terms.
              </p>
            )}
            {result && result.totalResults > 0 && (
              <table>
                <thead><tr><th>Document</th><th>Excerpt</th><th>Score</th></tr></thead>
                <tbody>
                  {result.results.map((r) => (
                    <tr key={r.id}>
                      <td><b className="table-main">{r.title}</b><small className="table-sub">{r.source ?? "—"} · chunk #{r.chunkIndex}</small></td>
                      <td style={{ whiteSpace: "normal" }}>{excerpt(r.chunkText)}</td>
                      <td><span className="status-label success">{r.similarity.toFixed(2)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {!showTable && (
          <p className="lede" style={{ padding: "18px 17px" }}>Run a search to rank vectorized chunks of the ingested corridor documents.</p>
        )}
      </Card>
      <Card className="info-card" style={{ marginTop: 14, padding: 19 }}>
        <span className="section-kicker">RETRIEVAL</span>
        <h2>How search works</h2>
        <p><FileText size={12} /> Results are ranked against vectorized chunks of ingested corridor documents.</p>
      </Card>
    </>
  );
}
