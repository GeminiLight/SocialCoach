import { NextResponse } from "next/server";
import { toHttpError } from "./llm";
import type { Lang } from "@/data/taxonomy";
import { observeServerFailure } from "./server-model-observation";

export function fail(e: unknown) {
  const { status, message, modelIssue,retryAt } = toHttpError(e);
  observeServerFailure(modelIssue);
  console.error("[api]", status, message);
  return NextResponse.json({ error: message, modelIssue: modelIssue ?? null,...(retryAt?{retryAt}:{}) }, { status });
}

export const asLang = (v: unknown): Lang => (v === "en" ? "en" : "zh");

/**
 * Run a streaming task and return its deltas as a plain text response.
 *
 * With `final`, the task's resolved value is appended as
 * `\n@@final\n<json>` — the authoritative result, since the streamed text is
 * only the model's raw output. Failures mid-stream are appended as
 * `\n@@error\n<{error,status,modelIssue}>` because headers have already been sent.
 */
export function taskStream<T>(run:(onDelta:(d:string)=>void,signal:AbortSignal)=>Promise<T>,opts:{final?:boolean;signal?:AbortSignal}={}){
 const enc=new TextEncoder(),abort=new AbortController();
 const signal=opts.signal?AbortSignal.any([opts.signal,abort.signal]):abort.signal;
 let cancelled=false;
 const body=new ReadableStream<Uint8Array>({
  async start(controller){
   const emit=(text:string)=>{if(!cancelled&&!signal.aborted)controller.enqueue(enc.encode(text));};
   try{const result=await run(emit,signal);if(opts.final)emit(`\n@@final\n${JSON.stringify(result)}`);}
   catch(error){if(!cancelled&&!signal.aborted){const {status,message,modelIssue,retryAt}=toHttpError(error);observeServerFailure(modelIssue);emit(`\n@@error\n${JSON.stringify({error:message,status,modelIssue:modelIssue??null,...(retryAt?{retryAt}:{})})}`);}}
   finally{if(!cancelled)controller.close();}
  },
  cancel(){cancelled=true;abort.abort();},
 });
 return new Response(body,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Accel-Buffering':'no'}});
}
