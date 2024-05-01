export const getWorkingHours = async (ruleId: string | null, CompanyKey: string | null) => {
	if (ruleId && CompanyKey) {
		const rule = await prisma.ldRule.findUniqueOrThrow({
			where: { id: ruleId },
			select: {
				companies: {
					where: { CompanyKey },
					select: {
						workingHours: {
							select: {
								id: true,
								start: true,
								end: true,
								days: true
							}
						}
					}
				}
			}
		});
		return rule.companies.length ? rule.companies[0].workingHours : undefined;
	}
};
