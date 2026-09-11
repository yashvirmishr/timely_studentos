import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const CANDIDATE_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs"];

function resolvePath(base) {
  const direct = CANDIDATE_EXTENSIONS.map((ext) => base + ext).find(existsSync);
  const indexed = CANDIDATE_EXTENSIONS.map((ext) =>
    path.join(base, "index" + ext),
  ).find(existsSync);
  return direct || indexed;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = resolvePath(path.join(projectRoot, "src", specifier.slice(2)));
    if (resolved) {
      return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
  }

  // Project source uses extensionless relative imports (TypeScript style).
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !path.extname(specifier) &&
    context.parentURL
  ) {
    const base = fileURLToPath(new URL(specifier, context.parentURL));
    const resolved = resolvePath(base);
    if (resolved) {
      return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}
