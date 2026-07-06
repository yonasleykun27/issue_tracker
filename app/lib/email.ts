import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
})

export async function sendStatusChangeEmail({
  to,
  recipientName,
  issueId,
  issueTitle,
  newStatus
}: {
  to: string
  recipientName: string
  issueId: number
  issueTitle: string
  newStatus: string
}) {
  const statusConfig: Record<string, { subject: string; color: string; headline: string; body: string }> = {
    IN_PROGRESS: {
      subject: `🔧 Ticket #${issueId} — Your issue is now being worked on`,
      color: '#F59E0B',
      headline: 'Your issue is In Progress',
      body: 'Our IT support team has picked up your ticket and is actively working to resolve it. We\'ll notify you once it\'s resolved.'
    },
    RESOLVED: {
      subject: `✅ Ticket #${issueId} — Your issue has been resolved`,
      color: '#16A34A',
      headline: 'Your issue has been resolved!',
      body: 'Great news! Your reported issue has been resolved by our IT support team. If the problem persists, please open a new ticket from your dashboard.'
    },
    OPEN: {
      subject: `📋 Ticket #${issueId} — Your issue has been reopened`,
      color: '#EF4444',
      headline: 'Your issue has been reopened',
      body: 'Your support ticket has been reopened and is back in the queue for review.'
    }
  }

  const config = statusConfig[newStatus]
  if (!config) return // Don't send email for unrecognized statuses

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              
              <!-- Header -->
              <tr>
                <td style="background:#052814;padding:28px 40px;text-align:center;">
                  <p style="margin:0;color:#4ade80;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Ethio Telecom</p>
                  <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:700;">IT Incident Tracker</p>
                </td>
              </tr>

              <!-- Status Badge -->
              <tr>
                <td style="padding:32px 40px 0;text-align:center;">
                  <span style="display:inline-block;background:${config.color}1a;color:${config.color};font-weight:700;font-size:12px;padding:6px 16px;border-radius:999px;letter-spacing:1px;text-transform:uppercase;border:1.5px solid ${config.color}30;">
                    ${newStatus.replace('_', ' ')}
                  </span>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:24px 40px;">
                  <p style="margin:0 0 8px;color:#71717a;font-size:14px;">Hi ${recipientName},</p>
                  <h2 style="margin:0 0 16px;color:#09090b;font-size:22px;font-weight:700;">${config.headline}</h2>
                  <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">${config.body}</p>

                  <!-- Ticket Info Box -->
                  <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
                    <p style="margin:0 0 4px;color:#a1a1aa;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Ticket Reference</p>
                    <p style="margin:0 0 12px;color:#09090b;font-size:18px;font-weight:700;">Ticket #${issueId}</p>
                    <p style="margin:0 0 4px;color:#a1a1aa;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Issue Title</p>
                    <p style="margin:0;color:#3f3f46;font-size:14px;font-weight:500;">${issueTitle}</p>
                  </div>

                  <p style="margin:0;color:#71717a;font-size:13px;">
                    This is an automated notification from the Ethio Telecom IT Incident Tracker.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #f4f4f5;text-align:center;">
                  <p style="margin:0;color:#a1a1aa;font-size:12px;">© ${new Date().getFullYear()} Ethio Telecom — IT Support Division</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  await transporter.sendMail({
    from: `"Ethio Telecom IT Support" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: config.subject,
    html
  })
}
