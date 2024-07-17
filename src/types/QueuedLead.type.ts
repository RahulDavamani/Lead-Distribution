export interface QueuedLead {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	isUpdated: boolean;
	ProspectKey: string;
	VonageGUID: string | null;
	ruleId: string | null;
	CompanyKey: string | null;
	notes: string;
	isPicked: boolean;
	overrideCallback: boolean;
	leadResponseTime: number | null;

	rule:
		| {
				id: string;
				name: string;
				operators: { UserKey: string; assignNewLeads: boolean; assignCallbackLeads: boolean }[];
				supervisors: { UserKey: string; isRequeue: boolean }[];
		  }
		| undefined;

	notificationProcesses: {
		createdAt: Date;
		callbackNum: number;
		requeueNum: number;
		status: string;
		notificationAttempts: { num: number }[];
		escalations: { num: number }[];
	}[];

	calls: {
		createdAt: Date;
		UserKey: string | null;
	}[];

	responses: {
		createdAt: Date;
		responseValue: string | null;
	}[];

	isNewLead: boolean;

	prospect: {
		ProspectId: number;
		CompanyKey: string | null;
		CompanyName: string | undefined;
		CustomerFirstName: string | null;
		CustomerLastName: string | null;
		Phone: string | null;
		Address: string | null;
		ZipCode: string | null;
	};

	company:
		| {
				CompanyName?: string | null;
				timezone?: string;
				workingHours?: {
					id: string;
					start: Date;
					end: Date;
					days: string;
				}[];
		  }
		| undefined;

	latestCall:
		| {
				userStr: string | undefined;
				UserKey: string | null;
				createdAt: Date;
		  }
		| undefined;
}
