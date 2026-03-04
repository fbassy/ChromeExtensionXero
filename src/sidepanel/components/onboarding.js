/**
 * First-run onboarding: welcome screen and short setup steps.
 * Shown once; completion is persisted in chrome.storage.local.
 */

export function renderOnboarding(onGetStarted) {
  const el = document.createElement('div');
  el.className = 'onboarding';
  el.innerHTML = `
    <div class="onboarding-logo">
      <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#13B5EA"/>
        <text x="24" y="30" text-anchor="middle" fill="white" font-size="20" font-weight="bold">X</text>
      </svg>
    </div>
    <h1 class="onboarding-title">Xero for Gmail</h1>
    <p class="onboarding-subtitle">See Xero data for your email contacts right in Gmail.</p>
    <ul class="onboarding-steps">
      <li><span class="onboarding-step-num">1</span> Connect your Xero account</li>
      <li><span class="onboarding-step-num">2</span> Open any email in Gmail</li>
      <li><span class="onboarding-step-num">3</span> View invoices, bills, and more in this panel</li>
    </ul>
    <p class="onboarding-note">You can also create new Xero contacts or add the sender’s email to an existing contact when they’re not in Xero yet.</p>
    <button type="button" class="btn btn-primary onboarding-cta">Get started</button>
  `;
  el.querySelector('.onboarding-cta').addEventListener('click', onGetStarted);
  return el;
}
