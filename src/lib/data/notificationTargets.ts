export const notificationTargets = (userType: 'Operator' | 'Supervisor') => ({
	one: `One ${userType == 'Operator' ? 'Available Operator' : 'Supervisor'}`,
	all: `All ${userType === 'Operator' ? 'Available Operator' : 'Supervisor'}s`
});
