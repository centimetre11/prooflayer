export function magicLinkEmail(url: string): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: "Sign in to InsightElk",
    text: `Click the link to sign in to InsightElk: ${url}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#0b1210">Sign in to InsightElk</h2>
        <p style="color:#444">Click the button below to complete sign-in. This link is valid for a short time only.</p>
        <p><a href="${url}" style="display:inline-block;background:#d4a574;color:#1a140c;
          padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sign in</a></p>
        <p style="color:#888;font-size:12px">If this wasn't you, simply ignore this email.</p>
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
        padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open dashboard</a></p>`
    : "";
  return {
    subject: `[InsightElk] Security regression detected for ${appName}`,
    text: `${appName} — security regression detected:\n${items
      .map((i) => `- [${i.severity}] ${i.title}`)
      .join("\n")}${dashboardUrl ? `\n\nView: ${dashboardUrl}` : ""}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#0b1210">Security regression detected for ${appName}</h2>
        <p style="color:#444">Monitoring found new high-priority risks in your app (a configuration regression or a secret leak):</p>
        <ul style="color:#222">${rows}</ul>
        ${cta}
        <p style="color:#888;font-size:12px">We only alert, we never block. Sign in to the dashboard for details and remediation guidance.</p>
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
  const greeting = input.userName ? `${input.userName}, ` : "";
  const rows = input.apps
    .map((a) => {
      const score = a.score != null ? String(a.score) : "—";
      const scan = a.lastScanAt
        ? a.lastScanAt.toISOString().slice(0, 10)
        : "Not yet scanned";
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
        `- ${a.name}: score ${a.score ?? "—"}, open alerts ${a.openAlerts}, last scan ${
          a.lastScanAt?.toISOString().slice(0, 10) ?? "none"
        }`
    )
    .join("\n");

  return {
    subject: "[InsightElk] Your weekly security summary",
    text: `${greeting}here is your weekly app security summary:\n\n${textRows}\n\nDashboard: ${input.dashboardUrl}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#0b1210">Weekly security summary</h2>
        <p style="color:#444">${greeting}here is an overview of your app monitoring over the past 7 days:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#222">
          <thead>
            <tr style="background:#f6f3ee;text-align:left">
              <th style="padding:8px 12px">App</th>
              <th style="padding:8px 12px;text-align:center">Score</th>
              <th style="padding:8px 12px;text-align:center">Open alerts</th>
              <th style="padding:8px 12px">Last scan</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="4" style="padding:12px;color:#888">No apps yet</td></tr>`}</tbody>
        </table>
        <p style="margin-top:20px">
          <a href="${input.dashboardUrl}" style="display:inline-block;background:#d4a574;color:#1a140c;
            padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open dashboard</a>
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
    subject: `[InsightElk] ${input.appName} scan complete · Score ${input.score}`,
    text: `${input.appName} scan complete. Score ${input.score}. Critical ${input.critical}, High ${input.high}.\nReport: ${input.reportUrl}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#0b1210">${input.appName} scan complete</h2>
        <p style="color:#444">Security score <b style="font-size:20px;color:#0b1210">${input.score}</b></p>
        <p style="color:#444">Critical ${input.critical} · High ${input.high}</p>
        <p><a href="${input.reportUrl}" style="display:inline-block;background:#d4a574;color:#1a140c;
          padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">View report</a></p>
      </div>`,
  };
}

export function applicationReceivedAdminEmail(input: {
  name: string;
  email: string;
  company?: string;
  note?: string;
  reviewUrl: string;
}) {
  return {
    subject: `[InsightElk] New access request: ${input.name}`,
    text: `New access request\nName: ${input.name}\nEmail: ${input.email}\nCompany: ${input.company ?? "—"}\nNote: ${input.note ?? "—"}\nReview: ${input.reviewUrl}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#0b1210">New access request</h2>
        <p style="color:#444"><b>${input.name}</b> (${input.email}) has submitted a request for console access.</p>
        <ul style="color:#222;padding-left:18px">
          <li>Company / team: ${input.company ?? "Not provided"}</li>
          <li>Note: ${input.note ?? "Not provided"}</li>
        </ul>
        <p><a href="${input.reviewUrl}" style="display:inline-block;background:#d4a574;color:#1a140c;
          padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Review in admin console</a></p>
      </div>`,
  };
}

export function applicationApprovedEmail(input: { name: string; loginUrl: string }) {
  return {
    subject: "[InsightElk] Your request is approved — you can sign in now",
    text: `Hi ${input.name}. Your access request has been approved. Sign in here: ${input.loginUrl}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#0b1210">Request approved</h2>
        <p style="color:#444">Hi ${input.name}. Your request for access to the InsightElk console has been approved.</p>
        <p style="color:#444">Click the button below and use your application email to receive a sign-in link to enter the console.</p>
        <p><a href="${input.loginUrl}" style="display:inline-block;background:#d4a574;color:#1a140c;
          padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sign in</a></p>
      </div>`,
  };
}

export function applicationRejectedEmail(input: { name: string; reason?: string }) {
  const reason = input.reason?.trim();
  return {
    subject: "[InsightElk] Your access request was not approved",
    text: `Hi ${input.name}. Unfortunately, your access request was not approved. ${reason ? `Reason: ${reason}` : "If you have any questions, feel free to reply to this email."}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#0b1210">Request not approved</h2>
        <p style="color:#444">Hi ${input.name}. Unfortunately, your access request was not approved this time.</p>
        ${reason ? `<p style="color:#444">Reason: ${reason}</p>` : ""}
        <p style="color:#888;font-size:12px">If you'd like to reapply, you can submit the application form again.</p>
      </div>`,
  };
}
