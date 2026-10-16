import { handleGrantGeneration, type GenerationEnv } from "../../src/lib/grants/generator-server";
export default {
  fetch(request: Request, env: GenerationEnv) {
    return handleGrantGeneration(request, env);
  },
};
