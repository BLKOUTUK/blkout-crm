/**
 * Email Share Templates for Newsletter
 *
 * These templates can be embedded in SendFox newsletters or other email systems.
 * Replace {{REFERRAL_CODE}} and {{SHARE_URL}} with member-specific values.
 */

export const REFERRAL_SHARE_SECTION = {
  /**
   * HTML snippet for newsletter footer with share CTA
   */
  newsletterFooter: `
<div style="background: linear-gradient(135deg, #264653 0%, #1a1a1a 100%); border-radius: 12px; padding: 24px; margin: 32px 0; text-align: center;">
  <h3 style="color: #F4A261; font-size: 20px; margin: 0 0 12px 0; font-family: 'Poppins', sans-serif;">
    Know someone who should join BLKOUT?
  </h3>
  <p style="color: #ffffff; font-size: 14px; margin: 0 0 20px 0; opacity: 0.9;">
    Share the community with friends. Every referral strengthens our collective power.
  </p>
  <a href="{{SHARE_URL}}" style="display: inline-block; background: #D4261A; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
    Invite a Friend
  </a>
  <p style="color: #888888; font-size: 11px; margin: 16px 0 0 0;">
    Your unique code: <strong style="color: #2A9D8F;">{{REFERRAL_CODE}}</strong>
  </p>
</div>
`,

  /**
   * Plain text version for emails
   */
  plainText: `
--------------------------------------------
INVITE A FRIEND TO BLKOUT

Know someone who should join our community?
Share your unique link: {{SHARE_URL}}

Your referral code: {{REFERRAL_CODE}}
--------------------------------------------
`,

  /**
   * Minimal inline version for tight spaces
   */
  inline: `
<p style="text-align: center; padding: 16px; background: #f0f0f0; border-radius: 8px;">
  <span style="color: #264653;">Share BLKOUT:</span>
  <a href="{{SHARE_URL}}" style="color: #D4261A; font-weight: bold; text-decoration: none;">{{SHARE_URL}}</a>
</p>
`,

  /**
   * Social share buttons
   */
  socialButtons: `
<div style="text-align: center; padding: 16px 0;">
  <p style="color: #666; font-size: 12px; margin: 0 0 12px 0;">Share on:</p>
  <a href="https://wa.me/?text=Join%20BLKOUT%20community%3A%20{{SHARE_URL}}" style="display: inline-block; background: #25D366; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none; margin: 0 4px; font-size: 12px;">
    WhatsApp
  </a>
  <a href="https://twitter.com/intent/tweet?text=Join%20@BLKOUTUK&url={{SHARE_URL}}" style="display: inline-block; background: #1DA1F2; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none; margin: 0 4px; font-size: 12px;">
    Twitter/X
  </a>
  <a href="mailto:?subject=Join%20BLKOUT&body=Check%20out%20BLKOUT%3A%20{{SHARE_URL}}" style="display: inline-block; background: #666; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none; margin: 0 4px; font-size: 12px;">
    Email
  </a>
</div>
`,
}

/**
 * Generate personalized share section for a member
 */
export function generateShareSection(
  referralCode: string,
  template: keyof typeof REFERRAL_SHARE_SECTION = 'newsletterFooter'
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.blkoutuk.cloud'
  const shareUrl = `${baseUrl}/join?ref=${referralCode}`

  return REFERRAL_SHARE_SECTION[template]
    .replace(/\{\{REFERRAL_CODE\}\}/g, referralCode)
    .replace(/\{\{SHARE_URL\}\}/g, shareUrl)
}

/**
 * SendFox merge tag instructions
 *
 * If using SendFox's custom fields, you can:
 * 1. Add a custom field called "referral_code" to contacts
 * 2. Sync referral codes via the API
 * 3. Use {{referral_code}} in your email templates
 *
 * Example SendFox HTML:
 * <a href="https://blkout-crm.vercel.app/join?ref={{referral_code}}">
 *   Invite a friend
 * </a>
 */
export const SENDFOX_INSTRUCTIONS = `
To use referral codes in SendFox:

1. Create a custom field "referral_code" in SendFox
2. When syncing contacts, include the referral_code field
3. In your email template, use: {{referral_code}}

Example button HTML for SendFox:
<a href="https://crm.blkoutuk.cloud/join?ref={{referral_code}}"
   style="background:#D4261A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">
  Invite a Friend
</a>
`
