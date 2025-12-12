import { prisma } from "../lib/prisma.js";

export async function persistApplicant(payload: {
  fullName: string;
  nin: string;
  bvn: string;
  residentialAddress: string;
  email: string;
  phone: string;
}) {
  return prisma.applicant.create({
    data: {
      ...payload,
      status: "pending",
      estimatedCompletion: new Date(Date.now() + 1000 * 60 * 60 * 12),
    },
  });
}