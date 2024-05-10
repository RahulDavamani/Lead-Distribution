import { derived, get, writable } from 'svelte/store';
import { ruleSchema, type Rule, type RuleChanges } from '../zod/rule.schema';
import { formatZodErrors, trpcClientErrorHandler, type TRPCZodError } from '../trpc/trpcErrorhandler';
import { page } from '$app/stores';
import { ui } from './ui.store';
import { trpc } from '../trpc/client';
import { goto } from '$app/navigation';
import { nanoid } from 'nanoid';
import type { Company } from '../zod/company.schema';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../trpc/routers/app.router';
import { getNewActions } from '$lib/config/actions/actions.config';
import cloneDeep from 'lodash.clonedeep';
import { auth } from './auth.store';

type MasterData = inferRouterOutputs<AppRouter>['rule']['getMasterData'];

export interface RuleConfig {
	init: boolean;
	ogRule: Rule;
	rule: Rule;
	isCreate: boolean;
	canDelete: boolean;
	masterData: MasterData;
}

export const ruleConfig = (() => {
	const getNewRule = (companies?: Company[]) => {
		const newRule: Rule = {
			id: nanoid(),
			isActive: true,
			name: '',
			description: '',

			outboundCallNumber: '',
			overrideOutboundNumber: false,

			messagingService: 'ghl',
			smsTemplate: '',

			affiliates: [],
			companies:
				companies?.map((company) => {
					return {
						id: nanoid(),
						CompanyKey: company.CompanyKey,
						workingHours: []
					};
				}) ?? [],

			operators: [],
			supervisors: [],

			notificationAttempts: [],
			escalations: [],

			responses: [],
			responseOptions: {
				id: nanoid(),
				totalMaxAttempt: 10,
				responsesNoMatchActions: getNewActions(),
				responsesLimitExceedActions: getNewActions()
			}
		};
		return newRule;
	};

	const { subscribe, set, update } = writable<RuleConfig>({
		init: false,
		ogRule: getNewRule(),
		rule: getNewRule(),
		isCreate: true,
		canDelete: false,
		masterData: {
			affiliates: [],
			companies: [],
			operators: []
		}
	});

	const init = async (init?: boolean) => {
		update((state) => ({ ...state, init: init ?? false }));
		const $page = get(page);

		const masterData = await trpc($page).rule.getMasterData.query().catch(trpcClientErrorHandler);

		const id = $page.url.searchParams.get('id');
		if (id) {
			const { rule, canDelete } = await trpc($page).rule.getById.query({ id }).catch(trpcClientErrorHandler);
			set({
				init: true,
				ogRule: cloneDeep(rule),
				rule: cloneDeep(rule),
				isCreate: false,
				canDelete,
				masterData
			});
		} else {
			const rule = getNewRule(masterData.companies);
			set({
				init: true,
				ogRule: cloneDeep(rule),
				rule: cloneDeep(rule),
				isCreate: true,
				canDelete: false,
				masterData
			});
		}
	};

	const createRule = ui.loaderWrapper({ title: 'Creating Rule' }, async () => {
		const $page = get(page);
		const { rule } = get(ruleConfig);

		await trpc($page).rule.create.mutate(rule).catch(trpcClientErrorHandler);
		update((state) => ({ ...state, ogRule: cloneDeep(state.rule), isCreate: false, canDelete: true }));
		goto(`/rules/rule-config?id=${rule.id}`, {});
		$page.url.searchParams.set('id', rule.id);

		ui.setToast({
			alertClasses: 'alert-success',
			title: 'Rule Created Successfully'
		});
	});

	const updateRule = ui.loaderWrapper({ title: 'Updating Rule' }, async () => {
		const $page = get(page);
		const rule = get(ruleChanges);
		const {
			user: { UserKey }
		} = get(auth);

		await trpc($page)
			.rule.update.mutate({ ...rule, UserKey })
			.catch(trpcClientErrorHandler);
		update((state) => ({ ...state, ogRule: cloneDeep(state.rule) }));

		ui.setToast({
			alertClasses: 'alert-success',
			title: 'Rule Updated Successfully'
		});
	});

	const removeRule = () =>
		ui.setAlertModal({
			title: 'Delete Rule',
			body: 'Are you sure you want to delete this rule?',
			actions: [
				{
					name: 'Cancel',
					classes: 'btn-warning',
					onClick: () => ui.setAlertModal()
				},
				{
					name: 'Delete',
					classes: 'btn-error',
					onClick: ui.loaderWrapper({ title: 'Deleting Rule' }, async () => {
						const $page = get(page);
						const {
							rule: { id }
						} = get(ruleConfig);

						await trpc($page).rule.remove.mutate({ id }).catch(trpcClientErrorHandler);
						goto('/rules');

						ui.setToast({
							alertClasses: 'alert-success',
							title: 'Rule Deleted Successfully'
						});
						ui.setAlertModal();
					})
				}
			]
		});

	return {
		subscribe,
		set,
		update,
		getNewActions,
		init,
		createRule,
		updateRule,
		removeRule
	};
})();

export const ruleErrors = derived(ruleConfig, ({ rule }) => {
	const result = ruleSchema.safeParse(rule);
	return result.success === false ? formatZodErrors<Rule>(result.error.issues as TRPCZodError[]) : undefined;
});

export const ruleChanges = derived(ruleConfig, ({ ogRule, rule }) => {
	const ruleChanges: RuleChanges = { id: rule.id };
	if (rule.isActive !== ogRule.isActive) ruleChanges.isActive = rule.isActive;
	if (rule.name !== ogRule.name) ruleChanges.name = rule.name;
	if (rule.description !== ogRule.description) ruleChanges.description = rule.description;
	if (rule.outboundCallNumber !== ogRule.outboundCallNumber) ruleChanges.outboundCallNumber = rule.outboundCallNumber;
	if (rule.overrideOutboundNumber !== ogRule.overrideOutboundNumber)
		ruleChanges.overrideOutboundNumber = rule.overrideOutboundNumber;
	if (rule.messagingService !== ogRule.messagingService) ruleChanges.messagingService = rule.messagingService;
	if (rule.smsTemplate !== ogRule.smsTemplate) ruleChanges.smsTemplate = rule.smsTemplate;

	if (rule.responseOptions.totalMaxAttempt !== ogRule.responseOptions.totalMaxAttempt)
		if (ruleChanges.responseOptions) ruleChanges.responseOptions.totalMaxAttempt = rule.responseOptions.totalMaxAttempt;
		else
			ruleChanges.responseOptions = {
				id: rule.responseOptions.id,
				totalMaxAttempt: rule.responseOptions.totalMaxAttempt
			};

	if (
		JSON.stringify(rule.responseOptions.responsesNoMatchActions) !==
		JSON.stringify(ogRule.responseOptions.responsesNoMatchActions)
	) {
		if (ruleChanges.responseOptions)
			ruleChanges.responseOptions.responsesNoMatchActions = rule.responseOptions.responsesNoMatchActions;
		else
			ruleChanges.responseOptions = {
				id: rule.responseOptions.id,
				responsesNoMatchActions: rule.responseOptions.responsesNoMatchActions
			};
	}

	if (
		JSON.stringify(rule.responseOptions.responsesLimitExceedActions) !==
		JSON.stringify(ogRule.responseOptions.responsesLimitExceedActions)
	)
		if (ruleChanges.responseOptions)
			ruleChanges.responseOptions.responsesLimitExceedActions = rule.responseOptions.responsesLimitExceedActions;
		else
			ruleChanges.responseOptions = {
				id: rule.responseOptions.id,
				responsesLimitExceedActions: rule.responseOptions.responsesLimitExceedActions
			};

	// Affiliates
	for (const affiliate of rule.affiliates) {
		const ogRuleAffiliate = ogRule.affiliates.find(({ id }) => id === affiliate.id);
		if (ogRuleAffiliate) {
			if (JSON.stringify(affiliate) !== JSON.stringify(ogRuleAffiliate)) {
				console.log(affiliate, ogRuleAffiliate);
				const updateAffiliate: NonNullable<NonNullable<RuleChanges['affiliates']>['update']>[number] = {
					id: affiliate.id
				};
				if (affiliate.CompanyKey !== ogRuleAffiliate.CompanyKey) updateAffiliate.CompanyKey = affiliate.CompanyKey;
				if (affiliate.num !== ogRuleAffiliate.num) updateAffiliate.num = affiliate.num;

				if (ruleChanges.affiliates)
					if (ruleChanges.affiliates.update) ruleChanges.affiliates.update.push(updateAffiliate);
					else ruleChanges.affiliates.update = [updateAffiliate];
				else ruleChanges.affiliates = { update: [updateAffiliate] };
			}
		} else {
			if (ruleChanges.affiliates)
				if (ruleChanges.affiliates.create) ruleChanges.affiliates.create.push(affiliate);
				else ruleChanges.affiliates.create = [affiliate];
			else ruleChanges.affiliates = { create: [affiliate] };
		}
	}
	for (const affiliate of ogRule.affiliates) {
		if (!rule.affiliates.find(({ id }) => id === affiliate.id))
			if (ruleChanges.affiliates)
				if (ruleChanges.affiliates.remove) ruleChanges.affiliates.remove.push({ id: affiliate.id });
				else ruleChanges.affiliates.remove = [{ id: affiliate.id }];
			else ruleChanges.affiliates = { remove: [{ id: affiliate.id }] };
	}

	// Operators
	for (const operator of rule.operators) {
		const ogRuleOperator = ogRule.operators.find(({ id }) => id === operator.id);
		if (ogRuleOperator) {
			if (JSON.stringify(operator) !== JSON.stringify(ogRuleOperator)) {
				const updateOperator: NonNullable<NonNullable<RuleChanges['operators']>['update']>[number] = {
					id: operator.id
				};
				if (operator.UserKey !== ogRuleOperator.UserKey) updateOperator.UserKey = operator.UserKey;
				if (operator.num !== ogRuleOperator.num) updateOperator.num = operator.num;
				if (operator.assignCallbackLeads !== ogRuleOperator.assignCallbackLeads)
					updateOperator.assignCallbackLeads = operator.assignCallbackLeads;
				if (operator.assignNewLeads !== ogRuleOperator.assignNewLeads)
					updateOperator.assignNewLeads = operator.assignNewLeads;

				if (ruleChanges.operators)
					if (ruleChanges.operators.update) ruleChanges.operators.update.push(updateOperator);
					else ruleChanges.operators.update = [updateOperator];
				else ruleChanges.operators = { update: [updateOperator] };
			}
		} else {
			if (ruleChanges.operators)
				if (ruleChanges.operators.create) ruleChanges.operators.create.push(operator);
				else ruleChanges.operators.create = [operator];
			else ruleChanges.operators = { create: [operator] };
		}
	}
	for (const operator of ogRule.operators) {
		if (!rule.operators.find(({ id }) => id === operator.id))
			if (ruleChanges.operators)
				if (ruleChanges.operators.remove) ruleChanges.operators.remove.push({ id: operator.id });
				else ruleChanges.operators.remove = [{ id: operator.id }];
			else ruleChanges.operators = { remove: [{ id: operator.id }] };
	}

	// Supervisors
	for (const supervisor of rule.supervisors) {
		const ogRuleSupervisor = ogRule.supervisors.find(({ id }) => id === supervisor.id);
		if (ogRuleSupervisor) {
			if (JSON.stringify(supervisor) !== JSON.stringify(ogRuleSupervisor)) {
				const updateSupervisor: NonNullable<NonNullable<RuleChanges['supervisors']>['update']>[number] = {
					id: supervisor.id
				};
				if (supervisor.UserKey !== ogRuleSupervisor.UserKey) updateSupervisor.UserKey = supervisor.UserKey;
				if (supervisor.num !== ogRuleSupervisor.num) updateSupervisor.num = supervisor.num;
				if (supervisor.isEscalate !== ogRuleSupervisor.isEscalate) updateSupervisor.isEscalate = supervisor.isEscalate;
				if (supervisor.isRequeue !== ogRuleSupervisor.isRequeue) updateSupervisor.isRequeue = supervisor.isRequeue;

				if (ruleChanges.supervisors)
					if (ruleChanges.supervisors.update) ruleChanges.supervisors.update.push(updateSupervisor);
					else ruleChanges.supervisors.update = [updateSupervisor];
				else ruleChanges.supervisors = { update: [updateSupervisor] };
			}
		} else {
			if (ruleChanges.supervisors)
				if (ruleChanges.supervisors.create) ruleChanges.supervisors.create.push(supervisor);
				else ruleChanges.supervisors.create = [supervisor];
			else ruleChanges.supervisors = { create: [supervisor] };
		}
	}
	for (const supervisor of ogRule.supervisors) {
		if (!rule.supervisors.find(({ id }) => id === supervisor.id))
			if (ruleChanges.supervisors)
				if (ruleChanges.supervisors.remove) ruleChanges.supervisors.remove.push({ id: supervisor.id });
				else ruleChanges.supervisors.remove = [{ id: supervisor.id }];
			else ruleChanges.supervisors = { remove: [{ id: supervisor.id }] };
	}

	// Notification Attempts
	for (const notificationAttempt of rule.notificationAttempts) {
		const ogRuleNotificationAttempt = ogRule.notificationAttempts.find(({ id }) => id === notificationAttempt.id);
		if (ogRuleNotificationAttempt) {
			if (JSON.stringify(notificationAttempt) !== JSON.stringify(ogRuleNotificationAttempt)) {
				const updateNotificationAttempt: NonNullable<
					NonNullable<RuleChanges['notificationAttempts']>['update']
				>[number] = {
					id: notificationAttempt.id
				};
				if (notificationAttempt.num !== ogRuleNotificationAttempt.num)
					updateNotificationAttempt.num = notificationAttempt.num;
				if (notificationAttempt.type !== ogRuleNotificationAttempt.type)
					updateNotificationAttempt.type = notificationAttempt.type;
				if (notificationAttempt.target !== ogRuleNotificationAttempt.target)
					updateNotificationAttempt.target = notificationAttempt.target;
				if (notificationAttempt.messageTemplate !== ogRuleNotificationAttempt.messageTemplate)
					updateNotificationAttempt.messageTemplate = notificationAttempt.messageTemplate;
				if (notificationAttempt.waitTime !== ogRuleNotificationAttempt.waitTime)
					updateNotificationAttempt.waitTime = notificationAttempt.waitTime;

				if (ruleChanges.notificationAttempts)
					if (ruleChanges.notificationAttempts.update)
						ruleChanges.notificationAttempts.update.push(updateNotificationAttempt);
					else ruleChanges.notificationAttempts.update = [updateNotificationAttempt];
				else ruleChanges.notificationAttempts = { update: [updateNotificationAttempt] };
			}
		} else {
			if (ruleChanges.notificationAttempts)
				if (ruleChanges.notificationAttempts.create) ruleChanges.notificationAttempts.create.push(notificationAttempt);
				else ruleChanges.notificationAttempts.create = [notificationAttempt];
			else ruleChanges.notificationAttempts = { create: [notificationAttempt] };
		}
	}
	for (const notificationAttempt of ogRule.notificationAttempts) {
		if (!rule.notificationAttempts.find(({ id }) => id === notificationAttempt.id))
			if (ruleChanges.notificationAttempts)
				if (ruleChanges.notificationAttempts.remove)
					ruleChanges.notificationAttempts.remove.push({ id: notificationAttempt.id });
				else ruleChanges.notificationAttempts.remove = [{ id: notificationAttempt.id }];
			else ruleChanges.notificationAttempts = { remove: [{ id: notificationAttempt.id }] };
	}

	// Escalations
	for (const escalation of rule.escalations) {
		const ogRuleEscalation = ogRule.escalations.find(({ id }) => id === escalation.id);
		if (ogRuleEscalation) {
			if (JSON.stringify(escalation) !== JSON.stringify(ogRuleEscalation)) {
				const updateEscalation: NonNullable<NonNullable<RuleChanges['escalations']>['update']>[number] = {
					id: escalation.id
				};
				if (escalation.num !== ogRuleEscalation.num) updateEscalation.num = escalation.num;
				if (escalation.type !== ogRuleEscalation.type) updateEscalation.type = escalation.type;
				if (escalation.target !== ogRuleEscalation.target) updateEscalation.target = escalation.target;
				if (escalation.messageTemplate !== ogRuleEscalation.messageTemplate)
					updateEscalation.messageTemplate = escalation.messageTemplate;
				if (escalation.waitTime !== ogRuleEscalation.waitTime) updateEscalation.waitTime = escalation.waitTime;

				if (ruleChanges.escalations)
					if (ruleChanges.escalations.update) ruleChanges.escalations.update.push(updateEscalation);
					else ruleChanges.escalations.update = [updateEscalation];
				else ruleChanges.escalations = { update: [updateEscalation] };
			}
		} else {
			if (ruleChanges.escalations)
				if (ruleChanges.escalations.create) ruleChanges.escalations.create.push(escalation);
				else ruleChanges.escalations.create = [escalation];
			else ruleChanges.escalations = { create: [escalation] };
		}
	}
	for (const escalation of ogRule.escalations) {
		if (!rule.escalations.find(({ id }) => id === escalation.id))
			if (ruleChanges.escalations)
				if (ruleChanges.escalations.remove) ruleChanges.escalations.remove.push({ id: escalation.id });
				else ruleChanges.escalations.remove = [{ id: escalation.id }];
			else ruleChanges.escalations = { remove: [{ id: escalation.id }] };
	}

	// Companies
	for (const company of rule.companies) {
		const ogRuleCompany = ogRule.companies.find(({ id }) => id === company.id);
		if (ogRuleCompany) {
			if (JSON.stringify(company) !== JSON.stringify(ogRuleCompany)) {
				const updateCompany: NonNullable<NonNullable<RuleChanges['companies']>['update']>[number] = {
					id: company.id
				};
				if (company.CompanyKey !== ogRuleCompany.CompanyKey) updateCompany.CompanyKey = company.CompanyKey;
				if (company.workingHours !== ogRuleCompany.workingHours) updateCompany.workingHours = company.workingHours;

				if (ruleChanges.companies)
					if (ruleChanges.companies.update) ruleChanges.companies.update.push(updateCompany);
					else ruleChanges.companies.update = [updateCompany];
				else ruleChanges.companies = { update: [updateCompany] };
			}
		} else {
			if (ruleChanges.companies)
				if (ruleChanges.companies.create) ruleChanges.companies.create.push(company);
				else ruleChanges.companies.create = [company];
			else ruleChanges.companies = { create: [company] };
		}
	}
	for (const company of ogRule.companies) {
		if (!rule.companies.find(({ id }) => id === company.id))
			if (ruleChanges.companies)
				if (ruleChanges.companies.remove) ruleChanges.companies.remove.push({ id: company.id });
				else ruleChanges.companies.remove = [{ id: company.id }];
			else ruleChanges.companies = { remove: [{ id: company.id }] };
	}

	// Responses
	for (const response of rule.responses) {
		const ogRuleResponse = ogRule.responses.find(({ id }) => id === response.id);
		if (ogRuleResponse) {
			if (JSON.stringify(response) !== JSON.stringify(ogRuleResponse)) {
				const updateResponse: NonNullable<NonNullable<RuleChanges['responses']>['update']>[number] = {
					id: response.id
				};
				if (response.num !== ogRuleResponse.num) updateResponse.num = response.num;
				if (response.type !== ogRuleResponse.type) updateResponse.type = response.type;
				if (response.values !== ogRuleResponse.values) updateResponse.values = response.values;
				if (response.actions !== ogRuleResponse.actions) updateResponse.actions = response.actions;

				if (ruleChanges.responses)
					if (ruleChanges.responses.update) ruleChanges.responses.update.push(updateResponse);
					else ruleChanges.responses.update = [updateResponse];
				else ruleChanges.responses = { update: [updateResponse] };
			}
		} else {
			if (ruleChanges.responses)
				if (ruleChanges.responses.create) ruleChanges.responses.create.push(response);
				else ruleChanges.responses.create = [response];
			else ruleChanges.responses = { create: [response] };
		}
	}
	for (const response of ogRule.responses) {
		if (!rule.responses.find(({ id }) => id === response.id))
			if (ruleChanges.responses)
				if (ruleChanges.responses.remove) ruleChanges.responses.remove.push({ id: response.id });
				else ruleChanges.responses.remove = [{ id: response.id }];
			else ruleChanges.responses = { remove: [{ id: response.id }] };
	}

	return ruleChanges;
});
