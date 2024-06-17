export interface QueuedLead {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	ProspectKey: string;
	VonageGUID: string | null;
	ruleId: string | null;
	CompanyKey: string | null;
	notes: string;
	isPicked: boolean;
	overrideCallback: boolean;

	rule: {
		id: string;
		name: string;
		supervisors: {
			UserKey: string;
			isRequeue: boolean;
		}[];
	} | null;

	notificationProcesses: {
		createdAt: Date;
		callbackNum: number;
		requeueNum: number;
		status: string;
		notificationAttempts: {
			UserKey: string | null;
			attempt: { num: number } | null;
		}[];
		escalations: {
			UserKey: string | null;
			escalation: { num: number } | null;
		}[];
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
		CompanyName: string | undefined;
		CompanyKey: string | null;
		Address: string | null;
		ProspectId: number;
		CustomerFirstName: string | null;
		CustomerLastName: string | null;
		ZipCode: string | null;
	};

	company:
		| {
				CompanyName?: string | null;
				timezone: string;
				workingHours: {
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

	leadResponseTime: number | undefined;
}
