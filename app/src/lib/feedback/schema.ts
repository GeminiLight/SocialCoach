import { z } from "zod";

export const categories = ["bug", "character", "assessment", "idea", "other"] as const;
export const feedbackSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(categories),
  detail: z.string().trim().max(2000).default(""),
  contact: z.string().trim().max(160).default(""),
  tags: z.array(z.enum(["slow", "error", "mobile", "too_easy", "out_of_role", "missed_context", "wrong_quote", "unclear", "other"])).max(3).default([]),
  rating: z.enum(["helpful", "unhelpful"]).optional(),
  page: z.enum(["/", "/arena", "/learn", "/progress", "/settings", "/rehearse", "/onboarding", "/practice"]),
  lang: z.enum(["zh", "en"]),
}).strict();
export type Feedback = z.infer<typeof feedbackSchema>;
export function feedbackPage(path: string): Feedback["page"] {
  if (path.startsWith("/practice/")) return "/practice";
  return feedbackSchema.shape.page.safeParse(path).success ? path as Feedback["page"] : "/";
}
