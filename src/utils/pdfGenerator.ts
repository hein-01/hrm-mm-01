/**
 * Governance Utility: Standardized "Simulated PDF" Content Generator
 * Ensures all corporate documents adhere to branding guidelines by injecting
 * the company logo and security metadata into generated text blobs.
 */

export const generateDocumentContent = (
  title: string,
  logoBase64: string | null | undefined,
  bodyContent: string,
  metadata: {
    id: string;
    timestamp: string;
    checksum: string;
    footer?: string;
  }
) => {
  const border = '=========================================';
  const logoSection = logoBase64 
    ? `[CORPORATE_LOGO_ATTACHED: ${logoBase64.substring(0, 32)}...]` 
    : '[DECENTRALIZED_IDENTITY_VERIFIED]';

  return `
${border}
${title.toUpperCase()}
${border}
${logoSection}

${bodyContent}

-----------------------------------------
GOVERNANCE & AUDIT METADATA
-----------------------------------------
Document ID: ${metadata.id}
Generated: ${metadata.timestamp}
Integrity Hash: [SECURE-${metadata.checksum}]
${metadata.footer ? `Notes: ${metadata.footer}\n` : ''}
${border}
© TECHDANCE HRMS · Myanmar Edition
  `.trim();
};
