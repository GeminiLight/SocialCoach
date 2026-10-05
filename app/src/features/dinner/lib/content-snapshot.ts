import {z} from 'zod';
import {ScenarioSchema,LocalizedSchema} from '@/lib/runtime-contracts';
/** Simulation direction remains separate from the public assessment snapshot. */
export const DinnerContentSchema=z.object({
 version:z.literal(1),publicScenario:ScenarioSchema,
 direction:z.object({title:LocalizedSchema,setup:LocalizedSchema,goal:LocalizedSchema,
 cast:z.array(z.object({id:z.string(),name:LocalizedSchema,role:LocalizedSchema,description:LocalizedSchema,agenda:LocalizedSchema,voice:LocalizedSchema.optional()})),
 facts:z.object({zh:z.array(z.string()),en:z.array(z.string())}),
 brief:z.object({role:LocalizedSchema,unknown:LocalizedSchema,lines:z.array(LocalizedSchema)}),
 }),
});
export type DinnerContent=z.infer<typeof DinnerContentSchema>;
