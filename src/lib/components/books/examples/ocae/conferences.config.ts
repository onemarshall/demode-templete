import { z } from "zod";

export const conferencePageConfigSchema = z.object({
  wrapperClass: z.string(),
  sectionTitleClass: z.string(),
  paragraphClass: z.string(),
  buttonType: z.enum(["default", "destructive", "outline", "secondary", "ghost", "link"]),
});

const rawConferencePageConfig = {
  wrapperClass: "container max-width-adaptive-lg padding-y-2xl",
  sectionTitleClass: "text-xl text-uppercase color-contrast-higher margin-top-md",
  paragraphClass: "text-md line-height-lg color-contrast-medium",
  buttonType: "secondary",
} as const;

export const conferencePageConfig = conferencePageConfigSchema.parse(rawConferencePageConfig);

export type ConferencePageConfig = z.infer<typeof conferencePageConfigSchema>;
