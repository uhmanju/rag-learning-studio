import type { EmbeddingProvider } from "@/services/embeddingProviders/embeddingProvider";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
  "is", "was", "were", "are", "be", "this", "that", "it", "as", "at",
  "by", "from", "their", "they", "them", "what", "who", "does", "did",
  "has", "have", "had", "not", "no", "how", "why", "when", "where",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

const MAX_VOCAB = 384; // chosen to match the dimension count learners will
// have just seen for all-MiniLM-L6-v2 — a coincidence worth being explicit
// about, not a claim that this is the same kind of vector.

/**
 * A real, deterministic, network-free embedding provider — TF-IDF vectors
 * over a vocabulary built from whatever text this provider has actually
 * seen. This is genuine, computable, verifiable math (not a placeholder
 * returning zeros or random numbers), but it is NOT a neural embedding
 * model: it has no notion of synonyms, word order, or semantic meaning
 * beyond literal shared vocabulary. It exists so Demo Mode has a real,
 * always-available embedding path with zero network dependency and zero
 * model-download wait — and so the app keeps working end to end even when
 * TransformersJsEmbeddingProvider can't load (offline, blocked CDN, etc).
 *
 * Vocabulary is built once, from the first batch embed() is called with
 * (in practice: a document's chunks), and reused for every later call
 * (e.g. embedding a single question) so vectors stay comparable. Terms
 * outside that vocabulary are simply ignored in later calls — standard
 * out-of-vocabulary behavior for this class of technique.
 */
export class LexicalTfIdfEmbeddingProvider implements EmbeddingProvider {
  readonly id = "lexical-tfidf";
  readonly name = "Lexical TF-IDF (offline fallback)";
  readonly description =
    "A real, computed vector — built from shared vocabulary and term frequency, not a neural network. Always available, no download, no network. Used when a real model provider isn't ready.";

  private vocabulary: string[] | null = null;
  private docFrequency: Map<string, number> = new Map();
  private corpusSize = 0;

  get dimensions(): number {
    return this.vocabulary?.length ?? 0;
  }

  isReady(): boolean {
    return true; // no async setup required
  }

  async load(): Promise<void> {
    // Nothing to load — vocabulary builds lazily from the first embed() call.
  }

  private buildVocabulary(texts: string[]): void {
    const freq = new Map<string, number>();
    for (const text of texts) {
      const seen = new Set(tokenize(text));
      for (const term of seen) freq.set(term, (freq.get(term) ?? 0) + 1);
    }
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_VOCAB);
    this.vocabulary = sorted.map(([term]) => term);
    this.docFrequency = new Map(sorted);
    this.corpusSize = texts.length;
  }

  private vectorFor(text: string): number[] {
    if (!this.vocabulary) return [];
    const tokens = tokenize(text);
    const termCount = new Map<string, number>();
    for (const t of tokens) termCount.set(t, (termCount.get(t) ?? 0) + 1);

    const vector = this.vocabulary.map((term) => {
      const tf = termCount.get(term) ?? 0;
      if (tf === 0) return 0;
      const df = this.docFrequency.get(term) ?? 1;
      const idf = Math.log((this.corpusSize + 1) / (df + 1)) + 1;
      return tf * idf;
    });

    // L2-normalize so cosine similarity behaves sensibly regardless of
    // document length — the same normalization real embedding models
    // typically apply.
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return magnitude > 0 ? vector.map((v) => v / magnitude) : vector;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.vocabulary) this.buildVocabulary(texts);
    return texts.map((t) => this.vectorFor(t));
  }
}
