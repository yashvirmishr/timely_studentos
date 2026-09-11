// Lets plain Node import app modules that use the `@/` TypeScript path alias,
// so isolation behaviour can be asserted against the real store code.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./alias-hooks.mjs", pathToFileURL("./tests/"));
