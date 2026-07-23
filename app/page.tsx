import Link from "next/link";
import { ScanForm } from "@/components/scan-form";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck,
  FileClock,
  Bell,
  KeyRound,
  DatabaseZap,
  ScanLine,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-12 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted)]">
            <ShieldCheck size={14} className="text-[var(--color-accent)]" />
            为 vibe coding 长成业务的应用而生
          </span>
          <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            60 秒检查你的应用
            <br />
            <span className="text-[var(--color-primary)]">是否泄露了数据库钥匙</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-[var(--color-muted)]">
            Prooflayer 是 AI 生成应用的「合规档案 + 保险」。从免费安全体检切入，为你留存持续尽责的证据链——出事故或客户尽调时，一键自证清白。
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <ScanForm />
          </div>
        </div>

        {/* proof stat */}
        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat value="1,645" label="个 Lovable+Supabase 上线应用被扫描" />
          <Stat value="170+" label="个存在 RLS 缺失 / USING(true) 策略" />
          <Stat value="55%" label="AI 生成代码的平均漏洞率" />
        </div>
        <p className="mt-3 text-center text-xs text-[var(--color-muted)]">
          数据来源：CVE-2025-48757 公开研究、Z3 形式化验证研究
        </p>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_40%,transparent)] py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">三步，非工程师也能用</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Step
              n={1}
              icon={<ScanLine size={20} />}
              title="粘贴应用地址"
              desc="后台用真实浏览器渲染你的应用，抓取前端 bundle 与运行时请求，检测暴露的数据库钥匙。零注册。"
            />
            <Step
              n={2}
              icon={<DatabaseZap size={20} />}
              title="可选连接 Supabase"
              desc="粘贴只读凭证做深度 RLS 审计。明确只读——我们不会改动你的任何东西，凭证默认用后即焚。"
            />
            <Step
              n={3}
              icon={<FileClock size={20} />}
              title="拿到白话报告 + 档案"
              desc="首屏三个数字：风险总数 / 最高危一项 / 修复预估分钟数。每次扫描沉淀为不可篡改的合规证据。"
            />
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          <Feature
            icon={<KeyRound size={20} />}
            title="上线体检（免费）"
            desc="RLS 逐表审计、service_role / secret 泄露扫描、Auth 配置与暴露面盘点，风险分级白话报告 + 图文修复指引。"
          />
          <Feature
            icon={<Bell size={20} />}
            title="持续监测（订阅）"
            desc="每日配置漂移检测——AI 重写代码导致 RLS 回退是常态。只对安全回退告警，防告警疲劳。"
          />
          <Feature
            icon={<FileClock size={20} />}
            title="合规档案（护城河）"
            desc="安全基线历史、修复四态闭环、监测连续性证明，形成防篡改证据链。尽调 / SOC2 预审一键应答。"
          />
        </div>
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-[var(--color-muted)]">
            监控是钩子，档案是资产，治理是生意。你卖的不是安全，是「持续尽责的证明」。
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
          >
            查看定价 <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card>
      <CardContent className="p-5 text-center">
        <div className="text-3xl font-bold text-[var(--color-primary)]">{value}</div>
        <div className="mt-1 text-sm text-[var(--color-muted)]">{label}</div>
      </CardContent>
    </Card>
  );
}

function Step({
  n,
  icon,
  title,
  desc,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-primary)]">
            {icon}
          </span>
          <span className="text-sm font-medium text-[var(--color-muted)]">第 {n} 步</span>
        </div>
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{desc}</p>
      </CardContent>
    </Card>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-fg)]">
          {icon}
        </span>
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{desc}</p>
      </CardContent>
    </Card>
  );
}
