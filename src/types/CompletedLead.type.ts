export interface CompletedLead {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	ProspectKey: string;
	VonageGUID: string | null;
	ruleId: string | null;
	CompanyKey: string | null;
	notes: string;
	UserKey: string | null;
	success: boolean;
	completeStatus: string;

	user: string | undefined;

	rule: {
		name: string;
	} | null;

	calls: {
		UserKey: string | null;
		createdAt: Date;
	}[];

	prospect: {
		CompanyName: string | undefined;
		CompanyKey: string | null;
		ProspectId: number;
		CustomerFirstName: string | null;
		CustomerLastName: string | null;
		Address: string | null;
		ZipCode: string | null;
	};

	company:
		| {
				CompanyName: string | null;
		  }
		| undefined;

	leadResponseTime: number | undefined;

	workingHours:
		| {
				id: string;
				start: Date;
				end: Date;
				days: string;
		  }[]
		| undefined;

	vonageCall:
		| {
				duration: string | null;
				status: string | null;
		  }
		| undefined;
}
