import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseDataset } from "./parse";
import type { Dataset, DatasetId } from "@/lib/types";

/**
 * Server-only loader. Datasets live in ./data/datasets (outside /public), so they are
 * only reachable through the /api/dataset route, which serves the dataset selected
 * in the researcher configuration. Researcher-only material is never copied into the app.
 */
const DATA_DIR = path.join(process.cwd(), "data", "datasets");
const cache = new Map<DatasetId, Promise<Dataset>>();

export function loadDataset(id: DatasetId): Promise<Dataset> {
  let p = cache.get(id);
  if (!p) {
    p = readFile(path.join(DATA_DIR, `${id}.json`), "utf8").then((txt) => parseDataset(id, JSON.parse(txt)));
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}
