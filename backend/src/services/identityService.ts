import { randomUUID } from "crypto";

type Applicant = {
  id: string;
  fullName: string;
  nin: string;
  bvn: string;
  residentialAddress: string;
  email: string;
  phone: string;
  status: "pending" | "verified" | "failed";
  estimatedCompletion: Date;
  createdAt: Date;
};

const applicants: Applicant[] = [];

function generateId() {
  return typeof randomUUID === "function"
    ? randomUUID()
    : `applicant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function persistApplicant(payload: {
  fullName: string;
  nin: string;
  bvn: string;
  residentialAddress: string;
  email: string;
  phone: string;
}) {
  const applicant: Applicant = {
    id: generateId(),
    ...payload,
    status: "pending",
    estimatedCompletion: new Date(Date.now() + 1000 * 60 * 60 * 12),
    createdAt: new Date(),
  };

  applicants.push(applicant);
  return applicant;
}