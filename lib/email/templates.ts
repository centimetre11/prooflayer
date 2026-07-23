export function magicLinkEmail(url: string): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: "登录麋鹿洞察",
    text: `点击链接登录麋鹿洞察：${url}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#0b1210">登录麋鹿洞察</h2>
        <p style="color:#444">点击下面的按钮完成登录，链接短时间内有效。</p>
        <p><a href="${url}" style="display:inline-block;background:#d4a574;color:#1a140c;
          padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">登录</a></p>
        <p style="color:#888;font-size:12px">如果不是你本人操作，忽略此邮件即可。</p>
      </div>`,
  };
}

export function alertEmail(
  appName: string,
  items: { title: string; severity: string }[],
  dashboardUrl?: string
) {
  const rows = items
    .map(
      (i) =>
        `<li style="margin:6px 0"><b style="color:#ff5470">[${i.severity}]</b> ${i.title}</li>`
    )
    .join("");
  const cta = dashboardUrl
    ? `<p><a href="${dashboardUrl}" style="display:inline-block;background:#d4a574;color:#1a140c;
        padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">查看控制台</a></p>`
    : "";
  return {
    subject: `[麋鹿洞察] ${appName} 检测到安全回退`,
    text: `${appName} 检测到安全回退：\n${items
      .map((i) => `- [${i.severity}] ${i.title}`)
      .join("\n")}${dashboardUrl ? `\n\n查看：${dashboardUrl}` : ""}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#0b1210">${appName} 检测到安全回退</h2>
        <p style="color:#444">监测发现你的应用出现新的高优风险（配置回退或密钥泄露）：</p>
        <ul style="color:#222">${rows}</ul>
        ${cta}
        <p style="color:#888;font-size:12px">我们只告警不阻断。登录控制台查看详情与修复指引。</p>
      </div>`,
  };
}

export function weeklyDigestEmail(input: {
  userName?: string | null;
  apps: {
    name: string;
    score: number | null;
    openAlerts: number;
    lastScanAt: Date | null;
  }[];
  dashboardUrl: string;
}) {
  const greeting = input.userName ? `${input.userName}，` : "";
  const rows = input.apps
    .map((a) => {
      const score = a.score != null ? String(a.score) : "—";
      const scan = a.lastScanAt
        ? a.lastScanAt.toISOString().slice(0, 10)
        : "尚未扫描";
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${a.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${score}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${a.openAlerts}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${scan}</td>
      </tr>`;
    })
    .join("");

  const textRows = input.apps
    .map(
      (a) =>
        `- ${a.name}: 评分 ${a.score ?? "—"}, 未关闭告警 ${a.openAlerts}, 最近扫描 ${
          a.lastScanAt?.toISOString().slice(0, 10) ?? "无"
        }`
    )
    .join("\n");

  return {
    subject: "[麋鹿洞察] 本周安全摘要",
    text: `${greeting}这是你本周的应用安全摘要：\n\n${textRows}\n\n控制台：${input.dashboardUrl}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#0b1210">本周安全摘要</h2>
        <p style="color:#444">${greeting}过去 7 天你的应用监测概况如下：</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#222">
          <thead>
            <tr style="background:#f6f3ee;text-align:left">
              <th style="padding:8px 12px">应用</th>
              <th style="padding:8px 12px;text-align:center">评分</th>
              <th style="padding:8px 12px;text-align:center">未关闭告警</th>
              <th style="padding:8px 12px">最近扫描</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="4" style="padding:12px;color:#888">暂无应用</td></tr>`}</tbody>
        </table>
        <p style="margin-top:20px">
          <a href="${input.dashboardUrl}" style="display:inline-block;background:#d4a574;color:#1a140c;
            padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">打开控制台</a>
        </p>
      </div>`,
  };
}

export function scanCompleteEmail(input: {
  appName: string;
  score: number;
  critical: number;
  high: number;
  reportUrl: string;
}) {
  return {
    subject: `[麋鹿洞察] ${input.appName} 体检完成 · 评分 ${input.score}`,
    text: `${input.appName} 体检完成。评分 ${input.score}。严重 ${input.critical}，高危 ${input.high}。\n报告：${input.reportUrl}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#0b1210">${input.appName} 体检完成</h2>
        <p style="color:#444">安全评分 <b style="font-size:20px;color:#0b1210">${input.score}</b></p>
        <p style="color:#444">严重 ${input.critical} · 高危 ${input.high}</p>
        <p><a href="${input.reportUrl}" style="display:inline-block;background:#d4a574;color:#1a140c;
          padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">查看报告</a></p>
      </div>`,
  };
}
