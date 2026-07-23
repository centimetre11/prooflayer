import { prisma } from "@/lib/db";
import type { ScanResult } from "./pipeline";
import type { Prisma, ScanKind } from "@prisma/client";

/** Create a scan row up front so the client can poll its status. */
export async function createPendingScan(url: string, appId?: string, kind: ScanKind = "EXTERNAL") {
  return prisma.scan.create({
    data: {
      url,
      appId: appId ?? null,
      kind,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });
}

export async function saveScanResult(scanId: string, result: ScanResult) {
  await prisma.$transaction([
    prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "DONE",
        finishedAt: new Date(),
        rulesetVersion: result.rulesetVersion,
        score: result.score,
        riskCounts: result.riskCounts as unknown as Prisma.InputJsonValue,
        meta: result.meta as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.scanFinding.createMany({
      data: result.findings.map((f) => ({
        scanId,
        ruleId: f.ruleId,
        category: f.category,
        severity: f.severity,
        title: f.title,
        description: f.description,
        confidence: f.confidence,
        fingerprint: f.fingerprint,
        evidence: f.evidence as unknown as Prisma.InputJsonValue,
        remediation: f.remediation as unknown as Prisma.InputJsonValue,
      })),
    }),
  ]);
}

export async function failScan(scanId: string, error: string) {
  await prisma.scan.update({
    where: { id: scanId },
    data: { status: "FAILED", finishedAt: new Date(), error: error.slice(0, 500) },
  });
}
