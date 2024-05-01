<script>
	import { ui } from '../../../stores/ui.store';
	import Loader from './Loader.svelte';
	import Toast from './Toast.svelte';
	import AlertModal from './AlertModal.svelte';
	import AddAffiliate from '../../rules/rule-config/components/AddAffiliate.svelte';
	import AddOperator from '../../rules/rule-config/components/AddOperator.svelte';
	import AddSupervisor from '../../rules/rule-config/components/AddSupervisor.svelte';
	import SettingsModal from '../../leads/components/SettingsModal.svelte';
	import LeadDetailsModal from '../../leads/components/LeadDetailsModal.svelte';
	import SwitchCompanyModal from '../../leads/components/SwitchCompanyModal.svelte';
	import UpdateDispositionModal from '../../leads/components/UpdateDispositionModal.svelte';
	import ScheduleCallbackModal from '../../leads/components/ScheduleCallbackModal.svelte';

	$: ({ loader, toast, alertModal, modals } = $ui);
</script>

{#if loader}
	<Loader {...loader} />
{/if}

{#if toast}
	<Toast {...toast} />
{/if}

{#if alertModal}
	<AlertModal {...alertModal} />
{/if}

{#if modals.addAffiliate}
	<AddAffiliate />
{:else if modals.addOperator}
	<AddOperator />
{:else if modals.addSupervisor}
	<AddSupervisor />
{:else if modals.showSettingsModal}
	<SettingsModal />
{:else if modals.leadDetailsModelId}
	<LeadDetailsModal />
{:else if modals.switchCompanyModalId}
	<SwitchCompanyModal />
{:else if modals.updateDispositionModalId}
	<UpdateDispositionModal />
{:else if modals.scheduleCallbackModalId}
	<ScheduleCallbackModal />
{/if}
