import { z } from "zod";

export const onboardingSchema = z.object({
  fullName: z.string().min(3),
  nin: z.string().length(11),
  bvn: z.string().length(11),
  residentialAddress: z.string().min(10),
  email: z.string().email(),
  phone: z.string().min(10),
});
