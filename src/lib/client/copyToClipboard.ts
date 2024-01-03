import { ui } from '../../stores/ui.store';

export const copyToClipboard = (text?: string | null) => {
	navigator.clipboard.writeText(text ?? '');
	ui.showToast({ class: 'alert-success', title: 'Copied to clipboard' });
};
