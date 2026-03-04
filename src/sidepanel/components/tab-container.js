/**
 * Tab container component - switches between Invoices, Bills, POs, Quotes tabs.
 */
export const TABS = [
  { id: 'invoices', label: 'Invoices' },
  { id: 'bills', label: 'Bills' },
  { id: 'pos', label: 'POs' },
  { id: 'quotes', label: 'Quotes' },
];

export function renderTabBar(activeTab, onTabChange) {
  const el = document.createElement('div');
  el.className = 'tab-bar';

  TABS.forEach((tab) => {
    const btn = document.createElement('button');
    btn.className = `tab-btn ${tab.id === activeTab ? 'tab-active' : ''}`;
    btn.textContent = tab.label;
    btn.addEventListener('click', () => onTabChange(tab.id));
    el.appendChild(btn);
  });

  return el;
}
