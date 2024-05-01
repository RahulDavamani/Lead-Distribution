import { ui } from '../../stores/ui.store';

export const copyToClipboard = (text?: string | null) => {
	navigator.clipboard.writeText(text ?? '');
	ui.setToast({ alertClasses: 'alert-success', title: 'Copied to clipboard' });
};
