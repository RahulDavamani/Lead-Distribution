export const notificationTargets = (userType: 'Operator' | 'Supervisor') => ({
	one: `One ${userType}`,
	all: `All ${userType}s`
});
