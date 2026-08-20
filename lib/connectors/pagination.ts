import { ConnectorFailure, toConnectorError } from "./errors";
import type { Provider } from "./types";

export type ProviderPage<RecordType, TokenType> = {
  records: RecordType[];
  nextToken?: TokenType;
};

export type PaginationResult<RecordType> = {
  records: RecordType[];
  pagesFetched: number;
};

function paginationFailure(provider: Provider): ConnectorFailure {
  return new ConnectorFailure(
    toConnectorError({
      provider,
      code: "PAGINATION_LIMIT_EXCEEDED",
      causeCategory: "pagination",
    }),
  );
}

export async function paginate<RecordType, TokenType>(
  fetchPage: (token?: TokenType) => Promise<ProviderPage<RecordType, TokenType>>,
  options: {
    provider: Provider;
    maxPages: number;
    maxRecords: number;
    tokenKey?: (token: TokenType) => string;
  },
): Promise<PaginationResult<RecordType>> {
  if (!Number.isInteger(options.maxPages) || options.maxPages < 1) throw paginationFailure(options.provider);
  if (!Number.isInteger(options.maxRecords) || options.maxRecords < 1) throw paginationFailure(options.provider);

  const records: RecordType[] = [];
  const seenTokens = new Set<string>();
  const tokenKey = options.tokenKey ?? ((token: TokenType) => JSON.stringify(token));
  let nextToken: TokenType | undefined;
  let pagesFetched = 0;

  while (true) {
    const page = await fetchPage(nextToken);
    pagesFetched += 1;
    records.push(...page.records);
    if (records.length > options.maxRecords) throw paginationFailure(options.provider);
    if (page.nextToken === undefined) return { records, pagesFetched };
    if (page.records.length === 0 || pagesFetched >= options.maxPages) throw paginationFailure(options.provider);

    const key = tokenKey(page.nextToken);
    if (seenTokens.has(key)) throw paginationFailure(options.provider);
    seenTokens.add(key);
    nextToken = page.nextToken;
  }
}
