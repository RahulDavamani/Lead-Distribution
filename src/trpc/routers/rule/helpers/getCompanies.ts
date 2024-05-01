import { getCompanyValues } from '../../lead/helpers/company';

export const getCompanies = async () => {
	const vonageUsers = (await prisma.$queryRaw`select UserId from VonageUsers where Active = 1`) as {
		UserId: number;
	}[];

	const companyKeys = (
		await Promise.all(
			vonageUsers.map(async (vonageUser) => {
				if (vonageUser.UserId) {
					const user = await prisma.users.findMany({
						where: { VonageAgentId: vonageUser.UserId.toString() },
						select: { UserKey: true, CompanyKey: true, VonageAgentId: true }
					});
					return user[0]?.CompanyKey;
				}
			})
		)
	).filter(Boolean) as string[];

	const companies = await Promise.all(
		[...new Set(companyKeys)].map(async (CompanyKey) => {
			return {
				CompanyKey: CompanyKey,
				CompanyName: (await getCompanyValues(CompanyKey))?.CompanyName ?? null
			};
		})
	);
	return companies;
};
